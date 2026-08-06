/**
 * L'editeur riche ne renvoie jamais null : un champ vide vaut "", "<p></p>"
 * ou "<p><br></p>" selon le chemin de saisie. On ramene ces coquilles a null
 * pour que la page publique teste simplement la presence de la valeur.
 *
 * Ce helper vit hors des actions serveur : un fichier "use server" ne peut
 * exporter que des fonctions asynchrones.
 */
export const normalizeRichText = (
  value: string | null | undefined,
): string | null => {
  if (!value) return null;
  const withoutMarkup = value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
  return withoutMarkup.trim() === "" ? null : value;
};
