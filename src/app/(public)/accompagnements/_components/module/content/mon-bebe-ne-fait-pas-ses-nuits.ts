import type { ModuleContent } from "./types";

/**
 * Page de vente « Mon bebe ne fait pas ses nuits » (97 €).
 * Le plus gros module du catalogue : le programme s'affiche replie, et la
 * barre de preuve porte a elle seule la justification du prix.
 */
export const MON_BEBE_NE_FAIT_PAS_SES_NUITS: ModuleContent = {
  hero: {
    eyebrow: "CONSULTANTE IBCLC DEPUIS 2011 · 6 000+ FAMILLES ACCOMPAGNÉES",
    titleOverride:
      "Votre bébé ne dort pas comme on vous a dit qu'il devrait. Peut-être que c'est la consigne qui est fausse.",
    subtitle:
      "Faire ses nuits n'est pas une compétence qui s'apprend à trois mois. Le sommeil du jeune enfant obéit à des mécanismes précis, et comprendre ces mécanismes change tout : ce que vous attendez, ce que vous mettez en place, et la culpabilité que vous portez.",
    ctaLabel: "Je comprends ce qui empêche mon enfant de dormir",
  },
  problem: {
    title: "Vous êtes épuisée, et on vous répond que c'est normal",
    intro:
      "Deux réponses circulent, et aucune ne vous aide : laissez pleurer, ou prenez votre mal en patience.",
    points: [
      "Votre enfant se réveille plusieurs fois par nuit et vous ne tenez plus.",
      "On vous dit qu'à son âge il devrait dormir d'une traite, et vous vous demandez ce que vous ratez.",
      "L'endormissement dure une heure et se termine souvent en pleurs.",
      "On vous conseille de le laisser pleurer et cela vous est insupportable.",
      "Vous ne savez pas si les tétées de nuit entretiennent le problème.",
      "Votre couple et votre travail encaissent, et personne ne parle de vous.",
    ],
  },
  promise: {
    title: "Le sommeil n'est pas une discipline, c'est une physiologie",
    paragraphs: [
      "Les cycles de sommeil du jeune enfant, leur maturation, le rôle de l'alimentation, de la lumière et de l'environnement sont documentés. Les réveils nocturnes ne sont pas un dysfonctionnement à corriger, mais ils ont des causes sur lesquelles on peut agir.",
      "Ce module est le plus complet du catalogue. Il reprend les besoins de l'enfant, l'endormissement, ce qui parasite le sommeil, les habitudes, et il consacre une partie entière au bien-être des parents, parce qu'une famille épuisée ne tient pas sur la seule compréhension.",
    ],
    bullets: [
      "Comprendre les besoins réels de sommeil selon l'âge, et ce qui est attendu.",
      "Identifier ce qui parasite concrètement les nuits de votre enfant.",
      "Agir sur l'endormissement sans laisser pleurer.",
    ],
  },
  program: {
    title: "Ce que contient le module",
    intro:
      "Le programme le plus complet du catalogue, du nourrisson au jeune enfant, avec une partie entière consacrée au sommeil des parents.",
  },
  outcomes: {
    title: "Ce qui devient possible",
    subtitle:
      "Ce que change la compréhension des mécanismes du sommeil de votre enfant.",
    items: [
      "Vous savez ce qui est normal à l'âge de votre enfant et vous cessez de vous comparer.",
      "L'endormissement s'allège parce que vous en avez identifié les freins.",
      "Les réveils diminuent, et ceux qui restent ne vous effondrent plus.",
      "Vous savez si l'alimentation joue un rôle dans son cas.",
      "Vous mettez en place un cadre qui vous convient, sans méthode imposée.",
      "Vous récupérez, parce que le module traite aussi votre sommeil à vous.",
    ],
  },
  fit: {
    title: "Est-ce le bon module pour vous ?",
    subtitle: "Un accompagnement complet du sommeil, pas une méthode d'entraînement.",
    forYouTitle: "Oui, si",
    forYou: [
      "Les nuits de votre enfant vous épuisent, quel que soit son âge.",
      "On vous a conseillé de le laisser pleurer et vous cherchez autre chose.",
      "Vous voulez comprendre avant d'appliquer.",
      "Vous cherchez un accompagnement complet, pas trois astuces.",
    ],
    notForYouTitle: "Pas encore, si",
    notForYou: [
      "Votre bébé a moins de six semaines : ses réveils sont physiologiques et « Mon allaitement des premiers jours » répond mieux à vos questions.",
      "Vous cherchez une méthode d'entraînement au sommeil par extinction : ce n'est pas l'approche de ce module.",
      "Votre enfant présente des signes médicaux, apnées ou trouble respiratoire, qui relèvent d'un avis pédiatrique.",
    ],
  },
  moment: {
    title: "À quel moment de votre allaitement ?",
    intro:
      "Chaque accompagnement couvre une étape. Voici où celui-ci se situe.",
  },
  // PLACEHOLDER — temoignages a remplacer par de vrais verbatims avant mise en ligne.
  pricing: {
    title: "Comprenez le sommeil de votre enfant, et retrouvez le vôtre",
    subtitle: "Le module le plus complet du catalogue. Un accès unique, à vie.",
  },
  faq: [
    {
      q: "C'est le module le plus cher, pourquoi ?",
      a: "Parce que c'est de loin le plus vaste. Il couvre le sommeil de la naissance au jeune enfant, ses mécanismes, ses parasites, et le sommeil des parents, là où les autres modules traitent une étape précise de l'allaitement.",
    },
    {
      q: "Mon enfant a trois ans, est-ce encore pour moi ?",
      a: "Oui. Le module va du nourrisson au jeune enfant, et les chapitres sur les habitudes de sommeil et l'endormissement concernent particulièrement cet âge.",
    },
    {
      q: "Est-ce une méthode d'entraînement au sommeil ?",
      a: "Non. Aucune extinction, aucun laisser-pleurer. Le module explique les mécanismes et propose des leviers, à vous de choisir ceux qui conviennent à votre famille.",
    },
  ],
  finalCta: {
    title: "Des nuits qui redeviennent lisibles",
    subtitle:
      "Comprendre ce qui se passe change plus de choses qu'une méthode de plus.",
    ctaLabel: "Je comprends ce qui empêche mon enfant de dormir",
  },
};
