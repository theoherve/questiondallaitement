/**
 * Enregistre le clic sur un lien de la page /liens.
 *
 * `sendBeacon` plutôt que `fetch` : la navigation part dans la foulée du clic,
 * et une requête classique serait annulée par le déchargement de la page. Le
 * navigateur, lui, garantit l'envoi du beacon. Un échec est ignoré : perdre un
 * clic dans les statistiques ne doit jamais empêcher d'ouvrir le lien.
 */
export const trackBioLinkClick = (id: string): void => {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return;

  try {
    navigator.sendBeacon(`/api/liens/${id}/clic`);
  } catch {
    // Rien à faire : le clic compte moins que la destination.
  }
};
