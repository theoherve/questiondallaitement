/**
 * Source unique des avis affichés côté visiteur. Les avis Google sont recopiés
 * à la main : l'API Places interdit la mise en cache du texte des avis et n'en
 * renvoie que cinq, choisis par Google. Seuls la note globale et le nombre
 * d'avis sont récupérés en direct (voir src/lib/google-reviews.ts).
 */

import { MODULE_ORDER, PACK_SLUG } from "@/config/accompagnements";

/**
 * Cibles possibles d'un avis : un slug de module, ou le pack. Dérivé de
 * MODULE_ORDER (déclaré `as const`) et non des clés de MODULE_CONTENT, qui sont
 * typées `string` et ne contraindraient rien. Un slug mal orthographié devient
 * ainsi une erreur de compilation.
 */
export type TestimonialTopic =
  | (typeof MODULE_ORDER)[number]
  | typeof PACK_SLUG;

type TestimonialBase = {
  /** Slug stable : clé de rendu et cible de déduplication. */
  id: string;
  author: string;
  /** Contexte affiché sous le nom, par exemple « Maman de Morgan, 3 mois ». */
  detail: string;
  quote: string;
  /** Absente quand la note d'origine n'est pas connue : les étoiles sont alors
   * masquées plutôt que supposées à 5. */
  rating?: 1 | 2 | 3 | 4 | 5;
  /** Vide = avis générique, éligible au repli des pages de vente. */
  topics: readonly TestimonialTopic[];
  /** Éligible à la page d'accueil et au repli des pages de vente. */
  featured?: boolean;
  /** Date ISO (AAAA-MM-JJ). Sert uniquement à l'ordre d'affichage. */
  date?: string;
};

export type Testimonial =
  | (TestimonialBase & { source: "direct" })
  | (TestimonialBase & { source: "google"; reviewUrl: string });

/**
 * Avis fournis par Carole. Les citations sont des extraits contigus des textes
 * d'origine, jamais des phrases recomposées : le lecteur qui suit le lien d'un
 * avis Google doit retrouver exactement ce qu'il a lu ici.
 *
 * Les coquilles des avis `direct` sont corrigées, ceux-ci n'étant liés à aucune
 * source publique. Un avis `google` reste verbatim, à la virgule près.
 *
 * Seul l'avis de Sonia a pu être recoupé avec l'API Places, qui ne renvoie que
 * cinq avis sur 327. Les autres restent en `direct` faute de lien vérifiable :
 * le badge Google ne se pose que sur un avis qu'on peut prouver.
 *
 * `topics` est vide pour les avis ci-dessous : ils parlent des consultations,
 * pas des modules en ligne, et les y rattacher serait une invention. Les avis
 * qui suivent (Marie-Cécile, Justine, Marie, Lucia) portent explicitement sur
 * le pack et sont donc rattachés à `PACK_SLUG`.
 */
