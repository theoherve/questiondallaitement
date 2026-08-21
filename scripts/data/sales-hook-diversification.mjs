/**
 * Accroches de bénéfice par chapitre — accompagnement « La diversification de
 * mon bébé allaité » (accompagnement_sections.sales_hook, migration 00079).
 *
 * `searchTitles` et `newTitle` sont identiques : aucun renommage demandé,
 * seul `sales_hook` est rempli, et seulement sur correspondance exacte
 * (insensible casse/espaces) — jamais par proximité devinée.
 */
export const SALES_HOOKS_DIVERSIFICATION = [
  {
    searchTitles: [
      "Diversification alimentaire, démêlez le vrai du faux !",
      "Quiz : Diversification alimentaire, démêlez le vrai du faux !",
      "Quiz Diversification alimentaire : Démêlez le vrai du faux !",
    ],
    newTitle: "Diversification alimentaire, démêlez le vrai du faux !",
    hook: "Vous ferez le tri entre ce que vous savez déjà et les idées reçues qui circulent encore sur la diversification.",
  },
  {
    searchTitles: ["Pourquoi diversifier ?"],
    newTitle: "Pourquoi diversifier ?",
    hook: "Vous comprendrez ce que la diversification apporte réellement à votre bébé allaité, au-delà du simple passage obligé.",
  },
  {
    searchTitles: ["Quand diversifier ?"],
    newTitle: "Quand diversifier ?",
    hook: "Vous saurez reconnaître les signes de disponibilité de votre bébé, plutôt que de vous fier uniquement à son âge en mois.",
  },
  {
    searchTitles: ["Comment diversifier ?"],
    newTitle: "Comment diversifier ?",
    hook: "Vous saurez par où commencer, dans quel ordre et avec quelles quantités, sans improviser au jour le jour.",
  },
  {
    searchTitles: ["Les aléas de la diversification"],
    newTitle: "Les aléas de la diversification",
    hook: "Vous saurez réagir sereinement face aux refus, régressions ou petits couacs qui ponctuent presque toujours cette étape.",
  },
  {
    searchTitles: ["Bonus"],
    newTitle: "Bonus",
    hook: "Vous irez plus loin sur l'alimentation pratique et le sommeil, deux sujets qui accompagnent naturellement la diversification.",
  },
];
