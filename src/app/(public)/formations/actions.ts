"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/stripe/connect";
import { consultantCanSell } from "@/lib/invoicing/consultant-billing";
import {
  attachSessionToRedemption,
  confirmRedemption,
  resolvePromoForPurchase,
} from "@/lib/promo/reserve";
import { siteConfig } from "@/config/site";
import type { ActionResult } from "@/types";

/**
 * L'inscription a une formation payante est ecrite par le webhook Stripe
 * `checkout.session.completed`, livre en asynchrone. Au retour du paiement, la
 * ligne `formation_registrations` peut ne pas encore exister : cette action permet
 * a l'ilot client de sonder son apparition sans recharger toute la page.
 */
export const hasFormationRegistration = async (
  formationId: string,
): Promise<boolean> => {
  const user = await getSessionUser();
  if (!user) return false;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("formation_registrations")
    .select("id")
    .eq("formation_id", formationId)
    .eq("client_id", user.id)
    .eq("status", "registered")
    .maybeSingle();

  return Boolean(data);
};

export const registerForFormation = async (
  formationId: string,
  promoCode?: string,
): Promise<ActionResult<{ redirect_url?: string }>> => {
  const user = await getSessionUser();
  if (!user) {
    return {
      success: false,
      error: "Vous devez être connecté pour vous inscrire",
    };
  }

  const supabase = createAdminClient();

  // Check if already registered
  const { data: existing } = await supabase
    .from("formation_registrations")
    .select("id")
    .eq("client_id", user.id)
    .eq("formation_id", formationId)
    .eq("status", "registered")
    .single();

  if (existing) {
    return {
      success: false,
      error: "Vous êtes déjà inscrit(e) à cette formation",
    };
  }

  // Load formation
  const { data: formation } = await supabase
    .from("formations")
    .select(
      "id, title, description, price_cents, currency, consultant_id, is_published, max_participants, slug",
    )
    .eq("id", formationId)
    .eq("is_published", true)
    .single();

  if (!formation) {
    return { success: false, error: "Formation introuvable ou non publiée" };
  }

  // Check available spots (16-06)
  if (formation.max_participants) {
    const { count } = await supabase
      .from("formation_registrations")
      .select("*", { count: "exact", head: true })
      .eq("formation_id", formationId)
      .eq("status", "registered");

    if ((count ?? 0) >= formation.max_participants) {
      return { success: false, error: "Il n'y a plus de places disponibles" };
    }
  }

  // Free formation → direct registration
  if (formation.price_cents === 0) {
    const { error } = await supabase.from("formation_registrations").upsert(
      {
        client_id: user.id,
        formation_id: formationId,
        stripe_payment_intent_id: null,
        status: "registered",
      },
      { onConflict: "formation_id,client_id" },
    );

    if (error) {
      console.error("Free formation registration error:", error);
      return { success: false, error: "Erreur lors de l'inscription" };
    }

    return { success: true };
  }

  // Paid formation → Stripe Checkout
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

  // Pas de vente en ligne sans pouvoir facturer (voir consultant-billing).
  if (!(await consultantCanSell(supabase, formation.consultant_id))) {
    return {
      success: false,
      error:
        "L'inscription en ligne est momentanément indisponible pour cet " +
        "formation.",
    };
  }

  const promo = promoCode?.trim()
    ? await resolvePromoForPurchase({
        code: promoCode,
        serviceKind: "formation",
        itemId: formation.id,
        amountCents: formation.price_cents,
        profileId: user.id,
        reserve: true,
        orderKind: "formation",
        referenceId: formation.id,
      })
    : null;

  if (promo && !promo.ok) {
    return { success: false, error: promo.error };
  }

  const chargedCents = promo?.ok ? promo.finalCents : formation.price_cents;

  // Remise totale : Stripe refuse une session a zero, et il n'y a rien a
  // encaisser. Meme traitement que la formation gratuite, plus haut.
  if (chargedCents === 0) {
    const { error } = await supabase.from("formation_registrations").upsert(
      {
        client_id: user.id,
        formation_id: formationId,
        stripe_payment_intent_id: null,
        status: "registered",
      },
      { onConflict: "formation_id,client_id" },
    );

    if (error) {
      console.error("Registration error (remise totale):", error);
      return { success: false, error: "Erreur lors de l'inscription" };
    }

    if (promo?.ok && promo.redemptionId) {
      await confirmRedemption(promo.redemptionId, null);
    }

    return { success: true };
  }

  try {
    const session = await createCheckoutSession({
      consultantStripeAccountId: consultant.stripe_account_id,
      commissionRate: consultant.commission_rate,
      priceInCents: chargedCents,
      currency: formation.currency,
      productName: formation.title,
      productDescription: formation.description ?? undefined,
      customerEmail: user.email,
      metadata: {
        type: "formation",
        reference_id: formation.id,
        client_id: user.id,
        consultant_id: formation.consultant_id,
        platform_fee_cents: Math.round(
          chargedCents * (consultant.commission_rate / 100),
        ).toString(),
        ...(promo?.ok
          ? {
              promo_code: promo.code,
              promo_code_id: promo.promoCodeId,
              promo_redemption_id: promo.redemptionId as string,
              discount_cents: promo.discountCents.toString(),
              original_price_cents: formation.price_cents.toString(),
            }
          : {}),
      },
      successUrl: `${siteConfig.url}/formations/${formation.slug}?registered=true`,
      cancelUrl: `${siteConfig.url}/formations/${formation.slug}?cancelled=true`,
    });

    if (promo?.ok && promo.redemptionId) {
      await attachSessionToRedemption(promo.redemptionId, session.id);
    }

    return {
      success: true,
      data: { redirect_url: session.url ?? "" },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Stripe";
    return { success: false, error: `Erreur paiement : ${message}` };
  }
};
