/**
 * Copie de la page de vente du pack (refonte copywriting, août 2026).
 * 100 % sérialisable — la structure suit les 12 temps du brief de vente.
 * Les modules affichés et le prix viennent de la DB, pas d'ici.
 *
 * `titleOverride` ne s'applique qu'au H1 de cette page : le nom produit
 * (accompagnements.title) reste utilisé dans les listings, le panier et les factures.
 */
export const PACK_CONTENT = {
  hero: {
    eyebrow: "Consultante IBCLC depuis 2011 · 5 000+ familles accompagnées",
    titleOverride:
      "Et si allaiter ne rimait plus avec douleur, épuisement et doutes, mais avec une évidence tranquille ?",
    subtitle:
      "Imaginez une tétée sans boule au ventre. Un bébé apaisé, une prise de poids qui ne vous angoisse plus, des nuits qui redeviennent supportables. Ce n'est pas un idéal inaccessible, c'est ce que permettent les bons repères, au bon moment.",
    reassurances: [
      "Accès immédiat après paiement",
      "Accès illimité, à vie",
      "Par une consultante IBCLC",
    ],
    ctaLabel: "Je sécurise mon allaitement",
  },
  problem: {
    title: "Ce que vous vivez peut-être, là, maintenant",
    intro:
      "Vous vous êtes préparée à accueillir votre bébé. Personne ne vous a vraiment préparée à l'allaitement.",
    points: [
      "Vos seins vous font mal à chaque mise au sein, et vous redoutez la tétée suivante plutôt que de l'attendre.",
      "On vous a donné dix conseils différents : à la maternité, par votre entourage, sur internet. Et ils se contredisent tous.",
      "Vous regardez la courbe de poids de votre bébé avec une boule au ventre, en redoutant le verdict du prochain rendez-vous.",
      "Vous êtes épuisée, seule à 3h du matin, sans personne à qui poser vos questions dans l'instant.",
      "Le retour au travail approche et vous n'avez aucun plan clair pour continuer d'allaiter.",
      "Vous avez l'impression que tout repose sur vous, en permanence, sans droit à l'erreur.",
    ],
  },
  promise: {
    title: "Pourquoi les conseils habituels ne suffisent pas",
    paragraphs: [
      "Si vous en êtes là, ce n'est pas un manque de volonté ni d'amour pour votre bébé. Les forums, les avis contradictoires de l'entourage et les injonctions reçues à la maternité (« patientez », « ça va passer », « donnez un biberon pour voir ») ne font qu'ajouter du doute au doute. Sans repères cliniques précis, on navigue à vue, et on s'épuise plus vite qu'on ne trouve de réponses.",
      "Mon approche s'appuie sur l'observation clinique, la physiologie réelle de la lactation et les comportements innés du nourrisson, pas sur des dogmes ni des recettes universelles. Ce pack est la version structurée de ce que je transmets en consultation individuelle depuis plus de dix ans.",
    ],
    bullets: [
      "Comprendre ce qui se passe dans votre corps et celui de votre bébé, et pourquoi.",
      "Savoir quoi faire, concrètement, à chaque étape, et ce qu'il ne faut surtout pas faire.",
      "Distinguer ce qui est physiologiquement normal de ce qui doit être corrigé.",
    ],
  },
  modules: {
    title: "Les piliers du programme",
    // Rendu comme « {N} {subtitle} » — le nombre vient de la DB.
    subtitle:
      "parcours complets qui couvrent l'allaitement, de la préparation au sevrage.",
  },
  howItWorks: {
    title: "Comment se déroule l'accompagnement",
    steps: [
      {
        title: "Vous rejoignez le pack",
        text: "Paiement sécurisé (1×, 3× ou 4× sans frais), accès immédiat à l'ensemble des modules.",
      },
      {
        title: "Vous avancez à votre rythme",
        text: "Chaque module reste accessible à vie : vous y revenez selon votre besoin du moment, sans calendrier imposé.",
      },
      {
        title: "Vous appliquez, sereinement",
        text: "Des contenus courts, concrets, fondés sur les preuves, pensés pour être consultés entre deux tétées.",
      },
    ],
  },
  forWho: {
    title: "Ce qui devient possible",
    scenarios: [
      "La pesée de votre bébé n'est plus une source d'angoisse mais la confirmation que votre corps fait ce qu'il faut.",
      "Vous savez pourquoi votre bébé pleure, et quoi faire, sans avoir à deviner.",
      "Vos nuits redeviennent lisibles : vous comprenez les réveils au lieu de les subir.",
      "La reprise du travail est organisée, avec un plan de tirage et une lactation qui tient.",
      "La diversification puis, le jour venu, le sevrage se font à votre rythme et en sécurité.",
      "Vous devenez une mère qui sait, plutôt qu'une mère qui devine.",
    ],
  },
  instructor: {
    title: "Pourquoi faire confiance à Carole",
    fallbackName: "Votre consultante IBCLC",
    fallbackBio:
      "Consultante en lactation certifiée IBCLC depuis 2011, j'ai accompagné plus de 5 000 familles et j'aide aujourd'hui plus de 1 000 mères chaque année, avec une équipe de 7 consultantes IBCLC. Ce pack, c'est la synthèse de plus de dix ans de consultations individuelles, condensée pour être accessible à toute heure, même quand mon agenda de consultation est complet.",
    credentials: [
      "IBCLC depuis 2011",
      "5 000+ familles accompagnées",
      "1 000+ mères accompagnées chaque année",
      "Une équipe de 7 consultantes IBCLC",
      "Autrice de 3 livres sur l'allaitement",
      "Formatrice & conférencière internationale",
    ],
  },
  pricing: {
    title:
      "Offrez-vous, et offrez à votre bébé, le démarrage serein que vous méritez",
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
        q: "Puis-je acheter uniquement le module dont j'ai besoin ?",
        a: "Oui. Chaque accompagnement est disponible à l'unité (27 € pour les urgences de l'allaitement, 75 € pour la plupart des modules, 97 € pour le sommeil). Le pack devient intéressant dès que deux modules vous concernent.",
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
      "Rejoignez « Mon Allaitement Sur Mesure » et avancez avec les bonnes réponses, à chaque étape.",
    ctaLabel: "Je rejoins le programme",
  },
} as const;
