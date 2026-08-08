-- Migration 00077: contenu editorial des formations, renommages, reprise des sessions
--
-- Trois choses, dans cet ordre obligatoire :
--   1. les fiches partagees, avec leur contenu ;
--   2. le rattachement de chaque session a sa fiche, PAR SLUG — le titre est
--      justement ce que l'on renomme, s'y appuyer serait circulaire ;
--   3. les corrections de donnees (formatrice, modalite, horaires, publication).
--
-- Les rattachements portent sur toutes les sessions, passees comprises : une
-- fiche de 2024 doit lire aussi bien qu'une fiche de 2027.
--
-- Le HTML est en quotes-dollar (`$html$`) : le contenu est plein
-- d'apostrophes, les doubler les rendrait illisibles a la relecture.

-- ════════════════════════════════════════════════════════════════
-- 1. Les fiches
-- ════════════════════════════════════════════════════════════════

INSERT INTO formation_templates (slug, title, category, external_url, badge, summary_html, objectives_html, program_html, audience_html) VALUES

-- ─── Allaitement maternel - Les indispensables (EDBN) ───────────
(
  'allaitement-maternel-les-indispensables',
  'Allaitement maternel - Les indispensables',
  'formation',
  'https://lecoledubiennaitre.com/formations/allaitement-maternel-les-indispensables',
  NULL,
  $html$<p>La formation pose les bases essentielles pour accompagner les débuts de l'allaitement avec justesse et assurance. Vous y apprendrez à reconnaître une tétée efficace, soutenir les mères face aux premiers doutes, prévenir les difficultés courantes et renforcer la confiance dans la poursuite de l'allaitement.</p>
<p>À travers une approche claire et structurée, cette formation donne aux professionnels les repères physiologiques et relationnels nécessaires pour répondre aux besoins concrets des familles.</p>
<p>Curieuse de savoir où vous en êtes avant de commencer ? Testez vos connaissances avec le quiz <a href="/quiz/incollable-allaitement">Êtes-vous incollable sur l'allaitement ?</a></p>$html$,
  $html$<ul>
<li>Développer les compétences nécessaires pour soutenir les mères dans la prise de décisions éclairées, au moment du démarrage et dans la poursuite de l'allaitement, en utilisant un langage verbal et non verbal encourageant et bienveillant.</li>
<li>Comprendre la place de l'allaitement maternel dans la société et au sein de notre culture.</li>
<li>Comprendre le processus de synthèse du lait maternel à partir des principaux éléments de l'anatomie et de la physiologie du sein lactant.</li>
<li>Identifier les situations à risque d'hypolactation.</li>
<li>Étudier les risques liés à une chirurgie mammaire sur la lactation.</li>
<li>Savoir reconnaître le déroulement optimal d'une tétée et les critères d'efficacité de transfert de lait.</li>
<li>Étudier la biochimie du lait maternel et les bénéfices qui en découlent.</li>
<li>Accompagner la mère pour optimiser la position du nouveau-né lors de la tétée.</li>
<li>Développer ses connaissances sur les rythmes, besoins, comportements et compétences de l'enfant allaité.</li>
<li>Connaître les attendus de la prise de poids chez l'enfant nourri au lait maternel.</li>
<li>Lister les modalités pour supplémenter l'enfant allaité lorsque la situation le requiert.</li>
<li>Aborder les incidents de parcours les plus communs au retour à domicile.</li>
</ul>$html$,
  $html$<ol>
<li><strong>Jour 1, matin.</strong> L'allaitement dans son contexte sociétal. Installer un vocabulaire précis. Le marketing des substituts du lait maternel. Communication et bienveillance dans l'accompagnement. Physiologie de la lactation. Le précieux colostrum. Biochimie du lait maternel. Risques liés à l'utilisation des préparations commerciales pour nourrissons. Allaitement et préparations commerciales : des coûts incomparables.</li>
<li><strong>Jour 1, après-midi.</strong> Taille des seins et risques d'hypolactation. La chirurgie mammaire. Facteurs de risque d'hypolactation primaire. Protéger la nutrition du nouveau-né. Maladresses et bonnes pratiques. Les positions d'allaitement. Le peau à peau et sa pratique. Déroulement d'une tétée et critères d'efficacité. Évolution de la production lactée.</li>
<li><strong>Jour 2, matin.</strong> Indices d'une lactation suffisante. Rythmes et comportements du nourrisson allaité. Prise de poids du nourrisson allaité. Le nourrisson sage et néanmoins fragile. Le nouveau-né hypotrophe. Le nourrisson qui pleure beaucoup. Symptômes du reflux gastro-œsophagien. Surstimuler la lactation au tire-lait.</li>
<li><strong>Jour 2, après-midi.</strong> La peur que ça s'arrête. La maman multipare. Incidents de parcours : mamelons douloureux. Recours aux écrans en silicone. L'engorgement : prévention et complications. Hygiène de vie, rapport au corps. Organiser un atelier d'allaitement.</li>
</ol>$html$,
  $html$<p>Professionnels de santé, de la périnatalité ou de la Petite Enfance habilités par un diplôme d'État ou reconnu par l'État.</p>$html$
),

-- ─── Allaitement maternel - Perfectionnement (EDBN) ─────────────
(
  'allaitement-maternel-perfectionnement',
  'Allaitement maternel - Perfectionnement',
  'formation',
  'https://lecoledubiennaitre.com/formations/allaitement-perfectionnement',
  NULL,
  $html$<p>Vous disposez de bases en allaitement et un certain nombre de défis peuvent se présenter au fil des jours, puis des mois. Chaque nouvel épisode peut contrarier le projet initial d'une mère et l'amener à sevrer plus tôt que prévu. Puis, une fois que son allaitement se poursuit comme elle le souhaite, elle peut également éprouver des difficultés à sevrer.</p>
<p>Ce panorama précis vous aidera à répondre à ces questions clés qui feront de vous un référent de premier ordre, capable d'apporter aux mères le soutien qu'elles méritent.</p>
<p>Envie de mesurer vos acquis avant de vous lancer ? Le quiz <a href="/quiz/incollable-allaitement">Êtes-vous incollable sur l'allaitement ?</a> vous donne le ton.</p>$html$,
  $html$<p>À l'issue de la formation vous serez en mesure :</p>
<ul>
<li>D'apporter des informations fiables aux mères allaitantes ou souhaitant allaiter.</li>
<li>De détecter un allaitement dysfonctionnel.</li>
<li>De connaître les mesures de conservation de l'allaitement maternel dans l'attente d'un rendez-vous spécialisé.</li>
<li>De savoir référer les parents à des spécialistes adaptés à la situation : consultant en lactation, pédiatre, sage-femme.</li>
<li>De savoir s'entourer d'un réseau local de soutien de l'allaitement, professionnels comme associations.</li>
</ul>$html$,
  NULL,
  $html$<p>Professionnels de santé, de la périnatalité ou de la Petite Enfance habilités par un diplôme d'État ou reconnu par l'État.</p>$html$
),

