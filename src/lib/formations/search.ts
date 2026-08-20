/**
 * Normalise une chaine pour une comparaison insensible a la casse et aux
 * accents : « Éligible » et « eligible » doivent matcher la meme recherche.
 */
export const normalizeSearchText = (str: string): string =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Le titre d'une formation contient-il la recherche tapee ? */
export const matchesFormationSearch = (title: string, query: string): boolean => {
  const normalizedQuery = normalizeSearchText(query.trim());
  if (!normalizedQuery) return true;
  return normalizeSearchText(title).includes(normalizedQuery);
};
