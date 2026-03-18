export type MediaItem = {
  title: string;
  show: string;
  duration: string | null;
  href: string | null;
  type: "podcast" | "video";
};

export const PODCASTS: MediaItem[] = [
  {
    title: "Allaiter, pourquoi un tel moment de solitude ?",
    show: "Galère sa Mère — Parents.fr",
    duration: "36 min",
    href: "https://www.parents.fr/podcast/galere-sa-mere/allaiter-pourquoi-un-tel-moment-de-solitude-432634",
    type: "podcast",
  },
  {
    title: "Les mythes qui entourent l'allaitement",
    show: "J'Allaite",
    duration: "32 min",
    href: "https://podcasts.apple.com/us/podcast/carole-herv%C3%A9-les-mythes-qui-entourent-lallaitement/id1523997283?i=1000535244621",
    type: "podcast",
  },
  {
    title: "Tout savoir sur le co-allaitement",
    show: "J'Allaite",
    duration: "1 h",
    href: "https://podcasts.apple.com/us/podcast/32-carole-herv%C3%A9-tout-savoir-sur-le-co-allaitement/id1523997283?i=1000522994700",
    type: "podcast",
  },
  {
    title:
      "Allaiter ou ne pas allaiter ? Telle est la question.",
    show: "Relax, vous êtes parents",
    duration: "47 min",
    href: "https://www.sogoodstories.com/episode/questions-dallaitement-avec-carole-herve-2/",
    type: "podcast",
  },
  {
    title:
      "Travailler ou reprendre des études tout en allaitant, c'est possible !",
    show: "France Bleu Lorraine",
    duration: "27 min",
    href: "https://www.francebleu.fr/emissions/circuit-bleu-cote-expert-avec-france-bleu-lorraine-nord/lorraine-nord/allaiter-et-travailler-ou-reprendre-des-etudes",
    type: "podcast",
  },
  {
    title: "Allaiter, est-ce toujours possible ?",
    show: "La Famelia",
    duration: "20 min",
    href: "https://podcast.ausha.co/la-famelia/8-allaiter-est-ce-toujours-possible-avec-carole-herve",
    type: "podcast",
  },
  {
    title:
      "Alimentation autonome : quels sont les bienfaits de la DME ?",
    show: "La Famelia",
    duration: "23 min",
    href: "https://podcast.ausha.co/la-famelia/12-alimentation-autonome-quels-sont-les-bienfaits-de-la-dme-avec-carole-herve",
    type: "podcast",
  },
  {
    title:
      "Les premiers jours de l'allaitement : comment bien démarrer ?",
    show: "La Famelia",
    duration: "40 min",
    href: "https://podcast.ausha.co/la-famelia/2-premiers-jours-allaitement-comment-bien-demarrer-carole-herve",
    type: "podcast",
  },
  {
    title:
      "Bien réussir la diversification alimentaire de son bébé",
    show: "La Famelia",
    duration: "24 min",
    href: "https://www.youtube.com/watch?v=s4xOo3408qc",
    type: "podcast",
  },
  {
    title:
      "Est-ce vraiment mieux d'allaiter mon bébé ?",
    show: "Sage-Meuf — Europe 1",
    duration: "9 min",
    href: "https://www.youtube.com/watch?v=OIAiNjvkaME",
    type: "podcast",
  },
  {
    title: "Allaitement et féminisme — Table ronde",
    show: "TajineBanane / Papatriarcat",
    duration: "1 h 22 min",
    href: "https://www.youtube.com/watch?v=ZhSHRJpCQzg",
    type: "podcast",
  },
  {
    title:
      "Forme des mamelons et allaitement / Mamelons ombiliqués",
    show: "Milkshaker",
    duration: "36 min",
    href: "https://www.youtube.com/watch?v=ZoKB0UAf7gM",
    type: "podcast",
  },
  {
    title:
      "Introduire un biberon, comment s'y prendre",
    show: "Milkshaker",
    duration: "52 min",
    href: "https://www.youtube.com/watch?v=y6X9d_iHCbs",
    type: "podcast",
  },
  {
    title: "La richesse de l'allaitement",
    show: "Entre mères",
    duration: "48 min",
    href: "https://podcast.ausha.co/entre-meres/19-carole-herve-la-richesse-de-l-allaitement",
    type: "podcast",
  },
  {
    title:
      "Carole Hervé : Allaiter bébé en toute sérénité",
    show: "Parents Conscients — Métamorphose",
    duration: null,
    href: "https://www.metamorphosepodcast.com/podcast/parents-conscients-carole-herve-et-si-vous-allaitiez-en-tout",
    type: "podcast",
  },
];

