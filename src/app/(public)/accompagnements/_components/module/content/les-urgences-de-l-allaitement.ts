import type { ModuleContent } from "./types";

/**
 * Page de vente « Les urgences de l'allaitement » (45 €).
 *
 * Parcours volontairement court : `problem` et `promise` ne sont pas omis
 * cette fois (contrairement à la version precedente) car la lectrice arrive
 * en pleine crise et a justement besoin d'etre identifiee avant la solution,
 * mais chaque section reste breve : pas de theorie, une boussole.
 */
export const LES_URGENCES_DE_L_ALLAITEMENT: ModuleContent = {
  hero: {
    eyebrow: "CONSULTANTE IBCLC DEPUIS 2011 · 6 000+ FAMILLES ACCOMPAGNÉES",
    titleOverride:
      "Vous avez mal, vous vous inquiétez, vous ne savez plus quoi faire. Voici comment réagir dès les premiers signes.",
    subtitle:
      "Crevasse, engorgement, zone dure et douloureuse, inflammation, fièvre : quand un problème survient pendant l'allaitement, on se retrouve vite seule face à des informations contradictoires. Cet accompagnement vous dit ce qui se passe, quoi faire, et surtout quoi éviter.",
    ctaLabel: "Je veux savoir quoi faire",
  },
  problem: {
    title: "Vous avez peut-être déjà essayé beaucoup de choses",
    intro: "Et pourtant, la douleur est toujours là.",
    points: [
      "Vos crevasses persistent malgré les crèmes et les conseils reçus.",
      "Une zone dure, rouge ou douloureuse est apparue sur votre sein.",
      "Vous avez l'impression d'avoir un « canal bouché » et vous ne savez pas comment le débloquer.",
      "Votre sein est tendu, douloureux, chaud, et vous vous demandez s'il s'agit d'un simple engorgement ou d'une mastite.",
      "Vous avez de la fièvre et vous commencez à paniquer.",
      "Vous avez peur que cette complication vous oblige à arrêter d'allaiter.",
    ],
  },
  promise: {
    title: "Pourquoi il est important d'agir au bon moment",
    paragraphs: [
      "Une douleur pendant l'allaitement n'est pas toujours synonyme de complication grave. Mais une douleur qui persiste, un engorgement qui évolue, une inflammation ou une fièvre méritent d'être pris au sérieux. Le problème n'est pas seulement de savoir quoi faire, c'est aussi de savoir quoi ne pas faire : certains gestes traditionnellement recommandés peuvent entretenir l'inflammation ou aggraver une situation déjà douloureuse.",
      "Vous allez apprendre à faire la différence entre les principales situations rencontrées pendant l'allaitement, à reconnaître les signes qui doivent vous alerter et à adopter les gestes les plus adaptés. Et surtout : une complication de l'allaitement ne signifie pas que votre allaitement doit s'arrêter.",
    ],
    bullets: [
      "Comprendre ce qui peut expliquer votre douleur, et quels signes observer.",
      "Savoir quels gestes peuvent vous aider, et lesquels éviter.",
      "Savoir quand surveiller, quand demander un avis professionnel, et quand consulter un médecin.",
    ],
  },
  program: {
    title: "Ce que vous recevez",
    intro:
      "Sept chapitres pour savoir comment réagir face aux principales complications de l'allaitement, à consulter directement à la situation qui vous concerne.",
  },
  outcomes: {
    title: "Ce que vous allez enfin savoir",
    subtitle:
      "Vous ne serez pas devenue experte. Vous aurez une boussole claire pour savoir quoi faire, et surtout, savoir quand demander de l'aide.",
    items: [
      "Vous savez ce qui peut expliquer votre douleur et quels signes observer.",
      "Vous savez quels gestes peuvent vous aider, et lesquels éviter.",
      "Vous savez quand surveiller l'évolution, et quand demander rapidement un avis professionnel.",
      "Vous savez quand consulter un médecin sans attendre.",
      "Vous savez comment préserver votre allaitement autant que possible pendant la prise en charge.",
      "Vous passez de « je ne sais pas ce qui m'arrive » à « je comprends ce que je dois surveiller et quelle est la prochaine étape ».",
    ],
  },
  fit: {
    title: "Est-ce le bon accompagnement pour vous ?",
    subtitle: "Pour une douleur ou un symptôme précis, là, maintenant.",
    forYouTitle: "Oui, si",
    forYou: [
      "Vous allaitez actuellement et vous rencontrez une douleur ou une complication.",
      "Vous avez une crevasse qui ne cicatrise pas.",
      "Votre sein est très tendu, douloureux ou présente une zone dure.",
      "Vous vous demandez si vous avez un engorgement, un canal bouché ou une mastite.",
      "Vous avez de la fièvre et vous ne savez pas quelle conduite adopter.",
      "Vous avez peur que cette difficulté mette fin à votre allaitement.",
    ],
    notForYouTitle: "Pas encore, si",
    notForYou: [
      "Votre allaitement se passe bien et vous cherchez simplement des conseils généraux.",
      "Vous avez besoin d'un diagnostic médical ou d'une prise en charge urgente : consultez sans attendre.",
      "Vous recherchez une consultation individuelle pour une situation complexe qui nécessite une évaluation personnalisée.",
    ],
  },
  moment: {
    title: "À quel moment de votre allaitement ?",
    intro: "Chaque accompagnement couvre une étape. Voici où celui-ci se situe.",
  },
  pricing: {
    title: "Vous n'avez pas besoin de paniquer face à chaque nouvelle douleur",
    subtitle:
      "Vous avez besoin de bons repères au bon moment. Accès illimité, à vie, à l'ensemble des vidéos, aux articles et aux mises à jour.",
  },
  faq: [
    {
      q: "Est-ce que ce module peut m'aider si j'ai déjà une mastite ?",
      a: "Oui, il vous donne des repères pour comprendre la situation, savoir quels signes surveiller et identifier les situations qui nécessitent un avis médical. Il ne remplace toutefois pas une consultation lorsque celle-ci est nécessaire.",
    },
    {
      q: "Est-ce que je dois arrêter d'allaiter si j'ai une mastite ?",
      a: "Une mastite ne signifie pas automatiquement qu'il faut arrêter l'allaitement. La conduite à tenir dépend notamment de votre situation et de son évolution. Vous saurez quels sont les paramètres à identifier et quand demander un avis professionnel.",
    },
    {
      q: "Et si j'ai un abcès ?",
      a: "Un abcès nécessite une prise en charge médicale. Le chapitre vous aide à comprendre les signes qui doivent vous alerter et ce qui peut être mis en place autour de cette prise en charge, notamment concernant la poursuite de l'allaitement.",
    },
    {
      q: "Est-ce que cet accompagnement peut remplacer une consultante IBCLC ?",
      a: "Non. Il vous apporte des connaissances et des stratégies générales. Une consultation individuelle reste indispensable lorsque votre situation nécessite une évaluation personnalisée.",
    },
    {
      q: "Et si mon problème apparaît dans quelques mois ?",
      a: "C'est justement l'intérêt de l'accès illimité : vous pouvez revenir à cet accompagnement lorsque la situation se présente.",
    },
  ],
  finalCta: {
    title: "Comprendre ce qui se passe. Savoir quoi faire. Savoir quoi éviter.",
    subtitle:
      "Et surtout, savoir quand demander de l'aide. Vous n'avez pas besoin de paniquer face à chaque nouvelle douleur.",
    ctaLabel: "Je veux savoir quoi faire",
  },
};
