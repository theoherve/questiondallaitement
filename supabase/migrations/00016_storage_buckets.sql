-- Migration 00016: Supabase Storage buckets + policies (EPIC-13)

-- 1) Create buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('formations', 'formations', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('downloads', 'downloads', false, 52428800, NULL),
  ('blog', 'blog', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- 2) Storage policies — avatars (public read, authenticated write own)
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_auth_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_auth_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3) Storage policies — formations (public read, admin write via service role)
CREATE POLICY "formations_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'formations');

CREATE POLICY "formations_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'formations'
    AND (is_admin() OR auth.role() = 'service_role')
  );

CREATE POLICY "formations_admin_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'formations'
    AND (is_admin() OR auth.role() = 'service_role')
  );

CREATE POLICY "formations_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'formations'
    AND (is_admin() OR auth.role() = 'service_role')
  );

-- 4) Storage policies — downloads (authenticated read if enrolled, admin write)
CREATE POLICY "downloads_enrolled_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'downloads'
    AND (
      is_admin()
      OR auth.role() = 'service_role'
      OR EXISTS (
        SELECT 1 FROM formation_enrollments fe
        JOIN formations f ON fe.formation_id = f.id
        WHERE fe.client_id = auth.uid()
          AND f.id::text = (storage.foldername(name))[1]
      )
    )
  );

CREATE POLICY "downloads_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'downloads'
    AND (is_admin() OR auth.role() = 'service_role')
  );

CREATE POLICY "downloads_admin_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'downloads'
    AND (is_admin() OR auth.role() = 'service_role')
  );

CREATE POLICY "downloads_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'downloads'
    AND (is_admin() OR auth.role() = 'service_role')
  );

-- 5) Storage policies — blog (public read, admin write)
CREATE POLICY "blog_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog');

CREATE POLICY "blog_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'blog'
    AND (is_admin() OR auth.role() = 'service_role')
  );

CREATE POLICY "blog_admin_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'blog'
    AND (is_admin() OR auth.role() = 'service_role')
  );

CREATE POLICY "blog_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'blog'
    AND (is_admin() OR auth.role() = 'service_role')
  );
