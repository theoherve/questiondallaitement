-- Migration 00091: audience visee par une session de formation
--
-- `category` decrit un FORMAT (webinaire, atelier mensuel...), pas un
-- PUBLIC : un webinaire peut viser des pros comme des mamans. Sans donnee
-- explicite, la page /formations ne peut pas distinguer les deux, et son
-- hero actuel ("Formations professionnelles") fait fuir les mamans avant
-- meme qu'elles ne voient la liste.

CREATE TYPE formation_audience_group AS ENUM ('maman', 'pro', 'both');

ALTER TABLE formations
  ADD COLUMN audience_group formation_audience_group NOT NULL DEFAULT 'both';

COMMENT ON COLUMN formations.audience_group IS
  'Public cible de la session, pilote le toggle sur /formations. '
  'maman = mamans uniquement, pro = professionnels de sante uniquement, '
  'both = les deux. Toutes les lignes existantes valent ''both'' au '
  'backfill : aucune session existante ne doit disparaitre d''une vue '
  'sans revue manuelle par Carole dans l''admin.';
