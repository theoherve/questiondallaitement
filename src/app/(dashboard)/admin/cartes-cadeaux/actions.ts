"use server";

import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertGiftCardWithUniqueCode } from "@/lib/gift-cards/code";
import {
  sendGiftCardPurchaseEmails,
  sendGiftCardRefundConfirmationEmail,
} from "@/lib/gift-cards/emails";
import { findOrCreateGuestProfile } from "@/lib/auth/guest-profile";
import { STANDARD_VAT_RATE } from "@/lib/invoicing/vat";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) {
    redirect("/connexion");
  }
  return user;
};

/** Une utilisation de la carte, pour l'historique affiche dans la liste. */
export type GiftCardRedemptionItem = {
  amountCents: number;
  redeemedAt: string;
};

export type GiftCardListItem = {
  id: string;
  code: string;
  type: "amount" | "service";
  /**
   * Statut d'affichage, et non la valeur brute de l'enum. `expired` n'est
   * jamais ecrit en base : il se deduit de `expires_at`. Sans ce calcul, une
   * carte perimee restait affichee « active » a vie dans le back-office, alors
   * que `redeem_gift_card()` la refuse deja.
   */
  status: "active" | "used" | "cancelled" | "expired";
  balanceCents: number | null;
  buyerName: string;
  issuedAt: string;
  expiresAt: string;
  closedReason: "refunded" | "replaced" | null;
  createdBy: "purchase" | "manual";
  redemptions: GiftCardRedemptionItem[];
};

export const listGiftCards = async (): Promise<ActionResult<GiftCardListItem[]>> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("gift_cards")
    .select(
      "id, code, type, status, initial_amount_cents, buyer_name, issued_at, expires_at, closed_reason, created_by, gift_card_redemptions(amount_cents, redeemed_at)",
    )
    .order("issued_at", { ascending: false });

  if (error || !data) {
    return { success: false, error: "Impossible de charger les cartes cadeaux." };
  }

  const now = Date.now();

  const items: GiftCardListItem[] = data.map((row) => {
    const redemptions =
      (row.gift_card_redemptions as
        | { amount_cents: number; redeemed_at: string }[]
        | null) ?? [];
    const used = redemptions.reduce((sum, r) => sum + r.amount_cents, 0);

    return {
      id: row.id,
      code: row.code,
      type: row.type,
      status:
        row.status === "active" && new Date(row.expires_at).getTime() < now
          ? "expired"
          : row.status,
      balanceCents: row.type === "amount" ? row.initial_amount_cents - used : null,
      buyerName: row.buyer_name,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      closedReason: row.closed_reason ?? null,
      createdBy: row.created_by,
      redemptions: redemptions
        .map((r) => ({ amountCents: r.amount_cents, redeemedAt: r.redeemed_at }))
        .sort((a, b) => a.redeemedAt.localeCompare(b.redeemedAt)),
    };
  });

  return { success: true, data: items };
};

