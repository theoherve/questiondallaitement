/**
 * Accroches de bénéfice par chapitre — accompagnement « Mon bébé ne fait pas
 * ses nuits » (accompagnement_sections.sales_hook, migration 00079).
 *
 * `searchTitles` et `newTitle` sont identiques : aucun renommage demandé,
 * seul `sales_hook` est rempli, et seulement sur correspondance exacte
 * (insensible casse/espaces) — jamais par proximité devinée.
 */
export const SALES_HOOKS_NUITS = [
  {
    searchTitles: ["Quiz"],
    newTitle: "Quiz",
    hook: "Un point de départ pour situer précisément où en est le sommeil de votre enfant aujourd'hui, avant même de commencer le programme.",
  },
  {
    searchTitles: ["Introduction"],
    newTitle: "Introduction",
    hook: "Vous saurez à quoi vous attendre dans cet accompagnement et comment l'utiliser selon l'âge de votre enfant.",
  },
  {
    searchTitles: ["Comprendre les besoins de l'enfant"],
    newTitle: "Comprendre les besoins de l'enfant",
    hook: "Vous saurez distinguer un sommeil normal d'un vrai trouble à traiter, pour arrêter de vous comparer aux autres bébés.",
  },
  {
    searchTitles: ["Optimiser le sommeil du nourrisson au jeune enfant"],
    newTitle: "Optimiser le sommeil du nourrisson au jeune enfant",
    hook: "Vous adapterez l'environnement et le rythme de votre enfant à chaque étape, de la naissance à cinq ans.",
  },
  {
    searchTitles: ["Alimentation et sommeil"],
    newTitle: "Alimentation et sommeil",
    hook: "Vous comprendrez le lien réel entre les tétées et les réveils nocturnes, sans dogme ni culpabilité.",
  },
  {
    searchTitles: ["Favoriser l'endormissement"],
    newTitle: "Favoriser l'endormissement",
    hook: "Vous pourrez apaiser l'endormissement sans épuiser votre allaitement ni y renoncer.",
  },
  {
    searchTitles: ["Qu'est-ce qui parasite le sommeil", "Qu’est-ce qui parasite le sommeil"],
    newTitle: "Qu'est-ce qui parasite le sommeil",
    hook: "Vous identifierez les causes concrètes qui perturbent les nuits de votre enfant, pour agir sur la bonne cause plutôt qu'au hasard.",
  },
  {
    searchTitles: ["Les habitudes de sommeil"],
    newTitle: "Les habitudes de sommeil",
    hook: "Vous poserez des repères durables, adaptés à votre famille plutôt qu'à une méthode standard.",
  },
  {
    searchTitles: ["Le bien-être des parents"],
    newTitle: "Le bien-être des parents",
    hook: "Vous prendrez soin de votre propre repos, pas seulement de celui de votre enfant.",
  },
];
