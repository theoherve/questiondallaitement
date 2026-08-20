-- Poids de naissance, nécessaire au calcul des alertes de perte de poids et de
-- non-reprise à J14 (module courbes de poids §3.3). Nullable : aucun
-- rattrapage sur les fiches existantes, les règles concernées deviennent
-- silencieuses pour ces enfants plutôt que d'échouer.
ALTER TABLE children
  ADD COLUMN birth_weight_grams INT
    CHECK (birth_weight_grams IS NULL OR (birth_weight_grams > 0 AND birth_weight_grams < 10000));
