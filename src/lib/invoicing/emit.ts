import type { SupabaseClient } from "@supabase/supabase-js";
import { buildInvoiceContent } from "./build-invoice";
import { notify } from "@/lib/notifications";
import { getConsultantBilling } from "./consultant-billing";
import { isBillingComplete } from "./billing-profile";
import {
  sendInvoiceEmail,
  type InvoiceEmailRecord,
} from "./send-invoice-email";

type Reader = SupabaseClient;

type PaymentType = "accompagnement" | "booking" | "formation" | "gift_card";

/**
 * Emet la facture d'un paiement confirme, designe par son identifiant.
 *
 * Appelee apres l'enregistrement du paiement — depuis le webhook pour une vente
 * en ligne, depuis « marquer comme encaisse » pour un paiement sur place.
 * Idempotente : la fonction `create_invoice` renvoie la facture existante sans
 * consommer de numero si elle est rappelee sur le meme paiement.
 *
 * Ne leve jamais : l'argent est deja encaisse et la vente deja traitee. Un
 * echec de facturation est trace (audit) mais ne doit pas faire rejouer le
 * webhook, ce qui doublerait emails et notifications.
 */
export const emitInvoiceForPayment = async (
  supabase: Reader,
  paymentId: string,
): Promise<void> => {
  try {
    const { data: payment } = await supabase
      .from("payments")
      .select(
        "id, client_id, consultant_id, amount_cents, currency, type, reference_id, status, discount_cents, original_amount_cents, promo_code_id",
      )
      .eq("id", paymentId)
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
        paymentId,
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

    // Le libelle du code est fige dans la facture : renommer un code plus tard
    // ne doit pas reecrire une facture emise.
    let promoCode: string | null = null;
    if (payment.promo_code_id) {
      const { data: promo } = await supabase
        .from("promo_codes")
        .select("code")
        .eq("id", payment.promo_code_id)
        .maybeSingle();
      promoCode = (promo?.code as string | undefined) ?? null;
    }

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
      promoCode,
      discountCents: payment.discount_cents ?? null,
      grossTtcCents: payment.original_amount_cents ?? null,
      issuer: billing,
    });

    const { data: created, error } = await supabase.rpc("create_invoice", {
      p_content: content,
    });

    if (error) {
      await logInvoiceIssue(
        supabase,
        payment.consultant_id,
        payment.reference_id,
        error.message,
        paymentId,
      );
      return;
    }

    // Envoi automatique a la cliente, une seule fois : `emailed_at` nul signale
    // une facture pas encore envoyee. Une redelivery retombe sur la facture
    // deja envoyee et ne redouble pas le mail ; un premier envoi echoue laisse
    // la colonne nulle, donc retentable.
    const invoice = created as
      | (InvoiceEmailRecord & { emailed_at: string | null })
      | null;
    if (invoice) {
      // Canal in-app seulement : l'email de facture est un envoi sur mesure,
      // avec le PDF en piece jointe, juste en dessous. Le dedupeId rend la
      // notification idempotente comme l'emission elle-meme.
      await notify(
        "invoice_available",
        [{ userId: payment.client_id }],
        {
          invoice_id: invoice.id,
          number: invoice.number,
          amount: new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: invoice.currency?.toUpperCase() ?? "EUR",
          }).format(invoice.amount_ttc_cents / 100),
        },
        { dedupeId: invoice.id },
      );
    }

    if (invoice && !invoice.emailed_at) {
      try {
        await sendInvoiceEmail(invoice);
        await supabase
          .from("invoices")
          .update({ emailed_at: new Date().toISOString() })
          .eq("id", invoice.id);
      } catch (mailErr) {
        // L'email est un plus : son echec ne doit ni bloquer ni rejouer le
        // webhook. La facture reste consultable et renvoyable manuellement.
        console.error("[emitInvoiceForPayment] envoi email", mailErr);
      }
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
  if (type === "accompagnement") {
    const { data } = await supabase
      .from("accompagnements")
      .select("title")
      .eq("id", referenceId)
      .maybeSingle();
    return data?.title ?? "Accompagnement";
  }

  if (type === "formation") {
    const { data } = await supabase
      .from("formations")
      .select("title")
      .eq("id", referenceId)
      .maybeSingle();
    return data?.title ?? "Formation";
  }

  if (type === "gift_card") {
    return "Carte cadeau";
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
  return ct?.title ? `Consultation, ${ct.title}` : "Consultation";
};

const logInvoiceIssue = async (
  supabase: Reader,
  consultantId: string,
  referenceId: string,
  reason: string,
  paymentId: string,
): Promise<void> => {
  await supabase.from("audit_logs").insert({
    user_id: consultantId,
    action: "invoice_emission_failed",
    entity_type: "invoice",
    entity_id: referenceId,
    metadata: { reason, payment_id: paymentId },
  });
};
