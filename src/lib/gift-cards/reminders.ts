import { createAdminClient } from "@/lib/supabase/admin";
import { sendGiftCardExpiryReminderEmail } from "./emails";

const REMINDER_WINDOW_DAYS = 30;

/**
 * Rappelle une seule fois, a J-30, l'expiration d'une carte cadeau active et
 * a solde non nul. `reminder_sent_at` n'est pose qu'apres envoi reussi : un
 * echec Resend transitoire doit pouvoir retenter au prochain passage du
 * cron, pas etre marque "envoye" a tort.
 */
export const sendGiftCardExpiryReminders = async (): Promise<number> => {
  const supabase = createAdminClient();
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + REMINDER_WINDOW_DAYS);

  const { data: cards } = await supabase
    .from("gift_cards")
    .select(
      "id, code, type, initial_amount_cents, buyer_name, buyer_email, beneficiary_name, beneficiary_email, expires_at, gift_card_redemptions(amount_cents)",
    )
    .eq("status", "active")
    .is("reminder_sent_at", null)
    .gte("expires_at", now.toISOString())
    .lte("expires_at", windowEnd.toISOString());

  if (!cards || cards.length === 0) return 0;

  let sent = 0;

  for (const card of cards as Array<{
    id: string;
    code: string;
    type: "amount" | "service";
    initial_amount_cents: number | null;
    buyer_name: string;
    buyer_email: string;
    beneficiary_name: string | null;
    beneficiary_email: string | null;
    expires_at: string;
    gift_card_redemptions: { amount_cents: number }[] | null;
  }>) {
    const used = (card.gift_card_redemptions ?? []).reduce(
      (sum, r) => sum + r.amount_cents,
      0,
    );
    const balanceCents =
      card.type === "amount" ? (card.initial_amount_cents ?? 0) - used : null;

    if (card.type === "amount" && (balanceCents ?? 0) <= 0) continue;

    const recipientEmail = card.beneficiary_email ?? card.buyer_email;
    const recipientName = card.beneficiary_name ?? card.buyer_name;

    try {
      await sendGiftCardExpiryReminderEmail({
        code: card.code,
        typeLabel:
          card.type === "amount" ? "Carte cadeau" : "Carte cadeau — prestation offerte",
        amountLabel: balanceCents != null ? formatEuros(balanceCents) : null,
        expiresAtLabel: new Date(card.expires_at).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        recipientName,
        recipientEmail,
      });
    } catch (err) {
      console.error(`[sendGiftCardExpiryReminders] carte ${card.code}`, err);
      continue;
    }

    const { error: updateError } = await supabase
      .from("gift_cards")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", card.id);
    if (updateError) {
      console.error(
        `[sendGiftCardExpiryReminders] marquage reminder_sent_at carte ${card.code}`,
        updateError,
      );
    }
    sent++;
  }

  return sent;
};

const formatEuros = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
