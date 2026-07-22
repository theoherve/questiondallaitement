import type { SupabaseClient } from "@supabase/supabase-js";
import { buildInvoiceContent } from "./build-invoice";
import { getConsultantBilling } from "./consultant-billing";
import { isBillingComplete } from "./billing-profile";

type Reader = SupabaseClient;

type PaymentType = "formation" | "booking" | "event";

/**
 * Emet la facture d'un paiement en ligne confirme.
 *
 * Appelee par le webhook une fois le paiement enregistre. Idempotente : la
 * fonction `create_invoice` renvoie la facture existante sans consommer de
 * numero si l'evenement est rejoue.
 *
 * Ne leve jamais : l'argent est deja encaisse et la reservation/formation deja
 * traitee. Un echec de facturation est trace (audit) mais ne doit pas faire
 * rejouer le webhook, ce qui doublerait emails et notifications.
 */
export const emitInvoiceForPayment = async (
  supabase: Reader,
  paymentIntentId: string,
): Promise<void> => {
  try {
    const { data: payment } = await supabase
      .from("payments")
      .select(
        "id, client_id, consultant_id, amount_cents, currency, type, reference_id, status",
      )
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();

    // Pas de facture pour un paiement absent, echoue ou rembourse : on ne
    // facture que ce qui a effectivement ete encaisse.
    if (!payment || payment.status !== "succeeded") return;

    const billing = await getConsultantBilling(supabase, payment.consultant_id);
    if (!billing || !isBillingComplete(billing)) {
      // Ne devrait pas arriver : le gate refuse la vente en amont. Si on y est
      // quand meme, on trace plutot que d'emettre une facture non conforme.
      await logInvoiceIssue(
        supabase,
        payment.consultant_id,
        payment.reference_id,
        "billing_profile_incomplete",
        paymentIntentId,
      );
      return;
    }

    const { data: client } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", payment.client_id)
      .maybeSingle();

    const clientName = client
      ? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()
      : "";

    const content = buildInvoiceContent({
      paymentId: payment.id,
      consultantId: payment.consultant_id,
      clientId: payment.client_id,
      type: payment.type as PaymentType,
      referenceId: payment.reference_id,
      ttcCents: payment.amount_cents,
      currency: payment.currency ?? "eur",
      description: await describeSale(
        supabase,
        payment.type as PaymentType,
        payment.reference_id,
      ),
      clientName,
      clientEmail: client?.email ?? "",
      issuer: billing,
    });

    const { error } = await supabase.rpc("create_invoice", {
      p_content: content,
    });

    if (error) {
      await logInvoiceIssue(
        supabase,
        payment.consultant_id,
        payment.reference_id,
        error.message,
        paymentIntentId,
      );
    }
  } catch (err) {
    // Jamais laisser une erreur de facturation faire echouer le webhook.
    console.error("[emitInvoiceForPayment]", err);
  }
};

/** Libelle de la prestation facturee, selon le type de vente. */
const describeSale = async (
  supabase: Reader,
  type: PaymentType,
  referenceId: string,
): Promise<string> => {
  if (type === "formation") {
    const { data } = await supabase
      .from("formations")
      .select("title")
      .eq("id", referenceId)
      .maybeSingle();
    return data?.title ?? "Formation";
  }

  if (type === "event") {
    const { data } = await supabase
      .from("events")
      .select("title")
      .eq("id", referenceId)
      .maybeSingle();
    return data?.title ?? "Événement";
  }

  // booking : le libelle porte le type de consultation quand on le retrouve.
  const { data } = await supabase
    .from("bookings")
    .select("consultation_types(title)")
    .eq("id", referenceId)
    .maybeSingle();
  const ctRaw = data?.consultation_types as
    | { title: string }
    | { title: string }[]
    | null
    | undefined;
  const ct = Array.isArray(ctRaw) ? ctRaw[0] : ctRaw ?? null;
  return ct?.title ? `Consultation — ${ct.title}` : "Consultation";
};

const logInvoiceIssue = async (
  supabase: Reader,
  consultantId: string,
  referenceId: string,
  reason: string,
  paymentIntentId: string,
): Promise<void> => {
  await supabase.from("audit_logs").insert({
    user_id: consultantId,
    action: "invoice_emission_failed",
    entity_type: "invoice",
    entity_id: referenceId,
    metadata: { reason, payment_intent_id: paymentIntentId },
  });
};
