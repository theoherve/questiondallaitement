/**
 * Livres publiés par Carole Hervé. Données statiques (pas de table dédiée) :
 * partagées entre /livres (page complète) et le teaser du profil consultante
 * de Carole (gate sur `is_platform_owner`, seule à en avoir aujourd'hui).
 */
export type Book = {
  id: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  description: string;
  personalNote: string;
  coverImage: string;
  publisher: string;
  year: string;
  price: string;
  pages: string | null;
  coAuthors: string;
  highlights: string[];
  links: { label: string; href: string }[];
};

export const BOOKS: Book[] = [
  {
    id: "allaitement-pour-les-nuls",
    title: "L'allaitement pour les nuls",
    shortTitle: "L'allaitement pour les nuls",
    subtitle:
      "Pour préparer et vivre votre allaitement en toute sérénité !",
    description:
      "Devenir maman est déjà un bouleversement en soi, mais qu'en est-il du projet d'allaitement ? Le lait sera-t-il suffisant pour nourrir son bébé ? Quels sont les freins à l'allaitement ? Le geste est-il moderne ? En quoi est-ce réellement un avantage pour le bébé et pour la maman ? Trois expertes se sont réunies pour répondre à toutes vos questions et vos doutes.",
    personalNote:
      "Ce livre, c'est entre vous et nous 3, le Dr Evelyne Mazurier, le Dr Muriel Mermilliod et moi. Nous y avons chacune mis beaucoup de notre passion, beaucoup de ce que nous aurions aimé savoir à nos débuts. C'est le livre que nous aurions aimé avoir entre les mains.",
    coverImage: "/livres/allaitement_pour_les_nuls.png",
    publisher: "Éditions First",
    year: "2024",
    price: "24,95 €",
    pages: "446 pages",
    coAuthors: "Dr Evelyne Mazurier, Dr Muriel Mermilliod",
    highlights: [
      "De nombreuses illustrations",
      "Des témoignages authentiques de mamans",
      "Le mode d'emploi des accessoires incontournables",
      "Des outils pratiques pour se lancer en toute sérénité",
    ],
    links: [
      {
        label: "Amazon",
        href: "https://www.amazon.fr/Lallaitement-pour-Nuls-grand-format/dp/2412089841",
      },
      {
        label: "Fnac",
        href: "https://www.fnac.com/a20433870/Pour-Les-Nuls-L-allaitement-pour-les-Nuls-grand-format-Carole-Herve",
      },
    ],
  },
  {
    id: "choisir-d-allaiter",
    title: "Choisir d'allaiter",
    shortTitle: "Choisir d'allaiter",
    subtitle:
      "Tout pour comprendre les besoins fondamentaux de votre bébé en préservant les vôtres",
    description:
      "C'est une question que toutes les futures mamans se posent : pourquoi choisir l'allaitement ? Le lait maternel apporte tous les nutriments et tous les anticorps dont votre bébé a besoin. L'OMS recommande d'ailleurs l'allaitement exclusif jusqu'à l'âge de 6 mois. Mais nourrir son enfant au sein est un choix, vous aimeriez le défendre et surtout, vous ressentez le besoin d'être bien préparée.",
    personalNote:
      "Ce livre est une mine d'informations que l'on dévore rapidement. Il inspire et encourage, vous prépare à vous lancer dans l'aventure merveilleuse de l'allaitement, que vous soyez enceinte, jeune parent, ou que vous envisagiez l'allaitement ou le biberon.",
    coverImage: "/livres/choisir_d_allaiter.jpg",
    publisher: "Éditions First",
    year: "2022",
    price: "12,50 €",
    pages: "192 pages",
    coAuthors: "Illustrations : Camille Mage",
    highlights: [
      "Premières tétées et mise en place de l'allaitement",
      "Gestion des douleurs et de la perte de poids du bébé",
      "Se libérer des « intox » sur l'allaitement",
      "Allaitement et reprise du travail",
    ],
    links: [
      {
        label: "Amazon",
        href: "https://www.amazon.fr/Choisir-dallaiter-Carole-Herv%C3%A9/dp/2412081565",
      },
      {
        label: "Fnac",
        href: "https://www.fnac.com",
      },
    ],
  },
  {
    id: "mon-allaitement-sur-mesure",
    title: "Mon allaitement sur mesure",
    shortTitle: "Mon allaitement sur mesure",
    subtitle:
      "Le guide essentiel pour apprendre à nourrir son enfant en toute confiance",
    description:
      "Les bienfaits de l'allaitement sur la santé du nourrisson et celle de sa mère ne sont plus à démontrer, de même que le formidable lien qu'il contribue à créer entre eux. Pourtant, nombreuses sont les femmes qui redoutent d'allaiter : peur de ne pas adopter les bons gestes, de ne pas produire assez de lait, d'avoir mal, d'être jugées… Le but de ce livre est de déculpabiliser les mères, de leur donner confiance et de leur fournir toutes les clés pour vivre un allaitement réussi.",
    personalNote:
      "Écrit en collaboration avec Julie Martory, journaliste spécialisée dans l'univers parental et la santé, également maman de trois enfants allaités. Relu par ma chère amie pédiatre, le Dr Evelyne Mazurier. Enrichi des témoignages vrais de mamans que j'ai eu la chance de soutenir.",
    coverImage: "/livres/mon_allaitement_sur_mesure.jpg",
    publisher: "Éditions Albin Michel",
    year: "2020",
    price: "18,90 €",
    pages: null,
    coAuthors: "Julie Martory",
    highlights: [
      "Physiologie de la lactation et clés du succès",
      "Solutions aux problèmes courants (douleurs, prise de poids…)",
      "L'allaitement au fil du temps : travail, diversification, sevrage",
      "Des suggestions concrètes et des témoignages de mamans",
    ],
    links: [
      {
        label: "Amazon",
        href: "https://www.amazon.fr/Mon-allaitement-sur-mesure-essentiel/dp/2226451773",
      },
      {
        label: "Fnac",
        href: "https://www.fnac.com",
      },
    ],
  },
];
