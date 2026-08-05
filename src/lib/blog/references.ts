/**
 * Prépare le HTML des références pour l'affichage public.
 *
 * L'éditeur enregistre les liens sans `target` ni `rel` : ouvrir une source
 * dans le même onglet fait perdre sa lecture, et un lien externe sans
 * `noopener` donne à la page cible une prise sur la nôtre. On ajoute donc les
 * deux à l'affichage plutôt que de migrer le HTML déjà enregistré.
 *
 * Pas de `nofollow` : ce sont de vraies citations, les suivre est le
 * comportement attendu.
 *
 * Les liens relatifs (`/blog/...`) sont laissés tels quels — rester dans
 * l'onglet est le bon comportement pour une page du site.
 */
export const withSafeExternalLinks = (html: string): string =>
  html.replace(/<a\b([^>]*)>/gi, (tag, attributes: string) => {
    if (!/href\s*=\s*["']https?:\/\//i.test(attributes)) return tag;

    let next = attributes;
    if (!/\btarget\s*=/i.test(next)) next += ' target="_blank"';
    // Un `rel` deja pose par l'editeur (bouton CTA) est conserve : il contient
    // deja noopener noreferrer.
    if (!/\brel\s*=/i.test(next)) next += ' rel="noopener noreferrer"';

    return `<a${next}>`;
  });

/** `true` quand le HTML ne contient aucun texte ni média affichable. */
export const isBlankHtml = (html: string | null | undefined): boolean => {
  if (!html) return true;

  const withoutMedia = html.replace(/<(img|iframe|video|audio)\b[^>]*>/gi, "média");
  const text = withoutMedia
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();

  return text.length === 0;
};
