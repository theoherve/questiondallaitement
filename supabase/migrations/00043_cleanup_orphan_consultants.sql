-- Deactivate consultants whose owning profile was soft-deleted.
-- Hard delete is not safe: events/payments/formations/bookings hold FKs
-- to consultants (some without ON DELETE CASCADE).
-- The /admin/consultantes page hides these via an inner join filter on
-- profiles.deleted_at IS NULL, so is_active=false is belt-and-suspenders
-- and also prevents booking flows from surfacing them.

UPDATE consultants
SET is_active = false
WHERE id IN (
  SELECT id FROM profiles WHERE deleted_at IS NOT NULL
)
AND is_active = true;
