import { NextResponse } from "next/server";
import { getSessionUser, hasAnyRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createConnectAccount, createAccountLink } from "@/lib/stripe/connect";
import type { UserRole } from "@/types/database";

/** Roles autorises a ouvrir ou reprendre un onboarding Stripe Connect. */
const ONBOARDING_ROLES: UserRole[] = ["consultant", "consultant_limited"];

export const GET = async () => {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // La ligne `consultants` peut survivre a une retrogradation : se contenter
  // de la trouver reviendrait a rouvrir un onboarding de paiement a quelqu'un
  // qui n'est plus consultante.
  if (!hasAnyRole(user, ONBOARDING_ROLES)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Lue avant tout appel a Stripe : sans elle, les URL de retour deviennent
  // « undefined/espace-consultante… » et Stripe les rejette avec un message
  // sans rapport avec la cause reelle.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error("[stripe/connect] NEXT_PUBLIC_APP_URL n'est pas defini");
    return NextResponse.json(
      { error: "Configuration incomplète du serveur" },
      { status: 500 },
    );
  }

  const supabase = createAdminClient();
  const { data: consultant } = await supabase
    .from("consultants")
    .select("id, stripe_account_id")
    .eq("id", user.id)
    .single();

  if (!consultant) {
    return NextResponse.json(
      { error: "Consultante non trouvée" },
      { status: 404 },
    );
  }

  try {
    let accountId = consultant.stripe_account_id;

    // `createConnectAccount` enregistre l'identifiant sur la fiche : sans cette
    // reprise, chaque passage creerait un compte Express de plus.
    if (!accountId) {
      const account = await createConnectAccount(user.id, user.email);
      accountId = account.id;
    }

    const accountLink = await createAccountLink(
      accountId,
      `${appUrl}/espace-consultante/parametres?stripe=refresh`,
      `${appUrl}/espace-consultante/parametres?stripe=success`,
    );

    return NextResponse.redirect(accountLink.url);
  } catch (err) {
    // Sans capture, l'exception remonte en page d'erreur 500 : la consultante
    // clique sur « connecter mon compte » et tombe sur un ecran illisible,
    // sans rien a rapporter.
    console.error("[stripe/connect]", err);
    return NextResponse.json(
      { error: "Stripe est momentanément indisponible. Réessayez." },
      { status: 502 },
    );
  }
};
