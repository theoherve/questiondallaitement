/**
 * Accroches de bénéfice par chapitre — accompagnement « Les urgences de
 * l'allaitement » (accompagnement_sections.sales_hook, migration 00079).
 *
 * Le brief de copywriting pour ce module ne donnait pas de ligne par
 * chapitre (contrairement aux autres modules) : ces accroches sont écrites
 * à partir des titres réels en base, dans le même ton que les autres pages.
 *
 * `searchTitles` et `newTitle` sont identiques : aucun renommage, seul
 * `sales_hook` est rempli, et seulement sur correspondance exacte
 * (insensible casse/espaces) — jamais par proximité devinée.
 */
export const SALES_HOOKS_URGENCES = [
  {
    searchTitles: ["Comment éviter une complication si j'ai mal", "Quiz : Comment éviter une complication si j'ai mal"],
    newTitle: "Comment éviter une complication si j'ai mal",
    hook: "Vous ferez le point sur votre situation exacte, pour aller directement à la conduite à tenir qui vous concerne.",
  },
  {
    searchTitles: ["J'ai des crevasses"],
    newTitle: "J'ai des crevasses",
    hook: "Vous saurez ce qui les entretient réellement et comment les faire cicatriser, au lieu de multiplier les crèmes sans effet.",
  },
  {
    searchTitles: ["J'ai un engorgement"],
    newTitle: "J'ai un engorgement",
    hook: "Vous saurez quels gestes soulagent vraiment un engorgement, et lesquels risquent de l'aggraver.",
  },
  {
    searchTitles: ["J'ai un canal bouché"],
    newTitle: "J'ai un canal bouché",
    hook: "Vous saurez le débloquer avec les bons gestes, sans vous acharner sur des massages qui ne servent à rien.",
  },
  {
    searchTitles: ["J'ai une mastite ?"],
    newTitle: "J'ai une mastite ?",
    hook: "Vous saurez reconnaître une mastite et la traiter sans les faux réflexes qui prolongent l'inflammation.",
  },
  {
    searchTitles: ["J'ai un abcès"],
    newTitle: "J'ai un abcès",
    hook: "Vous saurez reconnaître les signes qui doivent vous alerter et ce qui se passe autour de la prise en charge médicale.",
  },
  {
    searchTitles: ["Ma checklist urgences"],
    newTitle: "Ma checklist urgences",
    hook: "Vous garderez sous la main les repères essentiels à consulter dès les premiers signes.",
  },
];
