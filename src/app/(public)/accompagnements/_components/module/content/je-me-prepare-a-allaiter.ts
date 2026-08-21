import type { ModuleContent } from "./types";

/**
 * Page de vente « Je me prepare a allaiter » (75 €).
 * Moment vise : la grossesse, avant la naissance. L'angle est de prendre de
 * l'avance pendant qu'il reste du temps et de l'energie.
 */
export const JE_ME_PREPARE_A_ALLAITER: ModuleContent = {
  hero: {
    eyebrow: "CONSULTANTE IBCLC DEPUIS 2011 · 6 000+ FAMILLES ACCOMPAGNÉES",
    titleOverride:
      "Les premiers jours à la maternité peuvent être déstabilisants lorsque chaque personne semble donner un conseil différent.",
    subtitle:
      "En vous préparant à l'avance, vous développez votre propre boussole. Vous reconnaissez une tétée efficace, vous comprenez les comportements normaux de votre bébé, vous distinguez une difficulté passagère d'un vrai signal d'alerte, et vous prenez vos décisions avec confiance, sans vous laisser déstabiliser par les avis contradictoires.",
    ctaLabel: "Je me prépare sereinement",
  },
  problem: {
    title: "Ce que vous ne saurez qu'une fois qu'il sera trop tard",
    intro:
      "On prépare tout pour l'arrivée du bébé, sauf la seule chose qu'on fera dix fois par jour pendant des mois.",
    points: [
      "Les cours de préparation à la naissance survolent l'allaitement en vingt minutes.",
      "Votre entourage vous prédit déjà que vous n'aurez pas assez de lait.",
      "Vous ne savez pas ce qui se passe réellement dans l'heure qui suit la naissance.",
      "Vous ignorez ce qu'il faut demander à la maternité, et ce qu'il faut refuser.",
      "Vous avez lu dix articles qui se contredisent sur le tire-lait, les tétines et les compléments.",
      "Vous partez avec l'idée que ça marchera ou que ça ne marchera pas, comme si c'était une loterie.",
    ],
  },
  promise: {
    title: "Pourquoi les conseils habituels ne suffisent pas",
    paragraphs: [
      "Entre les cours de préparation à la naissance qui abordent l'allaitement en quelques minutes, les forums contradictoires et l'entourage bien intentionné mais mal informé, il est difficile de distinguer ce qui est vraiment fondé de ce qui relève de la croyance populaire.",
      "IBCLC depuis 2011, j'accompagne plus de 1 000 mères chaque année. J'ai moi-même connu un allaitement écourté avec mon premier enfant, faute des bonnes informations au bon moment. Je détaille dans cet accompagnement les stratégies qui ont aidé les milliers de mères que j'ai accompagnées avant vous, pour que les premiers jours deviennent un vrai point de départ, pas un pari.",
    ],
    bullets: [
      "Comprendre comment la lactation se met en place, et ce qui la freine.",
      "Savoir quoi demander et quoi refuser à la maternité.",
      "Reconnaître dès la première tétée ce qui va bien et ce qui doit être corrigé.",
    ],
  },
  program: {
    title: "Ce que contient l'accompagnement",
    intro:
      "Des chapitres courts, à parcourir tranquillement pendant la grossesse, pendant que vous en avez encore le temps.",
  },
  outcomes: {
    title: "Ce qui devient possible",
    subtitle:
      "Vous ne contrôlez pas tout ce qui va arriver pendant l'accouchement, mais vous pouvez travailler sur votre capacité à revenir à un état de confiance plutôt que de rester dans l'anticipation anxieuse.",
    items: [
      "Vous arrivez à la maternité avec un plan, pas avec des espoirs.",
      "Vous savez formuler ce que vous voulez à l'équipe soignante.",
      "La première tétée n'est plus un moment que vous subissez.",
      "Vous reconnaissez une bonne prise du sein avant d'avoir mal.",
      "Vous distinguez un vrai signal d'alerte d'une inquiétude sans fondement.",
      "Les remarques de l'entourage ne vous font plus douter.",
      "Vous économisez les nuits de recherche paniquée sur internet.",
    ],
  },
  fit: {
    title: "Est-ce le bon accompagnement pour vous ?",
    subtitle: "Pensé pour la grossesse, pas pour une difficulté déjà installée.",
    forYouTitle: "Oui, si",
    forYou: [
      "Vous avez entendu beaucoup de choses sur l'allaitement et vous ne savez pas toujours quoi croire.",
      "Vous voulez connaître les bons repères avant la naissance.",
      "Vous souhaitez comprendre les premières tétées, le démarrage de la lactation et les besoins de votre nouveau-né.",
      "Vous voulez éviter de vous retrouver démunie face aux premières difficultés.",
    ],
    notForYouTitle: "Pas encore, si",
    notForYou: [
      "Vous cherchez simplement des recettes de tisanes.",
      "Vous êtes déjà à la maternité et les premières tétées vous posent question : cet accompagnement est pensé pour vous préparer avant ces premiers jours.",
    ],
  },
  moment: {
    title: "À quel moment de votre allaitement ?",
    intro:
      "Chaque accompagnement couvre une étape. Voici où celui-ci se situe.",
  },
  pricing: {
    title: "Préparez la seule chose que vous ferez dix fois par jour",
    subtitle: "Un accès unique à l'accompagnement complet, à vie.",
  },
  faq: [
    {
      q: "Je suis au premier trimestre, est-ce trop tôt ?",
      a: "Non, c'est le meilleur moment. Vous avez encore l'énergie de lire tranquillement, ce qui ne sera plus le cas les premières semaines après la naissance.",
    },
    {
      q: "Je ne sais pas encore si je vais allaiter.",
      a: "Cet accompagnement aide justement à décider en connaissance de cause. Il explique ce que l'allaitement implique concrètement, sans injonction ni culpabilisation.",
    },
    {
      q: "J'ai déjà allaité, ça m'apportera quelque chose ?",
      a: "Oui. Chaque allaitement est différent, et ce qui s'est passé la première fois ne préjuge pas de la suivante. Cet accompagnement aide aussi à comprendre ce qui a coincé la fois précédente.",
    },
  ],
  finalCta: {
    title: "Arrivez préparée, pas inquiète",
    subtitle:
      "Quelques heures maintenant valent mieux que six semaines de doute.",
    ctaLabel: "Je me prépare sereinement",
  },
};
