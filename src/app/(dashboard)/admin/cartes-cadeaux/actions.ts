"use server";

import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertGiftCardWithUniqueCode } from "@/lib/gift-cards/code";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) {
    redirect("/connexion");
    throw new Error("unauthorized");
  }
  return user;
};

export type GiftCardListItem = {
  id: string;
  code: string;
  type: "amount" | "service";
  status: string;
  balanceCents: number | null;
  buyerName: string;
  issuedAt: string;
  expiresAt: string;
};

export const listGiftCards = async (): Promise<ActionResult<GiftCardListItem[]>> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("gift_cards")
    .select(
      "id, code, type, status, initial_amount_cents, buyer_name, issued_at, expires_at, gift_card_redemptions(amount_cents)",
    )
    .order("issued_at", { ascending: false });

  if (error || !data) {
    return { success: false, error: "Impossible de charger les cartes cadeaux." };
  }

  const items: GiftCardListItem[] = data.map((row) => {
    const redemptions = (row.gift_card_redemptions as { amount_cents: number }[] | null) ?? [];
    const used = redemptions.reduce((sum, r) => sum + r.amount_cents, 0);
    return {
      id: row.id,
      code: row.code,
      type: row.type,
      status: row.status,
      balanceCents: row.type === "amount" ? row.initial_amount_cents - used : null,
      buyerName: row.buyer_name,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
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

  // Site solo-praticienne : une seule consultante active. On récupère la
  // liste (pas de filtre serveur pour rester sur les mêmes primitives que
  // `listGiftCards`) et on choisit la consultante active, ou à défaut la
  // première trouvée / l'admin courant·e si elle est aussi consultante.
  const { data: consultants } = await supabase
    .from("consultants")
    .select("id, is_active")
    .order("created_at", { ascending: true });

  const activeConsultant = (consultants ?? []).find((c) => c.is_active);
  const consultantId = activeConsultant?.id ?? consultants?.[0]?.id ?? admin.id;

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt);
  expiresAt.setMonth(expiresAt.getMonth() + 12);

  const card = await insertGiftCardWithUniqueCode(supabase, (code) => ({
    code,
    type: input.type,
    initial_amount_cents: input.type === "amount" ? input.amountCents : null,
    consultation_type_id: input.type === "service" ? input.consultationTypeId : null,
    consultant_id: consultantId,
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

  return { success: true, data: { giftCardId: card.id, code: card.code } };
};
