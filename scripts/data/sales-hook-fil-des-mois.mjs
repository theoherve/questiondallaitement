/**
 * Accroches de bénéfice par chapitre — module « Mon allaitement au fil des
 * mois » (accompagnement_sections.sales_hook, migration 00079).
 *
 * `searchTitles` liste les intitulés de chapitre susceptibles d'exister en
 * base aujourd'hui (un export d'audit hors-ligne, potentiellement périmé, en
 * a inspiré une partie). Le script ne renomme/ne remplit que les chapitres
 * dont le titre correspond exactement (insensible à la casse/aux espaces) à
 * une entrée de `searchTitles` — jamais par proximité devinée. `newTitle` est
 * le titre cible ; `hook` va dans `sales_hook`.
 *
 * `searchTitles: []` signifie « chapitre à créer, n'existe pas encore en
 * base » : le script le signale sans y toucher.
 */
export const SALES_HOOKS_FIL_DES_MOIS = [
  {
    searchTitles: [
      "Savez-vous distinguer le normal de l'inquiétant ?",
      "Quiz : Savez-vous distinguer le normal de l'inquiétant ?",
    ],
    newTitle: "Savez-vous distinguer le normal de l'inquiétant ?",
    hook: "Vous ferez le point sur ce qui relève du normal et ce qui mérite une vraie vigilance.",
  },
  {
    searchTitles: ["J'ai mal"],
    newTitle: "J'ai mal",
    hook: "Vous saurez reconnaître une mastite et la soigner sans les faux réflexes (froid, arrêt du tire-lait) qui aggravent souvent la situation.",
  },
  {
    searchTitles: ["Je suis inquiète pour mon allaitement", "Je suis inquiète pour ma lactation"],
    newTitle: "Je suis inquiète pour ma lactation",
    hook: "Vous saurez évaluer objectivement si votre lactation baisse réellement, au lieu de vous fier à des signes trompeurs.",
  },
  {
    searchTitles: ["Je veux plus de lait"],
    newTitle: "Je veux plus de lait",
    hook: "Vous mettrez en place les leviers qui augmentent réellement votre production, en écartant ceux qui ne servent à rien.",
  },
  {
    searchTitles: [
      "Mon bébé est agité",
      "Aléas et maux du quotidien : gaz, reflux, selles, bronchiolite",
      "Mon bébé souffre : gaz, RGO, selles rares",
    ],
    newTitle: "Mon bébé souffre : gaz, RGO, selles rares",
    hook: "Vous saurez quand un désagrément est bénin et quand il faut consulter, pour chaque symptôme courant de votre bébé.",
  },
  {
    searchTitles: [
      "Je suis inquiète pour mon bébé",
      "« Mon bébé pleure et je ne comprends pas ce qui se passe »",
    ],
    newTitle: "« Mon bébé pleure et je ne comprends pas ce qui se passe »",
    hook: "Vous apprendrez à décoder les pleurs de votre bébé au lieu de vous sentir démunie face à eux.",
  },
  {
    searchTitles: ["Je me pose des questions sur mon allaitement"],
    newTitle: "Je me pose des questions sur mon allaitement",
    hook: "Vous trouverez des réponses claires aux interrogations qui reviennent le plus souvent, sans avoir à les chercher éparpillées un peu partout.",
  },
  {
    searchTitles: ["Mon quotidien"],
    newTitle: "Mon quotidien",
    hook: "Vous aurez des réponses concrètes sur le sommeil, les stocks de lait, la méthode MAMA, le couple et le regard des autres, tout ce qui rythme réellement votre quotidien d'allaitement.",
  },
  {
    searchTitles: ["Ma check-list", "Ma checklist"],
    newTitle: "Ma checklist",
    hook: "Vous garderez sous la main les repères essentiels du module, à consulter en un coup d'œil.",
  },
  {
    searchTitles: ["Mon bébé est malade"],
    newTitle: "Mon bébé est malade",
    hook: "Vous saurez comment adapter l'allaitement pendant une maladie courante de votre bébé, sans l'interrompre par excès de précaution.",
  },
];
