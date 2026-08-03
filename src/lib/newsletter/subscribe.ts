import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createContact } from "@/lib/brevo/client";
import { sendWelcomeEmail } from "./welcome-email";
import {
  NEWSLETTER_CONSENT_TEXT,
  type NewsletterSource,
} from "@/config/newsletter";
import type { NewsletterSignupInput } from "@/validations/newsletter";

/**
 * Issues possibles d'une inscription, du point de vue de la page.
 *
 * `already_subscribed` n'est pas une erreur : le cahier des charges demande un
 * message neutre. On la distingue quand meme de `subscribed` pour ne pas
 * promettre un mémo qui ne repartira pas.
 */
export type NewsletterSignupOutcome =
  | { status: "subscribed"; firstName: string }
  | { status: "already_subscribed"; firstName: string }
  | { status: "error" };

const listId = () => {
  const raw = process.env.BREVO_LIST_ID_NEWSLETTER?.trim();
  if (!raw) return null;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Enregistre une inscription, puis la pousse vers Brevo.
 *
 * L'ordre compte. La base d'abord : c'est elle qui porte la preuve de
 * consentement, et elle ne depend pas d'un service tiers dont le compte impose
 * une liste blanche d'IP que les fonctions Vercel ne peuvent pas satisfaire.
 * Un echec Brevo laisse donc une ligne complete, rejouable, et l'abonne recoit
 * quand meme une confirmation a l'ecran — plutot qu'un message d'erreur pour un
 * consentement qui, lui, a bien ete recueilli.
 */
export const subscribeToNewsletter = async (
  input: Omit<NewsletterSignupInput, "website" | "consent">,
  consentIp: string | null,
): Promise<NewsletterSignupOutcome> => {
  // Les adresses ne different pas par la casse. Sans normalisation, la
  // contrainte d'unicite laisserait passer Marie@… a cote de marie@… et le
  // meme abonne recevrait deux fois chaque envoi.
  const email = input.email.trim().toLowerCase();
  const firstName = input.first_name.trim();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("newsletter_subscribers")
    .select("id, unsubscribed_at")
    .eq("email", email)
    .maybeSingle();

  // Deja inscrit et toujours abonne : on ne retouche rien. Ecraser
  // `consented_at` reecrirait la preuve de consentement a chaque passage sur le
  // formulaire, et elle ne vaudrait plus rien.
  if (existing && !existing.unsubscribed_at) {
    return { status: "already_subscribed", firstName };
  }

  const { data: subscriber, error } = await supabase
    .from("newsletter_subscribers")
    .upsert(
      {
        email,
        first_name: firstName,
        source: input.source,
        consent_text: NEWSLETTER_CONSENT_TEXT,
        consented_at: new Date().toISOString(),
        consent_ip: consentIp,
        // Une reinscription apres desabonnement doit repartir propre.
        unsubscribed_at: null,
        brevo_synced_at: null,
        brevo_sync_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    )
    .select("id")
    .single();

  if (error || !subscriber) {
    // Volontairement sans l'adresse : les journaux d'execution ne sont pas un
    // endroit ou stocker des donnees personnelles.
    console.error("[newsletter] enregistrement impossible", error);
    return { status: "error" };
  }

  // Le contact doit exister chez Brevo avant l'envoi : le template de bienvenue
  // porte le lien de desinscription, que Brevo ne peut resoudre que pour un
  // contact qu'il connait.
  await pushToBrevo({ id: subscriber.id, email, firstName, source: input.source });
  await sendWelcomeEmail({ subscriberId: subscriber.id, email, firstName });

  return { status: "subscribed", firstName };
};

/**
 * Cree ou met a jour le contact chez Brevo et trace le resultat.
 *
 * `createContact` pose deja `updateEnabled: true`, donc une adresse connue est
 * mise a jour au lieu de renvoyer « contact already exists ».
 */
const pushToBrevo = async ({
  id,
  email,
  firstName,
  source,
}: {
  id: string;
  email: string;
  firstName: string;
  source: NewsletterSource;
}) => {
  const supabase = createAdminClient();
  const list = listId();

  if (!list) {
    // Cas de figure reel au moment du developpement : la liste « Newsletter —
    // Parents » n'existe pas encore. L'inscription est conservee et pourra etre
    // rejouee, plutot que perdue en attendant la configuration.
    await supabase
      .from("newsletter_subscribers")
      .update({ brevo_sync_error: "BREVO_LIST_ID_NEWSLETTER absent" })
      .eq("id", id);
    return;
  }

  const { ok, status } = await createContact(
    email,
    { PRENOM: firstName, SOURCE: source },
    [list],
  );

  await supabase
    .from("newsletter_subscribers")
    .update(
      ok
        ? { brevo_synced_at: new Date().toISOString(), brevo_sync_error: null }
        : { brevo_sync_error: `Brevo a repondu ${status}` },
    )
    .eq("id", id);
};

/**
 * Enregistre un evenement de mesure.
 *
 * Sans identifiant de visiteur ni adresse IP : la mesure ne se rattache a
 * personne, donc elle n'a pas a etre conditionnee au bandeau cookies et compte
 * aussi les visiteurs qui le refusent. Un echec n'interrompt jamais le
 * parcours — une statistique manquante ne vaut pas une inscription perdue.
 */
export const trackNewsletterEvent = async (
  type: "page_view" | "signup",
  source: NewsletterSource,
) => {
  const { error } = await createAdminClient()
    .from("newsletter_events")
    .insert({ type, source });

  if (error) {
    console.error(`[newsletter] evenement ${type} non enregistre`, error);
  }
};
