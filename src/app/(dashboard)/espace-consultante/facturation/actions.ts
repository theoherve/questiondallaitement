"use server";

import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { revalidatePath } from "next/cache";
import { sendInvoiceEmail } from "@/lib/invoicing/send-invoice-email";
import { buildCorrectionContent } from "@/lib/invoicing/correction";
import { buildManualInvoiceContent } from "@/lib/invoicing/manual-invoice";
import { buildInvoicesCsv, type InvoiceExportRow } from "@/lib/invoicing/csv-export";
import { redeemGiftCard } from "@/lib/gift-cards/redeem";
import { lookupGiftCard } from "@/lib/gift-cards/balance";
import type { ActionResult } from "@/types";

const INVOICE_FIELDS =
  "id, number, issued_at, type, currency, vat_rate, amount_ht_cents, amount_vat_cents, amount_ttc_cents, description, client_name, client_email, issuer_legal_name, issuer_address, issuer_siren, issuer_vat_number, issuer_legal_form, status, promo_code, discount_cents, gross_amount_ttc_cents, origin, payment_status, issuer_iban, issuer_bic";

/**
 * Renvoie la facture a la cliente (lien + PDF). Contrairement a l'envoi
 * automatique, il envoie toujours — c'est une action explicite de la
 * consultante — et n'est possible que sur ses propres factures.
 */
export const resendInvoice = async (
  invoiceId: string,
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(INVOICE_FIELDS)
    .eq("id", invoiceId)
    .eq("consultant_id", user.id)
    .maybeSingle();

  if (!invoice) {
    return { success: false, error: "Facture introuvable" };
  }

  try {
    await sendInvoiceEmail(invoice);
  } catch (err) {
    console.error("[resendInvoice]", err);
    return {
      success: false,
      error: "L'envoi de la facture a échoué. Réessayez.",
    };
  }

  await supabase
    .from("invoices")
    .update({ emailed_at: new Date().toISOString() })
    .eq("id", invoiceId);

  revalidatePath("/espace-consultante/facturation");
  return { success: true };
};

/**
 * Corrige une facture emise : emet l'avoir qui l'annule et une facture
 * corrigee (fonction `correct_invoice`, atomique), puis envoie la corrigee a la
 * cliente. La facture originale reste consultable, marquee annulee.
 */
export const correctInvoice = async (
  invoiceId: string,
  input: { description: string; ttcCents: number },
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: original } = await supabase
    .from("invoices")
    .select("id, vat_rate, document_type, status")
    .eq("id", invoiceId)
    .eq("consultant_id", user.id)
    .maybeSingle();

  if (
    !original ||
    original.document_type !== "invoice" ||
    original.status !== "issued"
  ) {
    return { success: false, error: "Cette facture ne peut pas être corrigée." };
  }

  let content;
  try {
    content = buildCorrectionContent({
      vatRate: Number(original.vat_rate),
      description: input.description,
      ttcCents: input.ttcCents,
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Saisie invalide.",
    };
  }

  const { data: corrected, error } = await supabase.rpc("correct_invoice", {
    p_original_id: invoiceId,
    p_content: content,
  });

  if (error || !corrected) {
    console.error("[correctInvoice]", error);
    return { success: false, error: "La correction a échoué." };
  }

  // Envoi de la facture corrigee. Non bloquant : la correction est faite, la
  // facture reste renvoyable a la main si l'email echoue.
  try {
    const invoice = corrected as { id: string };
    await sendInvoiceEmail(
      corrected as Parameters<typeof sendInvoiceEmail>[0],
    );
    await supabase
      .from("invoices")
      .update({ emailed_at: new Date().toISOString() })
      .eq("id", invoice.id);
  } catch (mailErr) {
    console.error("[correctInvoice] envoi email", mailErr);
  }

  revalidatePath("/espace-consultante/facturation");
  return { success: true };
};

/**
 * Verifie qu'un client a une relation reelle avec la consultante (booking non
 * annule ou inscription a un accompagnement) avant de lui emettre une facture
 * libre. Controle interne, jamais un parametre fourni par l'appelant — voir
 * la note de cadrage sur les server actions exportees.
 */
