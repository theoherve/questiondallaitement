-- Migration 00078: quiz « Êtes-vous incollable sur l'allaitement ? »
--
-- Premier `surveys.kind = 'quiz'` : douze questions a choix unique, corrigees
-- et expliquees, suivies d'une question a cases a cocher qui sert de segment
-- pour l'emailing et de rampe vers les accompagnements.
--
-- Les fiches de formation posees par 00077 pointent vers /quiz/incollable-allaitement.

INSERT INTO surveys (slug, title, kind, status, intro, thank_you_message) VALUES (
  'incollable-allaitement',
  'Êtes-vous incollable sur l''allaitement ?',
  'quiz',
  'published',
  'Mettez vos connaissances en allaitement à l''épreuve. Douze questions pour évaluer votre compréhension de ce sujet essentiel pour vous comme pour votre bébé.',
  'Vous avez aimé ce quiz ? Ne manquez pas d''autres informations captivantes sur l''allaitement : abonnez-vous à ma newsletter.'
) ON CONFLICT (slug) DO NOTHING;

-- Les douze questions corrigees. `rows` porte l'unique ligne implicite d'une
-- question a choix unique, comme pose par 00062 : la forme des reponses reste
-- ainsi la meme que pour un sondage, et la vue d'agregat n'a pas de cas
-- particulier a traiter.
INSERT INTO survey_questions
  (survey_id, position, kind, label, rows, choices, correct_choice_key, explanation_html, is_required)
SELECT s.id, v.position, 'single', v.label,
       '[{"key": "_", "label": ""}]'::jsonb, v.choices::jsonb,
       v.correct_choice_key, v.explanation_html, true
