/**
 * Import transformed data into Supabase
 *
 * Usage: npx tsx scripts/migration/import-data.ts profiles.json
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

type ProfileData = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: string;
};

const main = async () => {
  const [inputPath] = process.argv.slice(2);

  if (!inputPath) {
    console.error("Usage: npx tsx scripts/migration/import-data.ts profiles.json");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const profiles: ProfileData[] = JSON.parse(readFileSync(inputPath, "utf-8"));

  console.log(`Importing ${profiles.length} profiles...`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const profile of profiles) {
    try {
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", profile.email)
        .single();

      if (existingUser) {
        skipped++;
        continue;
      }

      const { error: authError } = await supabase.auth.admin.createUser({
        email: profile.email,
        email_confirm: true,
        user_metadata: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          role: profile.role,
        },
      });

      if (authError) {
        console.error(`Error creating user ${profile.email}:`, authError.message);
        errors++;
        continue;
      }

      imported++;
    } catch (err) {
      console.error(`Error processing ${profile.email}:`, err);
      errors++;
    }
  }

  console.log(`\nImport complete:`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped (existing): ${skipped}`);
  console.log(`  Errors: ${errors}`);
};

main();