export const issueGiftCardManually = async (input: {
  type: "amount" | "service";
  amountCents?: number;
  consultationTypeId?: string;
  buyerName: string;
  buyerEmail: string;
  beneficiaryName?: string;
  beneficiaryEmail?: string;
  personalMessage?: string;
  deliveryMode: "email" | "pdf";
}): Promise<ActionResult<{ giftCardId: string; code: string }>> => {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  // Site solo-praticienne : une seule consultante active.
  const { data: consultant } = await supabase
    .from("consultants")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (!consultant) {
    return { success: false, error: "Praticienne introuvable." };
  }

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt);
  expiresAt.setMonth(expiresAt.getMonth() + 12);

  const card = await insertGiftCardWithUniqueCode(supabase, (code) => ({
    code,
    type: input.type,
    initial_amount_cents: input.type === "amount" ? input.amountCents : null,
    consultation_type_id: input.type === "service" ? input.consultationTypeId : null,
    consultant_id: consultant.id,
    buyer_name: input.buyerName,
    buyer_email: input.buyerEmail,
    beneficiary_name: input.beneficiaryName ?? null,
    beneficiary_email: input.beneficiaryEmail ?? null,
    personal_message: input.personalMessage ?? null,
    delivery_mode: input.deliveryMode,
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    created_by: "manual",
    created_by_admin_id: admin.id,
  }));

  // Facture a 0 € (design §4) : une carte offerte en geste commercial reste une
  // piece a tracer. Les deux effets qui suivent sont non bloquants — la carte
  // existe et est utilisable ; une facture ou un email manquants se rattrapent
  // a la main, alors qu'une carte non creee ne se rattrape pas.
  const warnings: string[] = [];

  const invoiceIssue = await emitZeroAmountInvoice(supabase, {
    consultantId: consultant.id,
    buyerName: input.buyerName,
    buyerEmail: input.buyerEmail,
    code: card.code,
  });
  if (invoiceIssue) warnings.push(invoiceIssue);

  const consultantName = await resolveConsultantName(supabase, consultant.id);
  const consultationPriceCents =
    input.type === "service" && input.consultationTypeId
      ? await getConsultationTypePrice(supabase, input.consultationTypeId)
      : null;
  const faceValueCents =
    input.type === "amount" ? (input.amountCents ?? null) : consultationPriceCents;

  try {
    await sendGiftCardPurchaseEmails({
      code: card.code,
      typeLabel:
        input.type === "amount" ? "Carte cadeau" : "Carte cadeau — prestation offerte",
      amountLabel:
        input.type === "amount" && input.amountCents != null
          ? formatEuros(input.amountCents)
          : null,
      expiresAtLabel: new Date(card.expires_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      buyerName: input.buyerName,
      buyerEmail: input.buyerEmail,
      beneficiaryName: input.beneficiaryName ?? null,
      beneficiaryEmail: input.beneficiaryEmail ?? null,
      personalMessage: input.personalMessage ?? null,
      deliveryMode: input.deliveryMode,
      consultantName,
    });
  } catch (err) {
    console.error("[issueGiftCardManually] envoi de la carte", err);
    await supabase.from("audit_logs").insert({
      user_id: admin.id,
      action: "gift_card_delivery_failed",
      entity_type: "gift_card",
      entity_id: card.id,
      metadata: {
        code: card.code,
        delivery_mode: input.deliveryMode,
        error: err instanceof Error ? err.message : "Unknown error",
      },
    });
    warnings.push("l'email de remise n'a pas pu être envoyé");
  }

  // Valeur nominale tracee, meme quand la facture est a 0 : sans elle, rien
  // dans les journaux ne dit ce que le geste commercial a coute.
  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: "gift_card_issued_manually",
    entity_type: "gift_card",
    entity_id: card.id,
    metadata: {
      code: card.code,
      type: input.type,
      face_value_cents: faceValueCents,
    },
  });

  revalidatePath("/admin/cartes-cadeaux");

  return {
    success: true,
    data: { giftCardId: card.id, code: card.code },
    ...(warnings.length > 0
      ? { warning: `Carte créée, mais ${warnings.join(" et ")}.` }
      : {}),
  };
};

/**
 * Emet la facture a 0 € qui trace l'emission manuelle.
 *
 * Appelle `create_manual_invoice` directement plutot que la server action
 * `createManualInvoice` : celle-ci exige une relation cliente existante
 * (`hasClientRelationship`), ce que la beneficiaire d'un geste commercial n'a
 * justement pas encore. Le payload est le meme, a la numerotation pres, qui
 * reste celle de la sequence partagee.
 *
 * Renvoie `undefined` en cas de succes, sinon le libelle de l'echec.
 */
