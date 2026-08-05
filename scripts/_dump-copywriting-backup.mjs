import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("missing env"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });
const dir = "backups/copywriting-2026-08-05";
for (const t of ["blog_posts", "blog_categories", "formations"]) {
  const { data, error } = await db.from(t).select("*");
  if (error) { console.error(t, error.message); process.exit(1); }
  fs.writeFileSync(`${dir}/${t}.json`, JSON.stringify(data, null, 2));
  console.log(t, data.length, "rows");
}