FROM surveys s, (VALUES

(1,
 'Quelle affirmation concernant les bébés allaités par rapport aux bébés non allaités est vraie ?',
 $j$[
   {"key": "a", "label": "Les bébés allaités ont tendance à avoir un poids plus élevé à la naissance."},
   {"key": "b", "label": "Les bébés allaités ont un risque plus élevé de devenir dépendants de leur maman et de ne pas quitter le nid avant 25 ans."},
   {"key": "c", "label": "Les bébés allaités ont généralement une meilleure protection contre les maladies."}
 ]$j$,
 'c',
 $html$<p>Statistiquement, les bébés allaités ont une meilleure protection contre les maladies. Le lait maternel est riche en anticorps, cellules immunitaires et nutriments essentiels qui renforcent le système immunitaire du bébé, le protégeant contre les infections et les maladies. Les bébés allaités bénéficient de l'immunité passive transmise par le lait maternel, ce qui peut réduire le risque d'infections respiratoires, gastro-intestinales et d'autres maladies.</p>
<p>Pour aller plus loin : <a href="/livres">Choisir d'allaiter</a>, éditions First, chapitre 1, et le bonus du module <a href="/accompagnements/je-me-prepare-a-allaiter">Je me prépare à allaiter</a> : pourquoi est-ce important d'allaiter.</p>$html$),

(2,
 'Comment l''allaitement peut-il aider à réduire le risque de maladies pour le bébé ?',
 $j$[
   {"key": "a", "label": "En remplaçant complètement la vaccination."},
   {"key": "b", "label": "En transmettant des anticorps maternels qui renforcent le système immunitaire du bébé."},
   {"key": "c", "label": "En augmentant la sensibilité du bébé aux infections."}
 ]$j$,
 'b',
 $html$<p>Le lait maternel contient des anticorps et des cellules immunitaires qui aident à renforcer le système immunitaire du bébé, réduisant le risque de diverses maladies et infections, surtout au cours des premiers mois de vie.</p>
<p>Lancez-vous : les vidéos du module <a href="/accompagnements/je-me-prepare-a-allaiter">Je me prépare à allaiter</a>.</p>$html$),

(3,
 'Quelle est la durée moyenne d''une tétée normale chez un nourrisson ?',
 $j$[
   {"key": "a", "label": "Environ 5 à 10 minutes."},
   {"key": "b", "label": "Entre 12 et 67 minutes, une trentaine de minutes en moyenne."},
   {"key": "c", "label": "Environ 1 heure, voire plus."}
 ]$j$,
 'b',
 $html$<p>La durée de la tétée n'est cependant pas un indicateur d'efficacité. Il convient de se concentrer sur les déglutitions, qui doivent être nettement audibles après la montée laiteuse et présentes à raison d'une déglutition pour une succion, au moins les cinq premières minutes de la tétée.</p>
<p>Pour en savoir plus, assurez-vous que votre allaitement démarre bien en vous appuyant sur les vidéos du module <a href="/accompagnements/mon-allaitement-des-premiers-jours">Mon allaitement des premiers jours</a>.</p>$html$),

(4,
 'Quelle est la raison la plus évidente qui explique que votre bébé est agité depuis quelque temps, alors que l''allaitement roulait tout seul ?',
 $j$[
   {"key": "a", "label": "Votre lait n'est plus aussi nourrissant qu'avant parce que vous mangez mal."},
   {"key": "b", "label": "Votre bébé est bourré de gaz parce qu'il a un frein de langue trop court."},
   {"key": "c", "label": "Vous avez suivi les conseils de Mme Michu et vous ne lui donnez plus qu'un seul sein par tétée."}
 ]$j$,
 'c',
 $html$<p>De nombreuses mères parviennent à allaiter exclusivement et harmonieusement en ne donnant qu'un sein par tétée. Mais lorsque vous n'offrez qu'un sein, vous donnez l'ordre à votre corps de produire moins de lait : la lactation est en grande partie fondée sur le principe de l'offre et de la demande. Plus votre bébé tète, plus votre corps produit de lait.</p>
<p>En négligeant un sein à chaque tétée, vous risquez de réduire la demande, ce qui peut entraîner une production insuffisante. Et quand la lactation est insuffisante, le bébé se met à tirer sur le sein, il est agité, il raccourcit ses tétées, se montre insatisfait à la fin de son repas et peut donner l'impression d'avoir mal au ventre.</p>$html$),

(5,
 'Pourquoi pourriez-vous ressentir une douleur pendant la tétée ?',
 $j$[
   {"key": "a", "label": "Sans raison apparente, et c'est totalement normal : toutes les mères ressentent de la douleur."},
   {"key": "b", "label": "Il pourrait y avoir un problème de positionnement ou de prise du sein."},
   {"key": "c", "label": "La douleur pendant l'allaitement n'a pas de cause spécifique."}
 ]$j$,
 'b',
 $html$<p>La douleur extrême pendant l'allaitement n'est pas normale et ne doit pas être simplement acceptée. L'une des principales raisons est un mauvais positionnement ou une mauvaise prise du sein : lorsque le bébé n'est pas correctement positionné, il peut ne pas bien saisir le mamelon et l'aréole, ce qui cause des douleurs et parfois des crevasses.</p>
<p>Assurez-vous que le bébé prend une grande partie de l'aréole dans sa bouche, pas seulement le mamelon. Vous devriez aussi entendre des bruits de déglutition réguliers pendant la tétée. En cas de doute, demandez l'aide d'un professionnel, par exemple une consultante en lactation.</p>$html$),

(6,
 'Comment répondre lorsque votre bébé pleure régulièrement après avoir tété ?',
 $j$[
   {"key": "a", "label": "Limiter la tétée à un seul sein pour s'assurer que votre bébé obtient le lait gras de fin de tétée."},
   {"key": "b", "label": "Appeler Guimov à la rescousse, puisqu'ils recommandent leurs petits pots de purée de carotte à partir de 4 mois."},
   {"key": "c", "label": "Vous appuyer sur les conseils d'une IBCLC pour vérifier que votre allaitement se maintient comme il devrait."}
 ]$j$,
 'c',
 $html$<p>Les pleurs fréquents après la tétée peuvent évoquer un manque de lait, des problèmes de digestion, d'allergies ou de reflux. Faites-vous aider d'une IBCLC pour faire le tri dans tout ce qu'on vous dit. Et si aucune n'est disponible, allez voir tout ce que j'ai enregistré pour vous sur les pleurs, le reflux et les rythmes.</p>
<p>Introduire des aliments solides avant que votre bébé ne soit prêt, vers l'âge de 6 mois, ne va probablement pas résoudre les difficultés d'allaitement. Et entre nous, le lait gras de fin de tétée, on s'en fiche un peu.</p>
<p>Pour en savoir plus sur les Guimov de ce monde : <a href="/livres">Choisir d'allaiter</a>, éditions First, chapitre 4, le lobby de l'industrie agroalimentaire.</p>$html$),

(7,
 'Parmi les bêtises que peut avancer Mme Michu, laquelle est la plus dangereuse ?',
 $j$[
   {"key": "a", "label": "Veillez à bien espacer les tétées de 4 h pour vous reposer et ne pas donner de mauvaises habitudes à votre bébé."},
   {"key": "b", "label": "Buvez beaucoup de tisane et vous aurez ainsi beaucoup de lait."},
   {"key": "c", "label": "En cas de panne de lait, prenez de l'homéopathie et le tour est joué."}
 ]$j$,
 'a',
 $html$<p>Il est pour le moins choquant de constater que de telles croyances persistent aujourd'hui. La notion universelle en matière d'allaitement est d'offrir le sein à la demande du bébé au lieu d'imposer un rythme prédéfini, et cela n'a jamais été et ne sera jamais remis en question.</p>
<p>L'homéopathie n'a pas de base scientifique solide pour augmenter la production de lait maternel : comme cela ne servira à rien, cela ne fera pas de mal non plus, si ce n'est que votre problème de lactation restera entier. Boire beaucoup vous assure une hydratation optimale, mais les principes actifs contenus dans les tisanes d'allaitement du commerce n'apportent pas de bénéfice avéré.</p>
<p>Vous voulez savoir comment donner un coup de pouce à votre lactation ? Découvrez les stratégies qui aident le plus les mamans que je vois en consultation dans les modules <a href="/accompagnements/mon-allaitement-des-premiers-jours">Mon allaitement des premiers jours</a> et <a href="/accompagnements/mon-allaitement-au-fil-des-mois">Mon allaitement au fil des mois</a>.</p>$html$),

(8,
 'Comment l''allaitement peut-il vous aider à récupérer en post-partum ?',
 $j$[
   {"key": "a", "label": "En retardant le processus de récupération."},
   {"key": "b", "label": "En stimulant la contraction de l'utérus, l'aidant ainsi à retrouver sa taille normale."},
   {"key": "c", "label": "Il n'a pas d'effet sur la récupération post-partum."}
 ]$j$,
 'b',
 $html$<p>L'allaitement stimule la libération d'ocytocine, une hormone qui provoque des contractions utérines. Cela peut aider l'utérus à retrouver plus rapidement sa taille normale après l'accouchement.</p>
<p>À découvrir sans tarder : <a href="/accompagnements/mon-allaitement-au-fil-des-mois">Mon allaitement au fil des mois</a> et <a href="/livres">Choisir d'allaiter</a>, éditions First, chapitre 1.</p>$html$),

(9,
 'Pourquoi est-il important de trouver du soutien quand on allaite ?',
 $j$[
   {"key": "a", "label": "Parce que de toute façon vous ne pourrez pas avoir assez de lait si vous vous lancez toute seule."},
   {"key": "b", "label": "Parce que vous seriez trop naïve pour prendre les bonnes décisions pour vous-même."},
   {"key": "c", "label": "Parce que le soutien des pairs, des pères et des co-parents, il n'y a que ça de vrai."}
 ]$j$,
 'c',
 $html$<p>Le soutien de la famille, des amis et des professionnels de santé joue un rôle crucial dans la durée et la réussite de l'allaitement, en fournissant des informations, de l'encouragement et un environnement favorable.</p>
<p>Alors, quelle est votre team allaitement ? J'ai créé une communauté rien que pour vous : rejoignez-moi tous les mois dans un atelier convivial où règne une atmosphère chaleureuse et bienveillante.</p>$html$),

(10,
 'Pourquoi est-il judicieux de vous plonger dans des cours sur l''allaitement avant l''arrivée de votre petit trésor ?',
 $j$[
   {"key": "a", "label": "Pour pouvoir prédire la couleur exacte des couches en fonction du lait consommé."},
   {"key": "b", "label": "Pour être le mieux préparée possible à réussir l'allaitement et à surmonter d'éventuels obstacles."},
   {"key": "c", "label": "Pour maîtriser l'art de jouer à cache-cache avec les biberons."}
 ]$j$,
 'b',
 $html$<p>Les cours dispensés par les sages-femmes ou les gynécologues pour préparer à l'allaitement, pris en charge par l'assurance maladie, sont une ressource accessible à de nombreuses futures mamans, et on s'en réjouit. Leur contenu est cependant parfois incomplet. Il est donc légitime de se demander si l'on en ressort avec suffisamment de repères sur un allaitement optimal.</p>
<p>La question de la couleur des couches peut sembler amusante, mais la couleur des selles, elle, ne l'est pas tant que ça. Partagez vos préoccupations avec moi : on en parle quand vous voulez lors d'un atelier.</p>$html$),

(11,
 'Un bébé qui tète est-il aussi efficace qu''un tire-lait ?',
 $j$[
   {"key": "a", "label": "Non : à long terme, tirer son lait pourrait entraîner une baisse de production."},
   {"key": "b", "label": "Oui, assurément : le bébé draine aussi bien les seins que le tire-lait."},
   {"key": "c", "label": "Tout dépend de la situation."}
 ]$j$,
 'c',
 $html$<p>Si votre bébé ne peut pas s'alimenter directement au sein, parce qu'il est prématuré par exemple, ou qu'il présente des besoins spéciaux, ou si vous devez être séparés pour une raison quelconque, commencez à exprimer votre lait avec un tire-lait double dès que possible après la naissance.</p>
<p>Des recherches indiquent qu'en commençant à exprimer leur lait au cours des premières heures de vie de leur bébé, comme le ferait un nouveau-né en bonne santé allaité pour la première fois, les mères produisent davantage de lait au cours des premiers jours et des premières semaines. Leurs bébés ont ainsi plus de chances d'être nourris exclusivement au lait maternel.</p>$html$),

(12,
 'Est-il vrai que la production de lait se fait après une nuit de sommeil ?',
 $j$[
   {"key": "a", "label": "Oui, parce que le taux de prolactine est supérieur entre 1 h et 6 h du matin."},
   {"key": "b", "label": "Oui, parce que les bébés ont tendance à mieux téter la nuit."},
   {"key": "c", "label": "Non, parce que la sécrétion de prolactine varie tout au long de la journée et de la nuit, même en dehors de la période de lactation."}
 ]$j$,
 'c',
 $html$<p>La prolactine est l'hormone responsable de la production de lait. Bien que l'on entende souvent dire que les tétées de nuit favorisent une production optimale en raison d'une sécrétion accrue de prolactine, cette affirmation est erronée : la sécrétion de prolactine connaît des pics tout au long de la journée et de la nuit, même en dehors de la période de lactation.</p>
<p>Vous avez peur de manquer de lait ? Je détaille comment vous aider à chaque étape dans <a href="/accompagnements/mon-allaitement-au-fil-des-mois">Mon allaitement au fil des mois</a>.</p>$html$)

) AS v(position, label, choices, correct_choice_key, explanation_html)
WHERE s.slug = 'incollable-allaitement'
  -- Idempotence : une reprise de la migration ne doit pas doubler le questionnaire.
  AND NOT EXISTS (SELECT 1 FROM survey_questions q WHERE q.survey_id = s.id);

-- Question de segmentation : cases a cocher, une ligne par sujet. Chaque ligne
-- porte le lien de l'accompagnement correspondant, propose ensuite sur l'ecran
-- de resultat — c'est la que le quiz devient utile a la personne qui vient de
-- le passer.
INSERT INTO survey_questions
  (survey_id, position, kind, label, rows, choices, is_required, is_segment)
SELECT s.id, 13, 'multi',
  'Quels sujets souhaitez-vous approfondir ?',
  $j$[
    {"key": "pleurs", "label": "Les pleurs", "href": "/accompagnements/mon-allaitement-des-premiers-jours"},
    {"key": "bases", "label": "Les bases de l'allaitement", "href": "/accompagnements/je-me-prepare-a-allaiter"},
    {"key": "confusion", "label": "La confusion sein-tétine", "href": "/accompagnements/mon-allaitement-des-premiers-jours"},
    {"key": "qualite-lait", "label": "La qualité du lait qui évolue avec le temps", "href": "/accompagnements/mon-allaitement-au-fil-des-mois"},
    {"key": "nuits", "label": "L'âge auquel le bébé fait naturellement ses nuits", "href": "/accompagnements/mon-bebe-ne-fait-pas-ses-nuits"}
  ]$j$::jsonb,
  '[{"key": "oui", "label": "Oui"}]'::jsonb,
  false, true
FROM surveys s
WHERE s.slug = 'incollable-allaitement'
  AND NOT EXISTS (
    SELECT 1 FROM survey_questions q WHERE q.survey_id = s.id AND q.position = 13
  );
