import { createAdminClient } from "@/lib/supabase/admin";
import type { GoogleProfileStore } from "@/lib/auth/google-profile";

/** Implementation Supabase du store utilise par `resolveGoogleProfile`. */
export const createGoogleProfileStore = (): GoogleProfileStore => {
  const supabase = createAdminClient();

  return {
    findByEmail: async (email) => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "id, roles, first_name, last_name, avatar_url, email_verified, deleted_at",
        )
        .eq("email", email)
        .maybeSingle();
      return data ?? null;
    },
    create: async (values) => {
      const { error } = await supabase.from("profiles").insert(values);
      if (error) throw new Error(`[google] creation profil: ${error.message}`);
    },
    update: async (id, patch) => {
      await supabase.from("profiles").update(patch).eq("id", id);
    },
  };
};
