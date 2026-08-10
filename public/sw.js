/*
 * Service worker du push navigateur.
 *
 * Servi depuis /public, donc a la racine du site : c'est une contrainte du
 * navigateur, un service worker ne recoit de push que pour son perimetre, et un
 * fichier servi depuis /_next/ ne couvrirait pas le site.
 *
 * PAS DE MISE EN CACHE, PAS DE MODE HORS LIGNE. Ce n'est pas le sujet, et un
 * cache mal regle sert des pages perimees sans qu'on s'en apercoive.
 */

self.addEventListener("install", () => {
  // Prendre la main tout de suite : sans cela, une nouvelle version attend la
  // fermeture de tous les onglets avant d'etre active.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // Une charge utile illisible ne doit pas faire disparaitre la notification :
    // le navigateur afficherait alors un message generique bien plus opaque.
    payload = { title: event.data.text() };
  }

  const title = payload.title || "Question d'Allaitement";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body,
      icon: "/logo.svg",
      badge: "/logo.svg",
      tag: payload.tag,
      data: { href: payload.href || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const href = (event.notification.data && event.notification.data.href) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Reutiliser un onglet deja ouvert plutot qu'en empiler un nouveau a
        // chaque clic.
        for (const client of clientList) {
          if (client.url.includes(href) && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(href);
      })
  );
});