const emitZeroAmountInvoice = async (
  supabase: ReturnType<typeof createAdminClient>,
  input: {
    consultantId: string;
    buyerName: string;
    buyerEmail: string;
    code: string;
  },
): Promise<string | undefined> => {
  const { data: consultant } = await supabase
    .from("consultants")
    .select(
      "billing_legal_name, billing_address, billing_siren, billing_vat_number, billing_legal_form, billing_iban, billing_bic",
    )
    .eq("id", input.consultantId)
    .maybeSingle();

  if (!consultant?.billing_legal_name) {
    return "la facture n'a pas été émise (informations de facturation incomplètes)";
  }

  // Un `client_id` est obligatoire sur `invoices` : la beneficiaire d'un geste
  // commercial n'a pas forcement de compte, on le cree en invitee comme le fait
  // l'achat en ligne.
  const guest = await findOrCreateGuestProfile(supabase, {
    email: input.buyerEmail,
    first_name: input.buyerName,
    last_name: null,
    phone: null,
  });

  if (!guest.success) {
    return "la facture n'a pas été émise (profil bénéficiaire introuvable)";
  }

  const { error } = await supabase.rpc("create_manual_invoice", {
    p_content: {
      consultant_id: input.consultantId,
      client_id: guest.id,
      due_date: null,
      currency: "eur",
      vat_rate: STANDARD_VAT_RATE,
      amount_ttc_cents: 0,
      amount_ht_cents: 0,
      amount_vat_cents: 0,
      description: `Carte cadeau ${input.code} — émise à titre gracieux`,
      client_name: input.buyerName,
      client_email: input.buyerEmail,
      issuer_legal_name: consultant.billing_legal_name,
      issuer_address: consultant.billing_address,
      issuer_siren: consultant.billing_siren,
      issuer_vat_number: consultant.billing_vat_number,
      issuer_legal_form: consultant.billing_legal_form,
      issuer_iban: consultant.billing_iban,
      issuer_bic: consultant.billing_bic,
    },
  });

  if (error) {
    console.error("[issueGiftCardManually] facture", error);
    return "la facture n'a pas été émise";
  }

  return undefined;
};

