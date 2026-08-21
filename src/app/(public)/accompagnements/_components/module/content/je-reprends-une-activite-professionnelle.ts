import type { ModuleContent } from "./types";

/**
 * Page de vente « Je reprends une activite professionnelle » (75 €).
 * Moment vise : les semaines qui precedent la reprise. Angle : la reprise est
 * la premiere cause d'arret non choisi, et c'est un probleme d'organisation,
 * pas de lactation.
 */
export const JE_REPRENDS_UNE_ACTIVITE_PROFESSIONNELLE: ModuleContent = {
  hero: {
    eyebrow: "CONSULTANTE IBCLC DEPUIS 2011 · 6 000+ FAMILLES ACCOMPAGNÉES",
    titleOverride:
      "Reprendre le travail ne vous oblige pas à arrêter d'allaiter.",
    subtitle:
      "La reprise est la première raison pour laquelle des mères arrêtent d'allaiter sans l'avoir choisi. Pas parce que c'est impossible, mais parce que personne ne leur a montré comment s'organiser.",
    ctaLabel: "Je prépare ma reprise sereinement",
  },
  problem: {
    title: "La date approche et rien n'est prêt",
    intro:
      "Vous savez quand vous reprenez. Vous ne savez pas comment vous allez faire.",
    points: [
      "Vous ne savez pas combien de lait tirer, ni quand commencer.",
      "Le tire-lait vous intimide et les premiers essais ont donné trois gouttes.",
      "Vous ignorez comment conserver et transporter votre lait en sécurité.",
      "Le mode de garde vous dit qu'il faudra bien passer au biberon.",
      "Votre bébé refuse le biberon et la reprise est dans trois semaines.",
      "Vous ne savez pas à quoi vous avez droit sur votre lieu de travail.",
    ],
  },
  promise: {
    title:
      "Ce n'est pas un problème de lactation, c'est un problème d'organisation",
    paragraphs: [
      "Une lactation installée ne s'arrête pas parce que vous reprenez le travail. Ce qui la met en difficulté, c'est un plan de tirage improvisé, un stock constitué trop tard et un mode de garde mal informé.",
      "Cet accompagnement donne la méthode que je transmets en consultation avant chaque reprise : quand commencer, combien tirer, comment conserver, quoi dire au mode de garde et à l'employeur.",
    ],
    bullets: [
      "Construire un plan de tirage adapté à votre rythme de travail.",
      "Conserver et transporter votre lait en sécurité.",
      "Préparer votre bébé et son mode de garde à votre absence.",
    ],
  },
  program: {
    title: "Ce que contient l'accompagnement",
    intro:
      "Des chapitres qui suivent l'ordre de préparation d'une reprise, du premier tirage aux imprévus du quotidien.",
  },
  outcomes: {
    title: "Ce qui devient possible",
    subtitle: "Ce que change un plan de tirage préparé, plutôt qu'improvisé la veille.",
    items: [
      "Vous reprenez avec un stock suffisant et un plan clair.",
      "Le tirage devient une routine de quelques minutes, pas une épreuve.",
      "Votre lait est conservé correctement, sans doute sur les durées.",
      "Votre mode de garde applique ce que vous avez demandé.",
      "Votre bébé accepte de boire en votre absence et retrouve le sein le soir.",
      "Votre lactation tient dans la durée au lieu de s'effondrer en trois semaines.",
    ],
  },
  fit: {
    title: "Est-ce le bon accompagnement pour vous ?",
    subtitle: "Pour préparer une reprise à venir, pas pour un sevrage déjà décidé.",
    forYouTitle: "Oui, si",
    forYou: [
      "Vous reprenez bientôt le travail et vous souhaitez continuer à allaiter.",
      "Vous vous demandez comment organiser les tétées et les moments où vous serez séparée de votre bébé.",
      "Vous voulez savoir comment tirer, conserver et transporter votre lait.",
      "Vous ne savez pas combien de lait prévoir pour les journées de garde.",
      "Vous vous demandez comment gérer les tirages au travail sans que cela devienne une contrainte impossible à tenir.",
      "Vous voulez trouver une organisation réaliste, adaptée à votre travail, votre bébé et votre allaitement.",
    ],
    notForYouTitle: "Pas encore, si",
    notForYou: [
      "Vous ne souhaitez pas poursuivre l'allaitement après votre reprise.",
      "Vous êtes déjà parfaitement organisée et autonome avec vos tirages et votre conservation du lait.",
      "Vous cherchez uniquement des informations sur le sevrage.",
    ],
  },
  moment: {
    title: "À quel moment de votre allaitement ?",
    intro:
      "Chaque accompagnement couvre une étape. Voici où celui-ci se situe.",
  },
  pricing: {
    title: "Reprenez le travail sans renoncer à votre allaitement",
    subtitle: "Un accès unique à l'accompagnement complet, à vie.",
  },
  faq: [
    {
      q: "Je reprends dans dix jours, est-ce trop tard ?",
      a: "Non. Cet accompagnement donne aussi la marche à suivre en délai court, avec ce qu'il faut prioriser quand il ne reste pas le temps de constituer un stock confortable.",
    },
    {
      q: "Mon bébé refuse le biberon.",
      a: "C'est fréquent et ce n'est pas bloquant. Cet accompagnement traite le refus, ses causes, et les alternatives au biberon selon l'âge de votre bébé.",
    },
    {
      q: "Je travaille en horaires décalés ou sans pause dédiée.",
      a: "Cet accompagnement couvre les plans de tirage contraints et rappelle ce que la loi prévoit sur votre lieu de travail.",
    },
  ],
  finalCta: {
    title: "Reprenez sereinement, continuez d'allaiter",
    subtitle: "Un plan clair vaut mieux qu'un arrêt subi.",
    ctaLabel: "Je prépare ma reprise sereinement",
  },
};