-- ─── Animer un atelier d'allaitement (EDBN) ─────────────────────
(
  'animer-un-atelier-dallaitement',
  'Animer un atelier d''allaitement',
  'formation',
  'https://lecoledubiennaitre.com/formations/atelier-allaitement',
  NULL,
  $html$<p>Animer un groupe de parents ne s'improvise pas. Cette formation vous donne le cadre, les outils d'animation et les thématiques prêtes à l'emploi pour créer des ateliers d'allaitement qui font venir les familles, puis revenir.</p>
<p>Vingt-cinq thématiques déjà construites, des vignettes cliniques, un modèle économique : vous repartez avec de quoi programmer votre premier cycle.</p>
<p>Pour vous mettre en jambes, testez le quiz <a href="/quiz/incollable-allaitement">Êtes-vous incollable sur l'allaitement ?</a></p>$html$,
  $html$<ul>
<li>Déterminer le cadre, le format et la tarification d'un cycle d'ateliers.</li>
<li>Mobiliser des compétences d'animation et de communication auprès d'un groupe de parents.</li>
<li>Construire une progression de thématiques adaptée aux âges et aux situations rencontrées.</li>
<li>Faire preuve de déontologie dans le soutien apporté aux mères.</li>
<li>Organiser la promotion des ateliers et le suivi proposé aux familles ensuite.</li>
</ul>$html$,
  $html$<ol>
<li><strong>Poser le cadre.</strong> La raison d'être des ateliers de soutien. Préparation logistique et promotion. Planifier et déterminer le cadre des ateliers. Organisation logistique et stratégies de promotion.</li>
<li><strong>Animer.</strong> Compétences d'animation et de communication. L'écoute active et l'empathie dans le soutien aux mères. Faire preuve de déontologie. Modèles d'animation et supports visuels.</li>
<li><strong>Financer.</strong> Tarification et modèles de financement des ateliers.</li>
<li><strong>Vingt-cinq thématiques prêtes à l'emploi.</strong> Réfléchir à une thématique et à un ton. Période prénatale. Les 3 à 14 jours après la naissance. Les 1 à 3 mois du bébé. Gestion des douleurs lors de l'allaitement. Conciliation de l'allaitement et du travail. Le sevrage. Allaitement et médicaments.</li>
<li><strong>Après l'atelier.</strong> Vignettes cliniques prétextes à l'introduction de notions clés. Les binômes possibles. Le post-atelier. Ressources et soutien à offrir après les ateliers.</li>
</ol>$html$,
  $html$<p>Professionnels de santé, de la périnatalité ou de la Petite Enfance habilités par un diplôme d'État ou reconnu par l'État.</p>$html$
),

-- ─── Le sommeil du nourrisson et du jeune enfant (formation propre) ───
(
  'le-sommeil-du-nourrisson-et-du-jeune-enfant',
  'Le sommeil du nourrisson et du jeune enfant',
  'formation',
  NULL,
  NULL,
  $html$<p>Le sommeil est indiscutablement un défi majeur de la parentalité. Tout faire pour que le bébé ou le jeune enfant fasse ses nuits au plus tôt est considéré comme une réussite parentale. Cette formation vous permet de soutenir les familles dans la façon d'appréhender le sommeil.</p>
<p>Chacune de mes formations est illustrée par de très nombreux cas cliniques concrets.</p>
<p>Vous vous demandez ce que vivent vraiment les familles que vous accompagnez ? Le parcours <a href="/accompagnements/mon-bebe-ne-fait-pas-ses-nuits">Mon bébé ne fait pas ses nuits</a> vous en donne un aperçu.</p>$html$,
  $html$<ul>
<li>Comprendre pourquoi un nourrisson se réveille entre 1 h et 3 h du matin.</li>
<li>Savoir comment endormir un bébé.</li>
<li>Vous situer par rapport aux horaires de sieste moyens et aux heures de sommeil recommandées âge par âge.</li>
<li>Savoir ce que l'on peut attendre d'un nourrisson et d'un jeune enfant par tranche d'âge en matière de sommeil.</li>
<li>Comprendre ce que signifient les régressions et comment y faire face.</li>
<li>Organiser un sommeil sécuritaire et éviter les accidents.</li>
<li>Expliquer pourquoi il est faux d'affirmer que l'alimentation artificielle préserve de la dépression du post-partum ou favorise un sommeil plus long.</li>
<li>Identifier les paramètres qui influent sur le sommeil : l'âge du bébé ou son poids ne sont pas les seuls.</li>
<li>Protéger le sommeil et le bien-être de la famille.</li>
<li>Savoir ce qui permet à une mère allaitante de maintenir un bon niveau d'énergie.</li>
<li>Vous appuyer sur la biologie du sommeil pour confronter des idées reçues courantes.</li>
<li>Expliquer pourquoi laisser pleurer un nourrisson est néfaste pour sa croissance physique et émotionnelle.</li>
<li>Comprendre ce que faire ses nuits implique réellement.</li>
<li>Connaître les techniques couramment exploitées pour amener un bébé à faire ses nuits.</li>
<li>Mener une anamnèse de consultation du sommeil.</li>
</ul>$html$,
  NULL,
  $html$<ul>
<li>Bénévole d'associations de soutien aux mères</li>
<li>Accompagnante à la naissance, doula</li>
<li>Accompagnante en périnatalité</li>
<li>Mère en quête de sens professionnel</li>
<li>Société spécialisée dans la location de tire-lait et la vente de matériel de puériculture</li>
<li>Pédiatre, médecin de l'enfant</li>
<li>Sage-femme</li>
<li>Infirmière puéricultrice, auxiliaire de puériculture</li>
<li>Orthophoniste</li>
<li>Éducatrice de jeunes enfants</li>
<li>Pharmacien</li>
<li>Psychologue, psychomotricienne</li>
<li>Kinésithérapeute, ostéopathe, chiropracteur</li>
</ul>$html$
),

-- ─── Accompagner l'allaitement à la reprise du travail ──────────
(
  'accompagner-lallaitement-a-la-reprise-du-travail',
  'Accompagner l''allaitement à la reprise du travail',
  'formation',
  NULL,
  NULL,
  $html$<p>Même dans des circonstances peu favorables, l'allaitement est compatible avec la reprise du travail. L'anticipation et la planification sont les meilleures alliées de la mère et des professionnels qui l'accompagnent.</p>
<p>Chaque situation professionnelle est unique : écouter, évaluer, adapter sans jugement. Vous apprendrez à informer la mère sur ses droits et à dédramatiser les difficultés.</p>
<p>Les équipes de crèche, les assistantes maternelles, les facilitatrices en allaitement, la PMI, les sages-femmes et les pédiatres forment une chaîne de soutien : la coordination est la clé.</p>
<p>Pour situer vos connaissances avant la formation, essayez le quiz <a href="/quiz/incollable-allaitement">Êtes-vous incollable sur l'allaitement ?</a></p>$html$,
  $html$<ul>
<li>Comprendre ce qui peut influencer la décision d'allaiter.</li>
<li>Reconnaître les pièges de la communication.</li>
<li>S'approprier des principes concrets de communication favorables à l'allaitement.</li>
<li>Être capable d'analyser et de critiquer ses propres messages auprès des mères et des familles.</li>
<li>Mettre en place des comportements de communication dans la structure hospitalière.</li>
</ul>$html$,
  $html$<ol>
<li>Allaitement maternel et travail : état des lieux et recommandations.</li>
<li>Les défis du nourrisson à l'entrée en mode de garde.</li>
<li>Le refus du biberon.</li>
<li>Allaitement, sommeil et inversion jour-nuit.</li>
<li>Séparation mère-bébé : aspects émotionnels, portage.</li>
<li>Check-list du sac de tirage et conservation du lait.</li>
<li>Organisation à la maison et au travail, de J-30 à J+1.</li>
<li>Scénarios par métier.</li>
<li>Droits des mères allaitantes au travail.</li>
</ol>$html$,
  $html$<ul>
<li>Bénévole d'associations de soutien aux mères</li>
<li>Accompagnante à la naissance, doula</li>
<li>Accompagnante en périnatalité</li>
<li>Société spécialisée dans la location de tire-lait et la vente de matériel de puériculture</li>
<li>Pédiatre, médecin de l'enfant</li>
<li>Sage-femme</li>
<li>Infirmière puéricultrice, auxiliaire de puériculture</li>
<li>Orthophoniste</li>
<li>Éducatrice de jeunes enfants</li>
<li>Pharmacien</li>
<li>Psychologue, psychomotricienne</li>
<li>Kinésithérapeute, ostéopathe, chiropracteur</li>
</ul>$html$
),

