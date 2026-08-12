"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/stripe/connect";
import {
  routeSale,
  isPlatformOwnerConsultant,
} from "@/lib/stripe/sale-routing";
import { consultantCanSell } from "@/lib/invoicing/consultant-billing";
import { siteConfig } from "@/config/site";
import type { ActionResult } from "@/types";

const PREDEFINED_AMOUNTS_CENTS = [9000, 13000, 17000];

export type PurchaseGiftCardInput = {
  type: "amount" | "service";
  amountCents?: number;
  consultationTypeId?: string;
  buyerName: string;
  buyerEmail: string;
  beneficiaryName?: string;
  beneficiaryEmail?: string;
  personalMessage?: string;
  deliveryMode: "email" | "pdf";
};

export const purchaseGiftCard = async (
  input: PurchaseGiftCardInput,
): Promise<ActionResult<{ checkoutUrl: string }>> => {
  if (input.type === "amount") {
    if (!input.amountCents || !PREDEFINED_AMOUNTS_CENTS.includes(input.amountCents)) {
      return { success: false, error: "Montant invalide." };
    }
  } else {
    if (!input.consultationTypeId) {
      return { success: false, error: "Prestation manquante." };
    }
  }

  const supabase = createAdminClient();
  // Site solo-praticienne : une seule consultante active.
  const { data: consultant } = await supabase
    .from("consultants")
    .select("id, stripe_account_id, commission_rate")
    .eq("is_active", true)
    .maybeSingle();

  if (!consultant) {
    return { success: false, error: "Praticienne introuvable." };
  }

  const priceInCents =
    input.type === "amount"
      ? input.amountCents!
      : await getConsultationTypePrice(supabase, input.consultationTypeId!);

  if (priceInCents == null) {
    return { success: false, error: "Prestation introuvable." };
  }

  // Ou vont les fonds : chez la consultante, ou sur la plateforme quand
  // c'est sa proprietaire qui vend (voir sale-routing.ts).
  const isPlatformOwner = await isPlatformOwnerConsultant(supabase, consultant.id);

  const routing = routeSale({
    isPlatformOwner,
    stripeAccountId: consultant.stripe_account_id,
    commissionRate: consultant.commission_rate,
    hasCollaborators: false,
  });

  if (!routing) {
    return { success: false, error: "La consultante n'a pas configuré son compte Stripe" };
  }

  // Pas de vente en ligne sans pouvoir facturer : la facture est emise a
  // l'encaissement, et une facture sans les mentions obligatoires de
  // l'emettrice n'a aucune valeur. On refuse plutot que d'encaisser sans
  // pouvoir facturer.
  if (!(await consultantCanSell(supabase, consultant.id))) {
    return {
      success: false,
      error:
        "La consultante n'a pas complété ses informations de facturation. " +
        "L'achat de carte cadeau est momentanément indisponible.",
    };
  }

  const session = await createCheckoutSession({
    consultantStripeAccountId: routing.destinationAccountId ?? undefined,
    holdOnPlatform: routing.holdOnPlatform,
    commissionRate: routing.commissionRate,
    priceInCents,
    currency: "eur",
    productName: "Carte cadeau",
    customerEmail: input.buyerEmail,
    metadata: {
      type: "gift_card",
      gift_card_type: input.type,
      ...(input.type === "amount"
        ? { gift_card_amount_cents: String(input.amountCents) }
        : { consultation_type_id: input.consultationTypeId! }),
      consultant_id: consultant.id,
      buyer_name: input.buyerName,
      buyer_email: input.buyerEmail,
      ...(input.beneficiaryName ? { beneficiary_name: input.beneficiaryName } : {}),
      ...(input.beneficiaryEmail ? { beneficiary_email: input.beneficiaryEmail } : {}),
      ...(input.personalMessage ? { personal_message: input.personalMessage } : {}),
      delivery_mode: input.deliveryMode,
    },
    successUrl: `${siteConfig.url}/cartes-cadeaux/confirmation`,
    cancelUrl: `${siteConfig.url}/cartes-cadeaux`,
  });

  if (!session.url) {
    return { success: false, error: "Impossible de créer la session de paiement." };
  }

  return { success: true, data: { checkoutUrl: session.url } };
};

const getConsultationTypePrice = async (
  supabase: ReturnType<typeof createAdminClient>,
  consultationTypeId: string,
): Promise<number | null> => {
  const { data } = await supabase
    .from("consultation_types")
    .select("price_cents")
    .eq("id", consultationTypeId)
    .maybeSingle();
  return data?.price_cents ?? null;
};
