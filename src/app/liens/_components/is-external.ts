/**
 * Une adresse est externe dès qu'elle porte son propre schéma. Les liens
 * internes sont saisis en chemin (« /accompagnements/… ») depuis
 * l'administration : c'est la règle que valide déjà le formulaire.
 */
export const isExternal = (url: string | null): boolean =>
  Boolean(url && !url.startsWith("/"));
