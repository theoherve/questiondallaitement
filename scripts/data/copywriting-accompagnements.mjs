/**
 * Refonte copywriting des 8 pages d'accompagnement.
 *
 *   subtitle : formations.short_description — sous-titre du hero + meta description
 *   lead     : accroche courte, ouvre le corps de page
 *   problems : « Ce que vous vivez peut-être en ce moment »
 *   why      : le paragraphe de bascule (pourquoi c'est légitime / pourquoi ça marche)
 *   bridge   : phrase de pont vers le bloc « Votre formatrice », qui est mutualisé
 *
 * lead + problems + why + bridge composent formations.long_description_html.
 */

export const ACCOMPAGNEMENTS = [
  {
    slug: "je-me-prepare-a-allaiter",
    subtitle:
      "Vous n'avez pas besoin de tout savoir sur l'allaitement avant d'accoucher. Vous avez besoin de savoir ce qui compte vraiment, pour ne pas vous laisser déstabiliser par le premier avis contraire venu.",
    lead: "Arrivez à la maternité avec des repères — pas avec des doutes.",
    problems: [
      "Vous êtes enceinte, vous voulez allaiter, mais une petite voix vous demande si votre corps « saura faire ».",
      "Vous avez déjà entendu dix conseils différents sur la mise au sein — et ils se contredisent tous.",
      "On vous a dit que la douleur les premiers jours était « normale ». Vous n'êtes pas sûre de vouloir vous y résigner.",
      "Vous avez peur de manquer de lait, sans savoir comment le vérifier vraiment.",
      "Un allaitement précédent s'est mal passé, et vous ne voulez pas revivre la même déception.",
      "Vous redoutez de ne pas reconnaître les signes que votre bébé a faim — ou au contraire qu'il est rassasié.",
      "Vous savez qu'à la maternité, le temps manquera pour vous accompagner en profondeur.",
    ],
    whyTitle: "Pourquoi se préparer maintenant change tout",
    why: "Ce n'est pas une question d'instinct maternel qu'on aurait ou pas. C'est une question de repères. Une mère qui sait à quoi ressemble une bonne mise au sein, qui connaît les rythmes réels d'un nouveau-né et qui a anticipé ses propres peurs ne panique pas devant une remarque déstabilisante — elle a déjà la réponse. C'est exactement ce que ce programme construit avec vous, avant le jour J.",
    bridge:
      "Se préparer à allaiter, ce n'est pas apprendre une technique par cœur : c'est comprendre ce qui va vraiment se jouer, pour aborder ces premiers jours avec confiance plutôt qu'avec appréhension.",
  },
  {
    slug: "mon-allaitement-des-premiers-jours",
    subtitle:
      "Les repères cliniques exacts pour distinguer ce qui est normal de ce qui doit être corrigé — au lieu de vous fier au hasard des avis reçus à la maternité.",
    lead: "Cessez de deviner. Commencez à savoir.",
    problems: [
      "Chaque tétée fait mal, et vous ne savez pas si c'est « normal les premiers jours » ou le signe d'une mauvaise prise.",
      "Vous ne savez pas si votre bébé mange vraiment assez : combien de couches, quelles selles, quelle courbe de poids surveiller.",
      "On vous a déjà proposé un complément de lait artificiel « pour être sûre », et vous culpabilisez encore.",
      "Votre bébé ne suit aucun horaire, tète sans arrêt ou au contraire trop peu, et vous ne savez pas si c'est inquiétant.",
      "Vous êtes épuisée, seule face à vos questions à 3h du matin, sans personne à qui les poser dans l'instant.",
      "La maternité, votre entourage et internet vous ont donné trois versions différentes de la même consigne.",
    ],
    whyTitle: "Pourquoi ce n'est pas de votre faute",
    why: "Personne ne vous a jamais montré, minute par minute, à quoi ressemblent les 72 premières heures d'un allaitement. Sans repères cliniques précis, la moindre variation devient une source d'angoisse. Ce programme vous donne exactement cela : ce qui est physiologiquement normal, ce qui ne l'est pas, et le geste à faire dans chaque cas — même si un complément a déjà été donné.",
    bridge:
      "Dans les premiers jours, ce qui manque le plus aux mères, ce n'est pas de la volonté — c'est un regard clinique posé sur leur situation précise.",
  },
  {
    slug: "mon-allaitement-au-fil-des-mois",
    subtitle:
      "Votre allaitement se complique après plusieurs mois ? Ce n'est ni un pic de croissance qui s'éternise, ni une fatalité — c'est un signal précis, avec une cause précise.",
    lead: "Ce que vous traversez maintenant n'a rien à voir avec les premiers jours. Vos réponses non plus ne devraient pas être les mêmes.",
    problems: [
      "Votre bébé, qui tétait bien, devient agité ou inconsolable au sein sans raison apparente.",
      "Il refuse soudainement le sein — une vraie grève de la tétée, pas un caprice.",
      "Vous avez l'impression que votre lait diminue, sans certitude ni moyen de le vérifier.",
      "Un réflexe d'éjection fort fait tousser, recracher ou pleurer votre bébé à chaque début de tétée.",
      "Des douleurs réapparaissent, alors que tout allait bien depuis des semaines.",
      "Le reflux, les nuits hachées et les doutes sur la prise de poids reviennent vous hanter.",
    ],
    whyTitle: "Pourquoi ce module vous parle, maintenant",
    why: "Allaiter un bébé de quelques semaines et allaiter un bébé de plusieurs mois, ce n'est pas la même chose. Ce module répond à ce que vous traversez aujourd'hui — pas à ce que vous avez déjà dépassé. Chaque réponse est concrète, bienveillante, et pensée pour une mère qui n'a pas des heures à passer à chercher.",
    bridge:
      "Ce qui revient le plus souvent dans mon cabinet après le premier mois, ce n'est pas un problème d'allaitement — c'est un problème d'information qui n'a pas suivi l'évolution de votre bébé.",
  },
  {
    slug: "je-reprends-une-activite-professionnelle",
    subtitle:
      "Concilier allaitement et reprise professionnelle avec une lactation solide, une organisation claire, et zéro culpabilité.",
    lead: "Votre carrière ne devrait pas vous coûter votre allaitement. Et inversement.",
    problems: [
      "Vous avez peur que votre lactation chute dès les premiers jours de reprise.",
      "Vous ne savez pas comment organiser le tire-lait au bureau : fréquence, matériel, conservation du lait.",
      "Votre bébé refuse le biberon quand ce n'est pas vous qui le donnez.",
      "La culpabilité de la séparation vous pèse déjà, avant même d'avoir repris.",
      "Vous redoutez le regard de vos collègues ou de votre hiérarchie sur vos pauses tire-lait.",
      "Vous ne savez pas comment gérer les imprévus : grève, maladie, lait oublié à la maison.",
    ],
    whyTitle: "Pourquoi une lactation solide n'est pas incompatible avec une vie professionnelle",
    why: "Continuer d'allaiter après la reprise n'est pas affaire de chance ou de sacrifice — c'est affaire d'organisation. Une fois les bons réflexes en place (rythme de tirage, conservation, gestion de l'entourage professionnel), la lactation tient, et vous retrouvez votre équilibre de femme qui travaille et qui allaite, sans avoir à choisir.",
    bridge:
      "Concilier allaitement et vie professionnelle est un vrai sujet d'ingénierie autant que d'émotion — je vous donne les deux.",
  },
  {
    slug: "la-diversification-de-mon-bebe-allaite",
    subtitle:
      "Le bon tempo, les bonnes quantités, sans carence, sans sevrage accidentel, et sans paniquer au moindre ralentissement de sa courbe de poids.",
    lead: "Diversifier ne veut pas dire sevrer. Encore faut-il savoir où est la limite.",
    problems: [
      "Vous ne savez pas quand commencer réellement : 4 mois, 6 mois, ou selon les signes de votre bébé ?",
      "Vous avez peur que la diversification fasse chuter votre lactation sans que vous le vouliez.",
      "Vous redoutez les carences si votre bébé « n'aime pas » certains aliments.",
      "Vous confondez parfois diversifier et sevrer — alors que vous ne voulez surtout pas arrêter d'allaiter.",
      "La moindre stagnation de la courbe de poids pendant cette période vous angoisse.",
      "Vous croulez sous des informations contradictoires : aliments à risque, quantités, textures, ordre d'introduction.",
    ],
    whyTitle: "Pourquoi cette étape mérite sa propre méthode",
    why: "Diversifier un bébé allaité n'est pas la même chose que diversifier un bébé nourri au biberon : les équilibres sont différents, les rythmes aussi. Sans méthode claire, on bascule vite d'un extrême à l'autre — trop vite, ou pas assez. Ce programme vous donne un cadre progressif, pensé pour préserver votre allaitement autant que nourrir votre bébé.",
    bridge:
      "La diversification est souvent le moment où les mères qui allaitent depuis longtemps recommencent à douter. Ce module est fait pour vous éviter ça.",
  },
  {
    slug: "je-souhaite-sevrer-mon-bebe",
    subtitle:
      "Un plan détaillé pour arrêter l'allaitement en douceur, à votre rythme et au sien — sans les méthodes brutales qu'on vous a peut-être suggérées.",
    lead: "Sevrer n'est pas un échec. Mal sevrer, en revanche, se paie parfois cher.",
    problems: [
      "Vous voulez arrêter une tétée rapidement, sans savoir que cela peut provoquer engorgement ou mastite.",
      "Vous culpabilisez à l'idée de sevrer, comme si vous « abandonniez » quelque chose d'important.",
      "Votre entourage vous pousse à sevrer plus tôt — ou plus tard — que vous ne le souhaitez vraiment.",
      "Vous ne savez pas distinguer un vrai sevrage d'une grève de la tétée passagère.",
      "Vous redoutez la réaction émotionnelle de votre bébé face à ce changement — et la vôtre.",
      "Vous ne savez pas comment gérer les à-coups : retour de couches, reprise du travail, maladie.",
    ],
    whyTitle: "Pourquoi la méthode compte autant que la décision",
    why: "Supprimer une tétée en trois jours n'est pas seulement inefficace : ça peut être dangereux pour votre santé (engorgement, mastite) et brutal pour votre bébé. Le sevrage n'est pas qu'une étape logistique — c'est un vécu émotionnel qui mérite d'être accompagné, quel que soit le rythme que vous choisissez.",
    bridge:
      "Il n'existe pas de « bon moment universel » pour arrêter d'allaiter. Il existe le vôtre, et une façon de l'aborder sans danger ni regret.",
  },
  {
    slug: "mon-bebe-ne-fait-pas-ses-nuits",
    subtitle:
      "Comprendre pourquoi votre enfant se réveille, et l'aider à s'endormir sereinement — sans méthode brutale, ni promesse magique.",
    lead: "Il n'existe pas de bébé qui « ne fait pas ses nuits ». Il existe un besoin non identifié — et une solution qui lui correspond.",
    problems: [
      "Vous enchaînez les réveils nocturnes depuis des semaines, parfois des mois.",
      "Vous ne savez plus si le problème vient de l'allaitement, de l'âge de votre enfant, ou d'autre chose.",
      "On vous a suggéré des méthodes de sommeil « dures » qui vous mettent profondément mal à l'aise.",
      "Vous et votre conjoint n'êtes pas d'accord sur la marche à suivre, et cela crée des tensions.",
      "Vous craignez qu'arrêter les tétées de nuit ne mette en péril votre lactation.",
      "Vous êtes épuisée, à bout, et cet épuisement déborde sur votre couple, votre travail, votre patience.",
    ],
    whyTitle: "Pourquoi comprendre change tout",
    why: "Le sommeil d'un enfant n'est pas une case à cocher, c'est un besoin physiologique qui évolue avec son âge. Avant de « faire dormir » votre enfant, il faut comprendre ce qui, précisément, l'empêche de dormir. C'est ce diagnostic qui manque le plus souvent — et c'est lui qui change tout, sans jamais recourir à des méthodes qui vous mettraient mal à l'aise.",
    bridge:
      "Sommeil et allaitement sont souvent liés, rarement expliqués ensemble. Mon approche : comprendre avant d'agir, jamais l'inverse.",
  },
  {
    slug: "les-urgences-allaitement",
    subtitle:
      "Crevasses, mastite, engorgement, canal bouché : les gestes précis pour soulager la douleur en quelques heures, avant que la situation ne s'aggrave.",
    lead: "Vous n'avez pas besoin d'un cours. Vous avez besoin d'un geste, maintenant.",
    problems: [
      "Vous avez mal, là, tout de suite, et vous ne savez pas si c'est grave.",
      "Une boule douloureuse s'est formée dans votre sein, sans savoir s'il s'agit d'un canal bouché ou d'une mastite qui démarre.",
      "Vous avez de la fièvre et vous ne savez pas si vous devez arrêter d'allaiter de ce côté.",
      "Vos crevasses ne cicatrisent pas malgré la crème que vous avez déjà essayée.",
      "Vous avez peur qu'un problème isolé ne mette fin à tout votre allaitement.",
      "Vous cherchez une réponse rapide et fiable — pas un article de forum de plus.",
    ],
    whyTitle: "Pourquoi agir vite (et bien) fait toute la différence",
    why: "La plupart des urgences de l'allaitement se résolvent en quelques heures quand le bon geste est fait au bon moment — et peuvent au contraire s'aggraver en quelques jours si l'on attend ou si l'on applique la mauvaise solution. Ce module va droit au but : identifier ce dont vous souffrez, et agir immédiatement.",
    bridge:
      "Ces complications sont fréquentes, rarement graves si elles sont prises à temps, et presque toujours résolubles sans arrêter l'allaitement.",
  },
];
