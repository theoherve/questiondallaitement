export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

/**
 * Clés VAPID, ou `null` si la configuration est incomplète.
 *
 * `null` plutôt qu'une exception : une notification in-app ne doit pas échouer
 * parce que le push est mal configuré. L'appelant logue et passe.
 *
 * Ces clés sont engendrées une fois et jamais changées : les changer
 * invaliderait tous les abonnements existants d'un coup.
 */
export const vapidConfig = (): VapidConfig | null => {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
};
