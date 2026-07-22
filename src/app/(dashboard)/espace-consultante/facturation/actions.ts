"use server";

import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { revalidatePath } from "next/cache";
import { sendInvoiceEmail } from "@/lib/invoicing/send-invoice-email";
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
