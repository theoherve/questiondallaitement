/**
 * Helpers navigateur du push. Strictement client : aucun import serveur ici,
 * ce module est chargé par un composant `"use client"`.
 */

/**
 * La clé publique VAPID voyage en base64url ; l'API attend des octets.
 *
 * Le tableau est adossé à un `ArrayBuffer` explicite : `new Uint8Array(taille)`
 * produit un `Uint8Array<ArrayBufferLike>`, que TypeScript refuse là où
 * `PushManager.subscribe` attend un `BufferSource`.
 */
export const urlBase64ToUint8Array = (
  base64: string,
): Uint8Array<ArrayBuffer> => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
};

export const isPushSupported = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const isIos = (): boolean =>
  typeof window !== "undefined" &&
  /iphone|ipad|ipod/i.test(window.navigator.userAgent);

/**
 * Vrai quand le site tourne depuis l'écran d'accueil. C'est la condition
 * qu'iOS impose au push : `standalone` est la propriété propre à Safari,
 * `display-mode` la version standard.
 */
export const isStandalone = (): boolean =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true);

export type DeviceSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
};

/**
 * Enregistre le service worker, demande l'autorisation, s'abonne, et renvoie de
 * quoi enregistrer l'abonnement côté serveur.
 *
 * Lève quand l'autorisation est refusée : **un refus est définitif**, le
 * navigateur ne redemandera plus, et l'appelant doit l'expliquer plutôt que de
 * laisser cliquer en boucle.
 */
export const subscribeThisDevice = async (
  publicKey: string,
): Promise<DeviceSubscription> => {
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Autorisation refusée");
  }

  // Un abonnement existant est réutilisé : re-souscrire avec la même clé
  // renverrait le même endpoint, mais autant éviter l'aller-retour.
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const keys = subscription.toJSON().keys;
  if (!keys?.p256dh || !keys?.auth) {
    throw new Error("Abonnement sans clés de chiffrement");
  }

  return {
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    userAgent: window.navigator.userAgent.slice(0, 300),
  };
};
