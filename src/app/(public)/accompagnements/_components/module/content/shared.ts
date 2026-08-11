import type { FaqItem } from "../../sales/sales-faq";

/**
 * Ce qui ne varie pas d'un module a l'autre. Les 8 fichiers de contenu ne
 * portent que le specifique.
 */
export const SHARED_CONTENT = {
  reassurances: [
    "Accès immédiat après paiement",
    "Accès illimité, à vie",
    "Par une consultante IBCLC",
  ],
  howItWorks: {
    title: "Comment se déroule l'accompagnement",
    steps: [
      {
        title: "Vous rejoignez le module",
        text: "Paiement sécurisé (1×, 3× ou 4× sans frais), accès immédiat à l'ensemble du contenu.",
      },
      {
        title: "Vous avancez à votre rythme",
        text: "Le module reste accessible à vie : vous y revenez selon votre besoin du moment, sans calendrier imposé.",
      },
      {
        title: "Vous appliquez, sereinement",
        text: "Des contenus courts, concrets, fondés sur les preuves, pensés pour être consultés entre deux tétées.",
      },
    ],
  },
  instructor: {
    title: "Pourquoi faire confiance à Carole",
    fallbackName: "Votre consultante IBCLC",
    fallbackBio:
      "Consultante en lactation certifiée IBCLC depuis 2011, j'ai accompagné plus de 5 000 familles et j'aide aujourd'hui plus de 1 000 mères chaque année, avec une équipe de 7 consultantes IBCLC. Ce module, c'est la synthèse de plus de dix ans de consultations individuelles, condensée pour être accessible à toute heure, même quand mon agenda de consultation est complet.",
    credentials: [
      "IBCLC depuis 2011",
      "70 k+ familles accompagnées",
      "1 000+ mères accompagnées chaque année",
      "Une équipe de 7 consultantes IBCLC",
      "Autrice de 3 livres sur l'allaitement",
      "Formatrice & conférencière internationale",
    ],
  },
  pricing: {
    includes: [
      "L'intégralité du module",
      "Accès immédiat et illimité, à vie",
      "Mises à jour incluses",
      "Paiement en 1×, 3× ou 4× sans frais",
    ],
    // PLACEHOLDER JURIDIQUE — formulation reprise du pack sur decision explicite.
    // La mention de retractation avait ete retiree du tunnel d'achat (contenu
    // numerique a acces immediat) : cette promesse rouvre le risque de
    // remboursement, desormais sur 9 pages. A faire valider avant mise en ligne.
    guarantee: "Satisfait ou remboursé sous 14 jours.",
  },
  faq: {
    title: "Questions fréquentes",
    /** Questions communes, ajoutees apres les questions propres au module. */
    common: [
      {
        q: "Quand ai-je accès au contenu ?",
        a: "Immédiatement après votre paiement. Vous recevez vos accès et pouvez commencer tout de suite.",
      },
      {
        q: "Pendant combien de temps ai-je accès ?",
        a: "À vie. Vous revenez sur le module autant de fois que vous le souhaitez, à votre rythme.",
      },
      {
        q: "Est-ce que ça remplace une consultation individuelle ?",
        a: "Non. Le module couvre la grande majorité des situations avec des contenus clairs et fondés sur les preuves. Pour une situation spécifique, une consultation individuelle reste disponible en complément.",
      },
      {
        q: "Puis-je payer en plusieurs fois ?",
        a: "Oui, le paiement en 3× ou 4× sans frais est proposé au moment du règlement.",
      },
      {
        q: "Le contenu est-il fiable ?",
        a: "Oui. Tous les contenus sont conçus par une consultante en lactation IBCLC, selon une approche fondée sur les preuves.",
      },
    ] satisfies FaqItem[],
  },
  moment: {
    currentBadge: "Vous êtes ici",
  },
} as const;