const hasClientRelationship = async (
  supabase: Awaited<ReturnType<typeof getSupabaseAndUser>>["supabase"],
  consultantId: string,
  clientId: string,
): Promise<boolean> => {
  const { data: bookingLink } = await supabase
    .from("bookings")
    .select("id")
    .eq("client_id", clientId)
    .eq("consultant_id", consultantId)
    .not("status", "eq", "cancelled")
    .limit(1);
  if (bookingLink && bookingLink.length > 0) return true;

  const { data: accompagnements } = await supabase
    .from("accompagnements")
    .select("id")
    .eq("consultant_id", consultantId);

  const accompagnementIds = (accompagnements ?? []).map(
    (a: { id: string }) => a.id,
  );
  if (accompagnementIds.length === 0) return false;

  const { data: enrollmentLink } = await supabase
    .from("accompagnement_enrollments")
    .select("client_id")
    .eq("client_id", clientId)
    .in("accompagnement_id", accompagnementIds)
    .limit(1);

  return Boolean(enrollmentLink && enrollmentLink.length > 0);
};

/**
 * Emet une facture libre (hors Stripe) : virement, cheque ou especes a
 * venir. Consomme la meme sequence de numerotation que les factures
 * automatiques (create_manual_invoice, migration 00099).
 */
export const createManualInvoice = async (input: {
  clientId: string;
  description: string;
  ttcCents: number;
  dueDate?: string;
  giftCardCode?: string;
}): Promise<ActionResult<{ invoiceId: string }>> => {
  const { supabase, user } = await getSupabaseAndUser();

  if (!(await hasClientRelationship(supabase, user.id, input.clientId))) {
    return { success: false, error: "Cette cliente n'est pas rattachée à votre patientèle." };
  }

  let content;
  try {
    content = buildManualInvoiceContent({
      description: input.description,
      ttcCents: input.ttcCents,
      dueDate: input.dueDate,
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Saisie invalide.",
    };
  }

  const { data: client } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", input.clientId)
    .maybeSingle();

  const { data: consultant } = await supabase
    .from("consultants")
    .select(
      "billing_legal_name, billing_address, billing_siren, billing_vat_number, billing_legal_form, billing_iban, billing_bic",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!client || !consultant) {
    return { success: false, error: "Informations de facturation incomplètes." };
  }

  const { data: invoice, error } = await supabase.rpc("create_manual_invoice", {
    p_content: {
      consultant_id: user.id,
      client_id: input.clientId,
      due_date: content.due_date,
      currency: "eur",
      vat_rate: content.vat_rate,
      amount_ttc_cents: content.amount_ttc_cents,
      amount_ht_cents: content.amount_ht_cents,
      amount_vat_cents: content.amount_vat_cents,
      description: content.description,
      client_name: `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() || "Cliente",
      client_email: client.email,
      issuer_legal_name: consultant.billing_legal_name,
      issuer_address: consultant.billing_address,
      issuer_siren: consultant.billing_siren,
      issuer_vat_number: consultant.billing_vat_number,
      issuer_legal_form: consultant.billing_legal_form,
      issuer_iban: consultant.billing_iban,
      issuer_bic: consultant.billing_bic,
    },
  });

  if (error || !invoice) {
    console.error("[createManualInvoice]", error);
    return { success: false, error: "La création de la facture a échoué." };
  }

  const created = invoice as { id: string };

  if (input.giftCardCode) {
    const lookup = await lookupGiftCard(supabase, input.giftCardCode);
    if (!lookup.ok) {
      console.error("[createManualInvoice] carte cadeau", lookup.error);
    } else {
      // Le solde peut etre inferieur au total de la facture : on cappe au
      // solde disponible plutot que de rejeter (voir §7.3 — solde restant
      // suivi apres usage partiel), meme logique que checkGiftCardForBooking.
      const amountToRedeem =
        lookup.type === "amount"
          ? Math.min(lookup.balanceCents!, input.ttcCents)
          : input.ttcCents;

      const redemption = await redeemGiftCard(supabase, {
        code: input.giftCardCode,
        amountCents: amountToRedeem,
        invoiceId: created.id,
        recordedBy: user.id,
      });
      if (!redemption.ok) {
        console.error("[createManualInvoice] carte cadeau", redemption.error);
      }
    }
  }

  try {
    await sendInvoiceEmail(invoice as Parameters<typeof sendInvoiceEmail>[0]);
    await supabase
      .from("invoices")
      .update({ emailed_at: new Date().toISOString() })
      .eq("id", created.id);
  } catch (mailErr) {
    console.error("[createManualInvoice] envoi email", mailErr);
  }

  revalidatePath("/espace-consultante/facturation");
  return { success: true, data: { invoiceId: created.id } };
};

/**
 * Enregistre un reglement manuel (espece/cheque/virement) sur une facture de
 * la consultante appelante. Le statut de reglement de la facture est
 * recalcule par le trigger `invoice_settlements_recompute_status` (00099),
 * jamais ecrit ici directement.
 */
export const recordSettlement = async (input: {
  invoiceId: string;
  method: "cash" | "check" | "transfer";
  amountCents: number;
  paidAt: string;
  note?: string;
}): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, amount_ttc_cents")
    .eq("id", input.invoiceId)
    .eq("consultant_id", user.id)
    .maybeSingle();

  if (!invoice) {
    return { success: false, error: "Facture introuvable." };
  }

  if (input.amountCents <= 0) {
    return { success: false, error: "Le montant doit être strictement positif." };
  }

  const { data: existingSettlements } = await supabase
    .from("invoice_settlements")
    .select("amount_cents")
    .eq("invoice_id", input.invoiceId);

  const alreadySettled = (existingSettlements ?? []).reduce(
    (sum: number, s: { amount_cents: number }) => sum + s.amount_cents,
    0,
  );
  const remaining = invoice.amount_ttc_cents - alreadySettled;

  if (input.amountCents > remaining) {
    return {
      success: false,
      error: `Ce règlement dépasserait le solde restant (${(remaining / 100).toFixed(2)} €).`,
    };
  }

  const { error } = await supabase.from("invoice_settlements").insert({
    invoice_id: input.invoiceId,
    method: input.method,
    amount_cents: input.amountCents,
    paid_at: input.paidAt,
    note: input.note ?? null,
    recorded_by: user.id,
  });

  if (error) {
    console.error("[recordSettlement]", error);
    return { success: false, error: "L'enregistrement du règlement a échoué." };
  }

  revalidatePath("/espace-consultante/facturation");
  return { success: true };
};

/**
 * Export CSV factures + reglements, filtre par periode/statut/patiente
 * (module Facturation §6.4). Pas de FEC.
 */
export const exportInvoicesCsv = async (filters: {
  from?: string;
  to?: string;
  status?: "unpaid" | "partial" | "paid";
  clientId?: string;
}): Promise<ActionResult<string>> => {
  const { supabase, user } = await getSupabaseAndUser();

  let query = supabase
    .from("invoices")
    .select(
      "id, number, issued_at, document_type, status, payment_status, client_name, amount_ht_cents, amount_vat_cents, amount_ttc_cents, currency",
    )
    .eq("consultant_id", user.id);

  if (filters.from) query = query.gte("issued_at", filters.from);
  if (filters.to) query = query.lte("issued_at", filters.to);
  if (filters.status) query = query.eq("payment_status", filters.status);
  if (filters.clientId) query = query.eq("client_id", filters.clientId);

  const { data: invoices } = await query.order("issued_at", { ascending: false });
  const rows = invoices ?? [];

  const invoiceIds = rows.map((r: { id: string }) => r.id);
  const { data: settlements } =
    invoiceIds.length > 0
      ? await supabase
          .from("invoice_settlements")
          .select("invoice_id, method, amount_cents, paid_at")
          .in("invoice_id", invoiceIds)
      : { data: [] };

  const settlementsByInvoice = new Map<
    string,
    { method: string; amount_cents: number; paid_at: string }[]
  >();
  for (const s of settlements ?? []) {
    const list = settlementsByInvoice.get(s.invoice_id) ?? [];
    list.push({ method: s.method, amount_cents: s.amount_cents, paid_at: s.paid_at });
    settlementsByInvoice.set(s.invoice_id, list);
  }

  const exportRows: InvoiceExportRow[] = rows.map((row) => ({
    number: row.number,
    issued_at: row.issued_at,
    document_type: row.document_type,
    status: row.status,
    payment_status: row.payment_status,
    client_name: row.client_name,
    amount_ht_cents: row.amount_ht_cents,
    amount_vat_cents: row.amount_vat_cents,
    amount_ttc_cents: row.amount_ttc_cents,
    currency: row.currency,
    settlements: settlementsByInvoice.get(row.id) ?? [],
  }));

  return { success: true, data: buildInvoicesCsv(exportRows) };
};
