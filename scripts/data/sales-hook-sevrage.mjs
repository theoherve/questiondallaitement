/**
 * Accroches de bénéfice par chapitre — accompagnement « Je souhaite sevrer
 * mon bébé » (accompagnement_sections.sales_hook, migration 00079).
 *
 * `searchTitles` et `newTitle` sont identiques : aucun renommage demandé,
 * seul `sales_hook` est rempli, et seulement sur correspondance exacte
 * (insensible casse/espaces) — jamais par proximité devinée.
 */
export const SALES_HOOKS_SEVRAGE = [
  {
    searchTitles: [
      "Êtes-vous prête à tourner la page de l'allaitement ?",
      "Quiz : Êtes-vous prête à tourner la page de l'allaitement ?",
      "Quiz : Etes-vous prête à tourner la page de l'allaitement ?",
    ],
    newTitle: "Êtes-vous prête à tourner la page de l'allaitement ?",
    hook: "Vous ferez le point sur votre situation et vos ressentis avant de vous engager dans une démarche de sevrage.",
  },
  {
    searchTitles: ["Vous ne devez rien à personne. Cette décision est intime..."],
    newTitle: "Vous ne devez rien à personne. Cette décision est intime...",
    hook: "Vous poserez cette décision sur vos propres critères, sans céder à la pression de votre entourage ni à une date arbitraire.",
  },
  {
    searchTitles: [
      "Mon bébé est-il en train de se sevrer ou faut-il une grève de la tétée ?",
      "Mon bébé est-il en train se sevrer ou faut-il une grève de la tétée ?",
    ],
    newTitle: "Mon bébé est-il en train de se sevrer ou faut-il une grève de la tétée ?",
    hook: "Vous saurez distinguer un sevrage naturel d'une grève de la tétée passagère, pour ne pas arrêter un allaitement qui aurait pu continuer.",
  },
  {
    searchTitles: ["Les déterminants du sevrage"],
    newTitle: "Les déterminants du sevrage",
    hook: "Vous identifierez ce qui influence réellement le bon moment et le bon rythme de sevrage pour votre situation.",
  },
  {
    searchTitles: ["Comment procéder en pratique ?"],
    newTitle: "Comment procéder en pratique ?",
    hook: "Vous saurez par où commencer et à quel rythme avancer, sans y aller à l'aveugle.",
  },
  {
    searchTitles: ["Le sevrage nocturne"],
    newTitle: "Le sevrage nocturne",
    hook: "Vous saurez aborder spécifiquement les tétées de nuit, souvent les plus difficiles à lâcher.",
  },
  {
    searchTitles: ["Et les émotions dans tout ça ?"],
    newTitle: "Et les émotions dans tout ça ?",
    hook: "Vous saurez accueillir ce que ce sevrage réveille en vous, sans avoir à le vivre seule ou en silence.",
  },
  {
    searchTitles: ["Dépasser les aléas"],
    newTitle: "Dépasser les aléas",
    hook: "Vous saurez gérer l'engorgement, un refus de biberon ou une réaction inattendue de votre bébé, sans que ça ne remette tout en question.",
  },
  {
    searchTitles: ["Bonus"],
    newTitle: "Bonus",
    hook: "Vous aurez de quoi tenir les nuits qui suivent le sevrage, une période souvent sous-estimée.",
  },
];
