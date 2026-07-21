-- 5-1 — Rate limiting partage entre instances.
--
-- Le limiteur vivait dans une Map en memoire. Sur Vercel, chaque instance a la
-- sienne : la limite est multipliee par le nombre d'instances, et repart a zero
-- a chaque demarrage a froid. Observe en local pendant la Phase 5 — les passes
-- de test s'auto-bloquaient puis repartaient a zero au redemarrage du serveur.
--
-- Choix de Supabase plutot que d'un Redis dedie : le besoin est un etat
-- partage, pas un produit particulier. La base est deja interrogee a chaque
-- tentative de connexion (lecture de `profiles`), donc elle n'ajoute aucun
-- mode de panne. Le volume — quelques ecritures par tentative d'auth — est
-- sans commune mesure avec ce que Postgres encaisse.

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits (reset_at);

-- Aucune politique : seul le service role y accede, et lui contourne les RLS.
-- Sans RLS activee, la cle anon pourrait lire les compteurs — donc deduire
-- quelles adresses tentent de se connecter.
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

/**
 * Incremente le compteur d'une cle et dit si la requete passe.
 *
 * Tout tient dans un seul INSERT ... ON CONFLICT DO UPDATE : la ligne est
 * verrouillee pendant l'operation, donc deux requetes simultanees ne peuvent
 * pas lire le meme compteur et se croire toutes deux sous la limite. Un
 * SELECT puis UPDATE separes laisseraient precisement cette fenetre.
 */
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_limit INT,
  p_window_seconds INT
)
RETURNS TABLE (allowed BOOLEAN, remaining INT, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_count INT;
  v_reset TIMESTAMPTZ;
BEGIN
  INSERT INTO rate_limits AS r (key, count, reset_at)
  VALUES (p_key, 1, v_now + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE
    SET count = CASE WHEN r.reset_at <= v_now THEN 1 ELSE r.count + 1 END,
        reset_at = CASE
          WHEN r.reset_at <= v_now
          THEN v_now + make_interval(secs => p_window_seconds)
          ELSE r.reset_at
        END
  RETURNING r.count, r.reset_at INTO v_count, v_reset;

  -- Purge opportuniste : sans cron, les fenetres expirees s'accumuleraient.
  -- Une fois sur cent suffit largement au volume concerne.
  IF random() < 0.01 THEN
    DELETE FROM rate_limits WHERE rate_limits.reset_at < v_now - INTERVAL '1 hour';
  END IF;

  RETURN QUERY SELECT
    v_count <= p_limit,
    GREATEST(p_limit - v_count, 0),
    v_reset;
END;
$$;