-- ─── Accompagner les troubles alimentaires du nourrisson ────────
(
  'accompagner-les-troubles-alimentaires-du-nourrisson',
  'Accompagner les troubles alimentaires du nourrisson',
  'formation',
  NULL,
  NULL,
  $html$<p>Comprendre l'aversion alimentaire d'origine sensorielle et ses conséquences sur l'alimentation des nourrissons.</p>
<p>La formation présente la méthode développée par Catherine Senez et décrit en détail les massages de désensibilisation orale.</p>
<p>Une question vous trotte déjà dans la tête ? Le quiz <a href="/quiz/incollable-allaitement">Êtes-vous incollable sur l'allaitement ?</a> est un bon échauffement.</p>$html$,
  $html$<ul>
<li>Comprendre comment l'allaitement peut aider à prévenir une aversion alimentaire d'origine sensorielle.</li>
<li>Analyser des cas cliniques et un mémoire de fin d'études illustrant les améliorations obtenues chez des bébés souffrant de troubles de l'alimentation, notamment de difficultés de succion.</li>
<li>Définir le rôle de chaque professionnel et accompagner les familles dans la facilitation de l'allaitement.</li>
</ul>$html$,
  $html$<ol>
<li>Comprendre les conduites à tenir pour soutenir une mère allaitante en préservant sa santé et celle de son enfant.</li>
<li>Réfléchir à des stratégies de supplémentation qui contribuent au renforcement de l'allaitement.</li>
<li>Voir comment aider une famille quand le nourrisson refuse de manger ou de boire au biberon.</li>
<li>Renforcer la confiance des professionnels dans leur capacité à offrir un accompagnement aidant et soutenant.</li>
<li>Étudier des situations cliniques réelles afin de mettre en pratique les connaissances théoriques acquises.</li>
</ol>$html$,
  $html$<p>Professionnels de santé, de la périnatalité ou de la Petite Enfance, consultantes en lactation IBCLC.</p>$html$
),

-- ─── Rencontre en aparté (Grandir Nature) ───────────────────────
(
  'rencontre-en-aparte',
  'Rencontre en aparté',
  'webinaire',
  'https://www.grandir-nature.pro/',
  NULL,
  $html$<p>Un temps d'échange sur invitation privée, proposé avec Grandir Nature.</p>$html$,
  NULL,
  NULL,
  $html$<p>Professionnels de santé, de la périnatalité ou de la Petite Enfance habilités par un diplôme d'État ou reconnu par l'État, et consultantes en lactation IBCLC.</p>$html$
),

-- ─── Le tire-allaitement (EDBN) ─────────────────────────────────
(
  'le-tire-allaitement',
  'Le tire-allaitement',
  'formation',
  'https://lecoledubiennaitre.com/formations/le-tire-allaitement',
  NULL,
  $html$<p>Le tire-allaitement est un choix légitime pour les mères dont le bébé est né prématurément, qui ont souffert de douleurs, qui veulent partager l'alimentation ou qui reprennent le travail, sans oublier celles ayant vécu des violences. Pourtant, il est souvent écourté faute d'informations adaptées.</p>
<p>Pour le rendre durable, les mères ont besoin de conseils ciblés et précis. Apprenez les bonnes pratiques pour qu'il s'installe et se poursuive aussi longtemps que la maman le désire.</p>
<p>Avant de commencer, voyez ce que vous savez déjà avec le quiz <a href="/quiz/incollable-allaitement">Êtes-vous incollable sur l'allaitement ?</a></p>$html$,
  $html$<ul>
<li>Accompagner les mères en tire-allaitement en tenant compte de leur situation : prématurité, douleurs, reprise du travail, choix personnel.</li>
<li>Comprendre que pour certaines mères, le tire-allaitement est la meilleure alternative pour nourrir leur bébé.</li>
<li>Optimiser la production lactée en adaptant la fréquence et l'efficacité des tirages selon les besoins individuels.</li>
<li>Conseiller sur le choix du matériel : tire-lait, téterelles adaptées, accessoires facilitant le confort et l'efficacité.</li>
<li>Prévenir l'épuisement maternel en proposant des stratégies d'organisation réalistes et adaptées.</li>
<li>Identifier et surmonter les difficultés courantes pour favoriser un tire-allaitement durable et serein.</li>
</ul>$html$,
  NULL,
  $html$<p>Professionnels de santé, de la périnatalité ou de la Petite Enfance, consultantes en lactation IBCLC, non-professionnels de santé.</p>$html$
),

-- ─── Réagir quand l'allaitement dysfonctionne (EDBN) ────────────
(
  'reagir-quand-lallaitement-dysfonctionne-cas-cliniques',
  'Réagir quand l''allaitement dysfonctionne - cas cliniques',
  'formation',
  'https://lecoledubiennaitre.com/formations/cas-cliniques-allaitement',
  NULL,
  $html$<p>Vous accompagnez des familles et jouez un rôle essentiel dans les décisions d'alimentation infantile. Si l'allaitement commence souvent à la naissance, les taux chutent rapidement dans les premières semaines.</p>
<p>Cette formation vous permettra de soutenir efficacement les familles en appliquant les bonnes pratiques pour protéger l'allaitement et la santé nutritionnelle du nourrisson. Découvrez des cas cliniques concrets et développez des compétences pratiques pour faire face aux défis quotidiens.</p>
<p>Un cas clinique vous résiste déjà ? Commencez par le quiz <a href="/quiz/incollable-allaitement">Êtes-vous incollable sur l'allaitement ?</a></p>$html$,
  $html$<ul>
<li>Comprendre les bases de l'allaitement normal pendant la période postnatale précoce et au fil des semaines et des mois.</li>
<li>Évaluer une situation à risque et proposer des solutions adaptées aux difficultés courantes de l'allaitement, en tenant compte des spécificités familiales.</li>
<li>Gérer les problèmes d'allaitement en première intention, en appliquant des stratégies de soutien immédiates et efficaces.</li>
<li>Protéger la santé du nourrisson en guidant les parents vers des choix d'alimentation éclairés et en appliquant des pratiques de soins de qualité.</li>
<li>Développer des stratégies de soutien individualisées, adaptées aux besoins émotionnels et pratiques des familles.</li>
<li>Acquérir les connaissances cliniques nécessaires pour gérer, en ville comme à l'hôpital, une grande variété de problèmes d'allaitement, dans un format entièrement fondé sur des cas cliniques.</li>
</ul>$html$,
  NULL,
  $html$<p>Professionnels de santé, de la périnatalité ou de la Petite Enfance, consultantes en lactation IBCLC.</p>$html$
),