export const VIDEOS: MediaItem[] = [
  {
    title: "Mon bébé refuse le biberon : que faire ?",
    show: "La Maison des Maternelles",
    duration: "20 min",
    href: "https://www.youtube.com/watch?v=PzIT1mBV4e4",
    type: "video",
  },
  {
    title: "Freins de langue : les couper… ou pas ?",
    show: "La Maison des Maternelles",
    duration: "26 min",
    href: "https://www.youtube.com/watch?v=zjMjMxdFhFw",
    type: "video",
  },
  {
    title: "Allaitement : la France à la traîne",
    show: "La Maison des Maternelles",
    duration: "5 min",
    href: "https://www.youtube.com/watch?v=esV-ic-uDfM",
    type: "video",
  },
  {
    title: "Comment arrêter l'allaitement ?",
    show: "La Maison des Maternelles",
    duration: "31 min",
    href: "https://www.youtube.com/watch?v=xwT5sDMDsMI",
    type: "video",
  },
  {
    title: "Allaitement & reprise du travail",
    show: "Les RDV allaitement — Medela",
    duration: "29 min",
    href: "https://www.youtube.com/watch?v=6mADq5L_t8k",
    type: "video",
  },
  {
    title:
      "J'ai réduit ou arrêté mon allaitement, puis-je recommencer ?",
    show: "Parents.fr",
    duration: "2 min",
    href: "https://www.youtube.com/watch?v=cI454V7itbg",
    type: "video",
  },
  {
    title:
      "Quelles sont les bonnes positions pour allaiter ?",
    show: "Kidd'izy",
    duration: "3 min",
    href: "https://www.youtube.com/watch?v=kQ0v1XTy5xw",
    type: "video",
  },
  {
    title:
      "Faut-il aller chez une consultante en lactation avant l'accouchement ?",
    show: "Kidd'izy",
    duration: "5 min",
    href: "https://www.youtube.com/watch?v=qRPNBnjLb3c",
    type: "video",
  },
  {
    title:
      "Allaitement : conseils d'une pro — Replay vidéo",
    show: "Parents.fr",
    duration: "32 min",
    href: "https://www.parents.fr/videos/etre-parent/allaitement-conseils-dune-pro-un-replay-video-de-vos-questions-a-carole-herve-consultante-en-lactation-337373",
    type: "video",
  },
  {
    title: "Engorgement du sein",
    show: "Kidd'izy",
    duration: "3 min",
    href: "https://www.youtube.com/watch?v=-QKbvGbooVI",
    type: "video",
  },
  {
    title:
      "Comment se passent les premiers jours d'allaitement ?",
    show: "Kidd'izy",
    duration: "4 min",
    href: "https://www.youtube.com/watch?v=sCW3rB2gRX4",
    type: "video",
  },
  {
    title:
      "Allaiter et travailler, c'est possible !",
    show: "Parents.fr",
    duration: "3 min",
    href: "https://ms-my.facebook.com/169489401111/videos/519390525322465/",
    type: "video",
  },
  {
    title: "Le métier de consultante en lactation",
    show: "Kidd'izy",
    duration: "2 min",
    href: "https://www.facebook.com/kiddizygroup/videos/2697804736997742/",
    type: "video",
  },
  {
    title: "Allaitement & sexualité",
    show: "Les RDV allaitement — Medela",
    duration: "15 min",
    href: "https://www.youtube.com/watch?v=pqqX3C6moi0",
    type: "video",
  },
  {
    title: "La place du second parent dans l'allaitement",
    show: "Parents.fr",
    duration: "2 min",
    href: "https://www.facebook.com/Parents.fr/videos/341659611078117/",
    type: "video",
  },
];

export const PRESS_HASHTAGS = [
  "allaitement",
  "perinatalite",
  "responsabiliteparentale",
  "accompagnementparental",
  "consultanteenlactation",
  "ibclc",
  "formationperinatale",
  "caroleherve",
  "parentalite",
  "empowermentfeminin",
  "sommeilbebe",
];
