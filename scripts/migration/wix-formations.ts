export type WixStep = {
  title: string;
};

export type WixSection = {
  title: string;
  stepCount: number;
  steps?: WixStep[];
};

export type WixFormation = {
  id: string;
  slug: string;
  title: string;
  totalSteps?: number;
  sections: WixSection[];
};

export const wixFormations: WixFormation[] = [
  {
    id: "f0000002-0002-4000-8000-000000000002",
    slug: "je-me-prepare-a-allaiter",
    title: "Je me prépare à allaiter",
    totalSteps: 21,
    sections: [
      {
        title: "Aperçu",
        stepCount: 0,
      },
      {
        title: "Quiz",
        stepCount: 1,
        steps: [
          {
            title: "Avez-vous tout bien préparé pour l’arrivée de bébé ?",
          },
        ],
      },
      {
        title: "Ce que vous devez savoir",
        stepCount: 7,
        steps: [
          { title: "Ce que vous devez savoir" },
          { title: "Comment se passe l’allaitement dans les tout premiers jours" },
          { title: "Comment fonctionne le sein" },
          { title: "Qu’est-ce que la tétée de bienvenue ?" },
          { title: "Quels sont les principaux obstacles ?" },
          { title: "Comment va se passer la montée de lait ?" },
          { title: "Quelle quantité de lait dois-je produire ?" },
        ],
      },
      {
        title: "Vos principales préoccupations",
        stepCount: 6,
      },
      {
        title: "Quelques idées reçues",
        stepCount: 3,
      },
      {
        title: "Bonus",
        stepCount: 4,
      },
    ],
  },
  {
    id: "f0000003-0003-4000-8000-000000000003",
    slug: "mon-allaitement-des-premiers-jours",
    title: "Mon allaitement des premiers jours",
    totalSteps: 36,
    sections: [
      {
        title: "Aperçu",
        stepCount: 0,
      },
      {
        title: "Ce que vous devez savoir",
        stepCount: 7,
      },
      {
        title: "Les douleurs",
        stepCount: 6,
      },
      {
        title: "La prise de poids de mon bébé; ma sécrétion lactée",
        stepCount: 12,
      },
      {
        title: "Les rythmes de mon bébé",
        stepCount: 4,
      },
      {
        title: "Bonus",
        stepCount: 3,
      },
      {
        title: "Quiz",
        stepCount: 2,
      },
      {
        title: "Le co-allaitement",
        stepCount: 2,
      },
    ],
  },
  {
    id: "f0000009-0009-4000-8000-000000000009",
    slug: "mon-bebe-ne-fait-pas-ses-nuits",
    title: "Mon bébé ne fait pas ses nuits",
    totalSteps: 52,
    sections: [
      {
        title: "Aperçu",
        stepCount: 0,
      },
      {
        title: "Introduction",
        stepCount: 1,
      },
      {
        title: "Comprendre les besoins de l’enfant",
        stepCount: 12,
      },
      {
        title: "Optimiser le sommeil du nourrisson au jeune enfant",
        stepCount: 4,
      },
      {
        title: "Alimentation et sommeil",
        stepCount: 5,
      },
      {
        title: "Favoriser l’endormissement",
        stepCount: 6,
      },
      {
        title: "Qu’est-ce qui parasite le sommeil",
        stepCount: 10,
      },
      {
        title: "Les habitudes de sommeil",
        stepCount: 6,
      },
      {
        title: "Le bien-être des parents",
        stepCount: 8,
      },
    ],
  },
  {
    id: "f0000007-0007-4000-8000-000000000007",
    slug: "je-souhaite-sevrer-mon-bebe",
    title: "Je souhaite sevrer mon bébé",
    totalSteps: 26,
    sections: [
      {
        title: "Aperçu",
        stepCount: 0,
      },
      {
        title: "Les déterminants du sevrage",
        stepCount: 7,
      },
      {
        title: "Comment procéder en pratique ?",
        stepCount: 9,
      },
      {
        title: "Et les émotions dans tout ça ?",
        stepCount: 2,
      },
      {
        title: "Dépasser les aléas",
        stepCount: 4,
      },
      {
        title: "Et c’était une grève de la tétée ?",
        stepCount: 2,
      },
      {
        title: "Bonus",
        stepCount: 2,
      },
    ],
  },
  {
    id: "f0000006-0006-4000-8000-000000000006",
    slug: "je-reprends-une-activite-professionnelle",
    title: "Je reprends une activité professionnelle",
    totalSteps: 21,
    sections: [
      {
        title: "Aperçu",
        stepCount: 0,
      },
      {
        title: "Maintenir une lactation solide",
        stepCount: 6,
        steps: [
          { title: "Une lactation solide, la clé" },
          { title: "Concilier allaitement et travail, c’est possible" },
          { title: "Je ne souhaite pas tirer mon lait" },
          { title: "Concrètement, comment puis-je m’organiser ?" },
          { title: "Maintenir sa lactation" },
          { title: "Comment obtenir plus de lait au tire-lait ?" },
        ],
      },
      {
        title: "Comment tirer son lait ?",
        stepCount: 4,
      },
      {
        title: "Prendre soin de mon bébé en mon absence",
        stepCount: 5,
      },
      {
        title: "Mon entourage : hiérarchie, modes de garde",
        stepCount: 3,
      },
      {
        title: "Comment réagir face aux aléas ?",
        stepCount: 1,
      },
      {
        title: "Bonus",
        stepCount: 2,
      },
    ],
  },
  {
    id: "f0000001-0001-4000-8000-000000000001",
    slug: "pack-essentiel-allaitement",
    title: "Pack - L’essentiel de l’allaitement",
    totalSteps: 177,
    sections: [
      {
        title: "Aperçu",
        stepCount: 0,
      },
      {
        title: "Présentation du pack",
        stepCount: 1,
      },
      {
        title: "Je me prépare à allaiter",
        stepCount: 15,
      },
      {
        title: "Mon allaitement des premiers jours",
        stepCount: 27,
      },
      {
        title: "Mon allaitement au fil des mois",
        stepCount: 32,
      },
      {
        title: "La diversification de mon bébé allaité",
        stepCount: 16,
      },
      {
        title: "Je reprends une activité professionnelle",
        stepCount: 18,
      },
      {
        title: "Je souhaite sevrer mon bébé",
        stepCount: 17,
      },
      {
        title: "Mon bébé ne fait pas ses nuits",
        stepCount: 51,
      },
    ],
  },
  {
    id: "f0000004-0004-4000-8000-000000000004",
    slug: "mon-allaitement-au-fil-des-mois",
    title: "Mon allaitement au fil des mois",
    sections: [],
  },
  {
    id: "f0000005-0005-4000-8000-000000000005",
    slug: "les-urgences-allaitement",
    title: "Les urgences de l’allaitement",
    sections: [],
  },
  {
    id: "f0000008-0008-4000-8000-000000000008",
    slug: "la-diversification-de-mon-bebe-allaite",
    title: "La diversification de mon bébé allaité",
    sections: [],
  },
];

