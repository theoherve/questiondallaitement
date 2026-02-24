"use server";

import { hash } from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
} from "@/validations/auth";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

const baseUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const handleLogin = async (formData: FormData): Promise<void> => {
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
  const raw = { email: formData.get("email") as string };

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(
      `${baseUrl()}/mot-de-passe-oublie?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Données invalides")}`
    );
  }

  // TODO: implement reset flow (send email with token, page to set new password, update password_hash in profiles)
  redirect(`${baseUrl()}/mot-de-passe-oublie?success=1`);
};

export const handleLogout = async (): Promise<void> => {
  await signOut({ redirectTo: "/" });
};