-- ─── Le rôle de l'ostéopathe (CFPCO) ────────────────────────────
(
  'allaitement-maternel-premier-mois-osteopathe',
  'Allaitement maternel : l''essentiel du premier mois et le rôle de l''ostéopathe',
  'formation',
  NULL,
  NULL,
  $html$<p>« On m'a dit qu'allaiter, ça faisait forcément mal. » « Si j'ai une petite poitrine, j'aurai plus de mal à allaiter mon bébé. » « Je dormirai mieux si je n'allaite pas. » « Mon lait n'est pas assez riche. » « Il faut espacer les tétées pour laisser le temps aux seins de se remplir. » « Je croyais qu'on ne pouvait pas allaiter les bébés prématurés et les jumeaux. » « Une fois que la production de lait diminue, c'est foutu. »</p>
<p>Carole Hervé, consultante en lactation IBCLC, et Agathe Wagner, ostéopathe spécialisée en périnatalité, vous apportent les réponses à toutes ces questions et à bien d'autres. Elles vous donnent les clés pour démystifier les idées reçues, faire le tri dans les injonctions que les mères rencontrent, et explorer la corrélation entre certaines douleurs maternelles et les défis liés à l'allaitement ou à la production de lait.</p>
<p>Curieux de savoir combien de ces phrases vous sauriez déjà démonter ? Le quiz <a href="/quiz/incollable-allaitement">Êtes-vous incollable sur l'allaitement ?</a> vous le dira en dix minutes.</p>$html$,
  $html$<ul>
<li>Comprendre les fondements physiologiques, biochimiques et sociétaux de l'allaitement.</li>
<li>Acquérir une posture d'accompagnement bienveillante, éthique et exempte de jugement.</li>
<li>Identifier rapidement les situations à risque, les difficultés courantes et y apporter des solutions concrètes.</li>
<li>Savoir guider, rassurer et autonomiser les jeunes parents dans leur projet.</li>
</ul>$html$,
  $html$<ol>
<li><strong>Regard croisé et éthique de l'allaitement.</strong> La place de l'allaitement dans notre société et décryptage des influences sociétales. Poser les bases d'un vocabulaire professionnel, précis et inclusif. Influence industrielle et cadre réglementaire, avec le Code international de commercialisation. Posture d'accompagnement : allier écoute active, communication non violente et soutien inconditionnel.</li>
<li><strong>Mécanismes biologiques et anatomie.</strong> La machinerie lactée, de la mammogenèse à l'éjection du lait. L'or blanc : composition, rôles immunologiques et métaboliques majeurs. Aperçu biochimique de sa complexité et de son évolution qualitative. Analyse objective des risques sanitaires liés aux préparations commerciales pour nourrissons et comparatif économique.</li>
<li><strong>Anatomie fonctionnelle et mise en route.</strong> Volume et taille des seins, antécédents de chirurgie mammaire, évaluation personnalisée des risques d'hypolactation. Identifier les facteurs de risque d'une production insuffisante en amont. Protéger l'apport calorique dès les premières heures de vie. Erreurs fréquentes et bonnes pratiques, installation et postures d'allaitement adaptées à chaque dyade. Bienfaits neuro-endocriniens et mise en œuvre optimale du peau à peau. S'assurer de l'efficacité de la prise de sein et observer l'évolution naturelle de la sécrétion lactée.</li>
<li><strong>Évaluation clinique et comportements du bébé.</strong> Les indicateurs fiables d'une lactation bien établie. Éthologie du nourrisson : comprendre les rythmes, les phases d'éveil et les signaux d'alerte du bébé allaité. Analyser la prise de poids selon les référentiels actualisés. Le profil du bébé sage mais vulnérable, le nouveau-né hypotrophe, et décoder les pleurs excessifs. Reconnaître les signes du reflux gastro-œsophagien chez le bébé allaité. Protocoles de surstimulation de la lactation.</li>
<li><strong>Accompagnement des fragilités et transmission.</strong> Accueillir l'angoisse de l'arrêt prématuré et accompagner la spécificité du vécu de la multipare. Gestion des incidents de parcours : prévention et prise en charge des mamelons douloureux ou lésés, usage raisonné et limites des dispositifs comme les écrans en silicone, prévention, stades et complications de l'engorgement mammaire. Réappropriation du corps après l'accouchement et santé globale de la mère.</li>
</ol>$html$,
  $html$<p>Ostéopathes, chiropracteurs, kinésithérapeutes, et tous professionnels de la périnatalité.</p>$html$
),

-- ─── Le sevrage (EDBN) ──────────────────────────────────────────
(
  'le-sevrage',
  'Le sevrage',
  'formation',
  NULL,
  NULL,
  $html$<p>La formation vous permet d'acquérir les connaissances essentielles pour guider les familles dans cette transition souvent chargée d'émotions.</p>
<p>Vous y apprendrez à reconnaître les différentes formes de sevrage, progressif, brutal, choisi ou contraint, à comprendre ses enjeux hormonaux, nutritionnels et psychologiques, et à adapter vos conseils selon l'âge de l'enfant. Une formation indispensable pour soutenir les mères avec bienveillance, en prévenant complications et culpabilité.</p>
<p>Vous pensez déjà tout savoir sur la fin de l'allaitement ? Vérifiez-le avec le quiz <a href="/quiz/incollable-allaitement">Êtes-vous incollable sur l'allaitement ?</a></p>$html$,
  NULL,
  NULL,
  $html$<p>Professionnels de santé, de la périnatalité ou de la Petite Enfance habilités par un diplôme d'État ou reconnu par l'État.</p>$html$
),

-- ─── Accompagner l'allaitement en orthophonie (Dyskate) ─────────
(
  'accompagner-lallaitement-en-orthophonie',
  'Accompagner l''allaitement en orthophonie',
  'formation',
  'https://www.dyskateformation.fr/formation/accompagner-lallaitement-en-orthophonie-decouvrir-les-meilleures-pratiques/',
  NULL,
  $html$<p>L'allaitement maternel joue un rôle crucial dans le développement global de l'enfant, notamment au niveau de la sphère oro-faciale et de l'oralité.</p>
<p>Cette formation vise à démystifier les idées reçues et les informations contradictoires souvent véhiculées sur l'allaitement maternel. Vous apprendrez à faire le tri dans ces multiples informations et à prévenir les mères des injonctions parfois confuses qu'elles rencontrent régulièrement.</p>
<p>Vous serez en mesure de répondre aux questions des mères sur l'initiation et le maintien de la lactation, d'expliquer les mécanismes de régulation de la lactation et leur lien avec la conduite pratique de l'allaitement, et d'explorer les techniques de positionnement et de prise au sein. Vous explorerez également la corrélation entre certaines douleurs maternelles et les défis liés à l'allaitement ou à la production de lait.</p>
<p>Pour situer votre niveau avant d'entrer en formation, essayez le quiz <a href="/quiz/incollable-allaitement">Êtes-vous incollable sur l'allaitement ?</a></p>$html$,
  $html$<ul>
<li>Améliorer la concordance des discours des professionnels de la périnatalité en matière d'alimentation du nourrisson.</li>
<li>Accompagner les femmes qui désirent allaiter leur enfant.</li>
<li>Donner aux orthophonistes un nouveau champ de compétences dans la prise en charge précoce du nouveau-né allaité présentant des difficultés de succion, afin de l'améliorer.</li>
<li>Favoriser un développement optimal de l'enfant.</li>
<li>S'appuyer sur les connaissances en physiologie pour aider la mère qui donne le biberon, à défaut d'allaitement au sein.</li>
<li>Prévenir, détecter ou apporter une solution lorsqu'une difficulté alimentaire survient.</li>
</ul>$html$,
  NULL,
  $html$<p>Orthophonistes, et professionnels de santé et de la périnatalité concernés par l'oralité du nourrisson.</p>$html$
),

