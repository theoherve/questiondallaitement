-- Migration 00020: Booking flow ADR-013
-- New enums, consultant_locations table, alter consultation_types & bookings

-- 07-01: consultation_location enum
CREATE TYPE consultation_location AS ENUM (
  'cabinet',
  'teleconsultation',
  'domicile'
);

-- 07-02: booking_payment_method enum
CREATE TYPE booking_payment_method AS ENUM (
  'online',
  'on_site'
);

-- 07-03: consultant_locations table
CREATE TABLE consultant_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  location_type consultation_location NOT NULL,
  label TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  radius_km INT,
  surcharge_cents INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (consultant_id, location_type)
);

CREATE INDEX idx_consultant_locations_consultant
  ON consultant_locations(consultant_id);
CREATE INDEX idx_consultant_locations_active
  ON consultant_locations(consultant_id, is_active) WHERE is_active = true;

-- 07-04: add available_locations to consultation_types + migrate is_online
ALTER TABLE consultation_types
  ADD COLUMN available_locations consultation_location[]
  DEFAULT '{teleconsultation}';

UPDATE consultation_types
  SET available_locations = CASE
    WHEN is_online = true THEN ARRAY['teleconsultation']::consultation_location[]
    ELSE ARRAY['cabinet']::consultation_location[]
  END;

-- 07-05: add location, payment_method, reason to bookings
ALTER TABLE bookings
  ADD COLUMN location consultation_location NOT NULL DEFAULT 'teleconsultation';

ALTER TABLE bookings
  ADD COLUMN payment_method booking_payment_method NOT NULL DEFAULT 'online';

ALTER TABLE bookings
  ADD COLUMN reason TEXT;

-- 07-06: RLS policies for consultant_locations
ALTER TABLE consultant_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY consultant_locations_select_public ON consultant_locations
  FOR SELECT USING (is_active = true);

CREATE POLICY consultant_locations_insert_own ON consultant_locations
  FOR INSERT WITH CHECK (
    consultant_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY consultant_locations_update_own ON consultant_locations
  FOR UPDATE USING (
    consultant_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY consultant_locations_delete_own ON consultant_locations
  FOR DELETE USING (
    consultant_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY consultant_locations_select_admin ON consultant_locations
  FOR SELECT USING (is_admin());
