import type { SupabaseClient } from "@supabase/supabase-js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I

export const randomGiftCardCode = (): string => {
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `CADEAU-${suffix}`;
};

export const insertGiftCardWithUniqueCode = async <
  T extends Record<string, unknown>,
>(
  supabase: SupabaseClient,
  buildRow: (code: string) => T,
  maxAttempts = 5,
): Promise<T & { id: string; code: string }> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = randomGiftCardCode();
    const { data, error } = await supabase
      .from("gift_cards")
      .insert(buildRow(code))
      .select()
      .single();

    if (!error) return data as T & { id: string; code: string };

    lastError = error;
    const pgError = error as { code?: string };
    if (pgError.code !== "23505") throw error;
  }

  throw new Error("gift_card_code_generation_failed", { cause: lastError });
};
