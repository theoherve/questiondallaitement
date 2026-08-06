-- Reperes affiches sur la fiche d'une formation, choisis dans le back-office.
-- On stocke des cles, pas des libelles : l'intitule et l'icone restent en code
-- (src/config/event-highlights.ts), donc une reformulation ne demande aucune
-- migration de donnees.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS highlights TEXT[] NOT NULL DEFAULT '{}';

-- Reprise : les formations deja en ligne affichaient les six reperes en dur.
-- Sans ce backfill, la bande disparaitrait de toutes les fiches publiees.
UPDATE events
SET highlights = ARRAY[
  'elearning',
  'webinar',
  'zoom',
  'certificate',
  'evidence',
  'ibclc'
]
WHERE highlights = '{}';
