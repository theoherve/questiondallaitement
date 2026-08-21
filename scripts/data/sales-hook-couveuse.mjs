/**
 * Accroches de bénéfice par chapitre — accompagnement « De la couveuse au
 * sein » (accompagnement_sections.sales_hook, migration 00079).
 *
 * `searchTitles` et `newTitle` sont identiques : aucun renommage demandé,
 * seul `sales_hook` est rempli, et seulement sur correspondance exacte
 * (insensible casse/espaces) — jamais par proximité devinée.
 */
export const SALES_HOOKS_COUVEUSE = [
  {
    searchTitles: [
      "Bébé préma ou hospitalisé, où en est votre projet d'allaitement ?",
      "Quiz : Bébé préma ou hospitalisé, où en est votre projet d'allaitement ?",
      "Quiz : Bébé préma ou hospitalisé : où en est votre projet d'allaitement ?",
    ],
    newTitle: "Bébé préma ou hospitalisé, où en est votre projet d'allaitement ?",
    hook: "Vous ferez le point sur votre situation exacte, pour savoir par où commencer sans vous éparpiller.",
  },
  {
    searchTitles: ["Qu'est-ce que la prématurité ?"],
    newTitle: "Qu'est-ce que la prématurité ?",
    hook: "Vous comprendrez ce qui se joue réellement pour votre bébé selon son terme, pour ne plus subir des informations approximatives.",
  },
  {
    searchTitles: ["Votre lait est un médicament"],
    newTitle: "Votre lait est un médicament",
    hook: "Vous saurez pourquoi votre lait compte autant pour un bébé fragile, et ce que ça change concrètement pour lui.",
  },
  {
    searchTitles: ["Les défis physiologiques du nourrisson prématuré ou vulnérable"],
    newTitle: "Les défis physiologiques du nourrisson prématuré ou vulnérable",
    hook: "Vous reconnaîtrez les limites réelles de votre bébé, pour ne plus interpréter ses réactions comme un échec de votre part.",
  },
  {
    searchTitles: ["Organiser le recueil du lait et la stimulation en l'absence de bébé"],
    newTitle: "Organiser le recueil du lait et la stimulation en l'absence de bébé",
    hook: "Vous mettrez en place une organisation de tire-lait qui protège votre lactation dès les premiers jours, même loin de votre bébé.",
  },
  {
    searchTitles: ["J'ai mal aux seins"],
    newTitle: "J'ai mal aux seins",
    hook: "Vous soulagerez rapidement la douleur, sans interrompre le recueil de votre lait.",
  },
  {
    searchTitles: ["Le peau à peau, bien plus qu'un moment de tendresse"],
    newTitle: "Le peau à peau, bien plus qu'un moment de tendresse",
    hook: "Vous comprendrez ce que le peau à peau déclenche réellement chez votre bébé et sur votre lactation, au-delà du réconfort.",
  },
  {
    searchTitles: ["Quand votre bébé rencontre le sein"],
    newTitle: "Quand votre bébé rencontre le sein",
    hook: "Vous saurez reconnaître le bon moment et la bonne posture pour les toutes premières mises au sein.",
  },
  {
    searchTitles: ["De la sonde au sein"],
    newTitle: "De la sonde au sein",
    hook: "Vous accompagnerez la transition de la sonde au sein à son rythme, sans la précipiter ni reculer par excès de prudence.",
  },
  {
    searchTitles: ["Votre place dans les soins"],
    newTitle: "Votre place dans les soins",
    hook: "Vous saurez trouver votre place de parent au milieu de l'équipe soignante, sans vous sentir spectatrice de ce qui arrive à votre bébé.",
  },
  {
    searchTitles: ["Check-list de néonatalogie", "Check list de néonatalogie"],
    newTitle: "Check-list de néonatalogie",
    hook: "Vous repartirez avec une check-list claire à garder sous la main pour chaque étape du séjour en néonatalogie.",
  },
];