-- ─── Les troubles de la succion chez les porteurs de fentes ─────
(
  'troubles-succion-fentes',
  'Les troubles de la succion chez les nouveau-nés porteurs de fentes, un allaitement est-il possible ?',
  'formation',
  NULL,
  NULL,
  $html$<p>Approfondissez vos connaissances et vos compétences auprès des familles d'enfants porteurs de fentes, au regard des dernières données scientifiques et des <a href="https://www.has-sante.fr/upload/docs/application/pdf/2021-11/pnds_fentes_labiales_etou_palatines-texte-novembre_2021.pdf">recommandations de la HAS</a>.</p>
<p>En France, l'incidence des fentes faciales, toutes formes cliniques confondues, est estimée entre 1 sur 700 et 1 sur 1 000. La réparation chirurgicale des fentes labio-maxillo-palatines ne comble pas les difficultés de phonation, de ventilation et de déglutition.</p>
<p>La présence d'une fente vélo-pharyngée favorise la survenue d'un trouble alimentaire pédiatrique : la prise alimentaire, et notamment la tétée au sein, peut s'avérer difficile car le nourrisson aspire l'air par le nez. De nombreuses études ont montré que l'otite séromuqueuse a une prévalence élevée chez l'enfant porteur de fente vélo-palatine, de 50 à 92 % selon l'âge et l'auteur, et le non-allaitement majore le risque d'otite.</p>
<p>L'orthophoniste travaille de concert avec le chirurgien ORL et le pédiatre pour mettre en place des modalités d'alimentation adaptées, afin de prévenir les accidents d'inhalation tout en assurant une nutrition correcte. Au cours de cette formation, vous aborderez un protocole de prise en charge inspiré de la science de l'allaitement.</p>$html$,
  $html$<ul>
<li>Améliorer la concordance des discours des professionnels de santé en matière d'alimentation pédiatrique.</li>
<li>Accompagner les femmes qui désirent allaiter un enfant porteur de fente.</li>
<li>Donner aux orthophonistes un nouveau champ de compétences dans la prise en charge très précoce du nouveau-né, afin d'améliorer sa succion malgré la fente.</li>
<li>Favoriser un développement optimal de l'enfant porteur de fente.</li>
<li>S'appuyer sur les connaissances en physiologie pour aider la mère qui donne le biberon, à défaut d'allaitement au sein.</li>
<li>Prévenir, détecter ou apporter une solution lorsqu'une difficulté alimentaire survient.</li>
<li>Favoriser précocement une succion efficace permettant de développer un sphincter vélo-pharyngé parfaitement étanche, nécessaire à une bonne phonation future.</li>
</ul>$html$,
  NULL,
  $html$<p>Orthophonistes, professionnels de santé et de la périnatalité impliqués dans la prise en charge des enfants porteurs de fentes.</p>$html$
),

-- ─── Les clés de l'allaitement (formation propre) ───────────────
(
  'les-cles-de-lallaitement',
  'Les clés de l''allaitement, savoirs, postures et bonnes pratiques',
  'formation',
  NULL,
  NULL,
  $html$<p>Comment accompagner les mères avec conscience. Formez-vous ou améliorez vos connaissances pour accompagner les mères allaitantes dans le respect de leur projet individuel.</p>
<p>Avant de démarrer, mesurez ce que vous savez déjà avec le quiz <a href="/quiz/incollable-allaitement">Êtes-vous incollable sur l'allaitement ?</a></p>$html$,
  NULL,
  $html$<ol>
<li><strong>Ce qui manipule notre perception de l'allaitement.</strong> Découvrez comment l'industrie, les violations du Code de l'OMS, les normes sociales et nos histoires familiales influencent profondément notre vision de l'allaitement. Comprendre ces biais est essentiel pour les dépasser.</li>
<li><strong>Les gros freins de l'allaitement : comprendre les causes de l'hypolactation.</strong> Explorez les principaux obstacles à une lactation efficace, qu'ils soient liés à la santé, à l'environnement ou au contexte de naissance, pour mieux accompagner les mères dans leurs défis.</li>
<li><strong>Comprendre la physiologie pour mieux décoder les besoins du bébé.</strong> Familiarisez-vous avec la notion fondamentale de calibrage : comment le sein et le bébé s'adaptent l'un à l'autre au fil des semaines pour construire une lactation suffisante et durable.</li>
<li><strong>Soutenir les gestes innés d'allaitement.</strong> Apprenez à reconnaître et encourager les comportements instinctifs du bébé et les réflexes naturels de la mère, grâce à des clés inspirées de l'allaitement instinctif, approche Colson.</li>
<li><strong>Les conséquences de la banalisation du petit biberon.</strong> Comprenez pourquoi la gestion de l'alimentation du nouveau-né est cruciale : perte de poids physiologique ou pathologique, risques d'allergies, et comment éviter des erreurs fréquentes.</li>
<li><strong>Les pleurs inexpliqués et leur lien avec l'allaitement.</strong> Démystifiez les pleurs du nourrisson, souvent attribués à tort au lait maternel ou à un reflux, et découvrez comment apaiser les inquiétudes des mères.</li>
<li><strong>Gérer la fatigue, le quotidien et les rythmes familiaux.</strong> Fournissez des outils pour aider les mères à équilibrer leurs besoins avec ceux de leur bébé, et traversez les moments de doute liés aux rythmes irréguliers de l'allaitement.</li>
<li><strong>Les soutiens essentiels : rôles et implications.</strong> Analysez l'impact des différents soutiens, famille, professionnels de santé, pairs, et apprenez à mobiliser un réseau bienveillant autour des mères.</li>
<li><strong>Démystifier les boucs émissaires : stress, fatigue et leur rôle réel.</strong> Clarifiez les mythes autour du stress et de la fatigue comme responsables de l'échec de l'allaitement, et redonnez confiance aux mères dans leur capacité à allaiter.</li>
<li><strong>Booster la lactation sans recourir aux recettes de grand-mère.</strong> Découvrez des méthodes fondées sur des preuves scientifiques pour relancer ou augmenter une lactation insuffisante.</li>
<li><strong>Protéger la santé du bébé et de la mère.</strong> Apprenez à accompagner les mères dans leur projet d'allaitement tout en gardant en priorité la santé physique et émotionnelle de la dyade mère-enfant.</li>
<li><strong>Anticiper et résoudre les douleurs courantes de l'allaitement.</strong> Explorez les solutions pratiques pour prévenir et traiter les douleurs fréquentes, comme les crevasses ou les engorgements, avant qu'elles ne deviennent des obstacles majeurs.</li>
</ol>$html$,
  $html$<p>Professionnels de santé, de la périnatalité ou de la Petite Enfance, consultantes en lactation IBCLC.</p>$html$
),

