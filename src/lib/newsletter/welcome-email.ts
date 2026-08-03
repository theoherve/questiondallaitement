import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewsletterWelcome } from "@/lib/emails/send";
import { unsubscribeUrlFor } from "./unsubscribe";

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

/**
 * Envoie l'email de bienvenue contenant le lien vers le memo.
 *
 * Le template vit dans `email_templates` et s'edite dans l'administration du
 * site, comme les autres transactionnels — plutot que chez Brevo, ou Carole
 * aurait eu deux endroits ou modifier ses emails et un editeur de moins.
 *
 * Un lien, pas une piece jointe : un fichier joint degrade la delivrabilite, et
 * il fige le memo dans les boites de reception — le remplacer n'aurait aucun
 * effet sur les envois passes.
 *
 * Toute erreur est enregistree plutot que remontee : le consentement a ete
 * recueilli et le contact est dans la liste, un email de bienvenue manquant ne
 * justifie pas d'afficher un echec a quelqu'un qui vient de s'inscrire.
 */
export const sendWelcomeEmail = async ({
  subscriberId,
  email,
  firstName,
  unsubscribeToken,
}: {
  subscriberId: string;
  email: string;
  firstName: string;
  unsubscribeToken: string;
}) => {
  const supabase = createAdminClient();

  try {
    const sent = await sendNewsletterWelcome(email, {
      first_name: firstName,
      memo_url: await getMemoUrl(),
      unsubscribe_url: unsubscribeUrlFor(unsubscribeToken),
    });

    await supabase
      .from("newsletter_subscribers")
      .update(
        sent
          ? {
              welcome_email_sent_at: new Date().toISOString(),
              welcome_email_error: null,
            }
          : {
              // Le template est protege par `REQUIRED_TEMPLATES`, mais il peut
              // manquer tant que « Restaurer les templates par defaut » n'a pas
              // ete lance sur un environnement neuf.
              welcome_email_error:
                "Template « newsletter_welcome » absent de la base",
            },
      )
      .eq("id", subscriberId);
  } catch (error) {
    console.error("[newsletter] email de bienvenue non envoyé", error);
    await supabase
      .from("newsletter_subscribers")
      .update({ welcome_email_error: "Envoi impossible" })
      .eq("id", subscriberId);
  }
};
