"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/stripe/connect";
import {
  routeSale,
  isPlatformOwnerConsultant,
} from "@/lib/stripe/sale-routing";
import { consultantCanSell } from "@/lib/invoicing/consultant-billing";
import {
  attachSessionToRedemption,
  resolvePromoForPurchase,
} from "@/lib/promo/reserve";
import { siteConfig } from "@/config/site";
import type { ActionResult } from "@/types";

export const purchaseFormation = async (
  formationId: string,
  promoCode?: string,
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
      error: "Vous êtes déjà inscrit à cet accompagnement",
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
    return { success: false, error: "Accompagnement introuvable" };
  }

  const { data: consultant } = await supabase
    .from("consultants")
    .select("stripe_account_id, commission_rate")
    .eq("id", formation.consultant_id)
    .single();


  // Une vente a partager ne peut pas etre versee directement a la
  // proprietaire : la plateforme n'aurait plus les fonds pour payer les
  // collaboratrices, et le virement echouerait en `balance_insufficient`.
  // Elle est donc encaissee par la plateforme, qui repartit ensuite chaque
  // part en citant la charge source (voir distributeFormationRevenue).
  const { count: collaboratorCount } = await supabase
    .from("formation_collaborators")
    .select("consultant_id", { count: "exact", head: true })
    .eq("formation_id", formation.id);

  const hasCollaborators = (collaboratorCount ?? 0) > 0;

  // Ou vont les fonds : chez la consultante, sur la plateforme le temps d'etre
  // repartis, ou sur la plateforme definitivement quand c'est sa proprietaire
  // qui vend (voir sale-routing.ts).
  const isPlatformOwner = await isPlatformOwnerConsultant(
    supabase,
    formation.consultant_id,
  );

  const routing = consultant
    ? routeSale({
        isPlatformOwner,
        stripeAccountId: consultant.stripe_account_id,
        commissionRate: consultant.commission_rate,
        hasCollaborators,
      })
    : null;

  if (!routing) {
    return {
      success: false,
      error: "Le paiement n'est pas disponible pour cet accompagnement",
    };
  }

  // Pas de vente en ligne sans pouvoir facturer (voir consultant-billing).
  if (!(await consultantCanSell(supabase, formation.consultant_id))) {
    return {
      success: false,
      error:
        "L'achat en ligne est momentanément indisponible pour cet " +
        "accompagnement.",
    };
  }

  // La remise est resolue cote serveur, jamais transmise par le client : une
  // server action est un endpoint POST, appelable sans passer par l'interface.
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

  try {
    const session = await createCheckoutSession({
      holdOnPlatform: routing.holdOnPlatform,
      consultantStripeAccountId: routing.destinationAccountId ?? undefined,
      commissionRate: routing.commissionRate,
      priceInCents: chargedCents,
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
          chargedCents * (routing.commissionRate / 100),
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
      successUrl: `${siteConfig.url}/espace-client/accompagnements?purchased=${formation.id}`,
      cancelUrl: `${siteConfig.url}/accompagnements/${formationId}?cancelled=true`,
    });

    // Rattache la reservation a la session : c'est le lien qui permet de
    // l'annuler si la cliente abandonne le tunnel.
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