-- ─── Allaitement et prématurité (EDBN) ──────────────────────────
(
  'allaitement-et-prematurite',
  'Allaitement et prématurité',
  'formation',
  'https://lecoledubiennaitre.com/formations/allaitement-et-prematurite',
  NULL,
  $html$<p>L'allaitement d'un bébé prématuré est un défi que de nombreux parents n'avaient pas anticipé. La naissance prématurée bouleverse souvent les projets et, face à l'urgence médicale, l'allaitement peut sembler relégué au second plan. Pourtant, il est une ressource précieuse, un véritable médicament.</p>
<p>Comment soutenir une mère dans l'établissement de sa lactation et l'accompagner face aux séparations et aux contraintes médicales ? Entre enjeux physiologiques, soutien émotionnel et techniques concrètes, vous repartirez avec des connaissances solides et applicables dès le premier jour.</p>
<p>Pour prendre la température de vos connaissances, testez le quiz <a href="/quiz/incollable-allaitement">Êtes-vous incollable sur l'allaitement ?</a></p>$html$,
  $html$<ul>
<li>Comprendre les spécificités physiologiques de l'allaitement d'un bébé prématuré.</li>
<li>Accompagner les parents dans la mise en place et le maintien de l'allaitement en néonatalogie.</li>
<li>Proposer des stratégies adaptées pour favoriser la succion et l'autonomie du bébé.</li>
<li>Connaître les outils et techniques pour tirer son lait efficacement et préserver la lactation.</li>
<li>Anticiper les difficultés et déconstruire les idées reçues autour de l'allaitement du bébé prématuré.</li>
</ul>$html$,
  NULL,
  $html$<p>Professionnels de santé, de la périnatalité ou de la Petite Enfance habilités par un diplôme d'État ou reconnu par l'État, et consultantes en lactation IBCLC.</p>$html$
),

-- ─── E-learning : 3 cas cliniques ───────────────────────────────
(
  'trois-cas-cliniques-meres-allaitantes',
  '3 cas cliniques pour soutenir et rassurer les mères allaitantes',
  'e_learning',
  NULL,
  NULL,
  $html$<p>Cette webconférence est spécialement conçue pour apporter aux ostéopathes et thérapeutes manuels des réponses très concrètes à trois problèmes très fréquemment rencontrés par les mères qui allaitent.</p>
<p>« J'ai mal aux seins, ça ne passe pas, j'ai des crevasses, je veux continuer à allaiter, comment faire ? » « Mon bébé a des gaz, est-ce que je m'y prends mal ? Est-ce mon lait, sa qualité ? Que pouvez-vous faire pour le soulager ? » « Mon bébé se tortille en permanence, est-ce qu'il a un reflux ? Dois-je espacer les tétées, arrêter d'allaiter au sein, lui donner un autre lait ? » Autant de questions que vous avez déjà certainement entendues dans votre cabinet.</p>
<p>Pour vous aider à mieux y répondre et à rassurer des mères souvent inquiètes, nous analysons en détail chacun de ces trois cas cliniques. L'ostéopathe est identifié par les parents comme une ressource pour faciliter les premières semaines de vie de leur enfant : disposer de compétences opérationnelles sur l'allaitement maternel est un enjeu et un atout.</p>
<p>Envie de savoir ce que vous sauriez déjà répondre ? Le quiz <a href="/quiz/incollable-allaitement">Êtes-vous incollable sur l'allaitement ?</a> vous le dira.</p>$html$,
  $html$<ul>
<li>Identifier les causes sous-jacentes des problèmes d'allaitement maternel : douleurs persistantes, baisses de lactation inexpliquées, troubles digestifs chez le nourrisson.</li>
<li>Conseiller des solutions concrètes dans le cas de crevasses persistantes, un problème d'allaitement courant.</li>
<li>Fournir des explications claires et fondées sur des preuves concernant l'utilisation de compléments alimentaires à la prise au sein et les situations justifiant leur utilisation.</li>
<li>Accompagner les mères dans le processus de sevrage de leur enfant.</li>
<li>Identifier des sources fiables pour se tenir à jour sur les recherches récentes en allaitement maternel.</li>
</ul>$html$,
  $html$<ol>
<li>Quand les symptômes masquent le vrai problème.</li>
<li>Les compléments alimentaires à la prise au sein : quand, pourquoi et comment donner un biberon de lait maternel ou infantile ?</li>
<li>Les douleurs qui ne passent pas : crevasses persistantes.</li>
<li>La notion de confiance dans l'allaitement maternel.</li>
<li>La maman dont la lactation semble baisser inexorablement.</li>
<li>Quand penser au reflux, aux coliques et aux allergies chez le bébé allaité au sein ?</li>
</ol>$html$,
  $html$<p>Ostéopathes et thérapeutes manuels, et tout professionnel accompagnant le post-partum.</p>$html$
),

-- ─── E-learning : Sensory Food Aversion (en anglais) ────────────
(
  'sensory-food-aversion-and-breastfeeding',
  'Sensory Food Aversion & Breastfeeding',
  'e_learning',
  'https://www.lactationtraining.com/shopping/online-shop/online-conferences/sensory-food-aversion-in-infants-detail',
  '2.5 L-CERPs (through May 2, 2028)',
  $html$<p><em>Understanding oral hypersensitivity in breastfeeding challenges.</em></p>
<p>As a lactation care provider, what do you do when you encounter a breastfeeding challenge where the usual strategies just don't explain what is happening, such as a baby refusing the breast despite a good latch, or arching away during feeding for reasons you can't quite pinpoint?</p>
<p>This course opens a new avenue for understanding complex situations through the lens of sensory food aversion, a neurological sensitivity affecting taste, texture and oral stimulation that impacts up to 25 % of children born full-term, and up to 75 % of those born prematurely.</p>
<p>Cette formation est dispensée en anglais.</p>$html$,
  $html$<ul>
<li>Understand sensory food aversion as a neurological sensitivity affecting taste, texture and oral stimulation.</li>
<li>Recognise its impact on infants born full-term and preterm.</li>
<li>Apply that lens to breastfeeding challenges the usual strategies do not explain.</li>
</ul>$html$,
  $html$<ol>
<li>The impact of oral hypersensitivity on latch, breast refusal, milk transfer, weight gain and feeding behaviors.</li>
<li>Clinical signs of sensory-based feeding aversion versus other causes of breast refusal.</li>
<li>Desensitization massage and its application to breastfeeding challenges.</li>
<li>How to identify red flags, when to refer, and how to build a multidisciplinary support team.</li>
</ol>$html$,
  $html$<p>Consultantes en lactation IBCLC, professionnels de l'allaitement titulaires du DIULHAM, orthophonistes, médecins.</p>$html$
),

