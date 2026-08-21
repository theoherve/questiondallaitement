import type { ModuleContent } from "./types";

/**
 * Page de vente « Je souhaite sevrer mon bebe » (75 €).
 * Moment vise : la decision d'arreter, a tout age. Ton particulierement non
 * culpabilisant : la lectrice a deja decide, elle n'a pas besoin d'etre
 * convaincue de continuer.
 */
export const JE_SOUHAITE_SEVRER_MON_BEBE: ModuleContent = {
  hero: {
    eyebrow: "CONSULTANTE IBCLC DEPUIS 2011 · 6 000+ FAMILLES ACCOMPAGNÉES",
    titleOverride:
      "Sevrer en douceur, à votre rythme : la méthode d'une IBCLC qui respecte votre instinct et vous évite les complications courantes.",
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
      "Cet accompagnement donne la méthode selon l'âge de votre bébé et selon votre délai. Le sevrage n'est pas qu'une étape logistique : la chute hormonale qui l'accompagne peut réveiller tristesse, soulagement ou sentiment ambivalent, souvent les trois à la fois, et c'est normal. C'est ce vécu, le vôtre comme celui de votre bébé, que presque personne n'aborde.",
    ],
    bullets: [
      "Retirer les tétées dans un ordre et à un rythme qui protègent vos seins.",
      "Accompagner la réaction de votre bébé plutôt que de la subir.",
      "Reconnaître une grève de la tétée, qui n'est pas un sevrage.",
    ],
  },
  program: {
    title: "Ce que contient l'accompagnement",
    intro:
      "Des chapitres qui couvrent la décision, la pratique, les émotions et les imprévus, y compris le cas du refus soudain.",
  },
  outcomes: {
    title: "Ce qui devient possible",
    subtitle: "Ce que change un sevrage préparé, pour vos seins comme pour votre bébé.",
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
    title: "Est-ce le bon accompagnement pour vous ?",
    subtitle:
      "Pour une décision de sevrage prise ou en réflexion, pas pour la poursuite de l'allaitement.",
    forYouTitle: "Oui, si",
    forYou: [
      "Vous avez décidé de sevrer votre bébé et vous ne savez pas comment vous y prendre.",
      "Vous souhaitez diminuer progressivement les tétées.",
      "Vous voulez savoir comment gérer les changements pour votre bébé… et pour votre lactation.",
      "Vous avez peur de douleurs, d'engorgements ou d'une baisse trop brutale de lait.",
      "Vous voulez vivre cette transition sereinement, sans culpabilité.",
    ],
    notForYouTitle: "Pas encore, si",
    notForYou: [
      "Vous cherchez une méthode radicale et applicable en 3 à 5 jours maximum.",
      "Vous avez l'intention de « couper le cordon » tout net sans accompagner votre bébé dans la transition.",
      "Vous souhaitez poursuivre l'allaitement sans modifier votre rythme actuel.",
    ],
  },
  moment: {
    title: "À quel moment de votre allaitement ?",
    intro:
      "Chaque accompagnement couvre une étape. Voici où celui-ci se situe.",
  },
  pricing: {
    title: "Terminez votre allaitement comme vous l'avez commencé, accompagnée",
    subtitle: "Un accès unique à l'accompagnement complet, à vie.",
  },
  faq: [
    {
      q: "Est-il normal de se sentir bouleversée émotionnellement pendant le sevrage ?",
      a: "Oui, tout à fait. La chute hormonale qui suit l'arrêt des tétées peut provoquer tristesse, irritabilité ou un sentiment ambivalent, même quand le sevrage est un choix assumé. Cet accompagnement explique ce qui est attendu et jusqu'à quand.",
    },
    {
      q: "Je dois arrêter très vite, est-ce possible ?",
      a: "Oui. Cet accompagnement couvre les sevrages courts et les précautions à prendre pour limiter l'engorgement et le risque de mastite quand le délai est contraint.",
    },
    {
      q: "Mon bébé refuse tout autre chose que le sein.",
      a: "Cet accompagnement traite le refus et les alternatives selon l'âge, du biberon au verre à bec jusqu'aux solides, avec le rythme de transition adapté.",
    },
  ],
  finalCta: {
    title: "Sevrez en douceur, et en confiance",
    subtitle:
      "Votre décision est la bonne. Reste à la mettre en œuvre correctement.",
    ctaLabel: "Je sèvre en douceur et en confiance",
  },
};
