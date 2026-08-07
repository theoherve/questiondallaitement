/**
 * Refonte copywriting du blog — source de vérité.
 *
 * Un objet par article, appliqué par scripts/apply-copywriting-blog.mjs :
 *   slug      : identifie l'article en base (blog_posts.slug)
 *   title     : titre reformulé
 *   hook      : accroche affichée en chapô (blog_posts.excerpt) et en meta description
 *   intro     : introduction réécrite, remplace le premier paragraphe du corps
 *   cta       : clé de CTA_TARGETS, insérée en fin d'article
 *   category  : slug de catégorie, uniquement quand le rattachement actuel est faux
 */

export const CTA_TARGETS = {
  preparer: {
    href: "/accompagnements/je-me-prepare-a-allaiter",
    formation: "je-me-prepare-a-allaiter",
    text: "Arrivez à la maternité avec des repères, pas avec des doutes : l'accompagnement « Je me prépare à allaiter ».",
    label: "Je me prépare",
  },
  premiersJours: {
    href: "/accompagnements/mon-allaitement-des-premiers-jours",
    formation: "mon-allaitement-des-premiers-jours",
    text: "Les repères cliniques exacts des premiers jours : « Mon allaitement des premiers jours ».",
    label: "Je pose des bases solides",
  },
  filDesMois: {
    href: "/accompagnements/mon-allaitement-au-fil-des-mois",
    formation: "mon-allaitement-au-fil-des-mois",
    text: "Votre allaitement se complique après plusieurs mois ? « Mon allaitement au fil des mois ».",
    label: "Je retrouve un allaitement apaisé",
  },
  reprise: {
    href: "/accompagnements/je-reprends-une-activite-professionnelle",
    formation: "je-reprends-une-activite-professionnelle",
    text: "Reprendre le travail sans arrêter d'allaiter : « Je reprends une activité professionnelle ».",
    label: "Je prépare ma reprise",
  },
  diversification: {
    href: "/accompagnements/la-diversification-de-mon-bebe-allaite",
    formation: "la-diversification-de-mon-bebe-allaite",
    text: "Diversifier sans sevrer par accident : « La diversification de mon bébé allaité ».",
    label: "Je diversifie en confiance",
  },
  sevrage: {
    href: "/accompagnements/je-souhaite-sevrer-mon-bebe",
    formation: "je-souhaite-sevrer-mon-bebe",
    text: "Un plan détaillé pour sevrer en douceur et en sécurité : « Je souhaite sevrer mon bébé ».",
    label: "Je sèvre en douceur",
  },
  nuits: {
    href: "/accompagnements/mon-bebe-ne-fait-pas-ses-nuits",
    formation: "mon-bebe-ne-fait-pas-ses-nuits",
    text: "Comprendre pourquoi votre enfant se réveille : « Mon bébé ne fait pas ses nuits ».",
    label: "Je comprends ses réveils",
  },
  urgences: {
    href: "/accompagnements/les-urgences-allaitement",
    formation: "les-urgences-allaitement",
    text: "Crevasses, mastite, engorgement : les bons gestes, immédiatement.",
    label: "Je soulage la douleur",
  },
  pack: {
    href: "/accompagnements/pack-mon-allaitement-sur-mesure",
    formation: "pack-mon-allaitement-sur-mesure",
    text: "Toutes les étapes de votre allaitement, de la préparation au sevrage : le pack « Mon allaitement sur mesure ».",
    label: "Je découvre le pack",
  },
  accompagnements: {
    href: "/formations",
    formation: null,
    text: "Vous êtes professionnel·le de santé ? Formations certifiantes en allaitement, fondées sur l'observation clinique.",
    label: "Je découvre les formations",
  },
};

