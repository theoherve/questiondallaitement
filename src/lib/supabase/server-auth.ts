import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

/**
 * For protected routes: returns Supabase admin client and current user.
 * Redirects to /connexion if not authenticated.
 * Use this instead of createClient() + auth.getUser() so RLS is bypassed and we filter by user id.
 */
export const getSupabaseAndUser = async () => {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  const supabase = createAdminClient();
  return { supabase, user };
};
