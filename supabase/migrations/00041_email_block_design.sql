-- ─── Email Block Editor (Maily) ─────────────────────────────
-- Adds body_design jsonb to store block-editor JSON content.
-- body_html remains as rendered cache / fallback.

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS body_design JSONB;

ALTER TABLE email_campaigns
  ADD COLUMN IF NOT EXISTS body_design JSONB;

-- ─── Storage: mails bucket ──────────────────────────────────
-- Public read (recipients fetch images), admin write.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mails', 'mails', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "mails_public_read" ON storage.objects;
CREATE POLICY "mails_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'mails');

DROP POLICY IF EXISTS "mails_admin_insert" ON storage.objects;
CREATE POLICY "mails_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'mails'
    AND (is_admin() OR auth.role() = 'service_role')
  );

DROP POLICY IF EXISTS "mails_admin_update" ON storage.objects;
CREATE POLICY "mails_admin_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'mails'
    AND (is_admin() OR auth.role() = 'service_role')
  );

DROP POLICY IF EXISTS "mails_admin_delete" ON storage.objects;
CREATE POLICY "mails_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'mails'
    AND (is_admin() OR auth.role() = 'service_role')
  );
