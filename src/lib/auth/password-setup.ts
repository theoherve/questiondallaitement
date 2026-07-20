import { randomBytes } from "crypto";
import { siteConfig } from "@/config/site";
import { sendGuestAccountEmail } from "@/lib/emails/send";

/**
 * Duree de validite d'un lien de creation de mot de passe.
 *
 * Alignee sur le lien des comptes migres depuis Wix : les deux repondent au
 * meme besoin — une personne qui n'a jamais choisi de mot de passe doit pouvoir
 * en poser un depuis un lien recu par email.
 */
export const PASSWORD_SETUP_EXPIRY_HOURS = 72;

/** Sous-ensemble de Supabase utilise ici — evite de trainer le client complet. */
type ProfileUpdater = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => PromiseLike<{ error: unknown }>;
    };
  };
};

/**
 * Pose un token de creation de mot de passe sur un profil et renvoie l'URL.
 *
 * `resetPassword` retrouve le profil par `password_reset_token` : une URL qui
 * ne porte pas ce token affiche « Lien invalide ». C'est exactement ce que
 * faisait l'email guest, qui pointait sur `/reset-password?email=...`.
 */
export const createPasswordSetupUrl = async (
  supabase: ProfileUpdater,
  profileId: string,
): Promise<string> => {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(
    Date.now() + PASSWORD_SETUP_EXPIRY_HOURS * 3600 * 1000,
  ).toISOString();

  await supabase
    .from("profiles")
    .update({ password_reset_token: token, password_reset_expires: expires })
    .eq("id", profileId);

  return `${siteConfig.url}/reset-password?token=${token}`;
};

type GuestProfile = {
  id: string;
  email: string | null;
  first_name: string | null;
  password_hash: string | null;
};

/**
 * Invite une cliente sans mot de passe a en definir un.
 *
 * La condition porte sur l'absence de `password_hash`, pas sur « le profil
 * vient d'etre cree » : une cliente qui reserve deux fois en invitee sans
 * jamais finaliser son compte doit recevoir le lien les deux fois. A l'inverse,
 * un profil qui a deja un mot de passe ne doit rien recevoir — poser un token
 * invaliderait une reinitialisation en cours.
 *
 * Ne leve jamais : l'appelant a deja encaisse le paiement, et une erreur ici
 * ferait echouer le webhook, que Stripe rejouerait en boucle.
 */
export const sendGuestSetupEmailIfNeeded = async (
  supabase: ProfileUpdater,
  profile: GuestProfile,
): Promise<void> => {
  if (profile.password_hash || !profile.email) return;

  try {
    const setup_url = await createPasswordSetupUrl(supabase, profile.id);
    await sendGuestAccountEmail(profile.email, {
      client_name: profile.first_name ?? "",
      setup_url,
    });
  } catch (err) {
    console.error("[sendGuestSetupEmailIfNeeded]", err);
  }
};
