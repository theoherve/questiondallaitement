"use server";

import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
} from "@/validations/auth";
import { redirect } from "next/navigation";

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        role: "client",
      },
      emailRedirectTo: `${baseUrl()}/api/auth/callback`,
    },
  });

  if (error) {
    const message = error.message.includes("already registered")
      ? "Un compte existe déjà avec cette adresse email"
      : "Une erreur est survenue lors de l'inscription";
    redirect(`${baseUrl()}/inscription?error=${encodeURIComponent(message)}`);
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

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${baseUrl()}/api/auth/callback?next=/mot-de-passe-oublie/reset`,
    }
  );

  if (error) {
    redirect(
      `${baseUrl()}/mot-de-passe-oublie?error=${encodeURIComponent("Une erreur est survenue")}`
    );
  }

  redirect(`${baseUrl()}/mot-de-passe-oublie?success=1`);
};

export const handleLogout = async (): Promise<void> => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
};
