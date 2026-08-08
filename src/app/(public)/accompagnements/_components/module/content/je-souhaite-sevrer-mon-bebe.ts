import type { ModuleContent } from "./types";

/**
 * Page de vente « Je souhaite sevrer mon bebe » (75 €).
 * Moment vise : la decision d'arreter, a tout age. Ton particulierement non
 * culpabilisant : la lectrice a deja decide, elle n'a pas besoin d'etre
 * convaincue de continuer.
 */
export const JE_SOUHAITE_SEVRER_MON_BEBE: ModuleContent = {
  hero: {
    eyebrow: "Consultante IBCLC depuis 2011 · 5 000+ familles accompagnées",
    titleOverride:
      "Arrêter d'allaiter est une décision. Elle mérite d'être accompagnée, pas subie.",
    subtitle:
      "Que vous arrêtiez à trois semaines ou à trois ans, par choix ou par contrainte, le sevrage se prépare. Mal mené, il fait mal, aux seins comme au cœur. Bien mené, il se passe en douceur pour vous deux.",
    ctaLabel: "Je sèvre en douceur et en confiance",
  },
  problem: {
    title: "Personne ne vous accompagne pour arrêter",
    intro: "On vous a beaucoup dit comment commencer. Sur la fin, silence.",
    points: [
      "Vous ne savez pas à quel rythme retirer les tétées sans engorger.",
      "Vous craignez que votre bébé le vive mal, et vous culpabilisez déjà.",
      "On vous a conseillé de serrer vos seins ou de prendre un médicament, sans explication.",
      "Vous avez essayé d'arrêter et votre bébé a refusé catégoriquement.",
      "Vous ne savez pas si ce que vous ressentez, tristesse ou soulagement, est normal.",
      "Votre entourage a un avis tranché, dans un sens ou dans l'autre.",
    ],
  },
  promise: {
    title: "Un sevrage réussi est un sevrage progressif et informé",
    paragraphs: [
      "Le sevrage est un processus physiologique. La lactation décroît selon des règles connues, et les brusquer expose à l'engorgement, à la mastite et à une chute hormonale difficile à traverser.",
      "Ce module donne la méthode selon l'âge de votre bébé et selon votre délai, et il traite la part émotionnelle, la vôtre comme la sienne, que presque personne n'aborde.",
    ],
    bullets: [
      "Retirer les tétées dans un ordre et à un rythme qui protègent vos seins.",
      "Accompagner la réaction de votre bébé plutôt que de la subir.",
      "Reconnaître une grève de la tétée, qui n'est pas un sevrage.",
    ],
  },
  program: {
    title: "Ce que contient le module",
    intro:
      "Des chapitres qui couvrent la décision, la pratique, les émotions et les imprévus, y compris le cas du refus soudain.",
  },
  outcomes: {
    title: "Ce qui devient possible",
    items: [
      "Vous savez exactement quelle tétée retirer, et quand.",
      "Vos seins ne vous font pas mal pendant la décroissance.",
      "Votre bébé traverse la transition avec un remplacement qui lui convient.",
      "Vous distinguez un vrai refus d'une grève passagère.",
      "Vous vivez vos émotions sans les trouver anormales.",
      "Vous arrêtez sans avoir le sentiment d'avoir raté quelque chose.",
    ],
  },
  fit: {
    title: "Est-ce le bon module pour vous ?",
    forYouTitle: "Oui, si",
    forYou: [
      "Vous avez décidé d'arrêter, quelle que soit la raison.",
      "Vous voulez arrêter progressivement et sans douleur.",
      "Vous avez déjà essayé et votre bébé a refusé.",
      "Vous hésitez encore et voulez comprendre ce que le sevrage implique.",
    ],
    notForYouTitle: "Pas encore, si",
    notForYou: [
      "Vous voulez continuer et cherchez à résoudre une difficulté : d'autres modules y répondent mieux.",
      "Vous êtes en pleine mastite ou abcès : traitez-le d'abord avec « Les urgences allaitement » ou une consultation.",
      "Votre arrêt est imposé par un traitement médical en cours qui demande un avis individuel.",
    ],
  },
  moment: {
    title: "À quel moment de votre allaitement ?",
    intro: "Chaque accompagnement couvre une étape. Voici où celui-ci se situe.",
  },
  // PLACEHOLDER — temoignages a remplacer par de vrais verbatims avant mise en ligne.
  pricing: {
    title: "Terminez votre allaitement comme vous l'avez commencé, accompagnée",
    subtitle: "Un accès unique au module complet, à vie.",
  },
  faq: [
    {
      q: "Je dois arrêter très vite, est-ce possible ?",
      a: "Oui. Le module couvre les sevrages courts et les précautions à prendre pour limiter l'engorgement et le risque de mastite quand le délai est contraint.",
    },
    {
      q: "Mon bébé refuse tout autre chose que le sein.",
      a: "Le module traite le refus et les alternatives selon l'âge, du biberon au verre à bec jusqu'aux solides, avec le rythme de transition adapté.",
    },
    {
      q: "Vais-je me sentir mal après ?",
      a: "La chute hormonale du sevrage est réelle et fréquemment tue. Le module explique ce qui est attendu, combien de temps cela dure, et ce qui doit vous amener à consulter.",
    },
  ],
  finalCta: {
    title: "Sevrez en douceur, et en confiance",
    subtitle: "Votre décision est la bonne. Reste à la mettre en œuvre correctement.",
    ctaLabel: "Je sèvre en douceur et en confiance",
  },
};
