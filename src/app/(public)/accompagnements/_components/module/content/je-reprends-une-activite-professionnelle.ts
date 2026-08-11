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
      "Ce module donne la méthode que je transmets en consultation avant chaque reprise : quand commencer, combien tirer, comment conserver, quoi dire au mode de garde et à l'employeur.",
    ],
    bullets: [
      "Construire un plan de tirage adapté à votre rythme de travail.",
      "Conserver et transporter votre lait en sécurité.",
      "Préparer votre bébé et son mode de garde à votre absence.",
    ],
  },
  program: {
    title: "Ce que contient le module",
    intro:
      "Des chapitres qui suivent l'ordre de préparation d'une reprise, du premier tirage aux imprévus du quotidien.",
  },
  outcomes: {
    title: "Ce qui devient possible",
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
    title: "Est-ce le bon module pour vous ?",
    forYouTitle: "Oui, si",
    forYou: [
      "Vous reprenez dans les semaines ou les mois qui viennent.",
      "Vous voulez continuer à allaiter après la reprise.",
      "Vous n'avez jamais tiré votre lait ou vos essais ont échoué.",
      "Vous cherchez un plan concret, pas des encouragements.",
    ],
    notForYouTitle: "Pas encore, si",
    notForYou: [
      "Votre allaitement n'est pas encore installé et vous avez mal : commencez par « Mon allaitement des premiers jours ».",
      "Vous avez décidé de sevrer à la reprise : « Je souhaite sevrer mon bébé » vous accompagnera mieux.",
      "Votre bébé a plus de six mois et votre question porte d'abord sur les repas solides : voyez « La diversification de mon bébé allaité ».",
    ],
  },
  moment: {
    title: "À quel moment de votre allaitement ?",
    intro:
      "Chaque accompagnement couvre une étape. Voici où celui-ci se situe.",
  },
  // PLACEHOLDER — temoignages a remplacer par de vrais verbatims avant mise en ligne.
  pricing: {
    title: "Reprenez le travail sans renoncer à votre allaitement",
    subtitle: "Un accès unique au module complet, à vie.",
  },
  faq: [
    {
      q: "Je reprends dans dix jours, est-ce trop tard ?",
      a: "Non. Le module donne aussi la marche à suivre en délai court, avec ce qu'il faut prioriser quand il ne reste pas le temps de constituer un stock confortable.",
    },
    {
      q: "Mon bébé refuse le biberon.",
      a: "C'est fréquent et ce n'est pas bloquant. Le module traite le refus, ses causes, et les alternatives au biberon selon l'âge de votre bébé.",
    },
    {
      q: "Je travaille en horaires décalés ou sans pause dédiée.",
      a: "Le module couvre les plans de tirage contraints et rappelle ce que la loi prévoit sur votre lieu de travail.",
    },
  ],
  finalCta: {
    title: "Reprenez sereinement, continuez d'allaiter",
    subtitle: "Un plan clair vaut mieux qu'un arrêt subi.",
    ctaLabel: "Je prépare ma reprise sereinement",
  },
};
