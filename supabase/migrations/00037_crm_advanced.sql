-- Migration 00037 : CRM avancé — segments + scoring client

-- ============================================================
-- TABLE crm_segments
-- ============================================================

CREATE TABLE crm_segments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_id uuid REFERENCES profiles(id) ON DELETE CASCADE, -- NULL = segment global (admin)
  name text NOT NULL,
  description text,
  color text DEFAULT '#6B7280',
  conditions jsonb NOT NULL DEFAULT '[]',
  -- Format conditions : [{ "field": "booking_count", "op": ">=", "value": 3 }]
  -- Champs : booking_count, total_spent_cents, formation_count, event_count, inactive_days, days_since_registration
  -- Opérateurs : >=, <=, =, !=
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_segments_consultant_id_idx ON crm_segments(consultant_id);

-- Trigger updated_at
CREATE TRIGGER set_crm_segments_updated_at
  BEFORE UPDATE ON crm_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS crm_segments
-- ============================================================

ALTER TABLE crm_segments ENABLE ROW LEVEL SECURITY;

-- Admin : accès complet
CREATE POLICY "admin_all_crm_segments"
  ON crm_segments
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Consultante : ses propres segments
CREATE POLICY "consultant_own_crm_segments"
  ON crm_segments
  FOR ALL
  TO authenticated
  USING (consultant_id = auth.uid() AND is_consultant())
  WITH CHECK (consultant_id = auth.uid() AND is_consultant());

-- ============================================================
-- FONCTION calculate_client_score
-- ============================================================
-- Retourne un score 0-100 pour un client donné, optionnellement
-- filtré par consultante (ne compte que les interactions avec cette consultante).

CREATE OR REPLACE FUNCTION calculate_client_score(
  p_client_id uuid,
  p_consultant_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_completed_bookings integer;
  v_total_spent_cents  bigint;
  v_formations_count   integer;
  v_events_count       integer;
  v_last_activity      timestamptz;
  v_inactive_days      integer;
  v_score              numeric;
  v_recency_factor     numeric;
BEGIN
  -- Nombre de réservations complétées
  SELECT COUNT(*)
  INTO v_completed_bookings
  FROM bookings
  WHERE client_id = p_client_id
    AND status = 'completed'
    AND (p_consultant_id IS NULL OR consultant_id = p_consultant_id);

  -- Total dépensé (paiements réussis)
  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_total_spent_cents
  FROM payments
  WHERE client_id = p_client_id
    AND status = 'succeeded'
    AND (p_consultant_id IS NULL OR consultant_id = p_consultant_id);

  -- Nombre de formations achetées
  SELECT COUNT(*)
  INTO v_formations_count
  FROM formation_enrollments
  WHERE client_id = p_client_id;

  -- Nombre d'événements assistés
  SELECT COUNT(*)
  INTO v_events_count
  FROM event_registrations
  WHERE client_id = p_client_id
    AND status = 'confirmed';

  -- Dernière activité (max de toutes les interactions)
  SELECT GREATEST(
    MAX(b.starts_at),
    MAX(fe.enrolled_at),
    MAX(er.registered_at)
  )
  INTO v_last_activity
  FROM profiles p
  LEFT JOIN bookings b ON b.client_id = p.id
    AND b.status = 'completed'
    AND (p_consultant_id IS NULL OR b.consultant_id = p_consultant_id)
  LEFT JOIN formation_enrollments fe ON fe.client_id = p.id
  LEFT JOIN event_registrations er ON er.client_id = p.id
    AND er.status = 'confirmed'
  WHERE p.id = p_client_id;

  -- Jours d'inactivité
  v_inactive_days := COALESCE(
    EXTRACT(DAY FROM (now() - v_last_activity))::integer,
    9999
  );

  -- Calcul du score brut (max théorique = 100)
  v_score :=
    LEAST(40, v_completed_bookings * 15) +          -- fidélité consultations
    LEAST(25, v_total_spent_cents::numeric / 4000) + -- valeur financière
    LEAST(20, v_formations_count * 10) +             -- engagement formations
    LEAST(15, v_events_count * 5);                   -- engagement événements

  -- Malus récence
  IF v_inactive_days >= 180 THEN
    v_recency_factor := 0.5;
  ELSIF v_inactive_days >= 90 THEN
    v_recency_factor := 0.75;
  ELSE
    v_recency_factor := 1.0;
  END IF;

  v_score := v_score * v_recency_factor;

  RETURN LEAST(100, GREATEST(0, v_score::integer));
END;
$$;

-- ============================================================
-- COMMENTAIRES
-- ============================================================

COMMENT ON TABLE crm_segments IS 'Segments CRM basés sur des règles automatiques (conditions JSONB)';
COMMENT ON COLUMN crm_segments.consultant_id IS 'NULL = segment global visible par tous les admins';
COMMENT ON COLUMN crm_segments.conditions IS 'Tableau de conditions : [{"field":"booking_count","op":">=","value":3}]';
COMMENT ON FUNCTION calculate_client_score IS 'Calcule un score 0-100 pour un client. p_consultant_id optionnel pour filtrer par consultante.';
