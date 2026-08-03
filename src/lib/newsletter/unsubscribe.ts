import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { removeContactFromList, addContactToList } from "@/lib/brevo/client";
import { baseUrl } from "@/lib/url";

export const unsubscribeUrlFor = (token: string): string =>
  `${baseUrl()}/newsletter/desinscription?token=${token}`;

const listId = () => {
  const raw = process.env.BREVO_LIST_ID_NEWSLETTER?.trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export type UnsubscribeOutcome =
  | { status: "unsubscribed"; firstName: string; token: string }
  | { status: "already_unsubscribed"; firstName: string; token: string }
  | { status: "unknown_token" };

/**
 * Desinscrit le porteur d'un jeton.
 *
 * Base puis Brevo, dans cet ordre : la table porte la preuve de consentement,
 * donc c'est elle qui doit refleter le retrait en premier. Si l'appel a Brevo
 * echoue, la personne est deja consideree comme desinscrite chez nous et la
 * prochaine campagne se lit sur la liste Brevo — d'ou la trace en cas d'echec.
 */
export const unsubscribeByToken = async (
  token: string,
): Promise<UnsubscribeOutcome> => {
  const supabase = createAdminClient();

  const { data: subscriber } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, first_name, unsubscribed_at")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (!subscriber) return { status: "unknown_token" };

  if (subscriber.unsubscribed_at) {
    return {
      status: "already_unsubscribed",
      firstName: subscriber.first_name,
      token,
    };
  }

  await supabase
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("id", subscriber.id);

  const list = listId();
  if (list) {
    const { ok, status } = await removeContactFromList(subscriber.email, list);
    if (!ok) {
      await supabase
        .from("newsletter_subscribers")
        .update({ brevo_sync_error: `Retrait de liste : Brevo a repondu ${status}` })
        .eq("id", subscriber.id);
    }
  }

  return { status: "unsubscribed", firstName: subscriber.first_name, token };
};

/**
 * Reabonne le porteur d'un jeton.
 *
 * Le lien de desinscription est une URL ouverte en GET : les antivirus et les
 * previsualisateurs de certains clients mail les visitent d'eux-memes, ce qui
 * desinscrit des personnes qui n'ont rien demande. Plutot que d'imposer une
 * confirmation a tout le monde — deux clics pour un droit qui doit s'exercer en
 * un — on offre le retour en arriere sur la page de confirmation. Le jeton
 * reste le meme, donc le lien deja parti dans les emails continue de marcher.
 */
export const resubscribeByToken = async (token: string): Promise<boolean> => {
  const supabase = createAdminClient();

  const { data: subscriber } = await supabase
    .from("newsletter_subscribers")
    .select("id, email")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (!subscriber) return false;

  await supabase
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: null })
    .eq("id", subscriber.id);

  const list = listId();
  if (list) await addContactToList(subscriber.email, list);

  return true;
};
