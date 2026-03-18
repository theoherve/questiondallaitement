export type PressCategory = {
  id: string;
  label: string;
  emoji?: string;
};

export type PressArticle = {
  title: string;
  source: string;
  href: string | null;
  category: string;
};

export const PRESS_CATEGORIES: PressCategory[] = [
  { id: "all", label: "Tout" },
  { id: "accueillir-bebe", label: "Accueillir bébé" },
  { id: "douleurs-resolues", label: "Douleurs résolues" },
  { id: "augmenter-lactation", label: "Augmenter la lactation" },
  { id: "sante", label: "Santé" },
  { id: "equilibre-vie-active", label: "Vie active" },
  { id: "sexualite-couple", label: "Sexualité & couple" },
  { id: "sevrage", label: "Sevrage" },
];

export const PRESS_ARTICLES: PressArticle[] = [
  // ── Accueillir bébé ──
  {
    title:
      "Accoucher dans une maternité IHAB (Hôpital Ami des Bébés), qu'est-ce que ça change ?",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/grossesse/pendant-la-grossesse/preparation-a-la-naissance/choisir-sa-maternite/quelle-maternite-choisir/accoucher-dans-une-maternite-ihab-hopital-ami-des-bebes-quest-ce-que-ca-change-331392.htm",
    category: "accueillir-bebe",
  },
  {
    title:
      "Le lait maternel, « un véritable médicament pour les prématurés »",
    source: "Destination Santé",
    href: "https://destinationsante.com/le-lait-maternel-un-veritable-medicament-pour-les-prematures.html",
    category: "accueillir-bebe",
  },
  {
    title: "Les bienfaits du peau à peau avec bébé",
    source: "Santé Magazine",
    href: "https://www.santemagazine.fr/bebe/sante-du-bebe/les-bienfaits-du-peau-a-peau-919447",
    category: "accueillir-bebe",
  },
  {
    title: "Comment allaiter un bébé prématuré ?",
    source: "Journal des Femmes",
    href: "https://www.journaldesfemmes.fr/maman/guide-bebe/2906771-comment-allaiter-un-bebe-premature/",
    category: "accueillir-bebe",
  },
  {
    title: "Comment se préparer à l'allaitement ?",
    source: "Parents.fr",
    href: "https://www.parents.fr/bebe/allaitement/se-preparer-a-l-allaitement/comment-se-preparer-a-lallaitement-78334",
    category: "accueillir-bebe",
  },
  {
    title: "Les mythes et idées reçues sur l'allaitement",
    source: "Jollymama",
    href: "https://jollymama.com/blogs/guide/les-mythes-sur-l-allaitement-stop-aux-idees-recues",
    category: "accueillir-bebe",
  },
  {
    title: "La montée de lait… Est-ce douloureux ?",
    source: "Joornal (Joone)",
    href: "https://www.joone.fr/blogs/joornal/la-montee-de-lait-est-ce-douloureux",
    category: "accueillir-bebe",
  },
  {
    title: "Le B.A.BA pour réussir son allaitement",
    source: "Cool Parents Make Happy Kids",
    href: "https://www.coolparentsmakehappykids.com/le-b-a-ba-pour-reussir-son-allaitement/",
    category: "accueillir-bebe",
  },
  {
    title: "Allaitement : comment savoir si j'ai assez de lait ?",
    source: "Parole de Mamans",
    href: "https://paroledemamans.com/bebe-0-3-ans/allaitement/comment-savoir-si-j-ai-assez-de-lait",
    category: "accueillir-bebe",
  },
  {
    title:
      "Quelle quantité de lait donner à bébé en fonction de son âge ?",
    source: "Santé Magazine",
    href: "https://www.santemagazine.fr/bebe/alimentation-du-bebe/quelle-quantite-de-lait-donner-a-bebe-en-fonction-de-son-age-901454",
    category: "accueillir-bebe",
  },
  {
    title: "Donner de l'eau à bébé si on allaite",
    source: "Parole de Mamans",
    href: "https://paroledemamans.com/bebe-0-3-ans/allaitement/donner-de-l-eau-a-bebe-si-on-allaite",
    category: "accueillir-bebe",
  },
  {
    title: "Je n'ai pas assez de lait, que dois-je faire ?",
    source: "Parole de Mamans",
    href: "https://paroledemamans.com/bebe-0-3-ans/allaitement/je-n-ai-pas-assez-de-lait-que-dois-je-faire",
    category: "accueillir-bebe",
  },
  {
    title:
      "Pic de croissance chez bébé : toutes les réponses à vos questions",
    source: "Parents.fr",
    href: "https://www.parents.fr/bebe/allaitement/j-allaite/pic-de-croissance-chez-bebe-toutes-les-reponses-a-vos-questions-898219",
    category: "accueillir-bebe",
  },
  {
    title:
      "Allaitement : que faire quand mon bébé refuse le sein ?",
    source: "Parole de Mamans",
    href: "https://paroledemamans.com/bebe-0-3-ans/allaitement/allaitement-que-faire-quand-mon-bebe-refuse-le-sein",
    category: "accueillir-bebe",
  },
  {
    title:
      "5 phrases à prononcer suite aux remarques malveillantes sur votre allaitement « tardif »",
    source: "aufeminin",
    href: "https://www.aufeminin.com/apres-grossesse/allaitement-long-5-phrases-pour-repondre-aux-remarques-s4053398.html",
    category: "accueillir-bebe",
  },
  {
    title: "Comment bien démarrer son allaitement ?",
    source: "Parole de Mamans",
    href: "https://paroledemamans.com/bebe-0-3-ans/allaitement/les-conseils-pour-bien-demarrer-son-allaitement-3",
    category: "accueillir-bebe",
  },
  {
    title: "Quand arrêter d'allaiter bébé à la demande ?",
    source: "Magic Maman",
    href: "https://www.magicmaman.com/quand-arreter-d-allaiter-bebe-a-la-demande,3715336.asp",
    category: "accueillir-bebe",
  },
  {
    title:
      "À la naissance, faut-il réveiller bébé pour manger ?",
    source: "Journal des Femmes",
    href: "https://www.journaldesfemmes.fr/maman/guide-bebe/2881325-a-la-naissance-faut-il-reveiller-bebe-pour-manger/",
    category: "accueillir-bebe",
  },
  {
    title:
      "Allaitement et diversification : comment faire, à quel âge ?",
    source: "Journal des Femmes",
    href: "https://www.journaldesfemmes.fr/maman/guide-bebe/2891733-allaitement-et-diversification/",
    category: "accueillir-bebe",
  },
  {
    title: "Tout savoir sur les pics de croissance chez le bébé",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/bebe/sante-de-bebe/courbes-de-croissance-de-bebe/tout-savoir-sur-les-pics-de-croissance-chez-le-bebe/e52800_ar.html",
    category: "accueillir-bebe",
  },
  {
    title:
      "Peut-on allaiter avec un seul sein et comment faire ?",
    source: "Journal des Femmes",
    href: "https://www.journaldesfemmes.fr/maman/guide-bebe/2928547-allaiter-bebe-avec-un-seul-sein/",
    category: "accueillir-bebe",
  },
  {
    title:
      "Allaitement : tout savoir sur la position ballon de rugby",
    source: "Santé Magazine",
    href: "https://www.santemagazine.fr/bebe/alimentation-du-bebe/allaitement-tout-savoir-sur-la-position-ballon-de-rugby-1029010",
    category: "accueillir-bebe",
  },
  {
    title:
      "Difficultés d'allaitement maternel : comment gérer ?",
    source: "Journal des Femmes",
    href: "https://www.journaldesfemmes.fr/maman/guide-bebe/2467404-difficultes-d-allaitement-maternel/",
    category: "accueillir-bebe",
  },
  {
    title: "Allaiter deux enfants à la fois, c'est possible ?",
    source: "Parole de Mamans",
    href: "https://paroledemamans.com/bebe-0-3-ans/allaitement/allaiter-deux-enfants-a-la-fois-c-est-possible",
    category: "accueillir-bebe",
  },
  {
    title: "Allaitement de jumeaux",
    source: "Parole de Mamans",
    href: "https://paroledemamans.com/bebe-0-3-ans/allaitement/allaitement-de-jumeaux",
    category: "accueillir-bebe",
  },
  {
    title: "A quoi sert une consultante en lactation ?",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/bebe/allaitement/guide-pratique-de-l-allaitement/a-quoi-sert-consultante-lactation",
    category: "accueillir-bebe",
  },
  {
    title: "Tout savoir sur l'allaitement exclusif",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/bebe/tout-savoir-sur-lallaitement/bienfaits-de-lallaitement-maternel/tout-savoir-sur-lallaitement-exclusif-335463.htm",
    category: "accueillir-bebe",
  },

  // ── Douleurs résolues ──
  {
    title: "SOS allaitement : « J'ai une mastite » !",
    source: "Joornal (Joone)",
    href: "https://www.joone.fr/blogs/joornal/tout-sur-la-mastite",
    category: "douleurs-resolues",
  },
  {
    title:
      "Crevasses d'allaitement : comment les éviter et les soulager ?",
    source: "Joornal (Joone)",
    href: "https://www.joone.fr/blogs/joornal/allaitement-crevasses",
    category: "douleurs-resolues",
  },
  {
    title:
      "Le « Biological Nurturing », cette position d'allaitement physiologique qu'on devrait toutes connaître",
    source: "Joornal (Joone)",
    href: "https://www.joone.fr/blogs/joornal/biological-nurturing-allaitement",
    category: "douleurs-resolues",
  },
  {
    title:
      "Allaitement, ça commence maintenant : 5 conseils de pro pour faciliter les débuts",
    source: "Joornal (Joone)",
    href: "https://www.joone.fr/blogs/joornal/allaitement-ca-commence-maintenant-5-conseils-de-pro-pour-faciliter-les-debuts",
    category: "douleurs-resolues",
  },
  {
    title: "Allaitement : comment soigner une mastite ?",
    source: "Parole de Mamans",
    href: "https://paroledemamans.com/bebe-0-3-ans/allaitement/allaitement-comment-soigner-une-mastite-2",
    category: "douleurs-resolues",
  },
  {
    title: "L'allaitement sans douleur !",
    source: "Parole de Mamans",
    href: "https://paroledemamans.com/bebe-0-3-ans/allaitement/l-allaitement-sans-douleur-2",
    category: "douleurs-resolues",
  },
  {
    title: "Allaitement : comment préserver ses seins ?",
    source: "Parole de Mamans",
    href: "https://paroledemamans.com/bebe-0-3-ans/allaitement/comment-preserver-ses-seins-quand-on-allaite-son-bebe",
    category: "douleurs-resolues",
  },
  {
    title:
      "Allaitement : le réflexe d'éjection dysphorique du lait",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/bebe/tout-savoir-sur-lallaitement/allaitement-le-reflexe-dejection-dysphorique-du-lait/2faecd_ar.html",
    category: "douleurs-resolues",
  },
  {
    title:
      "Césarienne : quand y avoir recours, déroulement et conséquences",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/grossesse/accouchement/cesarienne/cesarienne-quand-y-avoir-recours-deroulement-et-consequences/405ed8_ar.html",
    category: "douleurs-resolues",
  },
  {
    title:
      "Bouts de sein pour l'allaitement : comment les utiliser correctement ?",
    source: "Parents.fr",
    href: "https://www.parents.fr/bebe/allaitement/j-allaite/bouts-de-sein-pour-lallaitement-comment-les-utiliser-correctement-964982",
    category: "douleurs-resolues",
  },
  {
    title:
      "Accompagner l'allaitement au comptoir : les conseils de l'experte Carole Hervé",
    source: "Pharma 365",
    href: "https://www.pharma365.fr/je-me-perfectionne/jechange-avec-mon-patient/accompagner-lallaitement-au-comptoir-les-conseils-de-lexperte-carole-herve/",
    category: "douleurs-resolues",
  },
  {
    title:
      "Les crevasses d'allaitement : qu'est-ce que c'est, comment les soigner et les prévenir ?",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/bebe/tout-savoir-sur-lallaitement/conseils-pour-donner-le-sein/petits-soucis-lies-a-lallaitement/les-crevasses-dallaitement-quest-ce-que-cest-comment-les-soigner-et-les-prevenir/169567_ar.html",
    category: "douleurs-resolues",
  },

  // ── Augmenter la lactation ──
  {
    title: "Peut-on manquer de lait maternel ?",
    source: "Joornal (Joone)",
    href: "https://www.joone.fr/blogs/joornal/conseils-dexperts-comment-stimuler-sa-lactation",
    category: "augmenter-lactation",
  },
  {
    title:
      "Tout ce qui se passe dans la couche d'un bébé allaité : décryptage !",
    source: "Joornal (Joone)",
    href: "https://www.joone.fr/blogs/joornal/tout-ce-qui-se-passe-dans-la-couche-dun-bebe-allaite",
    category: "augmenter-lactation",
  },
  {
    title: "Quelles tisanes pour l'allaitement ?",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/bebe/tout-savoir-sur-lallaitement/conseils-alimentaires-pendant-lallaitement/quelles-tisanes-pour-lallaitement/d9dff4_ar.html",
    category: "augmenter-lactation",
  },
  {
    title:
      "DAL pour l'allaitement : comment utiliser un Dispositif d'Aide à la Lactation ?",
    source: "Passeport Santé",
    href: "https://www.passeportsante.net/famille/allaitement?doc=dal-allaitement-utiliser-dispositif-aide-lactation",
    category: "augmenter-lactation",
  },
  {
    title:
      "Quand tirer son lait pendant l'allaitement ?",
    source: "Passeport Santé",
    href: "https://www.passeportsante.net/famille/allaitement?doc=quand-tirer-lait-pendant-allaitement",
    category: "augmenter-lactation",
  },
  {
    title:
      "Peut-on allaiter en cas d'hypoplasie mammaire ?",
    source: "Magic Maman",
    href: "https://www.magicmaman.com/peut-on-allaiter-en-cas-d-hypoplasie-mammaire,3695099.asp",
    category: "augmenter-lactation",
  },
  {
    title: "Comment réussir son tire-allaitement ?",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/bebe/allaitement/comment-reussir-son-tire-allaitement",
    category: "augmenter-lactation",
  },
  {
    title:
      "Quelles astuces pour tirer son lait en toutes circonstances ?",
    source: "Parole de Mamans",
    href: "https://paroledemamans.com/bebe-0-3-ans/allaitement/quelles-astuces-pour-tirer-son-lait-en-toutes-circonstances",
    category: "augmenter-lactation",
  },
  {
    title:
      "Comment utiliser un dispositif d'aide à la lactation ou DAL ?",
    source: "Femme Actuelle",
    href: "https://www.femmeactuelle.fr/enfant/bebe/allaitement-comment-utiliser-un-dispositif-daide-a-la-lactation-ou-dal-2098185",
    category: "augmenter-lactation",
  },
  {
    title:
      "Power Pumping : la technique qui stimule la lactation",
    source: "Journal des Femmes",
    href: "https://www.journaldesfemmes.fr/maman/guide-bebe/2891705-power-pumping/",
    category: "augmenter-lactation",
  },
  {
    title:
      "Tirer son lait : quand, comment, quelle quantité ?",
    source: "Journal des Femmes",
    href: "https://www.journaldesfemmes.fr/maman/guide-bebe/2508939-tire-lait-allaitement/",
    category: "augmenter-lactation",
  },
  {
    title:
      "Allaiter sans avoir accouché : « Pour moi, c'était une évidence »",
    source: "Elle",
    href: "https://www.elle.fr/Maman/News/Allaiter-sans-avoir-accouche-Pour-moi-c-etait-une-evidence-4121536",
    category: "augmenter-lactation",
  },
  {
    title:
      "Quand et comment utiliser un dispositif d'aide à la lactation (DAL) ?",
    source: "Magic Maman",
    href: "https://www.magicmaman.com/quand-et-comment-utiliser-un-dispositif-d-aide-a-l-allaitement-dal,3691022.asp",
    category: "augmenter-lactation",
  },
  {
    title:
      "Perte de poids du nouveau-né : comment gérer ?",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/bebe/nouveau-ne/perte-de-poids-du-nouveau-ne-comment-gerer-322108.htm",
    category: "augmenter-lactation",
  },
  {
    title:
      "Allaitement : quelles alternatives au biberon pour donner du lait maternel ?",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/bebe/tout-savoir-sur-lallaitement/allaitement-quelles-alternatives-au-biberon-pour-donner-du-lait-maternel-329618.htm",
    category: "augmenter-lactation",
  },
  {
    title:
      "« Je n'ai pas allaité à la naissance, mais avec la crise des laits infantiles, je veux commencer » : c'est possible ?",
    source: "Magic Maman",
    href: "https://www.magicmaman.com/je-n-ai-pas-allaite-a-la-naissance-mais-avec-la-crise-des-laits-infantiles-je-veux-commencer-c-est-possible,3779882.asp",
    category: "augmenter-lactation",
  },

  // ── Santé ──
  {
    title:
      "Allaitement : comment savoir si mon bébé a faim et prend suffisamment de lait ?",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/bebe/tout-savoir-sur-lallaitement/allaitement-comment-savoir-si-mon-bebe-a-faim-et-prend-suffisamment-de-lait-320913.htm",
    category: "sante",
  },
  {
    title: "Du lait maternel, dans mon armoire à pharmacie",
    source: "Parole de Mamans",
    href: "https://paroledemamans.com/bebe-0-3-ans/allaitement/du-lait-maternel-dans-mon-armoire-a-pharmacie",
    category: "sante",
  },
  {
    title:
      "Allaitement et alcool : peut-on boire quand on allaite ?",
    source: "Santé Magazine",
    href: "https://www.santemagazine.fr/bebe/alimentation-du-bebe/allaitement-et-alcool-peut-on-boire-quand-on-allaite-900269",
    category: "sante",
  },
  {
    title:
      "11 choses à savoir sur l'allaitement pour en finir avec les remarques désobligeantes",
    source: "Ma Grande Taille",
    href: "https://www.ma-grande-taille.com/psycho/vie-de-maman/choses-savoir-allaitement-finir-remarques-desobligeantes-341890",
    category: "sante",
  },
  {
    title: "Enceinte, puis-je consommer du miel ?",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/grossesse/alimentation-et-grossesse/bien-manger-pendant-la-grossesse/enceinte-puis-je-consommer-du-miel/25e176_ar.html",
    category: "sante",
  },
  {
    title:
      "Quels sont les bienfaits de l'allaitement pour la santé des mamans ?",
    source: "Parole de Mamans",
    href: "https://paroledemamans.com/bebe-0-3-ans/allaitement/quels-sont-les-bienfaits-de-lallaitement-sur-la-sante-des-mamans",
    category: "sante",
  },
  {
    title:
      "Galactosémie : au secours, mon bébé ne digère pas le lait !",
    source: "Magic Maman",
    href: "https://www.magicmaman.com/galactosemie-au-secours-mon-bebe-est-allergique-au-lait,3691058.asp",
    category: "sante",
  },
  {
    title:
      "Mal aux seins : que faire si je ressens une douleur au sein ?",
    source: "Parents.fr",
    href: "https://www.parents.fr/etre-parent/maman/sante-forme/jai-mal-aux-seins-que-faire-426702",
    category: "sante",
  },
  {
    title:
      "Médicaments pendant l'allaitement : quelles sont les précautions à prendre ?",
    source: "Parents.fr",
    href: "https://www.parents.fr/bebe/allaitement/j-allaite/medicament-et-allaitement-les-liaisons-dangereuses-1102435",
    category: "sante",
  },
  {
    title:
      "Les questions à se poser quand on allaite son enfant quand il fait chaud",
    source: "Magic Maman",
    href: "https://www.magicmaman.com/voici-les-questions-a-se-poser-quand-on-allaite-son-enfant-quand-il-fait-chaud,3773738.asp",
    category: "sante",
  },
  {
    title:
      "Peut-on nourrir bébé au sein tout en continuant à fumer, même peu ?",
    source: "Magic Maman",
    href: "https://www.magicmaman.com/,allaitement-et-tabac,69,1924976.asp",
    category: "sante",
  },
  {
    title:
      "Laits infantiles contaminés : la goutte de trop pour les parents",
    source: "Magic Maman",
    href: "https://www.magicmaman.com/laits-infantiles-contamines-la-goutte-de-trop-pour-les-parents,3781670.asp",
    category: "sante",
  },

  // ── Équilibre allaitement et vie active ──
  {
    title: "Allaiter en public : une drôle d'idée ?",
    source: "Parole de Mamans",
    href: "https://paroledemamans.com/bebe-0-3-ans/allaitement/allaiter-en-public-une-drole-d-idee-2",
    category: "equilibre-vie-active",
  },
  {
    title:
      "Comment s'habiller pour allaiter à l'extérieur ?",
    source: "Parole de Mamans",
    href: "https://paroledemamans.com/bebe-0-3-ans/allaitement/comment-s-habiller-pour-allaiter-a-l-exterieur-2",
    category: "equilibre-vie-active",
  },
  {
    title:
      "Couple lesbien : peut-on allaiter quand on n'est pas la mère biologique ?",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/bebe/tout-savoir-sur-lallaitement/co-allaitement-lactation-induite-couple-lesbien-peut-on-allaiter-quand-on-nest-pas-la-mere-biologique/3fab1f_ar.html",
    category: "equilibre-vie-active",
  },
  {
    title: "Allaiter dans un lieu public : que dit la loi ?",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/bebe/tout-savoir-sur-lallaitement/allaiter-dans-un-lieu-public-que-dit-la-loi/bd7c78_ar.html",
    category: "equilibre-vie-active",
  },
  {
    title:
      "Les meilleurs conseils pour la location d'un tire-lait pendant l'allaitement",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/bebe/tout-savoir-sur-lallaitement/les-meilleurs-conseils-pour-la-location-dun-tire-lait-pendant-lallaitement/92546c_ar.html",
    category: "equilibre-vie-active",
  },

  // ── Sexualité & couple ──
  {
    title:
      "Comment préserver une sexualité épanouie quand on allaite ?",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/bebe/tout-savoir-sur-lallaitement/comment-preserver-une-sexualite-epanouie-quand-on-allaite/6302cc_ar.html",
    category: "sexualite-couple",
  },
  {
    title:
      "À quoi sert Papa pendant que Maman allaite ?",
    source: "Parole de Mamans",
    href: "https://paroledemamans.com/bebe-0-3-ans/allaitement/a-quoi-sert-papa-pendant-que-maman-allaite-2",
    category: "sexualite-couple",
  },
  {
    title:
      "La place du second parent dans l'allaitement",
    source: "Parents.fr",
    href: "https://www.parents.fr/videos/allaitement/video-la-place-du-second-parent-dans-lallaitement-lavis-de-lexpert-896034",
    category: "sexualite-couple",
  },

  // ── Sevrage ──
  {
    title:
      "Bébé refuse de prendre le sein : quelles solutions ?",
    source: "Joornal (Joone)",
    href: "https://www.joone.fr/blogs/joornal/bebe-refuse-de-prendre-le-sein-quelles-solutions",
    category: "sevrage",
  },
  {
    title:
      "Sevrer bébé de l'allaitement : quelle est la meilleure manière de faire ?",
    source: "Joornal (Joone)",
    href: "https://www.joone.fr/blogs/joornal/sevrer-bebe-de-lallaitement-quelle-est-la-meilleure-maniere-de-faire",
    category: "sevrage",
  },
  {
    title:
      "Comment l'allaitement modifie-t-il la poitrine ?",
    source: "Magic Maman",
    href: "https://www.magicmaman.com/comment-l-allaitement-modifie-t-il-la-poitrine,3664453.asp",
    category: "sevrage",
  },
  {
    title:
      "Allaitement et tabac : ce que vous devez savoir",
    source: "Parents.fr",
    href: "https://www.parents.fr/bebe/allaitement/se-preparer-a-l-allaitement/allaitement-et-tabac-ce-que-vous-devez-savoir-78773",
    category: "sevrage",
  },
  {
    title:
      "Allaitement et tabac : fumer pendant l'allaitement est-il risqué ?",
    source: "Santé Magazine",
    href: "https://www.santemagazine.fr/bebe/alimentation-du-bebe/allaitement-et-tabac-fumer-pendant-lallaitement-est-il-risque-900243",
    category: "sevrage",
  },
  {
    title:
      "Dépression post allaitement : comment surmonter le phénomène du Milk blues ?",
    source: "aufeminin",
    href: "https://www.aufeminin.com/bebe/depression-post-allaitement-comment-surmonter-le-phenomene-du-milk-blues-s4056861.html",
    category: "sevrage",
  },
  {
    title:
      "Allaiter mon enfant me manque : est-ce normal ?",
    source: "Magic Maman",
    href: "https://www.magicmaman.com/allaiter-mon-enfant-me-manque-est-ce-normal,3716676.asp",
    category: "sevrage",
  },
  {
    title: "Comment accepter la fin de l'allaitement",
    source: "Doctissimo",
    href: "https://www.doctissimo.fr/bebe/allaitement/comment-accepter-la-fin-de-l-allaitement",
    category: "sevrage",
  },
  {
    title:
      "Le lait relais allaitement est-il vraiment utile ?",
    source: "Magic Maman",
    href: "https://www.magicmaman.com/le-lait-relais-allaitement-est-il-vraiment-utile,3714105.asp",
    category: "sevrage",
  },
  {
    title:
      "Seins après l'allaitement : comment retrouver sa poitrine ?",
    source: "Journal des Femmes",
    href: "https://www.journaldesfemmes.fr/maman/guide-bebe/2906765-seins-apres-l-allaitement/",
    category: "sevrage",
  },
  {
    title:
      "Allaitement long : faut-il prolonger l'allaitement ?",
    source: "Santé Magazine",
    href: "https://www.santemagazine.fr/bebe/alimentation-du-bebe/allaitement-long-faut-il-prolonger-lallaitement-912249",
    category: "sevrage",
  },
  {
    title:
      "Allaitement long : jusqu'à quel âge, quels bienfaits ?",
    source: "Journal des Femmes",
    href: "https://www.journaldesfemmes.fr/maman/guide-bebe/2891721-allaitement-long/",
    category: "sevrage",
  },
  {
    title:
      "Comment faire accepter le biberon à un bébé allaité ?",
    source: "Parents.fr",
    href: "https://www.parents.fr/bebe/allaitement/sevrage/comment-faire-accepter-le-biberon-a-un-bebe-allaite-1058534",
    category: "sevrage",
  },
];
