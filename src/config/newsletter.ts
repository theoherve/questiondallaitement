/**
 * Contenu editorial de la newsletter.
 *
 * Le nom, la promesse et les textes sont rassembles ici plutot que disperses
 * dans le JSX : ils attendent l'arbitrage de Carole, et le point d'entree du
 * formulaire (page dediee ou teaser d'accueil) doit rester coherent entre la
 * page, la route d'inscription et la mesure d'audience.
 *
 * Nom retenu — « L'allaitement, autrement. » : reprise de la baseline deja
 * affichee en Hero de la page d'accueil, donc rien de neuf a memoriser pour
 * une audience qui connait le site.
 */

export const NEWSLETTER_NAME = "L'allaitement, autrement.";

/**
 * Sources d'inscription. Ces valeurs partent telles quelles dans l'attribut
 * SOURCE de Brevo et dans la table d'evenements — les changer casse la
 * comparaison avec l'historique deja collecte.
 */
export const NEWSLETTER_SOURCES = [
  "page_newsletter",
  "homepage_teaser",
  // Inscription obtenue en fin de sondage, dans un article de blog. Distinguee
  // des deux autres parce que c'est un point d'entree tres different : le
  // visiteur venait lire, pas s'abonner.
  "sondage",
] as const;

export type NewsletterSource = (typeof NEWSLETTER_SOURCES)[number];

/**
 * Texte exact de la case a cocher. Copie dans `consent_text` a chaque
 * inscription : c'est la formulation acceptee qui fait la preuve, pas celle
 * affichee aujourd'hui. Modifier cette constante n'affecte donc que les
 * consentements a venir.
 */
export const NEWSLETTER_CONSENT_TEXT =
  "J'accepte de recevoir la newsletter de Question d'Allaitement ainsi que les emails liés (mémo offert, informations sur les accompagnements et formations). Je peux me désinscrire à tout moment en un clic.";

export const NEWSLETTER_COPY = {
  badge: "Newsletter",
  title: NEWSLETTER_NAME,
  subtitle:
    "Chaque semaine, un email court pour comprendre ce qui se passe vraiment avec votre allaitement — sans discours culpabilisant, sans recette toute faite. Juste ce qu'il faut savoir, expliqué par une IBCLC qui a accompagné plus de 5 000 mères.",
  cta: "Je m'inscris",

  /**
   * Le mur de questions — la section « pourquoi s'abonner » du cahier des
   * charges, ecrite comme les parents la vivent plutot qu'en liste de
   * benefices. La marque s'appelle Question d'Allaitement : les questions sont
   * le materiau de la maison, et elles disent le benefice sans l'annoncer.
   */
  questions: [
    {
      question: "Est-ce que j'ai assez de lait ?",
      answer:
        "Les vrais signes se lisent sur votre bébé, pas dans un tire-lait. On vous montre lesquels.",
    },
    {
      question: "Pourquoi ça fait encore mal après trois semaines ?",
      answer:
        "Une douleur qui dure n'est jamais normale. On vous aide à repérer d'où elle vient.",
    },
    {
      question: "Est-ce que je peux continuer en reprenant le travail ?",
      answer:
        "Oui, et sans y passer vos pauses. On vous donne l'organisation qui tient dans la durée.",
    },
    {
      question: "Là, je devrais m'inquiéter ou pas ?",
      answer:
        "Le regard d'une IBCLC sur ce qui alerte vraiment, sans attendre un rendez-vous.",
    },
  ],

  gift: {
    eyebrow: "Offert à l'inscription",
    title: "Le mémo « Conservation du lait maternel »",
    body: "Combien de temps à température ambiante, au réfrigérateur, au congélateur. Une page à imprimer et coller sur la porte du frigo, pour ne plus jamais avoir à chercher la réponse à 3 h du matin.",
  },

  rhythm: {
    title: "À quoi vous attendre",
    body: "Un email le mardi, à lire en cinq minutes. Une question, une réponse claire, et de quoi aller plus loin si vous en avez besoin. Rien d'autre — et un lien de désinscription dans chaque envoi.",
  },

  form: {
    title: "Recevez le prochain numéro",
    body: "Ajoutez votre prénom et votre email, le mémo part dans la foulée.",
  },
} as const;
