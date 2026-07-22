"use server";

import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { revalidatePath } from "next/cache";
import { sendInvoiceEmail } from "@/lib/invoicing/send-invoice-email";
import { buildCorrectionContent } from "@/lib/invoicing/correction";
import type { ActionResult } from "@/types";

const INVOICE_FIELDS =
  "id, number, issued_at, type, currency, vat_rate, amount_ht_cents, amount_vat_cents, amount_ttc_cents, description, client_name, client_email, issuer_legal_name, issuer_address, issuer_siren, issuer_vat_number, issuer_legal_form, status";

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
