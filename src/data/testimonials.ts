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
 * le pack et sont donc rattachés à `PACK_SLUG`. Ceux d'après (Mélodie,
 * Caroline, Jennifer, Sonia, Noella, Agathe, Federica, Marine, Aurélia,
 * Servane, Cécilia, Mélodie [melodie-2], Miora, Claire, Alexandra, Doriane,
 * Mélanie, Jeanne, Justine [justine-2], Miora [miora-2], Élodie, Abida,
 * Dounia, Teodora, Noémie, Astrid, Agnieszka, Clémence, Camille,
 * Élodie [elodie-2], Sarah, Julie) portent explicitement sur un module en
 * ligne précis. Mathilde et
 * Claire ont été rattachées à un second module après coup, sans changer leur
 * citation d'origine. Miora et Justine ont un second témoignage distinct
 * (contexte et texte différents) sur un autre module, d'où le suffixe `-2`.
 */
export const TESTIMONIALS: readonly Testimonial[] = [
  {
    id: "sonia",
    author: "Sonia",
    detail: "Consultation en présentiel, suivie par SMS",
    quote:
      "Il est très difficile de s'y retrouver dans la jungle des avis sur l'allaitement, souvent divergents, parfois contradictoires. Nous avions fini par perdre confiance. Carole a su prendre le temps de nous écouter, de remettre de la clarté, et surtout de nous redonner confiance avec beaucoup de douceur et de justesse.",
    rating: 5,
    topics: ["mon-allaitement-des-premiers-jours"],
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
    topics: ["mon-allaitement-des-premiers-jours"],
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
    topics: ["je-reprends-une-activite-professionnelle"],
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
  {
    id: "jennifer",
    author: "Jennifer",
    detail: "Maman de Noah",
    quote:
      "Après des débuts difficiles, les conseils de Carole m'ont aidée à passer à l'allaitement exclusif. Son soutien lors des ateliers mensuels a été essentiel pour ne pas baisser les bras lors des moments de doute.",
    topics: ["mon-allaitement-des-premiers-jours"],
    source: "direct",
  },
  {
    id: "agathe",
    author: "Agathe",
    detail: "Maman de Thaddée",
    quote:
      "Même si je n'ai pas réussi à allaiter plus de deux mois, je garde un souvenir merveilleux de mon passage dans l'espace cocooning. On a tellement besoin d'être prise en considération après l'accouchement !",
    topics: ["mon-allaitement-des-premiers-jours"],
    source: "direct",
  },
  {
    id: "federica",
    author: "Federica",
    detail: "Long parcours de PMA",
    quote:
      "Pas d'engorgement, pas de crevasses ni de douleurs et un bébé qui prend plus de 50 grammes par jour depuis sa sortie de maternité ! Évidemment on prend les défis chaque jour quand ils arrivent, mais simplement un grand merci pour tout ce que vous apportez.",
    topics: ["mon-allaitement-des-premiers-jours"],
    source: "direct",
  },
  {
    id: "marine",
    author: "Marine",
    detail: "Maman de Diane",
    quote:
      "Grâce à l'accompagnement, j'ai déconstruit mes idées reçues. J'ai vécu un allaitement exclusif de six mois, une aventure qui m'a transformée et m'a permis de surmonter mes peurs. Sans cet accompagnement, je n'en serais pas là.",
    topics: ["je-me-prepare-a-allaiter"],
    source: "direct",
  },
  {
    id: "aurelia",
    author: "Aurélia",
    detail: "Maman accompagnée",
    quote:
      "Plus qu'une conseillère, Carole a été un véritable soutien moral. Ses conseils sont fondés sur la science et adaptés à notre situation. Grâce à sa bienveillance, j'ai trouvé la force de persévérer.",
    topics: ["je-me-prepare-a-allaiter"],
    source: "direct",
  },
  {
    id: "servane",
    author: "Servane",
    detail: "Maman accompagnée en consultation",
    quote:
      "Je suis sortie de votre cabinet confiante en mes capacités et reboostée à fond pour mon projet d'allaitement ! Toutes les mamans mériteraient d'avoir un accompagnement de cette qualité.",
    topics: ["je-me-prepare-a-allaiter"],
    source: "direct",
  },
  {
    id: "cecilia",
    author: "Cécilia",
    detail: "Maman en télétravail",
    quote:
      "J'ai repris le travail à distance tout en maintenant mon allaitement exclusif pour Apolline. Les conseils d'organisation et le soutien reçus m'ont permis de réussir mon objectif sans stress.",
    topics: ["je-reprends-une-activite-professionnelle"],
    source: "direct",
  },
  {
    id: "melodie-2",
    author: "Mélodie",
    detail: "Maman active",
    quote:
      "Nous avons réussi à gérer la reprise à la crèche : je tire ce qu'il faut pour le lendemain et elle profite des tétées matin et soir. Merci pour cette logistique rodée !",
    topics: ["je-reprends-une-activite-professionnelle"],
    source: "direct",
  },
  {
    id: "miora",
    author: "Miora",
    detail: "Maman de bébé allaité",
    quote:
      "Grâce à l'accompagnement, j'ai pu introduire les solides la journée tout en continuant les tétées à volonté. La pédiatre a rassuré sur la prise de poids. Ce que vous faites est extra !",
    topics: ["la-diversification-de-mon-bebe-allaite"],
    source: "direct",
  },
  {
    id: "claire",
    author: "Claire",
    detail: "Maman de Maël",
    quote:
      "Maël s'est peu à peu désintéressé du sein en prenant goût à la diversification, et je l'ai très bien vécu. Le sevrage a été facile et en douceur grâce à vos conseils.",
    topics: ["la-diversification-de-mon-bebe-allaite", "je-souhaite-sevrer-mon-bebe"],
    source: "direct",
  },
  {
    id: "alexandra",
    author: "Alexandra",
    detail: "Maman de Pierre, 10 mois",
    quote:
      "Mon fils a dix mois et je l'allaite toujours matin et soir. Il est plus que bien portant depuis que vous avez détecté son frein de langue. Merci encore pour votre aide précieuse.",
    topics: ["la-diversification-de-mon-bebe-allaite"],
    source: "direct",
  },
  {
    id: "doriane",
    author: "Doriane",
    detail: "Maman de tout-petit",
    quote:
      "Jamais je n'aurais pensé poursuivre aussi longtemps malgré les remarques de l'entourage. Le sevrage se fera naturellement d'ici ses trois ans, c'est un soulagement d'être guidée ainsi.",
    topics: ["je-souhaite-sevrer-mon-bebe"],
    source: "direct",
  },
  {
    id: "melanie",
    author: "Mélanie",
    detail: "Maman suivie par Carole",
    quote:
      "J'ai pu aborder la transition sereinement grâce aux repères transmis. Savoir écouter le moment où l'enfant est prêt change tout pour vivre un sevrage sans pleurs.",
    topics: ["je-souhaite-sevrer-mon-bebe"],
    source: "direct",
  },
  {
    id: "miora-2",
    author: "Miora",
    detail: "Bébé dort mieux, allaitement qui se poursuit",
    quote:
      "La pédiatre a validé les tétées de nuit et confirme que le poids est bon. L'essentiel est que le rythme fonctionne et respecte les besoins de l'enfant !",
    topics: ["mon-bebe-ne-fait-pas-ses-nuits"],
    source: "direct",
  },
  {
    id: "jeanne",
    author: "Jeanne",
    detail: "Maman épuisée qui a retrouvé de l'énergie",
    quote:
      "Après des mois d'épuisement, l'accompagnement personnalisé a fait toute la différence. Nous avons appris à comprendre les besoins de notre bébé et à mettre en place des routines apaisantes.",
    topics: ["mon-bebe-ne-fait-pas-ses-nuits"],
    source: "direct",
  },
  {
    id: "justine-2",
    author: "Justine",
    detail: "Maman de Léo",
    quote:
      "J'étais très heureuse de pouvoir faire la transition des nuits moi-même en douceur. Au bout de quelques semaines, les réveils se sont espacés et les nuits sont enfin apaisées.",
    topics: ["mon-bebe-ne-fait-pas-ses-nuits"],
    source: "direct",
  },
  {
    id: "elodie",
    author: "Élodie",
    detail: "Peur de l'association sein/sommeil",
    quote:
      "Grâce à l'accompagnement de Carole, j'ai compris pourquoi mon bébé demande le sein pour dormir. Je sais répondre à ses besoins maintenant, protéger mes nuits et mon allaitement. Nous récupérons bien mieux tous les deux. Je retrouve l'énergie qui me manquait.",
    topics: ["mon-bebe-ne-fait-pas-ses-nuits"],
    source: "direct",
  },
  {
    id: "abida",
    author: "Abida",
    detail: "A compris la biologie du sommeil",
    quote:
      "Je suis fière de ce chemin, et je vois tous les bienfaits pour Adam à tous les niveaux, c'est incroyable ! Un lien extraordinaire, une bonne santé, un développement du langage très avancé, une grande empathie et compréhension des émotions ! Alors oui je l'accompagne encore pour le sommeil, mais connaissant la biologie du sommeil de l'enfant, je sais bien que c'est normal à cet âge et qu'elle progresse à son rythme. Donc merci pour ton accompagnement, j'ai maintenant confiance en moi et en mon allaitement !",
    topics: ["mon-bebe-ne-fait-pas-ses-nuits"],
    source: "direct",
  },
  {
    id: "dounia",
    author: "Dounia",
    detail: "Mieux dormir et poursuivre l'allaitement",
    quote:
      "J'avais fait appel à une coach du sommeil pour mon bébé de 7 mois qui enchaîne les réveils nocturnes (2 ou 3 sur une dizaine de réveils demandent une mise au sein), qui affirmait avec certitude qu'à 7 mois, il faut absolument faire un sevrage nocturne pour stopper ces réveils. Au fond de moi, je savais que c'était erroné. Merci de m'avoir rassurée.",
    topics: ["mon-bebe-ne-fait-pas-ses-nuits"],
    source: "direct",
  },
  {
    id: "teodora",
    author: "Teodora",
    detail: "Maman d'Apolline, prématurée",
    quote:
      "Ça m'a beaucoup aidée de savoir qu'on avait déjà un peu de lait, et de me dire que c'est déjà bien vu d'où on part. Mara est passée de 15 % à 44 % sur les courbes en un mois et demi.",
    topics: ["de-la-couveuse-au-sein"],
    source: "direct",
  },
  {
    id: "noemie",
    author: "Noémie",
    detail: "Maman de Sybille, prématurée",
    quote:
      "Grâce à l'accompagnement avant et après la naissance, j'ai réalisé mon objectif d'allaitement exclusif malgré la prématurité. Un soutien sans faille, même à distance, qui m'a permis de vivre des moments précieux.",
    topics: ["de-la-couveuse-au-sein"],
    source: "direct",
  },
  {
    id: "astrid",
    author: "Astrid",
    detail: "Relance de la lactation après le retour à la maison",
    quote:
      "Le stress de l'allaitement s'estompe et nous respirons mieux. C'est important pour notre relation avec Mara, et je suis juste rassurée de la voir si souriante, je ne voulais pas que cette période la marque.",
    topics: ["de-la-couveuse-au-sein"],
    source: "direct",
  },
  {
    id: "agnieszka",
    author: "Agnieszka",
    detail: "Maintien de l'allaitement au retour à la maison",
    quote:
      "Ça progresse, j'ai réussi à changer des choses, déjà je suis très contente, et j'ai les pédiatres qui suivent donc je me sens plus légitime.",
    topics: ["de-la-couveuse-au-sein"],
    source: "direct",
  },
  {
    id: "clemence",
    author: "Clémence",
    detail: "Allaitement maintenu, bébé en néonatalogie",
    quote:
      "Bébé avec streptocoque B en néonat, sous oxygène pendant 3 jours. J3, on tente la première tétée en peau à peau et la magie s'est faite. Au bout de 30 minutes, le pédiatre coupe l'oxygène pour voir comment elle réagit. Une heure après, on retire tout le matériel. Merci de m'avoir aidée à tenir mon allaitement.",
    topics: ["de-la-couveuse-au-sein"],
    source: "direct",
  },
  {
    id: "camille",
    author: "Camille",
    detail: "Maman de Léonie, 6 semaines",
    quote:
      "Plus de douleur depuis cette nuit ! Je n'ai pas voulu vous déranger Carole et je me suis rappelée que vous aviez enregistré en vidéo ce qu'il faut faire pour soigner une mastite. J'avais super mal au sein gauche et un gros placard rouge et je ne savais absolument pas quoi faire. On me disait de tirer et de jeter mon lait au risque d'infecter mon bébé. Plus je demandais de l'aide, plus j'étais perdue. J'ai appliqué vos conseils vidéo et ce matin, tout va mieux.",
    topics: ["les-urgences-de-l-allaitement"],
    source: "direct",
  },
  {
    id: "elodie-2",
    author: "Élodie",
    detail: "Maman de Martin, 2 mois",
    quote:
      "J'ai acheté le module dans un grand moment de panique hier soir. Déjà entendre votre voix posée, ça fait du bien, et surtout, ça marche. Ce matin, j'ai à nouveau les seins souples et la couche de Martin était lourde comme avant.",
    topics: ["les-urgences-de-l-allaitement"],
    source: "direct",
  },
  {
    id: "sarah",
    author: "Sarah",
    detail: "Maman de Louise, 3 semaines",
    quote:
      "Mes crevasses étaient devenues tellement douloureuses que j'appréhendais chaque tétée. J'avais tellement mal que je voyais des étoiles à chaque tétée. Mon mari me suppliait d'arrêter, ce que je ne voulais pas. Vos stratégies ont été miraculeuses. Je n'ai pas peur de le dire : je respire enfin.",
    topics: ["les-urgences-de-l-allaitement"],
    source: "direct",
  },
  {
    id: "julie",
    author: "Julie",
    detail: "Maman de Noé, 8 mois",
    quote:
      "Mon problème est arrivé un dimanche soir, évidemment ! Même à 8 mois, on peut encore avoir des galères, c'est fou. Je me suis réveillée avec un sein hyper dur, et rien de ce que j'ai pu trouver sur le net n'a pu m'aider. Je me suis souvenue de vous et j'ai trouvé tout de suite dans vos vidéos la partie qui correspondait à ma situation. Le fait d'avoir une ressource fiable sous la main m'a énormément rassurée, je l'ai depuis gardée dans mes favoris.",
    topics: ["les-urgences-de-l-allaitement"],
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