-- ─── Webinaire : les mythes de l'allaitement (CFPCO) ────────────
(
  'osteopathie-pediatrique-mythes-allaitement',
  'Ostéopathie pédiatrique : les mythes de l''allaitement',
  'webinaire',
  'https://www.cfpco.fr/workshop/465/webconference---osteopathie-pediatrique-:-les-mythes-de-l%E2%80%99allaitement---carole-herve-et-agathe-wagner',
  'Éligible à une prise en charge FIFPL',
  $html$<p>Le saviez-vous ? Le développement de l'allaitement maternel à un niveau quasi universel pourrait prévenir 823 000 décès annuels chez les enfants de moins de 5 ans. Et en moyenne, une mère allaitante brûle environ 500 calories supplémentaires par jour.</p>
<p>Cette webconférence, animée par Carole Hervé et Agathe Wagner, explicite le rôle essentiel des professionnels de la thérapie manuelle dans le soutien à la mère allaitante, et montre comment une compréhension approfondie de la physiologie permet d'éviter la propagation de fausses croyances.</p>
<p>Vous y verrez les principaux mythes courants sur l'allaitement, ainsi que la manière dont les difficultés d'allaitement peuvent servir à identifier et à corriger des troubles musculo-squelettiques. Vous apprendrez à répondre aux premières questions des mères et à aborder les avantages comme les défis de l'allaitement sans générer de culpabilité, en appliquant les principes de l'alliance thérapeutique.</p>
<p>Combien de ces mythes sauriez-vous déjà démonter ? Réponse en dix questions avec le quiz <a href="/quiz/incollable-allaitement">Êtes-vous incollable sur l'allaitement ?</a></p>$html$,
  $html$<ul>
<li>Déconstruire les mythes et les croyances autour de l'allaitement.</li>
<li>Expliquer l'incidence des troubles musculo-squelettiques sur la qualité de l'allaitement, notamment en ce qui concerne la succion du bébé.</li>
<li>Identifier les stratégies de traitement possibles en lien avec des difficultés d'allaitement.</li>
<li>Différencier les douleurs liées à l'allaitement des autres types de douleurs musculo-squelettiques.</li>
<li>Favoriser une collaboration interprofessionnelle dans l'accompagnement de la mère allaitante en difficulté.</li>
</ul>$html$,
  $html$<ol>
<li>Pourquoi une mère allaite-t-elle au XXIe siècle ?</li>
<li>Quels sont les enjeux et le rôle de l'ostéopathe dans le soutien aux mères allaitantes ?</li>
<li>Comment la compréhension de la physiologie de l'allaitement dissipe-t-elle une grande partie des mythes, par exemple la notion erronée selon laquelle le lait de certaines mères ne serait pas assez riche ?</li>
<li>Sur quelles données scientifiques s'appuyer pour définir le champ d'action des ostéopathes et thérapeutes manuels dans l'accompagnement des difficultés d'allaitement ?</li>
<li>Comment l'identification et la prise en charge de troubles musculo-squelettiques permettent-elles d'agir sur la qualité de l'allaitement ?</li>
</ol>$html$,
  $html$<p>Ostéopathes, chiropracteurs, kinésithérapeutes et thérapeutes manuels accompagnant le post-partum.</p>$html$
);

-- ════════════════════════════════════════════════════════════════
-- 2. Rattachement des sessions et renommages
-- ════════════════════════════════════════════════════════════════
--
-- Le rapprochement se fait sur le slug, stable depuis l'import, et non sur le
-- titre que l'on est justement en train de reecrire. Chaque bloc traite a la
-- fois les sessions historiques (prefixe `edbn-`, `formation-`) et celles du
-- calendrier 2027.

-- Allaitement maternel - Les indispensables
UPDATE formations f SET
  template_id = t.id,
  title = t.title,
  category = t.category
FROM formation_templates t
WHERE t.slug = 'allaitement-maternel-les-indispensables'
  AND (f.slug LIKE 'allaitement-maternel-les-indispensables%'
    OR f.slug LIKE 'edbn-allaitement-les-indispensables%'
    -- Une session de 2026 porte un slug raccourci, sans « les ».
    OR f.slug LIKE 'edbn-allaitement-indispensables%');

-- Allaitement maternel - Perfectionnement
UPDATE formations f SET
  template_id = t.id, title = t.title, category = t.category
FROM formation_templates t
WHERE t.slug = 'allaitement-maternel-perfectionnement'
  AND (f.slug LIKE 'allaitement-perfectionnement%'
    OR f.slug LIKE 'edbn-allaitement-perfectionnement%');

-- Animer un atelier d'allaitement
UPDATE formations f SET
  template_id = t.id, title = t.title, category = t.category
FROM formation_templates t
WHERE t.slug = 'animer-un-atelier-dallaitement'
  AND (f.slug LIKE 'atelier-allaitement%'
    OR f.slug LIKE 'edbn-animer-un-atelier-dallaitement%'
    OR f.slug LIKE 'edbn-animer-atelier-allaitement%');

-- Le sommeil du nourrisson et du jeune enfant
UPDATE formations f SET
  template_id = t.id, title = t.title, category = t.category
FROM formation_templates t
WHERE t.slug = 'le-sommeil-du-nourrisson-et-du-jeune-enfant'
  AND (f.slug LIKE 'le-sommeil-du-tout-petit%'
    OR f.slug LIKE 'formation-le-sommeil-du-tout-petit%'
    OR f.slug LIKE 'formation-sommeil-tout-petit%'
    OR f.slug LIKE 'sommeil-du-tout-petit%');

-- Accompagner l'allaitement à la reprise du travail
UPDATE formations f SET
  template_id = t.id, title = t.title, category = t.category
FROM formation_templates t
WHERE t.slug = 'accompagner-lallaitement-a-la-reprise-du-travail'
  AND f.slug LIKE 'allaitement-et-reprise-du-travail%';

-- Accompagner les troubles alimentaires du nourrisson
UPDATE formations f SET
  template_id = t.id, title = t.title, category = t.category
FROM formation_templates t
WHERE t.slug = 'accompagner-les-troubles-alimentaires-du-nourrisson'
  AND (f.slug LIKE 'les-troubles-alimentaires-pediatriques%'
    OR f.slug LIKE 'accompagner-les-troubles-alimentaires%'
    OR f.slug LIKE 'formation-accompagner-les-troubles-alimentaires%');

-- Rencontre en aparté
UPDATE formations f SET
  template_id = t.id, title = t.title, category = t.category
FROM formation_templates t
WHERE t.slug = 'rencontre-en-aparte'
  AND f.slug LIKE 'rencontre-en-aparte%';

-- Le tire-allaitement
UPDATE formations f SET
  template_id = t.id, title = t.title, category = t.category
FROM formation_templates t
WHERE t.slug = 'le-tire-allaitement'
  AND (f.slug LIKE 'le-tire-allaitement%' OR f.slug LIKE 'edbn-le-tire-allaitement%');

-- Réagir quand l'allaitement dysfonctionne
UPDATE formations f SET
  template_id = t.id, title = t.title, category = t.category
FROM formation_templates t
WHERE t.slug = 'reagir-quand-lallaitement-dysfonctionne-cas-cliniques'
  AND (f.slug LIKE 'reagir-quand-l-allaitement-dysfonctionne%'
    -- Les sessions EDBN de 2026 portent deux intitules pour la meme formation :
    -- « réagir quand l'allaitement dysfonctionne » et « repérer tôt, agir vite ».
    OR f.slug LIKE 'edbn-cas-cliniques%');

