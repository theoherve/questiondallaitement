import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { notify, getRoleRecipients } from "@/lib/notifications";
import type { ContactMessageInput } from "@/validations/contact";

export type ContactSubmitOutcome = { status: "sent" } | { status: "error" };

/**
 * Enregistre un message de contact puis notifie les admins in-app.
 *
 * L'ecriture d'abord, la notification ensuite : un echec de notify() (voir
 * son propre contrat, il ne leve jamais) ne doit jamais faire perdre le
 * message deja enregistre.
 */
export const submitContactMessage = async (
  input: Omit<ContactMessageInput, "website">,
  userId: string | null,
): Promise<ContactSubmitOutcome> => {
  const supabase = createAdminClient();

  const { data: contactMessage, error } = await supabase
    .from("contact_messages")
    .insert({
      name: input.name,
      email: input.email,
      subject: input.subject,
      message: input.message,
      user_id: userId,
    })
    .select("id")
    .single();

  if (error || !contactMessage) {
    console.error("[contact] enregistrement impossible", error);
    return { status: "error" };
  }

  const admins = await getRoleRecipients("admin");
  await notify(
    "contact_message_received",
    admins,
    {
      contactMessageId: contactMessage.id,
      name: input.name,
      subject: input.subject,
    },
    { dedupeId: contactMessage.id },
  );

  return { status: "sent" };
};
