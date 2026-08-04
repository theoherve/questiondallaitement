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

export type TokenLookup =
  | { status: "found"; firstName: string; alreadyUnsubscribed: boolean }
  | { status: "unknown_token" };

/**
 * Lecture seule : identifie le porteur d'un jeton sans rien modifier.
 *
 * Existe parce que l'affichage de la page ne doit avoir aucun effet. Le lien de
 * desinscription part dans des emails, et les passerelles de securite le
 * prechargent : constate en recette, une adresse Klesia a ete desinscrite vingt
 * secondes apres reception, sans qu'aucun humain ne clique. La desinscription
 * elle-meme passe donc par `unsubscribeByToken`, appele en POST.
 */
export const findSubscriberByToken = async (
  token: string,
): Promise<TokenLookup> => {
  const { data } = await createAdminClient()
    .from("newsletter_subscribers")
    .select("first_name, unsubscribed_at")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (!data) return { status: "unknown_token" };

  return {
    status: "found",
    firstName: data.first_name,
    alreadyUnsubscribed: Boolean(data.unsubscribed_at),
  };
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
 * Filet de securite laisse sur la page apres une desinscription, pour la
 * personne qui s'est trompee de bouton. Le jeton reste le meme, donc le lien
 * deja parti dans les emails continue de fonctionner.
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
