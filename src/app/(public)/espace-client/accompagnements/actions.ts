"use server";

import { getSupabaseAndUser } from "@/lib/supabase/server-auth";

/**
 * L'acces a un accompagnement est ouvert par le webhook Stripe
 * `checkout.session.completed`, livre en asynchrone. Au retour du paiement, la
 * ligne `accompagnement_enrollments` peut ne pas encore exister : cette action
 * permet a l'ilot client de sonder son apparition sans recharger toute la page.
 */
export const hasAccompagnementEnrollment = async (
  accompagnementId: string,
): Promise<boolean> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data } = await supabase
    .from("accompagnement_enrollments")
    .select("id")
    .eq("client_id", user.id)
    .eq("accompagnement_id", accompagnementId)
    .maybeSingle();

  return Boolean(data);
};
