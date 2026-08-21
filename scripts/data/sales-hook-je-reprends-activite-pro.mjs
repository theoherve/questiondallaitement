/**
 * Accroches de bénéfice par chapitre — accompagnement « Je reprends une
 * activité professionnelle » (accompagnement_sections.sales_hook, migration
 * 00079).
 *
 * `searchTitles` et `newTitle` sont identiques : aucun renommage demandé,
 * seul `sales_hook` est rempli, et seulement sur correspondance exacte
 * (insensible casse/espaces) — jamais par proximité devinée.
 */
export const SALES_HOOKS_JE_REPRENDS_ACTIVITE_PRO = [
  {
    searchTitles: [
      "Allaitement et travail, êtes-vous prête ?",
      "Quiz : Allaitement et travail, êtes-vous prête ?",
    ],
    newTitle: "Allaitement et travail, êtes-vous prête ?",
    hook: "Vous ferez le point sur ce qui est déjà en place et sur ce qu'il reste à organiser avant votre reprise.",
  },
  {
    searchTitles: ["Maintenir une lactation solide"],
    newTitle: "Maintenir une lactation solide",
    hook: "Vous saurez protéger votre lactation malgré l'éloignement de votre bébé et le rythme professionnel qui s'impose.",
  },
  {
    searchTitles: ["Comment tirer son lait ?"],
    newTitle: "Comment tirer son lait ?",
    hook: "Vous maîtriserez un geste efficace et confortable, pour tirer un maximum de lait dans le minimum de temps disponible.",
  },
  {
    searchTitles: ["Nourrir mon bébé en mon absence"],
    newTitle: "Nourrir mon bébé en mon absence",
    hook: "Vous saurez organiser la prise du lait par une tierce personne sans mettre en péril l'allaitement à votre retour.",
  },
  {
    searchTitles: ["Mon entourage : hiérarchie, modes de garde"],
    newTitle: "Mon entourage : hiérarchie, modes de garde",
    hook: "Vous saurez poser le cadre avec votre employeur et le mode de garde, pour que votre allaitement soit respecté plutôt que subi.",
  },
  {
    searchTitles: ["Comment réagir face aux aléas ?"],
    newTitle: "Comment réagir face aux aléas ?",
    hook: "Vous garderez le cap face aux imprévus du quotidien professionnel, sans que le moindre grain de sable ne remette votre allaitement en question.",
  },
  {
    searchTitles: ["La gestion de mon lait"],
    newTitle: "La gestion de mon lait",
    hook: "Vous saurez conserver, transporter et doser votre lait en toute sécurité, sans gaspillage ni prise de risque.",
  },
  {
    searchTitles: ["Ce qui se vit au moment de la reprise"],
    newTitle: "Ce qui se vit au moment de la reprise",
    hook: "Vous saurez à quoi vous attendre émotionnellement le jour J, pour ne pas être submergée par ce qui n'avait pas été anticipé.",
  },
  {
    searchTitles: ["Ma check-list reprise du travail", "Ma checklist reprise du travail"],
    newTitle: "Ma check-list reprise du travail",
    hook: "Vous repartirez avec la liste précise de ce qu'il faut avoir réglé avant votre premier jour.",
  },
  {
    searchTitles: ["Bonus"],
    newTitle: "Bonus",
    hook: "Vous irez plus loin sur le sommeil et le cododo, deux sujets qui reviennent souvent au moment de la reprise.",
  },
];
