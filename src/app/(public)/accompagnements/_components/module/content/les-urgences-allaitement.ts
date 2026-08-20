import type { ModuleContent } from "./types";

/**
 * Page de vente « Les urgences allaitement » (27 €).
 *
 * Parcours volontairement court : `problem` et `promise` sont omis. La
 * lectrice arrive ici avec une crevasse ou une mastite en cours ; lui
 * derouler six paragraphes sur sa douleur avant de montrer le remede serait
 * contre-productif. Le hero enchaine sur la barre de preuve, puis directement
 * sur le programme.
 */
export const LES_URGENCES_ALLAITEMENT: ModuleContent = {
  hero: {
    eyebrow: "CONSULTANTE IBCLC DEPUIS 2011 · 6 000+ FAMILLES ACCOMPAGNÉES",
    titleOverride:
      "Une crevasse, un engorgement, une mastite. Ce qu'il faut faire, tout de suite.",
    subtitle:
      "Les situations douloureuses les plus fréquentes, chacune avec sa marche à suivre, expliquées par une consultante IBCLC. Accès immédiat, pour ce soir.",
    ctaLabel: "Je soulage la douleur maintenant",
  },
  program: {
    title: "Les urgences traitées",
    intro:
      "Chaque chapitre répond à une situation précise, avec la conduite à tenir et ce qu'il ne faut surtout pas faire.",
  },
  outcomes: {
    title: "Ce qui devient possible",
    subtitle: "Ce que change la bonne conduite à tenir, tout de suite.",
    items: [
      "Vous savez quoi faire dans l'heure qui vient.",
      "La douleur diminue parce que vous traitez la cause, pas le symptôme.",
      "Vous savez ce qui relève de l'auto-traitement et ce qui impose de consulter.",
      "Vous évitez les gestes qui aggravent, encore souvent conseillés.",
      "Vous continuez d'allaiter pendant le traitement, ce qui est presque toujours indiqué.",
      "Vous reconnaissez les signes de récidive avant qu'elle s'installe.",
    ],
  },
  fit: {
    title: "Est-ce le bon module pour vous ?",
    subtitle: "Pour une douleur ou un symptôme précis, là, maintenant.",
    forYouTitle: "Oui, si",
    forYou: [
      "Vous avez mal maintenant et vous cherchez la conduite à tenir.",
      "Vous avez une rougeur, une boule ou de la fièvre.",
      "On vous a conseillé d'arrêter d'allaiter et vous voulez vérifier.",
      "Vous voulez savoir reconnaître ces situations avant qu'elles arrivent.",
    ],
    notForYouTitle: "Pas encore, si",
    notForYou: [
      "Votre douleur est présente à chaque tétée depuis le début sans lésion visible : c'est souvent une question de prise du sein, voyez « Mon allaitement des premiers jours ».",
      "Vous avez de la fièvre depuis plus de 24 heures ou un état général dégradé : consultez un médecin sans attendre, ce module ne remplace pas un avis clinique.",
      "Vous cherchez un accompagnement complet de votre allaitement : le pack ou les modules par étape sont plus adaptés.",
    ],
  },
  moment: {
    title: "À quel moment de votre allaitement ?",
    intro:
      "Chaque accompagnement couvre une étape. Voici où celui-ci se situe.",
  },
  pricing: {
    title: "Soulagez la douleur, ce soir",
    subtitle: "Accès immédiat après paiement. Un accès unique, à vie.",
  },
  faq: [
    {
      q: "J'ai de la fièvre, dois-je consulter ?",
      a: "Oui si elle dure plus de 24 heures ou si votre état général se dégrade. Le module précise les critères qui doivent vous amener à consulter, il ne remplace pas un avis médical.",
    },
    {
      q: "Dois-je arrêter d'allaiter pendant une mastite ?",
      a: "Non. Dans la très grande majorité des cas, continuer est précisément ce qui résout la mastite. Le module explique pourquoi et comment procéder.",
    },
    {
      q: "Le module coûte 27 €, pourquoi si peu ?",
      a: "C'est le plus court du catalogue, quelques situations ciblées et rien d'autre, et il doit rester accessible dans l'urgence.",
    },
  ],
  finalCta: {
    title: "N'attendez pas que ça empire",
    subtitle:
      "La conduite à tenir pour chaque situation, accessible dans la minute.",
    ctaLabel: "Je soulage la douleur maintenant",
  },
};
