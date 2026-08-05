/** Retire la fiche de test « Consultante E2E » du site public (is_active=false). */
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await db
  .from("consultants")
  .update({ is_active: false })
  .eq("slug", "consultante-e2e")
  .select("slug, is_active");

if (error) {
  console.error("❌", error.message);
  process.exit(1);
}
console.log("✅", data);
