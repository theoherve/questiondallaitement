import type { ModuleContent } from "./types";

/**
 * Page de vente « La diversification de mon bebe allaite » (75 €).
 * Moment vise : autour de six mois. Angle : diversifier un bebe allaite ne suit
 * pas les memes regles qu'un bebe au biberon, et les conseils recus ignorent
 * cette difference.
 */
export const LA_DIVERSIFICATION_DE_MON_BEBE_ALLAITE: ModuleContent = {
  hero: {
    eyebrow: "CONSULTANTE IBCLC DEPUIS 2011 · 6 000+ FAMILLES ACCOMPAGNÉES",
    titleOverride:
      "Diversifier un bébé allaité, ce n'est pas la même chose. Et personne ne vous le dit.",
    subtitle:
      "Les grammages, les horaires et les ordres d'introduction qu'on vous donne ont été pensés pour des bébés nourris au biberon. Votre bébé tète : sa diversification suit une autre logique, et votre allaitement n'a pas à s'arrêter là.",
    ctaLabel: "Je diversifie en toute confiance",
  },
  problem: {
    title: "On vous donne un calendrier, pas une explication",
    intro:
      "À six mois, tout le monde a un avis sur ce que votre bébé devrait manger.",
    points: [
      "On vous donne des grammages précis sans vous dire d'où ils viennent.",
      "Vous ne savez pas s'il faut donner le sein avant ou après le repas.",
      "Votre bébé refuse la cuillère et vous vous demandez si vous vous y prenez mal.",
      "On vous annonce que l'allaitement doit forcément diminuer maintenant.",
      "Les allergènes vous inquiètent et les conseils ont changé trois fois en dix ans.",
      "Vous ne savez pas comment reconnaître qu'il est vraiment prêt.",
    ],
  },
  promise: {
    title: "La diversification suit votre bébé, pas un calendrier",
    paragraphs: [
      "Un bébé allaité arrive à la diversification avec une expérience gustative et une autorégulation que les repères standards ignorent. Les signes de maturité sont observables, ils ne se lisent pas sur un calendrier.",
      "Ce module explique ce qui se passe réellement, ce que dit la recherche actuelle sur les allergènes et les textures, et comment introduire les aliments sans faire chuter votre lactation.",
    ],
    bullets: [
      "Reconnaître les vrais signes de maturité de votre bébé.",
      "Introduire les aliments dans un ordre qui a du sens, allergènes compris.",
      "Préserver votre allaitement pendant que l'alimentation solide s'installe.",
    ],
  },
  program: {
    title: "Ce que contient le module",
    intro:
      "Des chapitres qui répondent dans l'ordre aux questions que tout le monde pose : pourquoi, quand, comment, et que faire quand ça coince.",
  },
  outcomes: {
    title: "Ce qui devient possible",
    items: [
      "Vous savez quand commencer, en observant votre bébé plutôt que le calendrier.",
      "Les repas deviennent un moment de découverte, pas un combat.",
      "Vous n'avez plus peur d'introduire les allergènes.",
      "Votre lactation tient pendant que les quantités solides augmentent.",
      "Vous savez quoi répondre quand on vous dit qu'il faut arrêter le sein.",
      "Les refus et les régressions ne vous inquiètent plus.",
    ],
  },
  fit: {
    title: "Est-ce le bon module pour vous ?",
    forYouTitle: "Oui, si",
    forYou: [
      "Votre bébé approche ou dépasse quatre à six mois.",
      "Vous voulez continuer à allaiter pendant la diversification.",
      "Vous hésitez entre cuillère, morceaux et alimentation autonome.",
      "Les allergènes vous inquiètent.",
    ],
    notForYouTitle: "Pas encore, si",
    notForYou: [
      "Votre bébé a moins de quatre mois : la diversification n'est pas encore le sujet.",
      "Vous cherchez à sevrer complètement : voyez « Je souhaite sevrer mon bébé ».",
      "Votre bébé a une allergie déjà diagnostiquée qui demande un suivi médical individuel.",
    ],
  },
  moment: {
    title: "À quel moment de votre allaitement ?",
    intro:
      "Chaque accompagnement couvre une étape. Voici où celui-ci se situe.",
  },
  // PLACEHOLDER — temoignages a remplacer par de vrais verbatims avant mise en ligne.
  pricing: {
    title: "Diversifiez sans mettre fin à votre allaitement",
    subtitle: "Un accès unique au module complet, à vie.",
  },
  faq: [
    {
      q: "Faut-il donner le sein avant ou après le repas ?",
      a: "Cela dépend de l'âge et de l'appétit de votre bébé. Le module explique la logique derrière chaque cas de figure plutôt que d'imposer une règle unique.",
    },
    {
      q: "Mon bébé recrache tout.",
      a: "C'est fréquent et normal au début. Le module explique ce que ce réflexe signifie, à quel moment il s'estompe, et ce qui doit vraiment alerter.",
    },
    {
      q: "Dois-je réduire les tétées quand il mange ?",
      a: "Pas par principe. Le module détaille comment les deux coexistent et comment les quantités s'ajustent d'elles-mêmes au fil des mois.",
    },
  ],
  finalCta: {
    title: "Une diversification à votre rythme",
    subtitle:
      "Votre bébé vous montre quand il est prêt. Encore faut-il savoir le lire.",
    ctaLabel: "Je diversifie en toute confiance",
  },
};
