import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationRecipient } from "./types";

/**
 * Destinataires d'une alerte interne. Renvoie un tableau vide plutôt que de
 * lever : une alerte perdue vaut mieux qu'un webhook Stripe en échec.
 */
export const getRoleRecipients = async (
  role: "admin" | "consultant"
): Promise<NotificationRecipient[]> => {
  try {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("id, email")
      .contains("roles", [role]);
    return (data ?? []).map((p) => ({ userId: p.id, email: p.email }));
  } catch (error) {
    console.error(`getRoleRecipients(${role}) a échoué :`, error);
    return [];
  }
};
