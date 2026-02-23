/**
 * Transform Wix contacts CSV to Supabase profiles format
 *
 * Usage: npx tsx scripts/migration/transform-contacts.ts input.csv output.json
 */

import { readFileSync, writeFileSync } from "fs";

type WixContact = {
  "First Name": string;
  "Last Name": string;
  Email: string;
  Phone?: string;
};

type SupabaseProfile = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: "client";
};

const parseCSV = (content: string): WixContact[] => {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] ?? "";
    });
    return obj as unknown as WixContact;
  });
};

const transform = (contacts: WixContact[]): SupabaseProfile[] => {
  return contacts
    .filter((c) => c.Email && c.Email.includes("@"))
    .map((contact) => ({
      email: contact.Email.toLowerCase().trim(),
      first_name: contact["First Name"]?.trim() ?? "",
      last_name: contact["Last Name"]?.trim() ?? "",
      phone: contact.Phone?.trim() || null,
      role: "client" as const,
    }));
};

const main = () => {
  const [inputPath, outputPath] = process.argv.slice(2);

  if (!inputPath || !outputPath) {
    console.error(
      "Usage: npx tsx scripts/migration/transform-contacts.ts input.csv output.json"
    );
    process.exit(1);
  }

  const content = readFileSync(inputPath, "utf-8");
  const wixContacts = parseCSV(content);
  const profiles = transform(wixContacts);

  writeFileSync(outputPath, JSON.stringify(profiles, null, 2));
  console.log(`Transformed ${profiles.length} contacts -> ${outputPath}`);
};

main();
