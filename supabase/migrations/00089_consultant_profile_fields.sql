-- Nouveaux champs de credibilite sur le profil public d'une consultante :
-- certifications au-dela d'IBCLC, langues parlees, annees d'experience,
-- zone d'intervention. Meme pattern que `specialties` (deja un text[]).

ALTER TABLE consultants
  ADD COLUMN IF NOT EXISTS certifications TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS years_experience SMALLINT,
  ADD COLUMN IF NOT EXISTS service_area TEXT;

ALTER TABLE consultants
  ADD CONSTRAINT consultants_years_experience_check
    CHECK (years_experience IS NULL OR years_experience >= 0);
