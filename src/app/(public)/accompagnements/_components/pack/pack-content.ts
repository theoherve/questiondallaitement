/**
 * Copie PLACEHOLDER de la page de vente du pack.
 * 100 % sérialisable — remplacer par les vrais textes sans toucher à la structure.
 * Les modules affichés viennent de la DB, pas d'ici.
 *
 * Nom validé (spec « Pages de vente » v2) : « L'Allaitement Sur Mesure ».
 * Le nombre de modules et l'ancrage prix sont dérivés de la DB, pas figés ici.
 */
export const PACK_CONTENT = {
  hero: {
    eyebrow: "L'Allaitement Sur Mesure",
    subtitle:
      "Le programme complet pour vivre un allaitement serein, de la préparation au sevrage — à votre rythme, où que vous soyez.",
    reassurances: [
      "Accès immédiat après paiement",
      "Accès illimité, à vie",
      "Par une consultante IBCLC",
    ],
    ctaLabel: "Rejoindre le pack",
  },
  problem: {
    title: "L'allaitement, ça ne devrait pas être un parcours du combattant",
    intro:
      "Vous vous êtes préparée à accueillir votre bébé, mais personne ne vous a vraiment préparée à l'allaitement.",
    points: [
      "Des douleurs qui s'installent sans que vous sachiez pourquoi.",
      "Des conseils contradictoires à chaque personne consultée.",
      "La peur de « ne pas avoir assez de lait ».",
      "Des nuits hachées et le sentiment d'être seule face aux difficultés.",
      "Le retour au travail qui approche, sans plan clair.",
      "L'impression que tout repose sur vous, en permanence.",
    ],
  },
  promise: {
    title: "Et si vous aviez enfin les bonnes réponses, au bon moment ?",
    paragraphs: [
      "« L'Allaitement Sur Mesure » réunit tout ce dont vous avez besoin pour comprendre, anticiper et surmonter chaque étape de votre allaitement.",
      "Des contenus clairs, fondés sur les preuves, accessibles à toute heure — parce qu'un bébé ne pleure pas aux heures d'ouverture.",
    ],
    bullets: [
      "Comprendre ce qui se passe et pourquoi.",
      "Savoir quoi faire, concrètement, à chaque étape.",
      "Reprendre confiance en vous et en votre corps.",
    ],
  },
  modules: {
    title: "Tout ce que contient le pack",
    // Rendu comme « {N} {subtitle} » — le nombre vient de la DB.
    subtitle:
      "parcours complets qui couvrent l'allaitement, de la préparation au sevrage.",
  },
  howItWorks: {
    title: "Comment ça se passe",
    steps: [
      {
        title: "Vous rejoignez le pack",
        text: "Paiement sécurisé, puis accès immédiat à l'ensemble des modules.",
      },
      {
        title: "Vous avancez à votre rythme",
        text: "Chaque module est disponible à vie : vous piochez selon votre besoin du moment.",
      },
      {
        title: "Vous appliquez, sereinement",
        text: "Des contenus concrets et fondés sur les preuves, pour agir en confiance.",
      },
    ],
  },
  forWho: {
    title: "Vous allez vous reconnaître",
    scenarios: [
      "Vous êtes enceinte et vous voulez mettre toutes les chances de votre côté.",
      "Votre bébé vient de naître et les premiers jours sont plus durs que prévu.",
      "Vous reprenez le travail et vous ne savez pas comment organiser la suite.",
      "Vous vous posez mille questions sur la diversification.",
      "Vous envisagez le sevrage et vous voulez le faire en douceur.",
    ],
  },
  instructor: {
    title: "Votre formatrice",
    fallbackName: "Votre consultante IBCLC",
    // PLACEHOLDER — chiffres à valider avec Carole avant mise en ligne.
    fallbackBio:
      "Consultante en lactation certifiée IBCLC, elle accompagne plus de 1000 mères chaque année avec une approche fondée sur les preuves et bienveillante.",
    // PLACEHOLDER — bloc crédibilité structuré (spec) : à confirmer avec Carole.
    credentials: [
      "IBCLC depuis 2011",
      "1000+ mères accompagnées chaque année",
      "Une équipe de 7 consultantes IBCLC",
      "Autrice de 3 livres sur l'allaitement",
      "Formatrice & conférencière",
    ],
  },
  testimonials: {
    // PLACEHOLDER — remplacer par les vrais témoignages nominatifs du site.
    title: "Elles ont retrouvé un allaitement serein",
    items: [
      {
        quote:
          "J'étais à deux doigts d'arrêter à cause des douleurs. Les modules m'ont tout expliqué, aujourd'hui j'allaite sans douleur.",
        author: "Marie",
        detail: "Maman de Léa, 3 mois",
      },
      {
        quote:
          "Enfin des réponses claires et non culpabilisantes. J'ai repris confiance en moi.",
        author: "Sarah",
        detail: "Maman de Adam, 5 mois",
      },
      {
        quote:
          "La reprise du travail m'angoissait. Le module dédié a tout changé.",
        author: "Camille",
        detail: "Maman de Jules, 7 mois",
      },
    ],
  },
  pricing: {
    title: "Rejoignez « L'Allaitement Sur Mesure »",
    subtitle: "Un accès unique à l'ensemble des modules, à vie.",
    includes: [
      "L'intégralité des modules du pack",
      "Accès immédiat et illimité, à vie",
      "Mises à jour incluses",
      "Paiement en 1×, 3× ou 4× sans frais",
    ],
    // PLACEHOLDER JURIDIQUE — durée/conditions à valider (voir memory
    // withdrawal-waiver-removed : la rétractation a été retirée, cette garantie
    // rouvre le risque de remboursement sur contenu numérique à accès immédiat).
    guarantee: "Satisfait ou remboursé sous 14 jours.",
  },
  faq: {
    title: "Questions fréquentes",
    items: [
      {
        q: "Quand ai-je accès au contenu ?",
        a: "Immédiatement après votre paiement. Vous recevez vos accès et pouvez commencer tout de suite.",
      },
      {
        q: "Pendant combien de temps ai-je accès ?",
        a: "À vie. Vous revenez sur les modules autant de fois que vous le souhaitez, à votre rythme.",
      },
      {
        q: "Est-ce que ça remplace une consultation individuelle ?",
        a: "Non. Le pack couvre la grande majorité des situations avec des contenus clairs et fondés sur les preuves. Pour une situation spécifique, une consultation individuelle reste disponible en complément.",
      },
      {
        q: "J'ai déjà allaité, ça peut encore m'apporter quelque chose ?",
        a: "Oui. Chaque allaitement est différent, et ce qui s'est passé la première fois ne préjuge pas de la suivante. Le pack vous aide à aborder chaque étape avec les bons repères.",
      },
      {
        q: "Et si mon allaitement est déjà difficile ?",
        a: "Le pack est justement conçu pour comprendre ce qui se joue et reprendre la main, même quand le démarrage a été compliqué.",
      },
      {
        q: "Puis-je payer en plusieurs fois ?",
        a: "Oui, le paiement en 3× ou 4× sans frais est proposé au moment du règlement.",
      },
      {
        q: "Le contenu est-il fiable ?",
        a: "Oui. Tous les contenus sont conçus par une consultante en lactation IBCLC, selon une approche fondée sur les preuves.",
      },
      {
        q: "Et si je débute tout juste ma grossesse ?",
        a: "Le pack couvre la préparation à l'allaitement : c'est le moment idéal pour prendre de l'avance sereinement.",
      },
    ],
  },
  finalCta: {
    title: "Offrez-vous un allaitement serein",
    subtitle:
      "Rejoignez « L'Allaitement Sur Mesure » et avancez avec les bonnes réponses, à chaque étape.",
    ctaLabel: "Rejoindre le pack",
  },
} as const;