const resolveConsultantName = async (
  supabase: ReturnType<typeof createAdminClient>,
  consultantId: string,
): Promise<string> => {
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", consultantId)
    .maybeSingle();

  if (!data) return "";
  return `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim();
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

/** Types de consultation proposables a l'emission d'une carte « prestation ». */
export const listConsultationTypesForGiftCards = async (): Promise<
  ActionResult<{ id: string; title: string; priceCents: number }[]>
> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("consultation_types")
    .select("id, title, price_cents")
    .eq("is_active", true)
    .order("title");

  if (error || !data) {
    return { success: false, error: "Impossible de charger les prestations." };
  }

  return {
    success: true,
    data: data.map((row) => ({
      id: row.id,
      title: row.title,
      priceCents: row.price_cents,
    })),
  };
};

const REFUND_WINDOW_DAYS = 90;

type EligibleExpiredCard = {
  id: string;
  code: string;
  type: "amount" | "service";
  initial_amount_cents: number | null;
  consultation_type_id: string | null;
  buyer_name: string;
  buyer_email: string;
  beneficiary_name: string | null;
  beneficiary_email: string | null;
  consultant_id: string;
  created_by: "purchase" | "manual";
};

/**
 * Charge une carte et verifie son eligibilite a la procedure post-expiration
 * (§7.6 Exception 2). Le statut stocke reste 'active' pour une carte perimee
 * (voir `listGiftCards` : 'expired' est un statut d'affichage, jamais ecrit
 * en base) — l'expiration reelle se lit sur `expires_at`, jamais sur
 * `status`.
 */
const loadEligibleExpiredCard = async (
  supabase: ReturnType<typeof createAdminClient>,
  giftCardId: string,
): Promise<{ ok: true; giftCard: EligibleExpiredCard } | { ok: false; error: string }> => {
  const { data: card } = await supabase
    .from("gift_cards")
    .select(
      "id, code, type, status, expires_at, initial_amount_cents, consultation_type_id, buyer_name, buyer_email, beneficiary_name, beneficiary_email, consultant_id, closed_reason, created_by",
    )
    .eq("id", giftCardId)
    .maybeSingle();

  if (!card) return { ok: false, error: "Carte cadeau introuvable." };
  if (card.closed_reason) return { ok: false, error: "Cette carte a déjà été traitée." };
  if (card.status !== "active") {
    return { ok: false, error: "Cette carte n'est plus disponible pour cette procédure." };
  }
  if (new Date(card.expires_at) >= new Date()) {
    return { ok: false, error: "Cette carte n'est pas expirée." };
  }

  const windowEnd = new Date(card.expires_at);
  windowEnd.setDate(windowEnd.getDate() + REFUND_WINDOW_DAYS);
  if (windowEnd < new Date()) {
    return {
      ok: false,
      error: "Le délai de recours de 90 jours après expiration est dépassé.",
    };
  }

  return { ok: true, giftCard: card };
};

/**
 * Remboursement exceptionnel apres expiration (§7.6 Exception 2). Aucun
 * appel Stripe : Carole effectue le virement elle-meme avec l'IBAN/BIC recu
 * par email, hors app — la fenetre de remboursement Stripe/reseau carte est
 * souvent deja fermee a 12 mois + 90 jours. Cette action se contente de
 * tracer la decision.
 */
export const refundExpiredGiftCard = async (input: {
  giftCardId: string;
  note: string;
}): Promise<ActionResult> => {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const loaded = await loadEligibleExpiredCard(supabase, input.giftCardId);
  if (!loaded.ok) return { success: false, error: loaded.error };

  // Une carte emise a titre gracieux (promotion, jeu, geste commercial —
  // `created_by === 'manual'`) n'a jamais ete payee : la rembourser
  // reviendrait a verser de l'argent reel pour un solde qui n'en a jamais
  // coute. La prolongation reste en revanche autorisee pour ces cartes,
  // c'est ce guard qui les distingue (§07 module cartes cadeaux, ligne 68).
  if (loaded.giftCard.created_by !== "purchase") {
    return {
      success: false,
      error: "Une carte offerte à titre gracieux n'est pas remboursable.",
    };
  }

  const closedAt = new Date().toISOString();
  const { error } = await supabase
    .from("gift_cards")
    .update({
      status: "cancelled",
      closed_reason: "refunded",
      closed_at: closedAt,
      closed_note: input.note,
    })
    .eq("id", loaded.giftCard.id)
    .is("closed_reason", null);

  if (error) {
    console.error("[refundExpiredGiftCard]", error);
    return { success: false, error: "Le remboursement n'a pas pu être enregistré." };
  }

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: "gift_card_refunded_after_expiry",
    entity_type: "gift_card",
    entity_id: loaded.giftCard.id,
    metadata: { code: loaded.giftCard.code, note: input.note },
  });

  // Confirmation non bloquante (design §69) : la beneficiaire (ou l'acheteuse,
  // faute de beneficiaire) doit savoir que sa carte est desormais close. Un
  // echec d'envoi ne doit pas remettre en cause la cloture qui vient d'etre
  // enregistree.
  try {
    await sendGiftCardRefundConfirmationEmail({
      code: loaded.giftCard.code,
      recipientName: loaded.giftCard.beneficiary_name ?? loaded.giftCard.buyer_name,
      recipientEmail: loaded.giftCard.beneficiary_email ?? loaded.giftCard.buyer_email,
    });
  } catch (err) {
    console.error("[refundExpiredGiftCard] envoi email", err);
  }

  revalidatePath("/admin/cartes-cadeaux");
  return { success: true };
};

const REPLACEMENT_VALIDITY_MONTHS = 9;

/**
 * Prolongation (§7.6 Exception 2) : emet une carte de remplacement valable
 * 9 mois pour le solde restant de la carte expiree, puis cloture
 * l'originale. Pas de nouvelle facture — l'achat d'origine a deja ete
 * facture ; ce n'est pas un nouveau geste commercial mais la continuation
 * du meme.
 */
export const replaceExpiredGiftCard = async (input: {
  giftCardId: string;
  note: string;
}): Promise<ActionResult<{ newGiftCardId: string; code: string }>> => {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const loaded = await loadEligibleExpiredCard(supabase, input.giftCardId);
  if (!loaded.ok) return { success: false, error: loaded.error };
  const original = loaded.giftCard;

  let remainingAmountCents: number | null = null;
  if (original.type === "amount") {
    const { data: redemptions } = await supabase
      .from("gift_card_redemptions")
      .select("amount_cents")
      .eq("gift_card_id", original.id);
    const used = (redemptions ?? []).reduce(
      (sum: number, r: { amount_cents: number }) => sum + r.amount_cents,
      0,
    );
    remainingAmountCents = (original.initial_amount_cents ?? 0) - used;
    if (remainingAmountCents <= 0) {
      return { success: false, error: "Cette carte n'a plus de solde à reporter." };
    }
  }

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt);
  expiresAt.setMonth(expiresAt.getMonth() + REPLACEMENT_VALIDITY_MONTHS);

  const replacement = await insertGiftCardWithUniqueCode(supabase, (code) => ({
    code,
    type: original.type,
    initial_amount_cents: remainingAmountCents,
    consultation_type_id: original.type === "service" ? original.consultation_type_id : null,
    consultant_id: original.consultant_id,
    buyer_name: original.buyer_name,
    buyer_email: original.buyer_email,
    beneficiary_name: original.beneficiary_name,
    beneficiary_email: original.beneficiary_email,
    personal_message: null,
    delivery_mode: "email",
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    created_by: "manual",
    created_by_admin_id: admin.id,
    replaces_gift_card_id: original.id,
  }));

  const { error: closeError } = await supabase
    .from("gift_cards")
    .update({
      status: "cancelled",
      closed_reason: "replaced",
      closed_at: issuedAt.toISOString(),
      closed_note: input.note,
    })
    .eq("id", original.id)
    .is("closed_reason", null);

  if (closeError) {
    console.error("[replaceExpiredGiftCard] cloture carte d'origine", closeError);

    // A ce stade, le remplacement existe deja en base : sans compensation,
    // l'ancienne carte resterait active en pratique — deux cartes actives
    // pour le meme solde, un risque de double depense. Pas de transaction
    // disponible ici (aucune RPC ad hoc pour ces deux ecritures), donc on
    // annule a la main la carte de remplacement qui vient d'etre creee.
    const { error: cleanupError } = await supabase
      .from("gift_cards")
      .delete()
      .eq("id", replacement.id);

    if (cleanupError) {
      console.error(
        "[replaceExpiredGiftCard] echec de la compensation apres cloture ratee — intervention manuelle requise",
        {
          originalGiftCardId: original.id,
          replacementGiftCardId: replacement.id,
          closeError,
          cleanupError,
        },
      );
      return {
        success: false,
        error: `La clôture de l'ancienne carte a échoué et la nouvelle carte (code ${replacement.code}) n'a pas pu être annulée automatiquement — intervention manuelle requise pour éviter un doublon actif. Contactez le support technique avec les deux codes (${original.code} et ${replacement.code}).`,
      };
    }

    return {
      success: false,
      error:
        "La clôture de l'ancienne carte a échoué : l'opération a été annulée, aucune nouvelle carte n'a été conservée. Réessayez.",
    };
  }

  const consultantName = await resolveConsultantName(supabase, original.consultant_id);

  try {
    await sendGiftCardPurchaseEmails({
      code: replacement.code,
      typeLabel:
        original.type === "amount"
          ? "Carte cadeau de remplacement"
          : "Carte cadeau de remplacement — prestation offerte",
      amountLabel:
        original.type === "amount" && remainingAmountCents != null
          ? formatEuros(remainingAmountCents)
          : null,
      expiresAtLabel: expiresAt.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      buyerName: original.buyer_name,
      buyerEmail: original.buyer_email,
      beneficiaryName: original.beneficiary_name,
      beneficiaryEmail: original.beneficiary_email,
      personalMessage: null,
      deliveryMode: "email",
      consultantName,
    });
  } catch (err) {
    console.error("[replaceExpiredGiftCard] envoi email", err);
  }

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: "gift_card_replaced_after_expiry",
    entity_type: "gift_card",
    entity_id: original.id,
    metadata: {
      original_code: original.code,
      new_code: replacement.code,
      note: input.note,
    },
  });

  revalidatePath("/admin/cartes-cadeaux");
  return {
    success: true,
    data: { newGiftCardId: replacement.id, code: replacement.code },
  };
};

const formatEuros = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
