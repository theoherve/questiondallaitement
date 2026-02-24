"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRefund } from "@/lib/stripe/connect";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/connexion");
  return user;
};

export type PaymentFilters = {
  status?: string;
  type?: string;
  consultant_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
};

export type PaymentRow = {
  id: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  amount_cents: number;
  platform_fee_cents: number;
  currency: string;
  type: string;
  status: string;
  refund_amount_cents: number;
  refunded_at: string | null;
  stripe_invoice_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  client: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  consultant: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
};

export const getPayments = async (
  filters: PaymentFilters
): Promise<ActionResult<PaymentRow[]>> => {
  await requireAdmin();
  const supabase = createAdminClient();

  let query = supabase
    .from("payments")
    .select(
      `
      id,
      stripe_payment_intent_id,
      stripe_charge_id,
      amount_cents,
      platform_fee_cents,
      currency,
      type,
      status,
      refund_amount_cents,
      refunded_at,
      stripe_invoice_url,
      metadata,
      created_at,
      client:profiles!payments_client_id_fkey (
        id,
        first_name,
        last_name,
        email
      ),
      consultant:consultants!payments_consultant_id_fkey (
        id,
        profiles (
          first_name,
          last_name,
          email
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.type && filters.type !== "all") {
    query = query.eq("type", filters.type);
  }
  if (filters.consultant_id && filters.consultant_id !== "all") {
    query = query.eq("consultant_id", filters.consultant_id);
  }
  if (filters.date_from) {
    query = query.gte("created_at", filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte("created_at", `${filters.date_to}T23:59:59`);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: "Erreur lors de la récupération des paiements" };
  }

  const payments: PaymentRow[] = (data ?? []).map((p) => {
    const client = p.client as unknown as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
    };
    const consultantRaw = p.consultant as unknown as {
      id: string;
      profiles: {
        first_name: string | null;
        last_name: string | null;
        email: string;
      };
    };

    return {
      id: p.id,
      stripe_payment_intent_id: p.stripe_payment_intent_id,
      stripe_charge_id: p.stripe_charge_id,
      amount_cents: p.amount_cents,
      platform_fee_cents: p.platform_fee_cents,
      currency: p.currency,
      type: p.type,
      status: p.status,
      refund_amount_cents: p.refund_amount_cents,
      refunded_at: p.refunded_at,
      stripe_invoice_url: p.stripe_invoice_url,
      metadata: p.metadata as Record<string, unknown> | null,
      created_at: p.created_at,
      client,
      consultant: {
        id: consultantRaw?.id ?? "",
        first_name: consultantRaw?.profiles?.first_name ?? null,
        last_name: consultantRaw?.profiles?.last_name ?? null,
        email: consultantRaw?.profiles?.email ?? "",
      },
    };
  });

  if (filters.search) {
    const q = filters.search.toLowerCase();
    return {
      success: true,
      data: payments.filter((p) => {
        const clientName =
          `${p.client.first_name ?? ""} ${p.client.last_name ?? ""}`.toLowerCase();
        const consultantName =
          `${p.consultant.first_name ?? ""} ${p.consultant.last_name ?? ""}`.toLowerCase();
        return (
          clientName.includes(q) ||
          p.client.email.toLowerCase().includes(q) ||
          consultantName.includes(q) ||
          p.consultant.email.toLowerCase().includes(q) ||
          p.stripe_payment_intent_id?.toLowerCase().includes(q) ||
          false
        );
      }),
    };
  }

  return { success: true, data: payments };
};

export const refundPayment = async (
  paymentId: string,
  amountCents?: number
): Promise<ActionResult> => {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("id, stripe_payment_intent_id, amount_cents, refund_amount_cents, status")
    .eq("id", paymentId)
    .single();

  if (fetchError || !payment) {
    return { success: false, error: "Paiement introuvable" };
  }

  if (!payment.stripe_payment_intent_id) {
    return { success: false, error: "Pas de payment intent Stripe associé" };
  }

  if (payment.status === "refunded") {
    return { success: false, error: "Ce paiement a déjà été remboursé intégralement" };
  }

  const maxRefundable = payment.amount_cents - payment.refund_amount_cents;
  if (amountCents && amountCents > maxRefundable) {
    return {
      success: false,
      error: `Montant maximum remboursable : ${(maxRefundable / 100).toFixed(2)} €`,
    };
  }

  try {
    await createRefund(
      payment.stripe_payment_intent_id,
      amountCents ?? undefined
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Stripe";
    return { success: false, error: `Erreur Stripe : ${message}` };
  }

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: "payment_refund",
    entity_type: "payment",
    entity_id: paymentId,
    metadata: {
      amount_cents: amountCents ?? payment.amount_cents,
      is_partial: !!amountCents,
    },
  });

  revalidatePath("/admin/paiements");
  revalidatePath(`/admin/paiements/${paymentId}`);
  return { success: true };
};
