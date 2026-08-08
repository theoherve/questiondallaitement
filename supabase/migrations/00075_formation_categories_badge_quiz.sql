-- Migration 00075: categorie et badge sur les formations, mode « quiz » sur les sondages
--
-- Trois sujets independants mais tous prealables au contenu pose par 00077,
-- reunis ici pour ne pas empiler quatre migrations de schema d'affilee.

-- ─── 1. Categorie de formation ──────────────────────────────────
--
-- La categorie etait jusqu'ici DEDUITE DU TITRE cote client
-- (`title.startsWith("atelier")`, cf. formations-list.tsx). Le chantier de
-- renommage fait tomber toutes les formations dans « autre » et casse les
-- filtres : la categorie doit devenir une donnee.
--
-- Le backfill ci-dessous reproduit exactement l'ancienne heuristique, et il
-- doit tourner AVANT les renommages de 00077 — d'ou la separation des deux
-- migrations.

CREATE TYPE formation_category AS ENUM (
  'formation',       -- le format long, une ou plusieurs journees
  'webinaire',       -- format court en ligne (ex-« atelier » du filtre public)
  'atelier_mensuel', -- reserve aux abonnes d'un accompagnement (ex-« live »)
  'masterclass',
  'conference',
  'e_learning'       -- sans date : suivi au rythme de l'apprenant
);

ALTER TABLE formations
  ADD COLUMN category formation_category NOT NULL DEFAULT 'formation';

-- Reprise de l'existant. L'ordre des UPDATE compte : « atelier mensuel »
-- doit gagner sur « atelier », qui lui-meme ne doit pas rattraper les
-- journees completes de l'EDBN intitulees « ATELIER ALLAITEMENT ».
UPDATE formations SET category = 'masterclass'
  WHERE lower(title) LIKE 'masterclass%';

UPDATE formations SET category = 'conference'
  WHERE lower(title) LIKE '%conférence%' OR lower(title) LIKE '%conference%';

UPDATE formations SET category = 'atelier_mensuel'
  WHERE lower(title) LIKE 'live%'
     OR lower(title) LIKE 'atelier mensuel%'
     OR lower(title) LIKE 'atelier l%essentiel%';

UPDATE formations SET category = 'webinaire'
  WHERE lower(title) LIKE 'webinaire%'
     OR lower(title) LIKE 'webconférence%'
     OR lower(title) LIKE 'webconference%'
     OR lower(title) LIKE 'rencontre en apart%';

COMMENT ON COLUMN formations.category IS
  'Famille de format, affichee en pastille et pilotant les filtres publics. '
  'Remplace la deduction depuis le titre.';

-- ─── 2. Badge libre ─────────────────────────────────────────────
--
-- Mention courte propre a certaines formations (« 2.5 L-CERPs (through
-- May 2, 2028) », « Éligible FIFPL »). Facultative : vide, rien ne s'affiche.
-- Du texte et non une cle : ces mentions sont ponctuelles, souvent datees, et
-- n'ont pas vocation a etre reutilisees d'une formation a l'autre.

ALTER TABLE formations
  ADD COLUMN badge TEXT;

COMMENT ON COLUMN formations.badge IS
  'Mention libre affichee sur la fiche (certification, eligibilite). NULL = rien.';

-- ─── 3. Sondages : mode quiz ────────────────────────────────────
--
-- `surveys` ne savait faire qu'un sondage d'opinion : aucune reponse n'y est
-- juste ou fausse. Un quiz demande trois choses de plus, toutes portees par
-- la question : la bonne reponse, son explication, et l'affichage d'un score
-- final. Le stockage des reponses ne bouge pas — c'est la lecture qui change.

ALTER TABLE surveys
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'poll'
    CHECK (kind IN ('poll', 'quiz'));

COMMENT ON COLUMN surveys.kind IS
  'poll = sondage d''opinion (graphique d''agregat). '
  'quiz = correction immediate et score final.';

ALTER TABLE survey_questions
  -- Cle de `choices` qui vaut la bonne reponse. NULL sur un sondage.
  ADD COLUMN correct_choice_key TEXT,
  -- Explication montree apres validation, quelle que soit la reponse donnee.
  ADD COLUMN explanation_html TEXT;

COMMENT ON COLUMN survey_questions.correct_choice_key IS
  'Cle de choices consideree juste. NULL hors quiz.';

-- Le choix multiple s'exprime dans la forme deja en place plutot que dans une
-- nouvelle : une ligne par option cochable, un unique choix « oui ». La vue
-- d'agregat et le format des reponses restent donc inchanges, seul le rendu
-- passe de boutons radio a des cases a cocher.
ALTER TABLE survey_questions
  DROP CONSTRAINT survey_questions_kind_check;

ALTER TABLE survey_questions
  ADD CONSTRAINT survey_questions_kind_check
    CHECK (kind IN ('matrix', 'single', 'multi'));

COMMENT ON COLUMN survey_questions.kind IS
  'matrix = une ligne par item, choix unique par ligne. '
  'single = un seul choix. '
  'multi = cases a cocher : une ligne par option, choix « oui » ou absence.';