export const TESTIMONIALS: readonly Testimonial[] = [
  {
    id: "sonia",
    author: "Sonia",
    detail: "Consultation en présentiel, suivie par SMS",
    quote:
      "Il est très difficile de s'y retrouver dans la jungle des avis sur l'allaitement, souvent divergents, parfois contradictoires. Nous avions fini par perdre confiance. Carole a su prendre le temps de nous écouter, de remettre de la clarté, et surtout de nous redonner confiance avec beaucoup de douceur et de justesse.",
    rating: 5,
    topics: [],
    featured: true,
    date: "2026-03-24",
    source: "google",
    reviewUrl:
      "https://www.google.com/maps/reviews/data=!4m6!14m5!1m4!2m3!1sCi9DQUlRQUNvZENodHljRjlvT2s1V1EwTldabVkxVDAwd1QyUnVWVWhSZG1aUVFuYxAB!2m1!1s0x47e66fab5a541e93:0xcbf2565b88a399d0",
  },
  {
    id: "faten",
    author: "Faten",
    detail: "Accompagnée en allaitement",
    quote:
      "Ses conseils sont précieux, fondés sur des données scientifiques et toujours adaptés à notre situation. Mais au-delà de son expertise, c'est surtout sa présence humaine qui a fait toute la différence. Grâce à elle, j'ai trouvé la force de persévérer, en gardant en tête que les choses finiraient par s'améliorer.",
    topics: [],
    featured: true,
    source: "direct",
  },
  {
    id: "noella",
    author: "Noella",
    detail: "Accompagnée avant et après la naissance",
    quote:
      "Elle m'a accompagnée avec une écoute et une attention que je n'aurais jamais imaginé recevoir. Que ce soit avant la naissance ou pendant mon allaitement, elle a su être présente, rassurante et d'un soutien inestimable.",
    topics: [],
    featured: true,
    source: "direct",
  },
  {
    id: "oceane",
    author: "Océane",
    detail: "Accompagnée en allaitement",
    quote:
      "C'est une personne douce, bienveillante et très à l'écoute. Elle a su répondre à toutes mes questions avec patience et m'a apporté un vrai soutien, autant pratique qu'émotionnel. Grâce à elle, j'ai pu vivre mon allaitement plus sereinement.",
    topics: [],
    featured: true,
    source: "direct",
  },
  {
    id: "anne-sophie",
    author: "Anne-Sophie",
    detail: "Accompagnée pour deux de ses trois allaitements",
    quote:
      "Ses conseils m'ont permis de régler très rapidement les petits désagréments de mise en place et de vivre des allaitements sereins et épanouissants. Chaque femme allaitante devrait pouvoir avoir une conseillère comme Carole à ses côtés !",
    topics: ["mon-allaitement-au-fil-des-mois"],
    featured: true,
    source: "direct",
  },
  {
    id: "basma",
    author: "Basma",
    detail: "Accompagnée en allaitement",
    quote:
      "Carole est une pépite ! Non seulement elle est à l'écoute mais tellement bienveillante et disponible. J'ai été accompagnée plusieurs fois avant pour mon allaitement mais l'accompagnement avec Carole relève d'un tout autre niveau.",
    topics: ["mon-allaitement-au-fil-des-mois"],
    featured: true,
    source: "direct",
  },
  {
    id: "mathilde",
    author: "Mathilde",
    detail: "Professionnelle de santé, accompagnée puis formée",
    quote:
      "Elle a su m'accompagner quand j'ai rencontré des difficultés lors de mes allaitements (crevasses, engorgements, baisse de lactations, planning tirage pour ma reprise du travail) et m'a permis d'acquérir suffisamment de connaissances pour accompagner mes patientes lors de mes consultations.",
    topics: [],
    featured: true,
    source: "direct",
  },
  {
    id: "marie-cecile",
    author: "Marie-Cécile",
    detail: "Sage-femme",
    quote:
      "Hier une amie SF m'a demandé des conseils pour un bébé de 4 mois né au 93eP et actuellement au 49eP, avec un contexte de reprise du travail. J'ai passé du temps à reprendre tes ressources pour approfondir mes réponses. Je voulais encore une fois te remercier pour la qualité du contenu de ton pack et des mises à jour qui m'ont permis d'affiner encore mes connaissances et mon discours (en particulier le PPT sur le nombre d'or) et aussi de le structurer. Et comme à chaque fois, ça m'a donné envie de dire aux parents motivés d'y souscrire parce qu'il y a une réelle plus-value. Quelle somme de travail !",
    topics: [PACK_SLUG],
    source: "direct",
  },
  {
    id: "justine",
    author: "Justine",
    detail: "2 allaitements réussis",
    quote:
      "Je voudrais vous dire que je suis carrément plus confiante en mon allaitement dès le départ, grâce à toutes les infos que je pioche dans vos packs vidéos. Merci pour ce que vous faites. Et si mon allaitement avec ma 1ère a duré 2 ans et demi, c'est grâce à vous. J'aimerais que vous fassiez le tour de toutes les maternités de France pour former les pros qui accompagnent les mamans.",
    topics: [PACK_SLUG],
    source: "direct",
  },
  {
    id: "marie",
    author: "Marie",
    detail: "Consultante en lactation IBCLC",
    quote:
      "Je suis en train de visionner votre pack en tant que professionnelle sage-femme et consultante en lactation afin d'affiner encore mes prises en charge. Tout d'abord bravo pour vos contenus qui sont vraiment supers et faciles à écouter et à s'approprier. Une belle ressource pour les parents, venant assurément d'une belle personne.",
    topics: [PACK_SLUG],
    source: "direct",
  },
  {
    id: "lucia",
    author: "Lucia",
    detail: "Relance de la lactation, allergie aux protéines de lait de vache",
    quote:
      "Je parcours le pack avec beaucoup d'intérêt et mets en place une nouvelle stimulation de la lactation avec le maternage et le tirage, depuis vendredi matin.",
    topics: [PACK_SLUG],
    source: "direct",
  },
  {
    id: "melodie",
    author: "Mélodie",
    detail: "Maman d'Opale, 6,5 mois",
    quote:
      "Au vu des galères du début, je n'osais pas y croire. Aujourd'hui, ma fille est exclusivement allaitée et en pleine santé. Merci pour ce soutien précieux qui m'a redonné confiance.",
    topics: ["mon-allaitement-au-fil-des-mois"],
    source: "direct",
  },
  {
    id: "caroline",
    author: "Caroline",
    detail: "Maman de petit garçon, 13 mois",
    quote:
      "Incroyable tous les progrès de mon fils ! On s'est tellement battus et voilà, 13 mois plus tard, on y est : des petites tétées qu'il réclame avec joie. Un grand merci pour votre accompagnement !",
    topics: ["mon-allaitement-au-fil-des-mois"],
    source: "direct",
  },
];

/**
 * Fiche Google. Les valeurs de repli servent quand l'API est indisponible ou
 * non configurée ; les tenir à jour à la main reste sans conséquence, elles ne
 * sont affichées que dans ce cas.
 */
export const GOOGLE_PROFILE = {
  url: "https://search.google.com/local/reviews?placeid=ChIJkx5UWqtv5kcR0JmjiFtW8ss",
  ratingFallback: 4.9,
  reviewCountFallback: 327,
} as const;
