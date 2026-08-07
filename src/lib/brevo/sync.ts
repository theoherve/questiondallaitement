"use server";

import { createContact, addContactToList } from "@/lib/brevo/client";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Attribute mapping ──────────────────────────────────────

const profileToBrevoAttributes = (profile: {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  roles: string[];
}) => ({
  PRENOM: profile.first_name ?? "",
  NOM: profile.last_name ?? "",
  TELEPHONE: profile.phone ?? "",
  ROLE: profile.roles.join(","),
});

// ─── Single contact sync ────────────────────────────────────

export const syncContactToBrevo = async (
  email: string,
  attributes: Record<string, string>,
  listIds?: number[],
) => {
  try {
    await createContact(email, attributes, listIds);
  } catch (error) {
    console.error("Failed to sync contact to Brevo:", email, error);
  }
};

// ─── Formation-based sync (called from auth/webhook flows) ──────

export const syncOnSignup = async (profile: {
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  roles: string[];
}) => {
  const defaultListId = process.env.BREVO_DEFAULT_LIST_ID
    ? parseInt(process.env.BREVO_DEFAULT_LIST_ID)
    : undefined;

  await syncContactToBrevo(
    profile.email,
    profileToBrevoAttributes(profile),
    defaultListId ? [defaultListId] : undefined,
  );
};

export const syncOnPurchase = async (email: string, listId?: number) => {
  if (listId) {
    try {
      await addContactToList(email, listId);
    } catch (error) {
      console.error("Failed to add contact to purchase list:", error);
    }
  }
};

// ─── Batch sync (admin-triggered) ───────────────────────────

export const syncAllContactsToBrevo = async (): Promise<{
  total: number;
  synced: number;
  errors: number;
}> => {
  const supabase = createAdminClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("email, first_name, last_name, phone, roles")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error || !profiles) {
    console.error("Failed to fetch profiles for Brevo sync:", error);
    return { total: 0, synced: 0, errors: 1 };
  }

  let synced = 0;
  let errors = 0;

  const defaultListId = process.env.BREVO_DEFAULT_LIST_ID
    ? parseInt(process.env.BREVO_DEFAULT_LIST_ID)
    : undefined;

  // Process in batches of 50 to respect Brevo rate limits
  const BATCH_SIZE = 50;
  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const batch = profiles.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (profile) => {
        try {
          await createContact(
            profile.email,
            profileToBrevoAttributes(profile as { first_name: string | null; last_name: string | null; phone: string | null; roles: string[] }),
            defaultListId ? [defaultListId] : undefined,
          );
          synced++;
        } catch {
          errors++;
        }
      }),
    );

    // Small delay between batches
    if (i + BATCH_SIZE < profiles.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return { total: profiles.length, synced, errors };
};
