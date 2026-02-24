"use server";

import { hash } from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/validations/auth";
import { redirect } from "next/navigation";
import { randomBytes, randomUUID } from "crypto";
import { sendPasswordResetEmail } from "@/lib/emails/send";
import { rateLimit, AUTH_RATE_LIMITS } from "@/lib/rate-limit";

const RESET_TOKEN_EXPIRY_HOURS = 24;

const baseUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const handleLogin = async (formData: FormData): Promise<void> => {
  const rl = await rateLimit(AUTH_RATE_LIMITS.login);
  if (!rl.success) {
    redirect(
      `${baseUrl()}/connexion?error=${encodeURIComponent("Trop de tentatives. Réessayez dans quelques minutes.")}`
    );
  }

  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(
      `${baseUrl()}/connexion?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Données invalides")}`
    );
  }

  const result = await signIn("credentials", {
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.password,
    redirect: false,
  });

  if (result?.error) {
    redirect(
      `${baseUrl()}/connexion?error=${encodeURIComponent("Email ou mot de passe incorrect")}`
    );
  }

  const redirectTo = (formData.get("redirect") as string | null) || "/espace-client";
  redirect(redirectTo);
};

export const handleRegister = async (formData: FormData): Promise<void> => {
  const rl = await rateLimit(AUTH_RATE_LIMITS.register);
  if (!rl.success) {
    redirect(
      `${baseUrl()}/inscription?error=${encodeURIComponent("Trop de tentatives. Réessayez dans quelques minutes.")}`
    );
  }

  const raw = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirm_password: formData.get("confirm_password") as string,
    gdpr_consent: formData.get("gdpr_consent") === "on",
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(
      `${baseUrl()}/inscription?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Données invalides")}`
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    redirect(
      `${baseUrl()}/inscription?error=${encodeURIComponent("Un compte existe déjà avec cette adresse email.")}`
    );
  }

  const password_hash = await hash(parsed.data.password, 10);
  const id = randomUUID();

  const { error } = await supabase.from("profiles").insert({
    id,
    email,
    password_hash,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    role: "client",
  });

  if (error) {
    redirect(
      `${baseUrl()}/inscription?error=${encodeURIComponent("Une erreur est survenue lors de l'inscription.")}`
    );
  }

  redirect(`${baseUrl()}/inscription?success=1`);
};

export const handleForgotPassword = async (
  formData: FormData
): Promise<void> => {
  const rl = await rateLimit(AUTH_RATE_LIMITS.forgotPassword);
  if (!rl.success) {
    redirect(
      `${baseUrl()}/mot-de-passe-oublie?error=${encodeURIComponent("Trop de tentatives. Réessayez dans quelques minutes.")}`
    );
  }

  const raw = { email: formData.get("email") as string };

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(
      `${baseUrl()}/mot-de-passe-oublie?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Données invalides")}`
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name")
    .eq("email", email)
    .is("deleted_at", null)
    .maybeSingle();

  // Always redirect with success to prevent email enumeration
  if (!profile) {
    redirect(`${baseUrl()}/mot-de-passe-oublie?success=1`);
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(
    Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
  ).toISOString();

  await supabase
    .from("profiles")
    .update({
      password_reset_token: token,
      password_reset_expires: expires,
    })
    .eq("id", profile.id);

  const resetUrl = `${baseUrl()}/reset-password?token=${token}`;

  await sendPasswordResetEmail(email, {
    client_name: profile.first_name ?? "Utilisateur",
    reset_url: resetUrl,
  });

  redirect(`${baseUrl()}/mot-de-passe-oublie?success=1`);
};

export const handleResetPassword = async (
  formData: FormData
): Promise<void> => {
  const rl = await rateLimit(AUTH_RATE_LIMITS.resetPassword);
  if (!rl.success) {
    redirect(
      `${baseUrl()}/reset-password?error=${encodeURIComponent("Trop de tentatives. Réessayez dans quelques minutes.")}`
    );
  }

  const token = formData.get("token") as string;
  const raw = {
    password: formData.get("password") as string,
    confirm_password: formData.get("confirm_password") as string,
  };

  if (!token) {
    redirect(
      `${baseUrl()}/reset-password?error=${encodeURIComponent("Lien de réinitialisation invalide.")}`
    );
  }

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(
      `${baseUrl()}/reset-password?token=${token}&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Données invalides")}`
    );
  }

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, password_reset_expires")
    .eq("password_reset_token", token)
    .is("deleted_at", null)
    .maybeSingle();

  if (!profile) {
    redirect(
      `${baseUrl()}/reset-password?error=${encodeURIComponent("Ce lien de réinitialisation est invalide ou a déjà été utilisé.")}`
    );
  }

  if (
    !profile.password_reset_expires ||
    new Date(profile.password_reset_expires) < new Date()
  ) {
    redirect(
      `${baseUrl()}/reset-password?error=${encodeURIComponent("Ce lien de réinitialisation a expiré. Veuillez en demander un nouveau.")}`
    );
  }

  const password_hash = await hash(parsed.data.password, 10);

  await supabase
    .from("profiles")
    .update({
      password_hash,
      password_reset_token: null,
      password_reset_expires: null,
    })
    .eq("id", profile.id);

  redirect(`${baseUrl()}/connexion?success=${encodeURIComponent("Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.")}`);
};

export const handleLogout = async (): Promise<void> => {
  await signOut({ redirectTo: "/" });
};
