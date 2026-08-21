/**
 * Accroches de bénéfice par chapitre — accompagnement « Je me prépare à
 * allaiter » (accompagnement_sections.sales_hook, migration 00079).
 *
 * Contrairement au script fil-des-mois, aucun renommage n'est demandé ici :
 * `searchTitles` et `newTitle` sont identiques, le script ne fait que
 * remplir `sales_hook` sur le chapitre dont le titre correspond exactement
 * (insensible à la casse/aux espaces) — jamais par proximité devinée.
 */
export const SALES_HOOKS_JE_ME_PREPARE = [
  {
    searchTitles: [
      "Suis-je vraiment prête à allaiter mon bébé ?",
      "Quiz : Suis-je vraiment prête à allaiter mon bébé ?",
    ],
    newTitle: "Suis-je vraiment prête à allaiter mon bébé ?",
    hook: "Vous ferez le point sur ce que vous savez déjà et sur ce qu'il vous reste à comprendre, avant même l'arrivée de votre bébé.",
  },
  {
    searchTitles: ["Mon corps sait déjà quoi faire"],
    newTitle: "Mon corps sait déjà quoi faire",
    hook: "Vous comprendrez les mécanismes innés de votre corps et de votre bébé, pour aborder l'allaitement en confiance plutôt qu'en terrain inconnu.",
  },
  {
    searchTitles: ["Mes peurs, et ce qu'il y a vraiment derrière"],
    newTitle: "Mes peurs, et ce qu'il y a vraiment derrière",
    hook: "Vous identifierez ce qui se cache réellement derrière chacune de vos craintes, pour ne plus vous laisser paralyser par elles le moment venu.",
  },
  {
    searchTitles: ["Les 3 premiers jours"],
    newTitle: "Les 3 premiers jours",
    hook: "Vous saurez à quoi vous attendre dans les tout premiers jours, au lieu de découvrir chaque étape dans l'urgence.",
  },
  {
    searchTitles: ["Ma vie avec l'allaitement"],
    newTitle: "Ma vie avec l'allaitement",
    hook: "Vous anticiperez l'organisation du quotidien avec un bébé allaité, pour ne pas être prise au dépourvu une fois rentrée chez vous.",
  },
  {
    searchTitles: ["Bonus"],
    newTitle: "Bonus",
    hook: "Vous irez plus loin sur des points précis, à picorer selon vos besoins spécifiques.",
  },
  {
    searchTitles: ["Ma check-list avant l'accouchement", "Ma checklist avant l'accouchement"],
    newTitle: "Ma check-list avant l'accouchement",
    hook: "Vous repartirez avec une liste claire de ce qu'il faut avoir vérifié ou préparé avant le jour J.",
  },
];
