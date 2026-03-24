-- ============================================================
-- Migration: Duration-based pricing for consultation types
-- ============================================================

-- 1. New table: consultation_type_durations
CREATE TABLE consultation_type_durations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_type_id UUID NOT NULL REFERENCES consultation_types(id) ON DELETE CASCADE,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  weekend_price_cents INT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (consultation_type_id, duration_minutes)
);

-- 2. Add duration_option_id to bookings (nullable for existing bookings)
ALTER TABLE bookings
  ADD COLUMN duration_option_id UUID REFERENCES consultation_type_durations(id);

-- 3. Seed from existing consultation_types rows
INSERT INTO consultation_type_durations (consultation_type_id, duration_minutes, price_cents, is_default, position)
SELECT id, duration_minutes, price_cents, true, 0
FROM consultation_types
WHERE is_active = true;

-- 4. RLS policies
ALTER TABLE consultation_type_durations ENABLE ROW LEVEL SECURITY;

-- Public can read durations for active consultation types
CREATE POLICY "Anyone can view durations of active types"
  ON consultation_type_durations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consultation_types ct
      WHERE ct.id = consultation_type_durations.consultation_type_id
        AND ct.is_active = true
    )
  );

-- Consultants can manage their own durations
CREATE POLICY "Consultants can insert own durations"
  ON consultation_type_durations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consultation_types ct
      WHERE ct.id = consultation_type_durations.consultation_type_id
        AND ct.consultant_id = auth.uid()
    )
  );

CREATE POLICY "Consultants can update own durations"
  ON consultation_type_durations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM consultation_types ct
      WHERE ct.id = consultation_type_durations.consultation_type_id
        AND ct.consultant_id = auth.uid()
    )
  );

CREATE POLICY "Consultants can delete own durations"
  ON consultation_type_durations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM consultation_types ct
      WHERE ct.id = consultation_type_durations.consultation_type_id
        AND ct.consultant_id = auth.uid()
    )
  );

-- Index for fast lookups
CREATE INDEX idx_duration_consultation_type ON consultation_type_durations(consultation_type_id);
CREATE INDEX idx_bookings_duration_option ON bookings(duration_option_id) WHERE duration_option_id IS NOT NULL;
