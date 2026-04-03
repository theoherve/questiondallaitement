-- RGPD – right to erasure: update FK constraints so that deleting a profile
-- cascades to all personal data. Payments are anonymised (SET NULL) instead
-- of deleted to meet legal accounting retention requirements (10 years, FR).

-- bookings: cascade client data, nullify cancelled_by reference
ALTER TABLE bookings
  DROP CONSTRAINT bookings_client_id_fkey,
  ADD CONSTRAINT bookings_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE bookings
  DROP CONSTRAINT bookings_cancelled_by_fkey,
  ADD CONSTRAINT bookings_cancelled_by_fkey
    FOREIGN KEY (cancelled_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- formation_enrollments: cascade
ALTER TABLE formation_enrollments
  DROP CONSTRAINT formation_enrollments_client_id_fkey,
  ADD CONSTRAINT formation_enrollments_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- event_registrations: cascade
ALTER TABLE event_registrations
  DROP CONSTRAINT event_registrations_client_id_fkey,
  ADD CONSTRAINT event_registrations_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- crm_notes: cascade
ALTER TABLE crm_notes
  DROP CONSTRAINT crm_notes_client_id_fkey,
  ADD CONSTRAINT crm_notes_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- payments: SET NULL to preserve financial records (legal retention obligation)
ALTER TABLE payments
  DROP CONSTRAINT payments_client_id_fkey,
  ADD CONSTRAINT payments_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE SET NULL;
