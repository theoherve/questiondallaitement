const MAX_LENGTH = 64;

/** Lettres, chiffres, tiret et souligné. Rien d'autre. */
const SAFE = /^[a-z0-9_-]+$/;

/**
 * Nettoie la provenance lue dans l'URL d'inscription.
 *
 * La valeur vient d'un paramètre de requête : n'importe qui peut en forger une,
 * et elle finit affichée dans le backoffice. On n'accepte donc qu'un mot simple,
 * et on refuse tout le reste plutôt que d'échapper à l'affichage.
 */
export const resolveAcquisitionSource = (
  raw: string | null | undefined
): string | null => {
  if (!raw) return null;

  const value = raw.trim().toLowerCase().slice(0, MAX_LENGTH);
  if (!value) return null;
  if (!SAFE.test(value)) return null;

  return value;
};