-- Le rôle de l'ostéopathe (CFPCO)
UPDATE formations f SET
  template_id = t.id, title = t.title, category = t.category
FROM formation_templates t
WHERE t.slug = 'allaitement-maternel-premier-mois-osteopathe'
  AND f.slug LIKE 'formation-cfpco%';

-- Le sevrage
UPDATE formations f SET
  template_id = t.id, title = t.title, category = t.category
FROM formation_templates t
WHERE t.slug = 'le-sevrage'
  AND (f.slug LIKE 'le-sevrage%' OR f.slug LIKE 'edbn-le-sevrage%');

-- Accompagner l'allaitement en orthophonie (Dyskate)
UPDATE formations f SET
  template_id = t.id, title = t.title, category = t.category
FROM formation_templates t
WHERE t.slug = 'accompagner-lallaitement-en-orthophonie'
  AND (f.slug LIKE 'formation-dyskate%'
    OR f.slug LIKE 'dyskate-accompagner-lallaitement-en-orthophonie%');

-- Les troubles de la succion chez les porteurs de fentes (Dyskate)
UPDATE formations f SET
  template_id = t.id, title = t.title, category = t.category
FROM formation_templates t
WHERE t.slug = 'troubles-succion-fentes'
  AND f.slug LIKE 'dyskate-allaitement-et-fentes%';

-- Les clés de l'allaitement
UPDATE formations f SET
  template_id = t.id, title = t.title, category = t.category
FROM formation_templates t
WHERE t.slug = 'les-cles-de-lallaitement'
  AND f.slug LIKE 'les-bases-de-l-allaitement%';

-- Allaitement et prématurité
UPDATE formations f SET
  template_id = t.id, title = t.title, category = t.category
FROM formation_templates t
WHERE t.slug = 'allaitement-et-prematurite'
  AND (f.slug LIKE 'allaitement-et-prematurite%'
    OR f.slug LIKE 'edbn-allaitement-et-prematurite%');

-- ════════════════════════════════════════════════════════════════
-- 3. Les trois formations sans date
-- ════════════════════════════════════════════════════════════════
--
-- `starts_at`/`ends_at` sont NOT NULL et servent ici de simple date de mise en
-- ligne : `is_evergreen` les sort des listes chronologiques, `show_time` evite
-- d'afficher un horaire que personne n'a choisi.

INSERT INTO formations (
  consultant_id, template_id, title, slug, category,
  type, starts_at, ends_at, show_time, is_evergreen,
  price_cents, currency, show_price, badge, external_url, is_published
)
SELECT
  c.id, t.id, t.title, t.slug, t.category,
  'online', DATE '2026-08-07', DATE '2026-08-08', false, true,
  v.price_cents, v.currency, v.show_price, t.badge, t.external_url, true
FROM formation_templates t
JOIN consultants c ON c.slug = 'carole-herve'
JOIN (VALUES
  ('trois-cas-cliniques-meres-allaitantes', 0, 'eur', false),
  ('sensory-food-aversion-and-breastfeeding', 6500, 'usd', true),
  ('osteopathie-pediatrique-mythes-allaitement', 6700, 'eur', true)
) AS v(slug, price_cents, currency, show_price) ON v.slug = t.slug
ON CONFLICT (slug) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- 4. Corrections de donnees
-- ════════════════════════════════════════════════════════════════

-- Carole Hervé est la formatrice de toutes les sessions. Les formations de la
-- consultante E2E sont laissees de cote : elles appartiennent au jeu de
-- donnees de test, les reattribuer ferait echouer la suite.
UPDATE formations f
SET consultant_id = c.id
FROM consultants c
WHERE c.slug = 'carole-herve'
  AND f.consultant_id <> c.id
  AND f.consultant_id IS DISTINCT FROM (
    SELECT id FROM consultants WHERE slug = 'consultante-e2e'
  );

-- Les formations de l'EDBN se tiennent toutes en ligne. L'import les avait
-- passees en presentiel.
UPDATE formations f
SET type = 'online'
FROM training_providers p
WHERE f.provider_id = p.id
  AND p.slug = 'edbn'
  AND f.type <> 'online';

-- Le sevrage se termine a 13 h, et non a 12 h 30 comme l'import l'avait pose.
-- `starts_at` est deja juste (9 h heure de Paris), donc la fin se deduit d'une
-- duree de quatre heures plutot que d'une heure ecrite en dur, qui serait
-- fausse six mois sur douze a cause du changement d'heure.
UPDATE formations f
SET ends_at = f.starts_at + INTERVAL '4 hours'
FROM formation_templates t
WHERE f.template_id = t.id
  AND t.slug = 'le-sevrage';

-- Publication du calendrier 2027. Les deux sessions de Clinic Halav restent en
-- brouillon : leur contenu n'est pas encore ecrit, les publier vides ferait
-- deux fiches nues en ligne.
UPDATE formations f
SET is_published = true
WHERE f.is_published = false
  AND f.starts_at >= DATE '2026-08-01'
  AND f.provider_id IS DISTINCT FROM (
    SELECT id FROM training_providers WHERE slug = 'clinic-halav'
  );

-- Le tarif ne s'affiche que la ou il est arrete.
UPDATE formations f
SET show_price = true, price_cents = v.price_cents
FROM formation_templates t
JOIN (VALUES
  ('le-sommeil-du-nourrisson-et-du-jeune-enfant', 39000),
  ('accompagner-lallaitement-a-la-reprise-du-travail', 25000),
  ('accompagner-les-troubles-alimentaires-du-nourrisson', 25000),
  ('allaitement-maternel-premier-mois-osteopathe', 59700)
) AS v(slug, price_cents) ON v.slug = t.slug
WHERE f.template_id = t.id;

-- Partout ailleurs, l'inscription passe par l'organisme et le tarif lui
-- appartient.
UPDATE formations f
SET show_price = false
FROM formation_templates t
WHERE f.template_id = t.id
  AND t.slug IN (
    'allaitement-maternel-les-indispensables',
    'allaitement-maternel-perfectionnement',
    'animer-un-atelier-dallaitement',
    'rencontre-en-aparte',
    'le-tire-allaitement',
    'reagir-quand-lallaitement-dysfonctionne-cas-cliniques',
    'le-sevrage',
    'accompagner-lallaitement-en-orthophonie',
    'troubles-succion-fentes',
    'les-cles-de-lallaitement',
    'allaitement-et-prematurite',
    'trois-cas-cliniques-meres-allaitantes'
  );

-- Les notes de l'import du planning se sont retrouvees dans `description`, qui
-- s'affiche en sous-titre sur les cartes publiques : « Planning 2027 — Jour
-- 1/2 | Jour 2/2 » n'a jamais ete ecrit pour etre lu par un visiteur. Le
-- resume de la fiche prend le relais.
UPDATE formations
SET description = NULL
WHERE description LIKE 'Planning 2027%';

-- Le lien vers l'organisme et le badge suivent la fiche, sauf si la session en
-- porte deja un qui lui est propre.
UPDATE formations f
SET external_url = t.external_url
FROM formation_templates t
WHERE f.template_id = t.id
  AND f.external_url IS NULL
  AND t.external_url IS NOT NULL;

UPDATE formations f
SET badge = t.badge
FROM formation_templates t
WHERE f.template_id = t.id
  AND f.badge IS NULL
  AND t.badge IS NOT NULL;
