-- ============================================================
-- Seed all 4 default duration options for existing consultation types
-- that only have 1 duration (from the initial 00028 migration).
-- Also sets the 1h option as is_default for all types.
-- ============================================================

-- Insert 30 min option where missing
INSERT INTO consultation_type_durations (consultation_type_id, duration_minutes, price_cents, is_default, position)
SELECT ct.id, 30, 5000, false, 0
FROM consultation_types ct
WHERE ct.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM consultation_type_durations d
    WHERE d.consultation_type_id = ct.id AND d.duration_minutes = 30
  );

-- Insert 60 min option where missing
INSERT INTO consultation_type_durations (consultation_type_id, duration_minutes, price_cents, is_default, position)
SELECT ct.id, 60, 9000, false, 1
FROM consultation_types ct
WHERE ct.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM consultation_type_durations d
    WHERE d.consultation_type_id = ct.id AND d.duration_minutes = 60
  );

-- Insert 90 min option where missing
INSERT INTO consultation_type_durations (consultation_type_id, duration_minutes, price_cents, is_default, position)
SELECT ct.id, 90, 13000, false, 2
FROM consultation_types ct
WHERE ct.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM consultation_type_durations d
    WHERE d.consultation_type_id = ct.id AND d.duration_minutes = 90
  );

-- Insert 120 min option where missing
INSERT INTO consultation_type_durations (consultation_type_id, duration_minutes, price_cents, is_default, position)
SELECT ct.id, 120, 17000, false, 3
FROM consultation_types ct
WHERE ct.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM consultation_type_durations d
    WHERE d.consultation_type_id = ct.id AND d.duration_minutes = 120
  );

-- Ensure exactly one default per type: set 60 min as default
UPDATE consultation_type_durations SET is_default = false;
UPDATE consultation_type_durations SET is_default = true
WHERE duration_minutes = 60;

-- Fix positions for consistency
UPDATE consultation_type_durations SET position = 0 WHERE duration_minutes = 30;
UPDATE consultation_type_durations SET position = 1 WHERE duration_minutes = 60;
UPDATE consultation_type_durations SET position = 2 WHERE duration_minutes = 90;
UPDATE consultation_type_durations SET position = 3 WHERE duration_minutes = 120;