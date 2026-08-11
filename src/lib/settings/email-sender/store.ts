import { createAdminClient } from "@/lib/supabase/admin";

export const EMAIL_SENDER_KEY = "email_sender";

export type EmailSender = {
  from_address: string;
  from_name: string;
};

export const DEFAULT_EMAIL_SENDER: EmailSender = {
  from_address: process.env.RESEND_FROM_EMAIL ?? "noreply@formation-allaitement.com",
  from_name: process.env.RESEND_FROM_NAME ?? "Question d'Allaitement",
};

const safeJsonParse = (raw: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const parseEmailSender = (raw: unknown): EmailSender => {
  const src =
    typeof raw === "string"
      ? safeJsonParse(raw)
      : raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};

  const out = { ...DEFAULT_EMAIL_SENDER };
  for (const key of Object.keys(DEFAULT_EMAIL_SENDER) as (keyof EmailSender)[]) {
    const value = src[key];
    if (typeof value === "string" && value.length > 0) {
      out[key] = value;
    }
  }
  return out;
};

const TTL_MS = 60_000;
let cached: { value: EmailSender; at: number } | null = null;

export const invalidateEmailSenderCache = () => {
  cached = null;
};

export const getEmailSender = async (): Promise<EmailSender> => {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", EMAIL_SENDER_KEY)
      .maybeSingle();

    const value = parseEmailSender(data?.value);
    cached = { value, at: Date.now() };
    return value;
  } catch (e) {
    console.error("[email-sender] lecture des reglages echouee", e);
    return DEFAULT_EMAIL_SENDER;
  }
};

export const saveEmailSender = async (
  sender: EmailSender,
): Promise<{ error: string | null }> => {
  const supabase = createAdminClient();
  const { error } = await supabase.from("platform_settings").upsert(
    {
      key: EMAIL_SENDER_KEY,
      value: sender as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) return { error: "Erreur lors de l'enregistrement de l'expéditeur." };

  invalidateEmailSenderCache();
  return { error: null };
};
