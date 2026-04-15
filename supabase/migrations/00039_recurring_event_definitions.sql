-- ─── Recurring Event Definitions ────────────────────────────
-- Stores recurrence patterns. The cron generates individual
-- event rows from these definitions.

CREATE TABLE recurring_event_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug_prefix TEXT NOT NULL,
  description TEXT,
  consultant_id UUID NOT NULL REFERENCES consultants(id),
  type event_type NOT NULL DEFAULT 'online',
  location TEXT,
  duration_minutes INT NOT NULL DEFAULT 60,
  time_of_day TIME NOT NULL,
  recurrence_rule JSONB NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  max_participants INT,
  price_cents INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'eur',
  is_active BOOLEAN NOT NULL DEFAULT true,
  generate_ahead_days INT NOT NULL DEFAULT 45,
  last_generated_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER recurring_event_definitions_updated_at
  BEFORE UPDATE ON recurring_event_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Link generated events back to their definition
ALTER TABLE events ADD COLUMN recurring_definition_id UUID REFERENCES recurring_event_definitions(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN occurrence_date DATE;

CREATE INDEX idx_events_recurring_def ON events(recurring_definition_id);
CREATE INDEX idx_events_occurrence_date ON events(occurrence_date);

-- ─── RLS ────────────────────────────────────────────────────

ALTER TABLE recurring_event_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY recurring_event_defs_select ON recurring_event_definitions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  );

CREATE POLICY recurring_event_defs_insert ON recurring_event_definitions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  );

CREATE POLICY recurring_event_defs_update ON recurring_event_definitions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  );

CREATE POLICY recurring_event_defs_delete ON recurring_event_definitions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  );
