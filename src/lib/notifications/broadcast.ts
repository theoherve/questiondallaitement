import { randomUUID } from "crypto";
import { notify } from "./notify";
import { resolveAudience } from "./audience";
import type { AudienceRule } from "./audience";

/** Audiences proposées dans l'écran de diffusion. */
export type BroadcastAudience =
  | { kind: "all_clients" }
  | { kind: "accompagnement_holders" }
  | { kind: "segment"; segmentId: string };

export type BroadcastInput = {
  title: string;
  body: string;
  href?: string;
  audience: BroadcastAudience;
};

/**
 * Nombre de destinataires d'une audience, sans rien envoyer.
 *
 * Sert l'aperçu de l'écran : voir « 128 personnes » avant de cliquer change la
 * nature du geste. Le compte ne tient pas compte des préférences, qui ne
 * s'appliquent qu'à l'envoi, destinataire par destinataire : c'est un majorant.
 */
export const countAudience = async (
  audience: BroadcastAudience
): Promise<number> => {
  const recipients = await resolveAudience(
    "broadcast_message",
    audience as AudienceRule
  );
  return recipients.length;
};

/**
 * Diffuse un message libre aux utilisatrices de l'application.
 *
 * Sans rapport avec les campagnes newsletter de `admin/marketing`, qui partent
 * chez Brevo vers des listes Brevo. Ici l'audience est faite de profils, les
 * préférences s'appliquent et l'email porte son lien de désinscription.
 */
export const sendUserBroadcast = async (
  input: BroadcastInput
): Promise<{ sent: number }> => {
  const recipients = await resolveAudience(
    "broadcast_message",
    input.audience as AudienceRule
  );

  if (recipients.length === 0) return { sent: 0 };

  // Cle propre a cet envoi : deux annonces au meme libelle sont deux annonces,
  // et la seconde ne doit pas etre avalee par la deduplication.
  const dedupeId = randomUUID();

  await notify(
    "broadcast_message",
    recipients,
    { title: input.title, body: input.body, href: input.href },
    { dedupeId }
  );

  return { sent: recipients.length };
};
