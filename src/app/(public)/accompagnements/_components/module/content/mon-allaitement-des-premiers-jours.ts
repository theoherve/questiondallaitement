import type { ModuleContent } from "./types";

/**
 * Page de vente « Mon allaitement des premiers jours » (75 €, 7 chapitres).
 * Moment vise : la sortie de maternite et les six premieres semaines, quand
 * tout se joue et que la douleur fait abandonner.
 */
export const MON_ALLAITEMENT_DES_PREMIERS_JOURS: ModuleContent = {
  hero: {
    eyebrow: "Consultante IBCLC depuis 2011 · 5 000+ familles accompagnées",
    titleOverride:
      "Les premières semaines décident souvent de tout votre allaitement. Vous n'avez pas à les traverser à l'aveugle.",
    subtitle:
      "La maternité vous a laissée partir avec un bébé et dix conseils contradictoires. Ce module vous donne les repères cliniques des six premières semaines : la prise du sein, la douleur, la montée de lait, la prise de poids, les rythmes. Tout ce qui se joue maintenant.",
    ctaLabel: "Je pose des bases solides",
  },
  problem: {
    title: "Les premières semaines, personne ne vous a vraiment préparée",
    intro: "Vous vous êtes préparée à accoucher. Pas à ça.",
    points: [
      "Chaque mise au sein vous fait mal, et vous serrez les dents en attendant que « ça passe ».",
      "Vous ne savez pas si votre bébé boit assez, et personne ne vous donne de critère fiable pour le vérifier.",
      "On vous a dit de patienter, d'espacer, de compléter. Trois conseils qui se contredisent.",
      "Votre bébé réclame toutes les heures et vous vous demandez si votre lait suffit.",
      "La courbe de poids vous angoisse avant même le rendez-vous.",
      "Vous êtes épuisée à 3 h du matin, sans personne à qui poser la question qui vous tient éveillée.",
    ],
  },
  promise: {
    title: "Ce n'est pas un manque de volonté, c'est un manque de repères",
    paragraphs: [
      "La douleur n'est pas le prix à payer pour allaiter. Elle est un signal : dans la très grande majorité des cas, elle vient d'une prise du sein perfectible, et elle se corrige. Les conseils reçus à la maternité arrivent souvent trop vite, dans un couloir, sans que personne ne regarde vraiment une tétée.",
      "Ce module s'appuie sur l'observation clinique, la physiologie de la lactation et les comportements innés du nouveau-né. C'est ce que je regarde en consultation, mis à plat, chapitre par chapitre, pour que vous puissiez l'observer chez vous.",
    ],
    bullets: [
      "Reconnaître une bonne prise du sein, et corriger celle qui fait mal.",
      "Savoir, avec des critères objectifs, si votre bébé boit assez.",
      "Distinguer un rythme normal de nouveau-né d'un signal qui doit alerter.",
    ],
  },
  program: {
    title: "Ce que contient le module",
    intro:
      "Sept chapitres qui suivent l'ordre réel des premières semaines, à consulter dans l'urgence ou à parcourir tranquillement.",
  },
  outcomes: {
    title: "Ce qui devient possible",
    items: [
      "Vous mettez votre bébé au sein sans appréhension, parce que vous savez ce que vous regardez.",
      "La douleur diminue, puis disparaît, et vous savez pourquoi.",
      "La pesée n'est plus un verdict : vous avez déjà vos propres repères.",
      "Vous comprenez les tétées groupées du soir au lieu de les vivre comme un échec.",
      "Vous savez ce qui justifie d'appeler une consultante, et ce qui n'est qu'une étape normale.",
      "Vous arrêtez de chercher des réponses sur les forums à 3 h du matin.",
    ],
  },
  fit: {
    title: "Est-ce le bon module pour vous ?",
    forYouTitle: "Oui, si",
    forYou: [
      "Vous êtes enceinte du dernier trimestre ou votre bébé a moins de deux mois.",
      "Vous avez mal et on vous a répondu que c'était normal.",
      "Vous doutez de votre production de lait.",
      "Vous voulez comprendre ce que vous faites, pas appliquer une recette.",
    ],
    notForYouTitle: "Pas encore, si",
    notForYou: [
      "Votre bébé a plus de six mois : « Mon allaitement au fil des mois » correspond mieux à votre étape.",
      "Vous cherchez uniquement à soulager une crevasse ou une mastite installée : voyez « Les urgences allaitement ».",
      "Votre situation demande un examen clinique de votre bébé : une consultation individuelle s'impose d'abord.",
    ],
  },
  moment: {
    title: "À quel moment de votre allaitement ?",
    intro: "Chaque accompagnement couvre une étape. Voici où celui-ci se situe.",
  },
  // PLACEHOLDER — temoignages a remplacer par de vrais verbatims avant mise en ligne.
  testimonials: {
    title: "Elles ont retrouvé des premières semaines sereines",
    items: [
      {
        quote:
          "J'avais mal à en pleurer. En comprenant la prise du sein, la douleur a disparu en trois jours.",
        author: "Marie",
        detail: "Maman de Léa, 3 semaines",
      },
      {
        quote:
          "Je pensais ne pas avoir assez de lait. J'avais juste un bébé au rythme normal, et personne ne me l'avait dit.",
        author: "Sarah",
        detail: "Maman d'Adam, 6 semaines",
      },
      {
        quote:
          "Enfin des réponses claires et non culpabilisantes. J'ai repris confiance en moi.",
        author: "Camille",
        detail: "Maman de Jules, 5 semaines",
      },
    ],
  },
  pricing: {
    title: "Donnez à votre allaitement le démarrage qu'il mérite",
    subtitle: "Un accès unique au module complet, à vie.",
  },
  faq: [
    {
      q: "Mon bébé a déjà trois mois, est-ce encore utile ?",
      a: "Oui si vous avez encore mal ou si vous doutez de votre production : les repères des premières semaines restent valables. Si votre allaitement est installé et que vos questions portent sur la suite, « Mon allaitement au fil des mois » vous conviendra mieux.",
    },
    {
      q: "Je suis encore enceinte, dois-je attendre l'accouchement ?",
      a: "Non, c'est même le meilleur moment. Vous arrivez à la maternité en sachant ce que vous regardez, au lieu de découvrir en pleine fatigue.",
    },
    {
      q: "J'allaite déjà en mixte, ce module peut-il m'aider ?",
      a: "Oui. Il vous aide à comprendre ce qui a conduit aux compléments et ce qui reste possible pour votre allaitement, sans injonction.",
    },
  ],
  finalCta: {
    title: "Offrez-vous des premières semaines sereines",
    subtitle:
      "Les bons repères, au bon moment, plutôt que dix conseils contradictoires.",
    ctaLabel: "Je pose des bases solides",
  },
};
