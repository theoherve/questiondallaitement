"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/stripe/connect";
import { consultantCanSell } from "@/lib/invoicing/consultant-billing";
import { siteConfig } from "@/config/site";
import type { ActionResult } from "@/types";

export const registerForEvent = async (
  eventId: string,
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

  try {
    const session = await createCheckoutSession({
      consultantStripeAccountId: consultant.stripe_account_id,
      commissionRate: consultant.commission_rate,
      priceInCents: event.price_cents,
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
          event.price_cents * (consultant.commission_rate / 100),
        ).toString(),
      },
      successUrl: `${siteConfig.url}/formations/${event.slug}?registered=true`,
      cancelUrl: `${siteConfig.url}/formations/${event.slug}?cancelled=true`,
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
