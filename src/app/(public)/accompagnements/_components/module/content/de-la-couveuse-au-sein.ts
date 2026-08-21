import type { ModuleContent } from "./types";

/**
 * Page de vente « De la couveuse au sein » (75 €).
 * Moment vise : bebe premature ou hospitalise, de la naissance a la sortie de
 * neonatalogie. Angle : le lait et l'allaitement suivent d'autres regles
 * quand le bebe ne peut pas encore teter directement.
 */
export const DE_LA_COUVEUSE_AU_SEIN: ModuleContent = {
  hero: {
    eyebrow: "CONSULTANTE IBCLC DEPUIS 2011 · 6 000+ FAMILLES ACCOMPAGNÉES",
    titleOverride:
      "Votre bébé est né trop tôt, ou hospitalisé. Votre lait reste possible, et il compte plus que jamais.",
    subtitle:
      "En néonatalogie, personne n'a le temps de vous expliquer pourquoi le recueil du lait est urgent, comment le peau à peau agit sur votre lactation, ou comment on passe de la sonde au sein sans tout précipiter. Cet accompagnement reprend chaque étape, de la couveuse à la première tétée.",
    ctaLabel: "Je protège mon projet d'allaitement",
  },
  problem: {
    title: "Personne ne vous prépare à allaiter depuis une couveuse",
    intro: "Vous vous étiez préparée à un accouchement et un allaitement classiques. Pas à ça.",
    points: [
      "Votre bébé est en couveuse ou en soins intensifs, et vous ne savez pas comment continuer à allaiter dans ces conditions.",
      "Vous tirez votre lait sans savoir si c'est suffisant, ni si vous vous y prenez bien.",
      "Personne ne vous a expliqué pourquoi votre lait compte autant pour un bébé fragile.",
      "Vous avez mal aux seins et vous n'osez pas interrompre le recueil pour autant.",
      "Vous ne savez pas quand ni comment se fera la transition de la sonde au sein.",
      "Vous vous sentez spectatrice au milieu de l'équipe soignante, plutôt que parent.",
    ],
  },
  promise: {
    title: "Votre lait n'est pas accessoire, c'est un soin",
    paragraphs: [
      "Le lait d'une mère d'enfant prématuré ou hospitalisé a une composition adaptée aux besoins de ce bébé précis, documentée par la recherche en néonatalogie. Le protéger dès les premiers jours, même loin de lui, change ce qui se joue ensuite.",
      "Cet accompagnement reprend ce que j'explique aux mères en néonatalogie : comment organiser le recueil, comment le peau à peau agit sur la lactation, et comment mener, à son rythme, la transition de la sonde au sein.",
    ],
    bullets: [
      "Organiser un recueil de lait qui protège votre lactation dès les premiers jours.",
      "Comprendre ce que le peau à peau déclenche réellement chez votre bébé.",
      "Accompagner la transition de la sonde au sein sans la précipiter.",
    ],
  },
  program: {
    title: "Ce que contient l'accompagnement",
    intro:
      "Des chapitres qui suivent le parcours réel en néonatalogie, du recueil du lait à la sortie de l'hôpital.",
  },
  outcomes: {
    title: "Ce qui devient possible",
    subtitle:
      "Ce que change une organisation pensée dès les premiers jours, plutôt qu'improvisée dans l'urgence.",
    items: [
      "Votre lactation tient, même si vous êtes loin de votre bébé.",
      "Vous savez ce que chaque geste, peau à peau, recueil, sonde, apporte réellement.",
      "La douleur aux seins ne vous oblige plus à interrompre le recueil.",
      "Vous reconnaissez le bon moment pour les premières mises au sein.",
      "La transition de la sonde au sein se fait à son rythme, sans précipitation ni recul par excès de prudence.",
      "Vous trouvez votre place de parent au milieu de l'équipe soignante.",
    ],
  },
  fit: {
    title: "Est-ce le bon accompagnement pour vous ?",
    subtitle: "Pour un allaitement en néonatalogie ou après un séjour prématuré, pas pour un allaitement classique.",
    forYouTitle: "Oui, si",
    forYou: [
      "Votre bébé est né ou va naître prématurément et vous souhaitez lui donner votre lait.",
      "Vous vous demandez comment maintenir votre lactation lorsque votre bébé ne peut pas encore téter directement.",
      "Vous avez besoin de comprendre comment passer progressivement du lait tiré au sein.",
      "Vous avez peur que la séparation ou les difficultés des premières semaines compromettent votre allaitement.",
    ],
    notForYouTitle: "Pas encore, si",
    notForYou: [
      "Votre bébé n'est pas prématuré et vous recherchez un accompagnement pour un allaitement classique.",
      "Vous recherchez uniquement des informations générales sur l'allaitement.",
      "Votre bébé présente une situation médicale particulière nécessitant un suivi spécifique par l'équipe qui le prend en charge.",
    ],
  },
  moment: {
    title: "À quel moment de votre allaitement ?",
    intro: "Chaque accompagnement couvre une étape. Voici où celui-ci se situe.",
  },
  pricing: {
    title: "Donnez à votre bébé votre lait, quelles que soient les conditions de son arrivée",
    subtitle: "Un accès unique à l'accompagnement complet, à vie.",
  },
  faq: [
    {
      q: "Mon bébé est en réanimation, est-ce le bon moment pour commencer ?",
      a: "Oui, c'est souvent le moment où organiser le recueil compte le plus. Cet accompagnement priorise ce qu'il faut mettre en place dès les premiers jours, même dans l'urgence.",
    },
    {
      q: "Je n'arrive pas à tirer beaucoup de lait, est-ce grave ?",
      a: "C'est fréquent les premiers jours, et rarement définitif. Cet accompagnement explique comment stimuler la lactation en l'absence de bébé et ce qui fait réellement la différence.",
    },
    {
      q: "Mon bébé n'a jamais tété au sein, est-ce trop tard pour essayer ?",
      a: "Non. Cet accompagnement traite spécifiquement la transition de la sonde au sein, quel que soit le moment où votre bébé est prêt à la commencer.",
    },
  ],
  finalCta: {
    title: "De la couveuse au sein, à votre rythme",
    subtitle: "Votre lait compte dès le premier jour. Autant savoir comment le protéger.",
    ctaLabel: "Je protège mon projet d'allaitement",
  },
};
