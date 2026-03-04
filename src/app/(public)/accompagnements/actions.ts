"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/stripe/connect";
import { siteConfig } from "@/config/site";
import type { ActionResult } from "@/types";

export const purchaseFormation = async (
  formationId: string,
): Promise<ActionResult<{ redirect_url: string }>> => {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté pour acheter" };
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("formation_enrollments")
    .select("id")
    .eq("client_id", user.id)
    .eq("formation_id", formationId)
    .single();

  if (existing) {
    return {
      success: false,
      error: "Vous êtes déjà inscrit à cette formation",
    };
  }

  const { data: formation } = await supabase
    .from("formations")
    .select(
      "id, title, short_description, price_cents, currency, consultant_id, status",
    )
    .eq("id", formationId)
    .eq("status", "published")
    .is("deleted_at", null)
    .single();

  if (!formation) {
    return { success: false, error: "Formation introuvable" };
  }

  const { data: consultant } = await supabase
    .from("consultants")
    .select("stripe_account_id, commission_rate")
    .eq("id", formation.consultant_id)
    .single();

  if (!consultant?.stripe_account_id) {
    return {
      success: false,
      error: "Le paiement n'est pas disponible pour cette formation",
    };
  }

  try {
    const session = await createCheckoutSession({
      consultantStripeAccountId: consultant.stripe_account_id,
      commissionRate: consultant.commission_rate,
      priceInCents: formation.price_cents,
      currency: formation.currency,
      productName: formation.title,
      productDescription: formation.short_description ?? undefined,
      customerEmail: user.email,
      metadata: {
        type: "formation",
        reference_id: formation.id,
        client_id: user.id,
        consultant_id: formation.consultant_id,
        platform_fee_cents: Math.round(
          formation.price_cents * (consultant.commission_rate / 100),
        ).toString(),
      },
      successUrl: `${siteConfig.url}/espace-client/formations?purchased=${formation.id}`,
      cancelUrl: `${siteConfig.url}/accompagnements/${formationId}?cancelled=true`,
    });

    return {
      success: true,
      data: { redirect_url: session.url ?? "" },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Stripe";
    return { success: false, error: `Erreur paiement : ${message}` };
  }
};
