import type { ModuleContent } from "./types";

/**
 * Page de vente « Je me prepare a allaiter » (75 €).
 * Moment vise : la grossesse, avant la naissance. L'angle est de prendre de
 * l'avance pendant qu'il reste du temps et de l'energie.
 */
export const JE_ME_PREPARE_A_ALLAITER: ModuleContent = {
  hero: {
    eyebrow: "Consultante IBCLC depuis 2011 · 5 000+ familles accompagnées",
    titleOverride:
      "Le meilleur moment pour apprendre à allaiter, c'est avant que votre bébé soit là.",
    subtitle:
      "Vous préparez la chambre, la valise, la liste de naissance. Personne ne vous a dit que les trois heures les plus décisives de votre allaitement se joueraient juste après la naissance, et qu'on peut les préparer.",
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
    title: "L'allaitement n'est pas une loterie, c'est une compétence",
    paragraphs: [
      "La physiologie de la lactation est prévisible, et ce qui la met en difficulté l'est tout autant. Ce qui distingue les démarrages faciles des démarrages douloureux tient à quelques gestes et à quelques décisions prises très tôt, souvent dans les premières heures.",
      "Ce module transmet ce que j'explique aux futures mères en consultation prénatale : ce qui se joue à la naissance, ce qu'il faut savoir demander, et comment reconnaître dès le premier jour que tout se passe bien.",
    ],
    bullets: [
      "Comprendre comment la lactation se met en place, et ce qui la freine.",
      "Savoir quoi demander et quoi refuser à la maternité.",
      "Reconnaître dès la première tétée ce qui va bien et ce qui doit être corrigé.",
    ],
  },
  program: {
    title: "Ce que contient le module",
    intro:
      "Des chapitres courts, à parcourir tranquillement pendant la grossesse, pendant que vous en avez encore le temps.",
  },
  outcomes: {
    title: "Ce qui devient possible",
    items: [
      "Vous arrivez à la maternité avec un plan, pas avec des espoirs.",
      "Vous savez formuler ce que vous voulez à l'équipe soignante.",
      "La première tétée n'est plus un moment que vous subissez.",
      "Vous reconnaissez une bonne prise du sein avant d'avoir mal.",
      "Les remarques de l'entourage ne vous font plus douter.",
      "Vous économisez les nuits de recherche paniquée sur internet.",
    ],
  },
  fit: {
    title: "Est-ce le bon module pour vous ?",
    forYouTitle: "Oui, si",
    forYou: [
      "Vous êtes enceinte, quel que soit le terme.",
      "C'est votre premier allaitement et vous partez de zéro.",
      "Votre allaitement précédent s'est mal passé et vous voulez comprendre pourquoi.",
      "Vous voulez décider en connaissance de cause, pas suivre des consignes.",
    ],
    notForYouTitle: "Pas encore, si",
    notForYou: [
      "Votre bébé est né et vous avez déjà mal : voyez « Mon allaitement des premiers jours ».",
      "Vous cherchez à résoudre une crevasse ou un engorgement en cours : voyez « Les urgences allaitement ».",
      "Vous avez une pathologie mammaire connue qui demande un avis clinique individuel.",
    ],
  },
  moment: {
    title: "À quel moment de votre allaitement ?",
    intro: "Chaque accompagnement couvre une étape. Voici où celui-ci se situe.",
  },
  // PLACEHOLDER — temoignages a remplacer par de vrais verbatims avant mise en ligne.
  pricing: {
    title: "Préparez la seule chose que vous ferez dix fois par jour",
    subtitle: "Un accès unique au module complet, à vie.",
  },
  faq: [
    {
      q: "Je suis au premier trimestre, est-ce trop tôt ?",
      a: "Non, c'est le meilleur moment. Vous avez encore l'énergie de lire tranquillement, ce qui ne sera plus le cas les premières semaines après la naissance.",
    },
    {
      q: "Je ne sais pas encore si je vais allaiter.",
      a: "Le module aide justement à décider en connaissance de cause. Il explique ce que l'allaitement implique concrètement, sans injonction ni culpabilisation.",
    },
    {
      q: "J'ai déjà allaité, ça m'apportera quelque chose ?",
      a: "Oui. Chaque allaitement est différent, et ce qui s'est passé la première fois ne préjuge pas de la suivante. Le module aide aussi à comprendre ce qui a coincé la fois précédente.",
    },
  ],
  finalCta: {
    title: "Arrivez préparée, pas inquiète",
    subtitle: "Quelques heures maintenant valent mieux que six semaines de doute.",
    ctaLabel: "Je me prépare sereinement",
  },
};
