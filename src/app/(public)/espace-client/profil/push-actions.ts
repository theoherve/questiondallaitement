"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";
import type { PushDevice } from "@/types/database";

/** Un `user_agent` trop long serait de la donnée injectée, pas un navigateur. */
const MAX_USER_AGENT = 300;

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().max(MAX_USER_AGENT).optional(),
});

/**
 * Enregistre l'abonnement de CE navigateur.
 *
 * `onConflict: "endpoint"` : le navigateur peut renvoyer le même endpoint à
 * chaque visite, et un même appareil ne doit jamais produire deux lignes. C'est
 * aussi ce qui rattache l'abonnement à la bonne personne quand deux comptes se
 * succèdent sur le même navigateur.
 */
export const registerPushSubscription = async (input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<ActionResult> => {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Abonnement invalide" };

  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.p256dh,
        auth: parsed.data.auth,
        user_agent: parsed.data.userAgent ?? null,
        failure_count: 0,
      },
      { onConflict: "endpoint" },
    );

  if (error) {
    console.error("registerPushSubscription a échoué :", error);
    return { success: false, error: "Erreur lors de l'enregistrement" };
  }

  revalidatePath("/espace-client/profil");
  return { success: true };
};

/** Les appareils abonnés de l'utilisatrice, le plus récent d'abord. */
export const listPushDevices = async (): Promise<PushDevice[]> => {
  const user = await getSessionUser();
  if (!user) return [];

  const { data, error } = await createAdminClient()
    .from("push_subscriptions")
    .select("endpoint, user_agent, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listPushDevices a échoué :", error);
    return [];
  }

  return (data ?? []) as PushDevice[];
};

/**
 * Désabonne un appareil. Le filtre porte sur l'endpoint **et** sur
 * l'utilisatrice : sans le second, connaître un endpoint suffirait à désabonner
 * autrui.
 *
 * C'est le remède au choix de ne pas supprimer les abonnements à la
 * déconnexion : sur un ordinateur partagé, le retrait se fait depuis n'importe
 * quelle session.
 */
export const removePushDevice = async (
  endpoint: string,
): Promise<ActionResult> => {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .delete()
    .match({ endpoint, user_id: user.id });

  if (error) {
    console.error("removePushDevice a échoué :", error);
    return { success: false, error: "Erreur lors du retrait" };
  }

  revalidatePath("/espace-client/profil");
  return { success: true };
};

/** Rafraîchit l'écran après un abonnement ou un retrait, depuis le client. */
export const refreshProfilePage = async (): Promise<void> => {
  revalidatePath("/espace-client/profil");
};
