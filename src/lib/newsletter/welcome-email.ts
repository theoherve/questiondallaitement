import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/brevo/client";

/**
 * URL du memo offert a l'inscription.
 *
 * Stockee en base plutot qu'en variable d'environnement pour que le fichier
 * puisse etre remplace depuis l'administration, sans nouveau deploiement — la
 * demande explicite du cahier des charges. Chaine vide tant qu'aucun fichier
 * n'a ete depose.
 */
export const getMemoUrl = async (): Promise<string | null> => {
  const { data } = await createAdminClient()
    .from("platform_settings")
    .select("value")
    .eq("key", "newsletter_memo_url")
    .maybeSingle();

  const url = typeof data?.value === "string" ? data.value.trim() : "";
  return url === "" ? null : url;
};

const templateId = () => {
  const raw = process.env.BREVO_TEMPLATE_ID_NEWSLETTER_WELCOME?.trim();
  if (!raw) return null;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Envoie l'email de bienvenue contenant le lien vers le memo.
 *
 * Un lien, pas une piece jointe : un fichier joint degrade la delivrabilite, et
 * il fige le memo dans les boites de reception — le remplacer n'aurait aucun
 * effet sur les envois passes. Le lien pointe vers le bucket public
 * « ressources », donc il reste valable indefiniment, contrairement aux URL
 * signees du bucket prive.
 *
 * Toute erreur est enregistree plutot que remontee : le consentement a ete
 * recueilli et le contact est dans la liste, un email de bienvenue manquant ne
 * justifie pas d'afficher un echec a quelqu'un qui vient de s'inscrire.
 */
export const sendWelcomeEmail = async ({
  subscriberId,
  email,
  firstName,
}: {
  subscriberId: string;
  email: string;
  firstName: string;
}) => {
  const supabase = createAdminClient();
  const template = templateId();

  if (!template) {
    await supabase
      .from("newsletter_subscribers")
      .update({
        welcome_email_error: "BREVO_TEMPLATE_ID_NEWSLETTER_WELCOME absent",
      })
      .eq("id", subscriberId);
    return;
  }

  const memoUrl = await getMemoUrl();

  const { ok, status } = await sendTransactionalEmail({
    to: email,
    templateId: template,
    params: {
      PRENOM: firstName,
      // Le template doit conditionner son bouton a cette variable : tant que le
      // memo n'est pas depose, l'email part sans lien mort.
      MEMO_URL: memoUrl ?? "",
    },
  });

  await supabase
    .from("newsletter_subscribers")
    .update(
      ok
        ? { welcome_email_sent_at: new Date().toISOString(), welcome_email_error: null }
        : { welcome_email_error: `Brevo a repondu ${status}` },
    )
    .eq("id", subscriberId);
};
