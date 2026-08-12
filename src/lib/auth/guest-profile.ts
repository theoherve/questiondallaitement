import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type GuestProfileFields = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

export type GuestProfileResult =
  | { success: true; id: string; password_hash: string | null }
  | { success: false; error: string };

/**
 * Retrouve ou cree le profil d'une acheteuse qui n'a pas necessairement de
 * compte : une reservation ou un achat de carte cadeau ne suppose jamais que
 * la personne qui paie est deja cliente.
 *
 * Partagee entre `reserver/actions.ts` et `cartes-cadeaux/actions.ts` : les
 * deux tunnels d'achat ont besoin d'un `client_id` valide avant de creer la
 * session Stripe (`payments.client_id` est `NOT NULL`), et divergerait vite
 * en deux implementations legerement differentes si dupliquee.
 */
export const findOrCreateGuestProfile = async (
  supabase: AdminClient,
  fields: GuestProfileFields,
): Promise<GuestProfileResult> => {
  const email = fields.email.toLowerCase();

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, password_hash")
    .eq("email", email)
    .is("deleted_at", null)
    .single();

  if (existingProfile) {
    await supabase
      .from("profiles")
      .update({
        first_name: fields.first_name,
        last_name: fields.last_name,
        phone: fields.phone,
      })
      .eq("id", existingProfile.id);

    return {
      success: true,
      id: existingProfile.id,
      password_hash: existingProfile.password_hash,
    };
  }

  const { data: newProfile, error } = await supabase
    .from("profiles")
    .insert({
      id: crypto.randomUUID(),
      email,
      roles: ["client"],
      first_name: fields.first_name,
      last_name: fields.last_name,
      phone: fields.phone,
    })
    .select("id")
    .single();

  if (error || !newProfile) {
    return { success: false, error: "Erreur lors de la création du profil" };
  }

  return { success: true, id: newProfile.id, password_hash: null };
};
