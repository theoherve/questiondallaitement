import type { ModuleContent } from "./types";

/**
 * Page de vente « Mon allaitement au fil des mois » (75 €).
 * Moment vise : allaitement installe, de deux mois a plusieurs annees, quand
 * plus personne n'accompagne. Les titres de chapitres en base sont deja les
 * questions des meres (« Je veux plus de lait », « J'ai mal ») : le programme
 * les affiche tels quels.
 */
export const MON_ALLAITEMENT_AU_FIL_DES_MOIS: ModuleContent = {
  hero: {
    eyebrow: "CONSULTANTE IBCLC DEPUIS 2011 · 6 000+ FAMILLES ACCOMPAGNÉES",
    titleOverride:
      "Votre allaitement devient difficile après plusieurs mois ? Ce n'est ni un pic de croissance qui s'éternise, ni une fatalité.",
    subtitle:
      "Passé les premières semaines, on considère que ça roule. Sauf que la baisse de lait, les pics de croissance, les tétées agitées, les dents et le regard des autres arrivent maintenant, et que plus personne ne vous accompagne.",
    ctaLabel: "Je retrouve un allaitement apaisé",
  },
  problem: {
    title: "Le moment où l'on cesse de vous accompagner",
    intro:
      "Passé six semaines, on suppose que vous savez. Ce n'est pas ce que vous vivez.",
    points: [
      "Vous avez l'impression d'avoir moins de lait qu'avant et vous ne savez pas si c'est réel.",
      "Votre bébé s'agite au sein, se cambre, refuse, et vous ne comprenez pas pourquoi.",
      "La douleur est revenue après des semaines sans problème.",
      "On vous demande de plus en plus souvent quand vous comptez arrêter.",
      "Votre bébé tète encore la nuit et tout le monde vous dit que ce n'est plus normal.",
      "Vous ne savez pas à qui poser ces questions maintenant que la maternité est loin.",
    ],
  },
  promise: {
    title: "Un allaitement qui dure n'est pas un allaitement figé",
    paragraphs: [
      "La lactation s'ajuste en permanence. Ce que vous prenez pour une baisse est souvent une régulation normale, et ce que vous prenez pour un caprice est le plus souvent un besoin identifiable. Encore faut-il savoir lire l'un et l'autre.",
      "Ce module reprend, une par une, les questions que les mères me posent entre deux mois et deux ans, avec ce que l'observation clinique permet de répondre.",
    ],
    bullets: [
      "Distinguer une vraie baisse de lactation d'une régulation normale.",
      "Comprendre les comportements de votre bébé au sein plutôt que les interpréter.",
      "Savoir répondre à l'entourage sans avoir à vous justifier.",
    ],
  },
  program: {
    title: "Ce que contient le module",
    intro:
      "Des chapitres nommés comme vous formulez vos questions, pour aller droit à celle qui vous préoccupe aujourd'hui.",
  },
  outcomes: {
    title: "Ce qui devient possible",
    subtitle: "Ce que change le fait de savoir lire son allaitement, mois après mois.",
    items: [
      "Vous savez si votre production baisse vraiment, et quoi faire le cas échéant.",
      "Les tétées agitées ne vous inquiètent plus, vous en connaissez les causes.",
      "Vous traversez les pics de croissance sans croire que tout s'écroule.",
      "La douleur qui revient a une explication et une réponse.",
      "Vous assumez les tétées nocturnes en sachant ce qu'elles apportent.",
      "Les remarques de l'entourage glissent.",
    ],
  },
  fit: {
    title: "Est-ce le bon module pour vous ?",
    subtitle: "Pour un allaitement déjà installé, pas pour les tout premiers jours.",
    forYouTitle: "Oui, si",
    forYou: [
      "Votre bébé a plus de deux mois et votre allaitement est installé.",
      "Vous doutez de votre production sans signe objectif.",
      "Votre bébé s'agite ou refuse le sein.",
      "Vous voulez continuer et vous cherchez des réponses solides.",
    ],
    notForYouTitle: "Pas encore, si",
    notForYou: [
      "Votre bébé a moins de six semaines : voyez « Mon allaitement des premiers jours ».",
      "Votre question porte sur la reprise du travail, la diversification ou le sevrage : ces trois modules existent séparément.",
      "Vous avez une mastite ou un abcès en cours qui demande un avis médical immédiat.",
    ],
  },
  moment: {
    title: "À quel moment de votre allaitement ?",
    intro:
      "Chaque accompagnement couvre une étape. Voici où celui-ci se situe.",
  },
  pricing: {
    title: "Continuez votre allaitement avec les bonnes réponses",
    subtitle: "Un accès unique au module complet, à vie.",
  },
  faq: [
    {
      q: "Mon bébé a un an, c'est encore pour moi ?",
      a: "Oui. Le module couvre l'allaitement long, y compris les questions propres au jeune enfant qui tète encore.",
    },
    {
      q: "Je crois que je n'ai plus assez de lait.",
      a: "C'est la crainte la plus fréquente, et rarement fondée. Le module donne les critères objectifs pour le vérifier avant de conclure, puis les leviers réels si la baisse est confirmée.",
    },
    {
      q: "Mon bébé refuse le sein depuis quelques jours.",
      a: "Le module traite la grève de la tétée, ses causes possibles et la conduite à tenir. Un refus soudain n'est presque jamais un sevrage.",
    },
  ],
  finalCta: {
    title: "Votre allaitement mérite de durer sereinement",
    subtitle:
      "Les questions du milieu de parcours méritent d'aussi bonnes réponses que celles du début.",
    ctaLabel: "Je retrouve un allaitement apaisé",
  },
};
