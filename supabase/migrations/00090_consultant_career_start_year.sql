-- Remplace years_experience (00089) par une annee de debut de carriere : un
-- nombre d'annees fige se perime chaque annee sans mise a jour manuelle,
-- alors qu'une annee de debut permet de calculer l'anciennete a la volee.

ALTER TABLE consultants
  DROP CONSTRAINT IF EXISTS consultants_years_experience_check,
  DROP COLUMN IF EXISTS years_experience,
  ADD COLUMN IF NOT EXISTS career_start_year SMALLINT;

ALTER TABLE consultants
  ADD CONSTRAINT consultants_career_start_year_check
    CHECK (career_start_year IS NULL OR career_start_year >= 1950);
