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
 * L'inscription a un evenement payant est ecrite par le webhook Stripe
 * `checkout.session.completed`, livre en asynchrone. Au retour du paiement, la
 * ligne `event_registrations` peut ne pas encore exister : cette action permet
 * a l'ilot client de sonder son apparition sans recharger toute la page.
 */
export const hasEventRegistration = async (
  eventId: string,
): Promise<boolean> => {
  const user = await getSessionUser();
  if (!user) return false;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("event_registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("client_id", user.id)
    .eq("status", "registered")
    .maybeSingle();

  return Boolean(data);
};

export const registerForEvent = async (
  eventId: string,
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
    .from("event_registrations")
    .select("id")
    .eq("client_id", user.id)
    .eq("event_id", eventId)
    .eq("status", "registered")
    .single();

  if (existing) {
    return {
      success: false,
      error: "Vous êtes déjà inscrit(e) à cet événement",
    };
  }

  // Load event
  const { data: event } = await supabase
    .from("events")
    .select(
      "id, title, description, price_cents, currency, consultant_id, is_published, max_participants, slug",
    )
    .eq("id", eventId)
    .eq("is_published", true)
    .single();

  if (!event) {
    return { success: false, error: "Événement introuvable ou non publié" };
  }

  // Check available spots (16-06)
  if (event.max_participants) {
    const { count } = await supabase
      .from("event_registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "registered");

    if ((count ?? 0) >= event.max_participants) {
      return { success: false, error: "Il n'y a plus de places disponibles" };
    }
  }

  // Free event → direct registration
  if (event.price_cents === 0) {
    const { error } = await supabase.from("event_registrations").upsert(
      {
        client_id: user.id,
        event_id: eventId,
        stripe_payment_intent_id: null,
        status: "registered",
      },
      { onConflict: "event_id,client_id" },
    );

    if (error) {
      console.error("Free event registration error:", error);
      return { success: false, error: "Erreur lors de l'inscription" };
    }

    return { success: true };
  }

  // Paid event → Stripe Checkout
  const { data: consultant } = await supabase
    .from("consultants")
    .select("stripe_account_id, commission_rate")
    .eq("id", event.consultant_id)
    .single();

  if (!consultant?.stripe_account_id) {
    return {
      success: false,
      error: "Le paiement n'est pas disponible pour cet événement",
    };
  }

  // Pas de vente en ligne sans pouvoir facturer (voir consultant-billing).
  if (!(await consultantCanSell(supabase, event.consultant_id))) {
    return {
      success: false,
      error:
        "L'inscription en ligne est momentanément indisponible pour cet " +
        "événement.",
    };
  }

  const promo = promoCode?.trim()
    ? await resolvePromoForPurchase({
        code: promoCode,
        serviceKind: "event",
        itemId: event.id,
        amountCents: event.price_cents,
        profileId: user.id,
        reserve: true,
        orderKind: "event",
        referenceId: event.id,
      })
    : null;

  if (promo && !promo.ok) {
    return { success: false, error: promo.error };
  }

  const chargedCents = promo?.ok ? promo.finalCents : event.price_cents;

  // Remise totale : Stripe refuse une session a zero, et il n'y a rien a
  // encaisser. Meme traitement que l'evenement gratuit, plus haut.
  if (chargedCents === 0) {
    const { error } = await supabase.from("event_registrations").upsert(
      {
        client_id: user.id,
        event_id: eventId,
        stripe_payment_intent_id: null,
        status: "registered",
      },
      { onConflict: "event_id,client_id" },
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
      currency: event.currency,
      productName: event.title,
      productDescription: event.description ?? undefined,
      customerEmail: user.email,
      metadata: {
        type: "event",
        reference_id: event.id,
        client_id: user.id,
        consultant_id: event.consultant_id,
        platform_fee_cents: Math.round(
          chargedCents * (consultant.commission_rate / 100),
        ).toString(),
        ...(promo?.ok
          ? {
              promo_code: promo.code,
              promo_code_id: promo.promoCodeId,
              promo_redemption_id: promo.redemptionId as string,
              discount_cents: promo.discountCents.toString(),
              original_price_cents: event.price_cents.toString(),
            }
          : {}),
      },
      successUrl: `${siteConfig.url}/formations/${event.slug}?registered=true`,
      cancelUrl: `${siteConfig.url}/formations/${event.slug}?cancelled=true`,
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