export const ARTICLES = [
  // ─── Lot 1 ────────────────────────────────────────────────────────────────
  {
    slug: "allaitement-quand-consulter-pourquoi-choisir-une-ibclc-consultante-en-lactation-certifiee",
    title: "Allaitement : à quel moment appeler une IBCLC ? (Plus tôt que vous ne le pensez)",
    hook: "Vous vous dites que vous devriez y arriver seule, que ce n'est pas assez grave pour déranger une professionnelle ? La plupart des mamans que je reçois pensaient pareil.",
    intro:
      "Il y a ce moment, dans les premières semaines, où vous vous demandez si ce que vous vivez est normal — et si ça vaut le coup d'appeler quelqu'un pour ça. La réponse est presque toujours oui. Ce n'est pas parce que l'allaitement est naturel qu'il va de soi : à chaque étape, de la grossesse au sevrage, des questions légitimes se posent, et il existe un bon moment pour y répondre avant qu'elles ne deviennent des difficultés installées. Voici les grands rendez-vous de votre allaitement, et pourquoi il n'est jamais trop tôt pour consulter une IBCLC — même quand tout semble « à peu près » aller.",
    cta: "pack",
  },
  {
    slug: "reussir-son-allaitement-les-premiers-pas",
    title: "Réussir son allaitement : ce que personne ne vous dit avant les premiers jours",
    hook: "« C'est naturel » — c'est la phrase que vous avez entendue cent fois pendant la grossesse. Sauf que naturel ne veut pas dire spontané, et vous êtes nombreuses à le découvrir seule, à 3h du matin.",
    intro:
      "Vous avez lu, préparé, imaginé ce moment où bébé prendrait le sein sans effort. Puis la réalité arrive : la montée de lait, les positions à trouver, ce petit corps qui cherche, ce rythme que vous ne comprenez pas encore. Rien d'anormal dans tout ça — c'est simplement que l'allaitement, comme la marche ou la parole, s'apprend à deux, vous et votre bébé. La bonne nouvelle : un minimum de préparation avant la tempête des premiers jours change tout, et évite la plupart des écueils classiques (douleurs, crevasses, engorgement, perte de poids). Voici comment mettre toutes les chances de votre côté, dès maintenant.",
    cta: "preparer",
  },
  {
    slug: "comment-concilier-allaitement-et-reprise-du-travail",
    title: "Reprendre le travail sans arrêter d'allaiter : vos droits, votre organisation, votre sérénité",
    hook: "La date de reprise approche et une question tourne en boucle : « est-ce que je vais devoir choisir entre mon travail et mon allaitement ? » La réponse est non — et la loi est de votre côté, même si personne ne vous l'a expliqué clairement.",
    intro:
      "Vous n'êtes pas la première à sentir cette pointe d'angoisse à l'approche de la reprise. Entre les pauses allaitement dont vous ignorez l'existence, le tire-lait à choisir, la chaîne du froid à respecter et la crèche qui pose mille questions, l'équation semble insoluble. Elle ne l'est pas : le Code du travail vous garantit un droit précis à ce moment de la journée, et une organisation simple suffit à sécuriser votre lactation même à distance de votre bébé. Voici tout ce qu'il faut savoir, du texte de loi au sac isotherme, pour reprendre sereinement sans sacrifier votre allaitement.",
    cta: "reprise",
  },
  {
    slug: "allaiter-est-un-choix-personnel-comment-prevoyez-vous-de-nourrir-votre-bebe",
    title: "« Sein ou biberon, vous avez choisi ? » — pourquoi cette question mal posée vous met déjà la pression",
    hook: "On vous la pose comme un interrogatoire, souvent avant même que vous ayez eu le temps d'y réfléchir vraiment. Et si la vraie question n'était pas là où on vous la pose ?",
    intro:
      "« Vous comptez allaiter, ou vous donnerez le biberon ? » Formulée ainsi, la question sous-entend déjà une hiérarchie — et vous met en position de devoir vous justifier, quel que soit votre choix. Cette manière de poser les choses comme un dilemme définitif, tranché une fois pour toutes en salle d'accouchement, ne reflète ni la réalité de l'allaitement, ni celle de votre liberté de mère. Voici ce que disent réellement les recommandations de santé publique, et pourquoi nourrir votre bébé — quel que soit le mode choisi — n'a jamais été une question de bon ou de mauvais choix.",
    cta: "premiersJours",
  },
  {
    slug: "l-allaitement-en-vacances-d-ete-comment-je-gere",
    title: "Allaiter en vacances : voiture, train, avion, canicule — mon plan pour des vacances sans stress",
    hook: "Entre l'envie de souffler enfin et la peur de tout compliquer avec un bébé allaité dans les valises, l'été peut vite ressembler à un casse-tête. Il ne l'est pas, à condition de connaître trois ou quatre réflexes.",
    intro:
      "Vous rêvez de ces vacances depuis des semaines — et une question s'invite malgré tout : comment allaiter sereinement en voiture, en train, en avion, ou simplement sous la canicule ? Entre la peur de manquer d'eau, de lait, ou de gérer un trajet interminable avec un bébé qui réclame le sein, l'appréhension est légitime. Bonne nouvelle : un peu d'anticipation et quelques repères simples suffisent à transformer ces vacances en moment de vraie légèreté, pour vous comme pour bébé. Suivez le guide.",
    cta: "filDesMois",
    category: "accueillir-bebe",
  },
  {
    slug: "peut-on-rattraper-un-allaitement-mal-demarre",
    title: "Votre allaitement a mal démarré ? Voici pourquoi il n'est pas trop tard",
    hook: "Douleurs, biberons de complément prescrits à la va-vite, sentiment de ne rien maîtriser : si votre allaitement a déraillé dès la maternité, vous portez peut-être une culpabilité qui n'a pas lieu d'être.",
    intro:
      "Vous êtes rentrée chez vous avec une ordonnance, des boîtes de lait infantile et le sentiment diffus d'avoir échoué avant même d'avoir commencé. Ce sentiment, je le vois chaque semaine en consultation, et il n'a presque jamais à voir avec vos capacités de mère : la douleur qu'on n'a pas su soulager, le manque de soutien à la maternité, ou une inquiétude légitime sur la prise de poids de bébé suffisent à faire dérailler un allaitement qui, au départ, se passait bien. À la question « peut-on rattraper un allaitement mal démarré », la réponse est claire : oui, dans la grande majorité des cas. Voici comment, et pourquoi il ne faut jamais s'interdire d'essayer.",
    cta: "premiersJours",
  },
  {
    slug: "vous-souhaitez-devenir-ibclc",
    title: "Devenir IBCLC : le parcours de certification expliqué simplement",
    hook: "Vous avez aidé plusieurs mamans de votre entourage à traverser leurs difficultés d'allaitement, et une évidence s'impose : c'est ce métier que vous voulez faire. Reste à comprendre comment y arriver, sans se perdre dans des sites contradictoires.",
    intro:
      "« Je serais intéressée pour devenir conseillère en lactation IBCLC, seulement je ne comprends pas vraiment comment y parvenir » — c'est le message que je reçois presque chaque semaine. Et c'est normal : le chemin vers la certification IBCLC (International Board Certified Lactation Consultant), reconnue depuis 1985 comme le gold standard international, comporte des étapes précises, des prérequis cliniques exigeants, et plusieurs voies d'accès possibles. Avant de vous lancer, il faut aussi comprendre ce que recouvre réellement ce métier : bien plus qu'un accompagnement bienveillant, une véritable prise en charge clinique. Voici les grandes étapes pour y voir clair, et les ressources pour avancer avec la bonne personne à vos côtés.",
    cta: "accompagnements",
  },
  {
    slug: "confusion-sein-tetine-vrai-ou-faux-risque-pour-votre-allaitement",
    title: "« Un bébé allaité n'a pas d'allergies » : ce que la science dit vraiment",
    hook: "On vous l'a peut-être promis pendant la grossesse : allaiter protégerait votre bébé de tout. La réalité est plus nuancée — et comprendre pourquoi peut vous éviter bien des angoisses face à un bébé qui a le nez pris ou des coliques.",
    intro:
      "Votre bébé est allaité, et pourtant il a le nez encombré en permanence, des coliques, ou une peau qui réagit. Vous vous sentez perdue : on vous avait dit que le lait maternel protégeait de tout. En réalité, l'allaitement offre une protection immunitaire précieuse, mais il ne met pas à l'abri des allergies et intolérances, qui touchent aussi les bébés allaités. Comprendre comment fonctionne le système immunitaire de votre enfant — et le rôle des anticorps transmis par votre lait — permet d'agir avec justesse plutôt que dans l'inquiétude. Voici ce que la recherche scientifique nous apprend, expliqué simplement.",
    cta: "filDesMois",
    category: "accueillir-bebe",
  },
  {
    slug: "allaitement-et-biberon-y-a-t-il-un-risque-de-confusion",
    title: "Confusion sein-tétine : le mythe qui vous empêche peut-être de souffler un peu",
    hook: "« Surtout, ne lui donne jamais de biberon, il ne reviendra plus au sein. » Cette phrase, vous l'avez sûrement entendue — et elle vous prive peut-être d'un vrai répit.",
    intro:
      "Vous aimeriez que quelqu'un d'autre puisse nourrir votre bébé de temps en temps — le temps d'une sieste, d'une sortie, d'un retour au travail qui approche. Mais une peur vous retient : et si un biberon compromettait tout l'allaitement que vous avez mis tant d'efforts à installer ? Cette crainte porte un nom, la « confusion sein-tétine », mais les études scientifiques sur le sujet racontent une histoire bien plus nuancée que l'interdit qu'on vous a peut-être posé. Voici ce que la recherche montre réellement, et pourquoi votre bien-être de mère compte, lui aussi, dans l'équation.",
    cta: "reprise",
  },
  {
    slug: "se-faire-accompagner-quand-on-allaite-les-bonnes-questions-a-poser",
    title: "Comment bien choisir sa consultante en lactation ? Les questions à poser avant de vous engager",
    hook: "Douleurs, épuisement, bébé qui pleure ou refuse le sein : vous savez que vous avez besoin d'aide. Reste à savoir à qui la demander, et comment être sûre de tomber sur la bonne personne.",
    intro:
      "Dans ces moments où l'allaitement devient difficile, vous n'avez pas besoin d'une énième opinion tranchée, mais d'un vrai accompagnement professionnel. Le problème, c'est que le terme « consultante en lactation » recouvre des réalités très différentes, et qu'il n'est pas toujours simple de savoir à qui vous adressez votre confiance — et celle de votre bébé. Certification, lieu de consultation, déroulé, suivi dans la durée : quelques questions simples suffisent à faire le tri. Voici comment vous assurer une aide réellement professionnelle, humaine, et efficace.",
    cta: "pack",
  },
  {
    slug: "5-idees-recues-sur-le-metier-de-consultante-en-lactation-ibclc",
    title: "Consultante en lactation IBCLC : 5 idées reçues qui vous empêchent peut-être de demander de l'aide",
    hook: "« Une IBCLC, c'est une maman qui a beaucoup allaité et qui donne des conseils » — si vous pensez ça, vous n'êtes pas seule. Et ça change tout de comprendre pourquoi c'est faux.",
    intro:
      "Vous hésitez à consulter parce que vous pensez ne pas avoir « un cas assez compliqué », ou parce que vous imaginez une professionnelle prête à vous culpabiliser si vous envisagez le sevrage. Ces représentations, aussi répandues soient-elles, ne correspondent pas à la réalité du métier de consultante en lactation IBCLC — une certification internationale exigeante, avec des centaines d'heures de pratique clinique encadrée et un examen à réussir. Pire : le titre de « consultante en lactation » n'étant pas protégé par la loi, la confusion profite parfois à des personnes sans formation ni supervision réelle. Voici 5 idées reçues à déconstruire pour savoir précisément ce que vous êtes en droit d'attendre d'un accompagnement en allaitement.",
    cta: "pack",
  },
  {
    slug: "et-le-papa-dans-tout-ca-comment-mieux-impliquer-les-peres-dans-l-allaitement-et-la-parental",
    title: "« Je me sens inutile » : comment impliquer votre conjoint dans l'allaitement (sans qu'il donne le sein)",
    hook: "Il vous regarde allaiter et vous dit qu'il se sent exclu, presque jaloux. Vous, vous êtes épuisée et vous auriez justement besoin de lui — mais ni l'un ni l'autre ne sait par où commencer.",
    intro:
      "« Gabriel affirmait qu'il ne pouvait pas m'aider parce qu'il n'allaitait pas », me confiait récemment une maman. C'est un sentiment que je retrouve dans beaucoup de couples : d'un côté une mère débordée, de l'autre un père qui se sent spectateur d'un lien qu'il ne peut pas créer de la même façon. Pourtant, l'allaitement n'a jamais eu besoin d'être une affaire de mère seule — et le soutien du conjoint change concrètement la donne face aux douleurs, aux doutes ou à la fatigue. Voici comment transformer ce sentiment de mise à l'écart en un vrai travail d'équipe, dès la grossesse et bien après la naissance.",
    cta: "premiersJours",
  },

  // ─── Lot 2 ────────────────────────────────────────────────────────────────
  {
    slug: "de-combien-d-heures-de-sommeil-mon-bebe-a-t-il-besoin",
    title: "Mon bébé dort moins que « la moyenne » : dois-je m'inquiéter ?",
    hook: "Une appli, un tableau trouvé à 3h du matin, et soudain l'angoisse : « il devrait dormir combien, normalement ? » Bonne nouvelle : la normalité, côté sommeil, est beaucoup plus large qu'on ne le croit.",
    intro:
      "Il est 4h12, vous scrollez un article qui promet « le nombre d'heures de sommeil idéal selon l'âge », et votre bébé ne colle à aucune case. Vous n'êtes pas seule : c'est l'une des questions que les parents me posent le plus souvent en consultation. La bonne nouvelle, c'est que la science donne des repères — pas des obligations. Ce guide vous donne les recommandations telles qu'elles existent réellement, et surtout, les clés pour observer votre bébé à lui, plutôt que de le comparer à une moyenne qui ne le concerne pas forcément.",
    cta: "nuits",
  },
  {
    slug: "les-gaz-chez-les-bebes-ce-qu-il-faut-vraiment-savoir",
    title: "Bébé se tortille et grogne : que se passe-t-il vraiment dans son ventre ?",
    hook: "Il pousse, il grimace, il a l'air de souffrir — et vous, vous vous demandez déjà ce que vous avez raté. Ce petit ventre bruyant raconte en fait une histoire passionnante, pas un échec.",
    intro:
      "Vous venez de le coucher, et voilà qu'il se cambre, grogne, pousse comme s'il luttait contre quelque chose. Le réflexe, c'est de se demander ce qu'on a mal fait — le lait, la position, un aliment. En réalité, ces bruits et ces mimiques font partie d'un processus tout à fait normal : la mise en place du microbiote intestinal de votre bébé. On vous explique d'où viennent vraiment ces gaz, ce qui doit vous alerter, et surtout comment l'aider sans culpabiliser.",
    cta: "premiersJours",
  },
  {
    slug: "les-associations-de-sommeil-ne-sont-negatives-que-si-vous-le-decidez",
    title: "On vous a dit d'arrêter de l'endormir au sein : est-ce vraiment un problème ?",
    hook: "« Vous êtes en train de créer de mauvaises habitudes. » Cette phrase, vous l'avez peut-être déjà entendue — et elle a fait son petit effet de culpabilité. Il n'existe pas de mauvaise façon d'endormir son bébé, seulement des façons qui vous conviennent, ou plus.",
    intro:
      "Une tétée pour l'endormir, un bercement qui n'en finit plus, un doudou qui devient indispensable : ce sont vos rituels du soir, et quelqu'un, un jour, vous a laissé entendre qu'ils étaient « un problème ». Pourtant, endormir un bébé au sein n'a rien d'anormal — c'est même l'une des façons les plus naturelles de l'aider à trouver le sommeil. La vraie question n'est pas « est-ce que je fais bien », mais « est-ce que cette habitude fonctionne encore pour nous, aujourd'hui ? » Cet article vous aide à faire la différence entre un rituel qui vous convient et un signal qu'il est temps d'ajuster — sans jamais vous faire sentir en faute.",
    cta: "nuits",
  },
  {
    slug: "surmonter-les-defis-et-preserver-l-allaitement-maternel",
    title: "Douleur, bébé grognon, refus du sein : faut-il vraiment arrêter d'allaiter ?",
    hook: "Une crevasse, un bébé qui pleure au sein, l'impression de manquer de lait — et cette petite voix qui dit « peut-être que c'est le signe qu'il faut arrêter ». Avant de trancher, il y a presque toujours une cause identifiable, et une solution.",
    intro:
      "Il y a des jours où continuer semble au-dessus de vos forces : la douleur à chaque tétée, ce bébé qui s'agite au sein sans qu'on comprenne pourquoi, ou pire, qui tourne soudain la tête et refuse de téter. Face à ça, on se dit vite que le corps ou le bébé « ne veut plus ». Mais dans l'immense majorité des cas, ces difficultés ont une cause précise — une position, un rythme de tétées, l'arrivée des solides — et donc une vraie marge de manœuvre pour les résoudre. Voici, obstacle par obstacle, comment y voir plus clair avant de prendre une décision.",
    cta: "filDesMois",
    category: "augmenter-la-lactation",
  },
  {
    slug: "allaiter-en-etant-enceinte-ce-qu-il-faut-vraiment-savoir",
    title: "Enceinte et toujours en train d'allaiter : dois-je choisir entre les deux ?",
    hook: "Un test de grossesse positif, un aîné toujours au sein, et cette question qui surgit aussitôt : « est-ce que je dois arrêter ? » La réponse est presque toujours non — mais elle mérite d'être posée avec de vraies informations, pas des on-dit.",
    intro:
      "La nouvelle vient de tomber : un deuxième bébé s'annonce, et le premier tète encore. Entre la joie de cette grossesse et l'inquiétude de « faire mal » à l'un ou à l'autre, les questions s'enchaînent — et les avis contradictoires de l'entourage n'aident pas. C'est une situation que je vois très régulièrement en consultation, et la réalité est plus simple qu'on ne le pense : votre corps sait généralement faire les deux à la fois. Voici ce qu'il faut vraiment savoir pour traverser cette période sereinement, quel que soit le choix que vous ferez.",
    cta: "preparer",
  },
  {
    slug: "pourquoi-la-science-doit-revoir-sa-maniere-de-parler-d-allaitement",
    title: "« Il ne faut pas culpabiliser » : la phrase qui, justement, culpabilise",
    hook: "On vous a sûrement déjà dit « il ne faut pas culpabiliser » — sans jamais vous dire pourquoi vous culpabilisiez en premier lieu. Il est temps de nommer les choses, avec honnêteté et sans dogme.",
    intro:
      "Joie, fatigue, émerveillement — et, tapie derrière, cette culpabilité qui ne demande qu'à s'installer, quel que soit votre choix d'alimentation. On vous dit de ne pas culpabiliser, comme si la culpabilité était un défaut de caractère à corriger, plutôt que la conséquence d'un manque criant d'informations fiables. En tant que consultante IBCLC, je vois chaque semaine à quel point ce vide pèse sur les décisions des parents — des décisions qui engagent la santé de leur bébé. Voici pourquoi la science elle-même doit changer sa façon d'en parler, et ce que cela change concrètement pour vous.",
    cta: "premiersJours",
  },
  {
    slug: "allaitement-maternel-ce-qu-il-faut-savoir-sur-ses-bienfaits-ses-defis-et-les-alternatives",
    title: "Crevasses, doutes, fatigue : pourquoi tant de mères s'accrochent quand même",
    hook: "Personne ne vous a menti sur les bienfaits de l'allaitement. Mais on a peut-être oublié de vous parler des débuts parfois rudes — et surtout, des solutions qui existent pour chacun d'eux.",
    intro:
      "Vous avez lu tous les bienfaits de l'allaitement avant la naissance, et puis la réalité a débarqué : une douleur inattendue, un bébé qui réclame toutes les deux heures, l'angoisse de ne pas savoir s'il boit « assez ». De quoi se demander si le jeu en vaut vraiment la chandelle. Il en vaut la chandelle — mais pas au prix de souffrir en silence. Voici un panorama honnête : ce que l'allaitement apporte, ce qu'il peut coûter, et comment franchir chaque obstacle sans renoncer à ce qui compte pour vous.",
    cta: "premiersJours",
  },
  {
    slug: "l-allaitement-des-premiers-jours-une-fenetre-d-opportunite",
    title: "Les 72 premières heures : ce qui se joue vraiment pour votre allaitement",
    hook: "« On m'a dit que mon bébé ne tétait pas bien et on m'a proposé du lait artificiel sans chercher d'autre solution. » Ce témoignage, je l'entends trop souvent — alors que ces tout premiers jours sont justement ceux où un accompagnement change tout.",
    intro:
      "Vous venez d'accoucher, vous êtes épuisée, et on vous demande déjà si « ça prend bien ». Ces premières heures sont pourtant une fenêtre unique : le corps est câblé, hormonalement, pour démarrer la lactation — à condition d'être bien accompagné. Trop de mères se retrouvent seules à la maternité face à un bébé qui peine à téter, sans qu'on prenne le temps de comprendre pourquoi. Voici ce que la science sait de ce moment charnière, et comment les repères utilisés par les spécialistes peuvent vous aider à ne rien laisser au hasard.",
    cta: "premiersJours",
  },
  {
    slug: "reprendre-le-travail-tout-en-allaitant-vos-droits-vos-choix-votre-confiance",
    title: "Reprendre le travail ne veut pas dire arrêter d'allaiter — voici vos droits",
    hook: "On ne demande jamais à quelqu'un d'arrêter un traitement pour « faciliter » son retour au bureau. Pourtant, on le sous-entend souvent aux mères qui allaitent. La loi, elle, dit tout autre chose.",
    intro:
      "La date de reprise approche, et avec elle, une angoisse sourde : « est-ce que je vais devoir choisir entre mon travail et l'allaitement ? » Entre les remarques désobligeantes de certains collègues et le flou total sur vos droits, il y a de quoi se sentir seule face à cette décision. Rassurez-vous : reprendre une activité professionnelle n'oblige à rien côté allaitement, et la loi française vous protège plus que vous ne le pensez. Voici, concrètement, ce que vous pouvez exiger — et comment en parler avec assurance à votre employeur.",
    cta: "reprise",
  },
  {
    slug: "quand-faire-faire-un-rot-a-son-bebe-ou-pas",
    title: "Rot ou pas rot : ce qu'on vous a mal expliqué",
    hook: "« Il faut absolument le faire roter, même la nuit » : cette phrase, vous l'avez peut-être suivie à la lettre, épuisée, à 3h du matin. Bonne nouvelle : ce n'est pas toujours vrai.",
    intro:
      "Votre bébé vient de téter, et vous voilà en train de le trimballer contre votre épaule en tapotant, sans trop savoir si c'est vraiment nécessaire ou juste une habitude transmise de génération en génération. Autour de vous, tout le monde a son avis : « les bébés allaités n'en ont pas besoin », « il faut le réveiller la nuit pour ça ». De quoi douter, légitimement. Avant de vous donner les positions les plus efficaces et les plus douces, on fait le tri entre ce qui est vrai et ce qui ne l'est pas.",
    cta: "premiersJours",
    category: "accueillir-bebe",
  },
  {
    slug: "sommeil-partage-ne-nous-voilons-pas-la-face",
    title: "Vous dormez déjà avec votre bébé (même sans l'avoir décidé) : autant le faire en sécurité",
    hook: "3h du matin, vous l'avez repris dans votre lit sans même y réfléchir — et le lendemain, une pointe de culpabilité. Soyons pragmatiques : ça arrive à la majorité des parents. Autant savoir comment le faire sans risque.",
    intro:
      "On vous a peut-être dit « ne prenez jamais votre bébé dans votre lit » — et pourtant, épuisée, à moitié endormie, vous l'avez fait. Vous n'êtes pas seule : le sommeil partagé se pratique depuis que l'humanité existe, et il facilite énormément l'allaitement de nuit. Le vrai sujet n'est donc pas de culpabiliser ceux qui le pratiquent, mais de donner à chacun les règles précises pour que ce moment de proximité reste un moment sûr. Voici ce qu'il faut savoir, sans tabou.",
    cta: "nuits",
  },
  {
    slug: "sommeil-comment-concilier-instinct-securite-et-recommandations",
    title: "Le canapé à 3h du matin est plus dangereux que votre lit : ce que dit vraiment la science",
    hook: "Par peur de « mal faire », beaucoup de mères finissent à moitié endormies sur un canapé ou un fauteuil pour allaiter la nuit — pensant bien faire. C'est justement l'endroit le plus risqué.",
    intro:
      "Vous vous êtes jurée de ne jamais prendre votre bébé dans votre lit, alors, épuisée, vous allaitez assise sur le canapé, en luttant contre le sommeil. Ce que la science montre aujourd'hui, c'est que cet instinct qui vous pousse vers votre lit n'était pas le problème — c'est l'endroit où vous avez fini par vous réfugier par peur qui l'était. L'allaitement lui-même réduit le risque de mort subite du nourrisson, et il existe des règles précises pour que le partage du lit reste sécurisé. Voici ce que disent les dernières recommandations, sans injonction, pour que vous puissiez suivre votre instinct en toute sécurité.",
    cta: "nuits",
  },

  // ─── Lot 3 ────────────────────────────────────────────────────────────────
  {
    slug: "le-co-allaitement-en-pratique",
    title: "Enceinte et toujours en train d'allaiter : le co-allaitement, mode d'emploi",
    hook: "Le test est positif. Et une petite voix vous dit tout bas : « mais alors... je fais quoi, pour lui ? »",
    intro:
      "Vous vibrez encore au rythme des tétées de votre aîné quand une deuxième ligne apparaît sur le test. Joie, vertige, et cette question qui s'impose aussitôt : faut-il sevrer, maintenant, tout de suite ? Autour de vous, les regards interrogateurs commencent déjà — « tu allaites encore, à son âge ? » Sachez une chose avant toute autre : cette décision n'appartient qu'à vous, et elle peut se prendre en douceur, sans date butoir imposée par qui que ce soit. Voici, avec toute la nuance que mérite ce sujet trop souvent jugé, ce qu'il faut savoir pour avancer sereinement.",
    cta: "preparer",
  },
  {
    slug: "je-pense-avoir-un-ref-mon-bebe-est-agite-au-sein",
    title: "Bébé tousse, s'agite, lâche le sein : est-ce vraiment un « réflexe d'éjection fort » ?",
    hook: "Il tète deux secondes, s'étrangle, hurle, repart en arrière. Vous, vous êtes trempée de lait et de doute.",
    intro:
      "Ce lait qui gicle, ce bébé qui panique, ces tétées qui tournent au petit chaos : on vous a peut-être déjà dit « c'est un réflexe d'éjection fort, madame, votre lait part trop vite. » Le diagnostic tombe, rassurant en apparence, presque définitif. Sauf qu'il est souvent posé beaucoup trop vite — sans qu'on ait vraiment regardé la position de votre bébé, le rythme de vos tétées, ou ce qui se joue vraiment dans son corps encore immature. Avant de vous résigner à un « trop-plein » qui n'en est peut-être pas un, voici ce que la physiologie a vraiment à en dire.",
    cta: "filDesMois",
  },
  {
    slug: "pourquoi-suivre-le-poids-de-son-bebe-sur-les-courbes-de-l-oms",
    title: "La courbe de poids de bébé vous inquiète ? Apprenez à vraiment la lire",
    hook: "Un chiffre en moins sur la balance, et c'est tout votre allaitement qui vacille en une phrase du carnet de santé.",
    intro:
      "Vous sortez de la pesée, le petit point bleu a un peu bougé sur la courbe, et déjà l'angoisse s'installe : est-ce grave, est-ce que je ne le nourris pas assez ? Cette courbe, si intimidante sur le papier, n'est pourtant pas une sentence — c'est un langage, et comme tout langage, il s'apprend. Encore faut-il qu'elle soit la bonne : une courbe française et une courbe OMS ne racontent pas la même histoire pour un bébé allaité, et confondre les deux peut faire naître une inquiétude totalement infondée, voire pousser vers des décisions qui fragilisent l'allaitement pour de mauvaises raisons. Voici comment lire ce graphique avec les yeux qu'il faut.",
    cta: "filDesMois",
  },
  {
    slug: "l-allaitement-une-formation-qui-bouscule-et-qui-transforme-en-profondeur",
    title: "Se former à l'allaitement : bien plus qu'une technique, une remise en question",
    hook: "Vous pensiez apprendre à repérer une bonne prise du sein. Vous allez surtout réapprendre à écouter.",
    intro:
      "Sage-femme, doula, ostéopathe, puéricultrice ou tout simplement future consultante : vous arrivez en formation avec vos certitudes, votre propre histoire d'allaitement (réussi, douloureux, écourté, ou jamais vécu), et souvent, sans le savoir, avec quelques mythes solidement installés. C'est normal : la plupart d'entre nous n'avons jamais été vraiment formées sur ce sujet, ni pendant nos études, ni ailleurs. Se former sérieusement à l'allaitement, ce n'est donc pas seulement cocher des compétences techniques : c'est accepter de regarder en face ce qu'on croyait savoir, pour mieux accompagner les mères sans y projeter ses propres peurs. Voici pourquoi cette démarche transforme autant la pratique professionnelle que le regard qu'on porte sur soi-même.",
    cta: "accompagnements",
  },
  {
    slug: "on-m-a-dit-de-tirer-mon-lait-au-pire-on-le-jettera-l-allaitement-d-elodie",
    title: "Cancer, prématurité, radiothérapie : l'allaitement d'Élodie et Gabriela",
    hook: "Un cancer pendant la grossesse. Un bébé né à 30 semaines. Et une question, posée d'une voix qui ne tremble pas : « je peux quand même tirer mon lait ? »",
    intro:
      "Élodie est ostéopathe, elle vit à Porto. Enceinte de sa deuxième fille, elle apprend qu'elle a un cancer du cervelet. Elle sera opérée pendant la grossesse. Une semaine avant de m'écrire, sa fille Gabriela est née par césarienne, à 30 semaines. Et pourtant, au milieu de la peur, de la séparation et des traitements, Élodie n'a posé qu'une seule question : comment continuer à donner son lait à sa fille. Voici son histoire — celle d'un allaitement tenu par la force du tire-lait, envers et contre tout.",
    cta: "premiersJours",
  },
  {
    slug: "concilier-allaitement-et-retour-au-travail-droits-et-conseils-pratiques",
    title: "Reprendre le travail sans arrêter d'allaiter : ce que la loi vous doit vraiment",
    hook: "Votre congé maternité touche à sa fin, et une question tourne en boucle : est-ce que je vais devoir choisir entre mon travail et mon allaitement ?",
    intro:
      "La date de la reprise approche, et avec elle, ce petit pincement au ventre : comment continuer à allaiter quand il faut à nouveau pointer au bureau ? La bonne nouvelle, c'est que ce n'est pas qu'une question d'organisation personnelle — c'est un droit, inscrit noir sur blanc dans le Code du travail, que beaucoup de mères ignorent ou n'osent pas réclamer. Pauses dédiées, local d'allaitement, matériel adapté : voici tout ce que vous pouvez exiger, et comment vous y prendre concrètement pour que cette reprise se passe bien, pour vous comme pour votre bébé.",
    cta: "reprise",
  },
  {
    slug: "diversification-alimentaire-ce-qu-on-sait-vraiment-et-ce-qu-on-vous-vend",
    title: "Diversification alimentaire : ce qui relève de la science, ce qui relève du marketing",
    hook: "« 4 mois », « 6 mois », « dès que possible »... Chacun y va de sa règle, et vous, vous cherchez juste à bien faire pour votre bébé.",
    intro:
      "Un petit pot « dès 4 mois » dans le rayon du supermarché, une amie qui jure par la DME, une belle-mère persuadée que le lait seul ne suffit plus : la diversification alimentaire est un de ces moments où tout le monde a un avis, et où vous, vous aimeriez juste savoir ce qui est vrai. Derrière les étiquettes marketing et les injonctions contradictoires, il y a pourtant des repères solides, portés par l'OMS et les recommandations françaises, qui remettent l'observation de votre bébé au centre plutôt qu'une date gravée dans le marbre. Voici comment démêler le vrai du commercial, sans céder à la pression du rayon bébé.",
    cta: "diversification",
  },
  {
    slug: "perte-de-poids-du-nouveau-ne-reagir-vite-pour-proteger-l-allaitement",
    title: "Bébé a perdu du poids à la maternité : ce qu'il faut faire, vite et bien",
    hook: "La sage-femme annonce un chiffre, votre cœur se serre : et si vous n'aviez pas assez de lait ?",
    intro:
      "Trois jours après la naissance, on vous annonce que bébé a perdu du poids, et en une phrase, toute votre confiance dans l'allaitement vacille. Une perte modérée est pourtant normale — c'est passé les 10 % du poids de naissance que la vigilance devient nécessaire, pour l'hydratation de votre bébé comme pour la mise en route de votre lactation. Le plus difficile, dans ces moments-là, c'est souvent moins la situation elle-même que les conseils reçus au mauvais moment, ceux qui vous font perdre un temps précieux. Voici ce qu'il faut vraiment surveiller, et ce qu'il faut faire sans attendre.",
    cta: "urgences",
  },
  {
    slug: "fumer-et-allaiter-est-ce-compatible",
    title: "Vous fumez et vous allaitez : voici ce qu'il faut vraiment savoir, sans jugement",
    hook: "Une cigarette, un pincement de culpabilité, et cette question qu'on n'ose poser à personne : dois-je arrêter d'allaiter ?",
    intro:
      "Vous allumez une cigarette, et aussitôt, une petite voix vous dit que vous êtes en train de faire du mal à votre bébé. Entre la fatigue de la reprise, l'envie irrépressible de ce moment de pause « rien qu'à vous », et la peur de mal faire, il n'y a pas de quoi culpabiliser : vous n'êtes ni la première ni la seule dans ce cas, et la maternité ne gomme pas les fragilités d'une vie réelle. La vraie question n'est pas de savoir si vous êtes une « bonne » ou une « mauvaise » mère, mais ce que la science dit vraiment de l'impact du tabac sur votre lait et sur bébé — et surtout, comment continuer à allaiter en toute sécurité. Voici les réponses, sans culpabilité inutile.",
    cta: "pack",
  },
  {
    slug: "moins-de-25-des-bebes-sont-encore-allaites-a-6-mois-en-france",
    title: "Pourquoi si peu de bébés sont encore allaités à 6 mois en France ?",
    hook: "Vous n'êtes pas seule si vous avez arrêté plus tôt que prévu. En France, c'est même la majorité.",
    intro:
      "Si votre allaitement s'est arrêté plus tôt que ce que vous aviez imaginé, sachez une chose : ce n'est presque jamais « de votre faute ». En France, moins d'un quart des bébés sont encore allaités exclusivement à 6 mois, alors que l'OMS recommande cet allaitement exclusif jusqu'à cet âge — un écart qui n'a rien d'une fatalité individuelle. Maternités encore marquées par des habitudes anciennes, soignants trop peu formés, manque de soutien après la sortie : les causes sont systémiques, bien avant d'être personnelles. Voici pourquoi ce chiffre doit nous interpeller collectivement, et ce qui pourrait changer la donne pour les mères de demain.",
    cta: "premiersJours",
  },
  {
    slug: "allaiter-apres-une-cesarienne-est-ce-que-les-des-sont-jetes",
    title: "Césarienne et allaitement : non, rien n'est joué d'avance",
    hook: "On vous a peut-être laissé entendre que la césarienne compliquerait tout. Ce n'est pas ce que dit la physiologie.",
    intro:
      "Une césarienne, ce n'est pas seulement une autre voie de naissance : c'est souvent une convalescence, une douleur à gérer, parfois un accouchement qui ne s'est pas passé comme prévu — et au milieu de tout ça, la peur sourde que l'allaitement soit lui aussi compromis. Rassurez-vous : c'est la délivrance du placenta, et non la façon dont votre bébé est né, qui déclenche votre montée de lait. La montée peut simplement arriver quelques jours plus tard, le temps que la proximité avec votre bébé et les tétées s'installent malgré la mobilité réduite des premiers jours. Voici comment poser les bonnes bases, positions adaptées à la cicatrice comprises, pour démarrer votre allaitement en confiance.",
    cta: "premiersJours",
  },
  {
    slug: "le-manque-de-lait-mythes-et-realites",
    title: "« Je n'ai pas assez de lait » : quand cette peur est fondée, et quand elle ne l'est pas",
    hook: "Votre bébé pleure après la tétée, et une phrase s'impose aussitôt : « je dois manquer de lait. »",
    intro:
      "C'est l'une des peurs les plus anciennes et les plus universelles de la maternité : ne pas avoir assez de lait pour son enfant. Elle traverse les époques, les cultures, et reste aujourd'hui encore la première cause de sevrage précoce — alors même que, dans la grande majorité des cas, la production de lait est bien réelle et suffisante. Le problème, c'est que les seins ne sont pas gradués : impossible de « voir » combien votre bébé a bu, et ce vide laisse toute la place au doute. Voici ce que disent vraiment les études sur la production de lait, pour vous aider à distinguer une inquiétude légitime d'une alerte sans fondement.",
    cta: "filDesMois",
  },

  // ─── Lot 4 ────────────────────────────────────────────────────────────────
  {
    slug: "faut-il-vraiment-se-fier-aux-grammes-pris-chaque-jour-pour-juger-la-sante-d-un-bebe",
    title: "« 30 grammes par jour » : le chiffre qui rassure tout le monde… sauf vous",
    hook: "La sage-femme note un chiffre sur le carnet de santé. Vous, vous ne retenez qu'une chose : est-ce que c'est assez ?",
    intro:
      "« S'il n'a pas repris son poids, vous ne pourrez pas sortir. » Cette phrase, beaucoup de mères l'ont entendue à la maternité, et elle ne les a plus jamais quittées. Dès lors, chaque pesée devient un examen, chaque grammage un verdict. On se met à guetter la balance comme on guetterait un bulletin de notes, avec la peur au ventre de ne pas être « à la hauteur ». Pourtant, ce chiffre unique — les fameux grammes pris chaque jour — est loin d'être aussi fiable qu'on le croit pour juger de la santé d'un bébé. Voici ce que disent vraiment les courbes de croissance, et comment les lire sans angoisse.",
    cta: "filDesMois",
  },
  {
    slug: "l-allaitement-est-il-une-cause-de-depression-du-post-partum",
    title: "Et si ce n'était pas l'allaitement qui vous rendait triste ?",
    hook: "On vous a peut-être déjà glissé : « Arrête d'allaiter, tu verras, tu iras mieux. » Et si ce conseil, bien intentionné, passait complètement à côté du vrai problème ?",
    intro:
      "Vous pleurez sans savoir pourquoi. Vous vous sentez vidée, loin de vous-même, et quelqu'un de bienveillant a fini par dire : « Et si tu arrêtais d'allaiter ? Ça t'aiderait peut-être. » Cette phrase, tant de mères l'ont entendue — et tant s'en sont voulu de ne pas se sentir soulagées à cette seule idée. Les recherches, elles, racontent une tout autre histoire : l'allaitement n'est pas la cause de la dépression du post-partum, il peut même être un appui. La vraie question n'est pas « dois-je sevrer pour aller mieux », mais « qu'est-ce qui, dans mon quotidien, m'épuise et me pèse vraiment ». On fait le point, sans culpabiliser personne.",
    cta: "premiersJours",
  },
  {
    slug: "mastite-les-risques-caches-et-comment-les-eviter-des-le-debut",
    title: "Mastite : une mère sur quatre la vit, presque aucune ne s'y attend",
    hook: "Un sein brûlant, une fièvre qui grimpe d'un coup, et cette pensée qui traverse : « je n'y arriverai pas ce soir. » La mastite frappe vite, et fort.",
    intro:
      "Si vous l'avez déjà traversée, vous savez : la mastite ne prévient pas vraiment. Un sein qui tire un peu plus que d'habitude, puis une zone rouge, chaude, et en quelques heures la fièvre qui s'installe avec des courbatures qui donnent l'impression d'avoir la grippe. Beaucoup de mères, à ce moment précis, envisagent sérieusement d'arrêter d'allaiter — la douleur est réelle, et personne ne devrait avoir à la minimiser. Pourtant, une large partie des mastites peut être anticipée, comprise, et évitée, à condition de connaître les bons signaux. Voici ce que la recherche récente nous apprend sur ses causes réelles, et comment vous en protéger dès les premières semaines.",
    cta: "urgences",
  },
  {
    slug: "et-si-ce-n-etait-pas-un-defaut-de-succion",
    title: "« Sa succion n'est pas bonne », vous a-t-on dit. Et si c'était autre chose ?",
    hook: "Bébé s'agite, tousse, lâche le sein en pleurant. Le premier mot qu'on vous glisse, c'est souvent « succion ». Rarement le bon.",
    intro:
      "Il s'accroche, tète deux minutes, puis se détache en pleurant, la tête rejetée en arrière. On vous parle alors d'un « défaut de succion », parfois même d'une chirurgie à envisager. Avant d'en arriver là, il existe une explication beaucoup plus fréquente, et beaucoup plus simple à corriger : un réflexe d'éjection puissant que votre bébé n'arrive pas encore à gérer, ou une prise du sein à ajuster. Comprendre la physiologie réelle de la tétée change tout — et évite bien des interventions inutiles. On vous explique comment distinguer les deux, et surtout comment agir concrètement.",
    cta: "urgences",
  },
  {
    slug: "faut-il-vraiment-ceder-au-lait-infantile",
    title: "Le biberon de lait infantile est déjà prêt. Avant de céder, ces questions méritent d'être posées",
    hook: "La boîte est dans le placard depuis la maternité, « au cas où ». Ce jour-là arrive plus vite qu'on ne le pensait — et il n'a rien d'un échec.",
    intro:
      "Il est 3h du matin, bébé pleure, vous doutez d'avoir assez de lait, et cette boîte de lait infantile est là, dans le placard, « au cas où ». Ce moment, beaucoup de mères l'ont vécu — et beaucoup ont cédé sans vraiment savoir ce que ce choix engageait, ni ce qu'il n'engageait pas. Cet article ne vise à culpabiliser personne : donner du lait infantile est une décision qui se prend avec les informations et le soutien du moment, parfois faute de mieux. Mais il est utile de savoir ce que dit vraiment la science sur son impact, quand il est réellement nécessaire, et comment, si vous le souhaitez, préserver ou relancer votre allaitement malgré tout.",
    cta: "filDesMois",
  },
  {
    slug: "baisse-de-lactation-pendant-les-regles-que-se-passe-t-il-et-que-faire",
    title: "Vos règles reviennent, et votre lait semble baisser : coïncidence ou pas ?",
    hook: "Le sein moins plein, bébé plus réclamant, et vous qui remarquez que ça arrive toujours à la même période du mois. Vous n'imaginez rien.",
    intro:
      "Vos règles reviennent, et en même temps, votre bébé semble réclamer plus, ou votre sein vous paraît moins généreux qu'avant. Vous vous demandez si c'est une coïncidence, ou si votre corps vous joue vraiment un tour au pire moment. Ce n'est ni dans votre tête, ni un signe que votre allaitement s'essouffle : c'est un phénomène hormonal bien identifié, qui touche certaines mères plus que d'autres, et qui reste, dans l'immense majorité des cas, temporaire et sans gravité. Voici ce qui se joue réellement dans votre corps à ce moment du cycle, et les gestes simples qui aident à passer le cap.",
    cta: "filDesMois",
  },
  {
    slug: "votre-bebe-regurgite-faut-il-s-inquieter",
    title: "Un filet de lait sur l'épaule, et le cœur qui s'affole : faut-il s'inquiéter ?",
    hook: "Bébé vient de rejeter la moitié de sa tétée sur votre pull. Première pensée : « il n'a rien mangé, il va avoir faim. » Ce n'est presque jamais le cas.",
    intro:
      "Bébé rote, et avec lui, tout un flot de lait vient inonder votre épaule. Vous regardez la flaque, un peu paniquée : a-t-il tout perdu ? A-t-il trop bu, ou pas assez ? Est-ce le signe d'un problème qu'il faudrait faire soigner ? Rassurez-vous tout de suite sur un point : la quantité régurgitée ne dit presque rien de la quantité réellement absorbée, et dans la grande majorité des cas, ces petits (ou grands) rejets sont totalement bénins. On vous aide à distinguer un reflux physiologique, banal et transitoire, d'un reflux qui mérite un avis médical.",
    cta: "filDesMois",
  },
  {
    slug: "engorgement-ce-qu-on-ne-vous-dit-pas",
    title: "Seins durs, brûlants, impossibles à toucher : ce qu'on ne vous dit pas sur l'engorgement",
    hook: "Vos seins sont si tendus que même l'eau de la douche fait mal. Et personne ne vous avait prévenue que ça pouvait arriver comme ça, d'un coup.",
    intro:
      "La montée de lait, on vous en a parlé. Mais pas de ça : ces seins soudain durs comme de la pierre, brûlants, où même le tissu du pyjama devient insupportable. Vous n'osez plus bouger, et votre bébé, lui, n'arrive plus à s'accrocher tant la peau est tendue. Cet épisode, aussi impressionnant soit-il, se résout dans la grande majorité des cas rapidement — à condition de savoir exactement quoi faire, et surtout, ce qu'il ne faut plus faire (bander ses seins n'a jamais aidé personne). Voici ce que peu de professionnels prennent le temps de vous expliquer sur l'engorgement, ses causes réelles et les gestes qui soulagent vraiment.",
    cta: "urgences",
    category: "douleurs",
  },
  {
    slug: "allaitement-d-un-bambin-pourquoi-il-tete-encore-autant",
    title: "Il a 18 mois et tète comme à J1 : « j'ai l'impression d'être un distributeur »",
    hook: "Vous pensiez que ça se calmerait avec l'âge. C'est même parfois l'inverse — et non, votre lait n'est pas devenu « de l'eau ».",
    intro:
      "« Il ne me lâche pas du tout, j'ai l'impression d'être un distributeur. » Cette phrase, beaucoup de mères d'un bambin allaité l'ont pensée, parfois dite tout haut, souvent suivie d'une pointe de culpabilité de l'avoir formulée ainsi. Votre enfant a soufflé sa première bougie, marche, parle presque, et pourtant il continue de réclamer le sein, de jour comme de nuit, comme s'il avait de nouveau six semaines. Non, votre lait n'est pas « devenu de l'eau » : il reste, encore à cet âge, un aliment complet et une ressource affective précieuse. Voici pourquoi les bambins tètent autant, et comment poser un cadre qui vous respecte, vous, sans rompre ce lien.",
    cta: "pack",
    category: "allaitement-bambin",
  },

  // ─── Lot 5 ────────────────────────────────────────────────────────────────
  {
    slug: "instrumentalises-vous-croyez-faire-des-choix-libres",
    title: "Sages-femmes, pédiatres, IBCLC : et si vous étiez, sans le savoir, la cible du marketing des laits infantiles ?",
    hook: "Un stylo offert en congrès, un café-croissant sponsorisé, une formation « gratuite »... Vous pensez conseiller librement les familles. L'industrie du lait infantile, elle, sait exactement ce qu'elle fait.",
    intro:
      "Vous n'avez jamais signé de contrat avec un laboratoire. Vous n'avez jamais accepté de « vendre » une marque à vos patientes. Et pourtant, si vous avez reçu un mètre-ruban floqué, assisté à un congrès sponsorisé ou utilisé un outil « pédagogique » fourni gracieusement, vous avez déjà été touché·e par une stratégie d'influence documentée depuis des décennies. Ce n'est pas un procès en intention : c'est ce que montrent les rapports de l'OMS, de l'UNICEF et d'IBFAN sur les pratiques de l'industrie envers les professionnels de santé. Ici, on déplie les mécanismes — pour que votre parole reste, justement, la vôtre.",
    cta: "accompagnements",
  },
  {
    slug: "allaitement-douleur-la-piste-du-clitoris",
    title: "Et si le clitoris pouvait aussi soulager la douleur de l'allaitement ?",
    hook: "Crevasses, tranchées, tensions périnéales... On dit souvent aux jeunes mères d'attendre que ça passe. Une étude française ouvre une piste à laquelle personne n'avait pensé.",
    intro:
      "La douleur du post-partum, on la connaît par cœur en cabinet : celle qui fait serrer les dents à chaque tétée, celle qu'on tait parce qu'on ne sait pas à qui la dire. Pourtant, entre 2020 et 2023, une équipe du CHU de Rouen a exploré une hypothèse qu'on n'attendait pas dans ce contexte : le clitoris aurait, en plus de sa fonction sexuelle, une fonction analgésique. Sur 32 femmes enceintes, une stimulation externe, non sexuelle, a soulagé la douleur dans plus de 86 % des cas testés. Un résultat encore exploratoire, mais qui mérite qu'on en parle sans tabou — parce que la douleur de l'allaitement n'a jamais été une fatalité à supporter en silence.",
    cta: "urgences",
  },
  {
    slug: "faut-il-vraiment-donner-un-rythme-aux-tetees",
    title: "« Il tète toutes les combien ? » — la question qui angoisse (et qui n'a pas de bonne réponse)",
    hook: "Dès la maternité, la question tombe. Comme s'il existait un bon tempo à trouver, et qu'on l'avait raté.",
    intro:
      "« Il tète toutes les combien ? » Cette question, vous l'avez peut-être déjà entendue avant même de sortir de la maternité. Sous-entendu : y a-t-il un rythme à installer, un cadre à donner ? Dans une vie où tout se planifie — les couches, les siestes, les biberons des copines — l'idée d'un rythme rassure. Sauf que le corps d'un nouveau-né ne fonctionne pas comme un agenda : il fonctionne à la demande, et c'est précisément ce qui fait fonctionner votre lactation. On vous explique pourquoi lâcher l'horloge est souvent la meilleure chose à faire.",
    cta: "filDesMois",
  },
  {
    slug: "ramadan-jeuner-ou-non-pendant-l-allaitement",
    title: "Ramadan et allaitement : jeûner ou pas, la décision vous appartient",
    hook: "Le Ramadan approche et une question revient, intime et souvent culpabilisante : puis-je jeûner sans mettre en danger ma lactation, ou mon bébé ?",
    intro:
      "Le Ramadan est un temps spirituel précieux. Pour une mère qui allaite, il s'accompagne souvent d'une question qu'elle n'ose pas toujours poser à voix haute : ai-je le droit de ne pas jeûner sans trahir ma foi ? Ai-je le droit de jeûner sans mettre mon bébé en danger ? La bonne nouvelle, c'est que la science et les textes religieux convergent sur un point : cette décision est personnelle, elle ne se justifie devant personne, et elle peut évoluer d'un jour à l'autre selon comment vous vous sentez. Voici ce que dit vraiment la recherche, et ce que prévoit la dispense religieuse pour vous accompagner sereinement.",
    cta: "filDesMois",
  },
  {
    slug: "tirer-son-lait-ca-paraissait-evident-et-pourtant",
    title: "Vous tirez votre lait et les volumes ne suivent pas ? Ce n'est probablement pas votre corps le problème",
    hook: "Un tire-lait plus puissant, des séances plus longues, plus de courage... et toujours les mêmes millilitres au fond du biberon. Et si le vrai coupable était la taille de vos téterelles ?",
    intro:
      "Vous avez déjà passé de longues minutes, tire-lait branché, à fixer un biberon qui ne se remplit pas. Vous avez pensé que votre corps « n'était pas fait pour ça ». Ou que votre appareil n'était pas assez performant. Pendant des années, c'est exactement ce qu'on a laissé croire aux mères — en cherchant la solution du côté du matériel plutôt que du côté de la physiologie. Aujourd'hui, la science est plus précise : le tirage de lait est un processus biologique qui se calibre, se comprend et s'ajuste. On vous explique comment, sans jargon.",
    cta: "filDesMois",
  },
  {
    slug: "mon-bebe-ne-dort-pas-et-si-c-etait-ses-troubles-digestifs",
    title: "Bébé grogne, se tortille, semble souffrir la nuit — et si ce n'était pas son ventre ?",
    hook: "3h du matin. Bébé grogne, se cambre, pousse des petits cris. Vous êtes sûre que c'est son ventre. La science, elle, raconte une autre histoire.",
    intro:
      "Vous l'écoutez grogner dans son sommeil, vous le voyez se tortiller, arquer le dos, et votre premier réflexe est de penser : « il a mal au ventre ». C'est l'explication la plus répandue — et pourtant, ce n'est presque jamais la bonne. Ce que les études récentes en neurosciences du sommeil montrent, c'est que ces bruits et ces mouvements sont le signe d'un cerveau qui travaille, pas d'un intestin qui souffre. Comprendre ce mécanisme change tout : moins d'inquiétude inutile la nuit, moins de fausses pistes digestives, et plus d'énergie pour ce qui compte vraiment.",
    cta: "nuits",
    category: "sommeil-du-tout-petit",
  },
  {
    slug: "on-m-avait-dit-de-jeter-le-reste-du-biberon",
    title: "Le reste du biberon à la poubelle : la règle qui a fait pleurer tant de mères était-elle vraiment justifiée ?",
    hook: "Des heures passées à tirer quelques millilitres. Et à la fin, on vous dit de les jeter parce que bébé n'a pas fini. Ce lait-là, il ne méritait pas ça.",
    intro:
      "Tirer son lait demande du temps, de l'énergie, parfois de longues minutes pour quelques dizaines de millilitres à peine. Alors quand on vous dit « s'il n'a pas fini, il faut jeter », quelque chose se serre. Beaucoup de mères ont vécu cette règle comme un crève-cœur — certaines ont même arrêté de tirer leur lait, convaincues qu'il n'avait finalement pas tant de valeur. Sauf que cette recommandation, aussi stricte soit-elle, reposait longtemps davantage sur la prudence que sur des données scientifiques directes. Une étude récente vient enfin éclairer ce qui se passe vraiment dans ce biberon entamé.",
    cta: "filDesMois",
  },
  {
    slug: "bebe-agite-ou-sommeil-perturbe-est-ce-vraiment-a-cause-du-reflux",
    title: "Reflux, pleurs, nuits agitées : et si ce n'était pas ce que vous croyez ?",
    hook: "Vous posez bébé après la tétée, il pleure aussitôt, le dos arqué. « C'est son reflux », vous dit-on. Les recommandations officielles racontent une histoire différente.",
    intro:
      "Vous connaissez ce moment : bébé vient de manger, vous le posez délicatement, et il se met à pleurer, à s'agiter, parfois à se cambrer. Le mot « reflux » arrive vite dans la conversation, souvent suivi d'inquiétude et, parfois, d'une prescription. Pourtant, la Haute Autorité de Santé est claire : dans la grande majorité des cas, ce reflux est banal, indolore, et il ne provoque ni les pleurs ni les nuits hachées qu'on lui attribue. Alors si ce n'est pas le ventre, qu'est-ce que c'est vraiment ? On démêle le vrai du faux, sans médicament inutile.",
    cta: "nuits",
    category: "sommeil-du-tout-petit",
  },
  {
    slug: "lactation-pourquoi-les-premieres-semaines-comptent-elles-autant",
    title: "Les 5 premiers jours qui décident (presque) de tout votre allaitement",
    hook: "Vous pensez que si votre allaitement s'arrête tôt, c'est un manque de volonté ou de soutien. La science montre que la fenêtre décisive se joue bien plus tôt — et qu'elle peut se préparer.",
    intro:
      "La majorité des mères souhaitent allaiter. Et pourtant, beaucoup arrêtent bien plus tôt qu'elles ne l'auraient voulu — souvent dans les deux à quatre premières semaines, sans l'avoir choisi. Ce n'est ni un manque de motivation, ni un manque de soutien de l'entourage : c'est que les tout premiers jours après la naissance sont un moment biologique charnière, un véritable « calibrage » de votre lactation pour les mois à venir. Un groupe international de chercheurs vient de le documenter précisément, avec des outils qui changent la façon dont on peut vous accompagner. Comprendre ce qui se joue dans ces cinq premiers jours, c'est se donner les moyens d'aborder l'allaitement avec moins de pression et plus de repères concrets.",
    cta: "premiersJours",
  },
];
