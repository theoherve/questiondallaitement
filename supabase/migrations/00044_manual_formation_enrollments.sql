-- Manual formation enrollments: allow admin/marketing_manager to enroll users
-- directly (without going through Stripe checkout).

ALTER TABLE formation_enrollments
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'stripe'
    CHECK (source IN ('stripe', 'manual')),
  ADD COLUMN IF NOT EXISTS enrolled_by UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_formation_enrollments_enrolled_by
  ON formation_enrollments(enrolled_by);

-- Update formation_access template to expose access_url (existing user → direct
-- formation link ; new user → /reset-password?email=...&next=...) plus the
-- is_new_account flag used by the renderer for conditional copy.
UPDATE email_templates
SET
  subject   = 'Accès à votre accompagnement — {{formation_title}}',
  body_html = '<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a"><h1 style="font-size:22px;margin-bottom:8px;color:#A0283E">Votre accompagnement est disponible</h1><p style="margin-bottom:16px">Bonjour {{client_name}},</p><p style="margin-bottom:16px">Vous avez été inscrit(e) à l''accompagnement <strong>{{formation_title}}</strong>.</p><p style="margin:24px 0"><a href="{{access_url}}" style="display:inline-block;padding:12px 24px;background-color:#A0283E;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Accéder à l''accompagnement</a></p><p style="color:#666;font-size:14px;margin-top:24px">À très bientôt,<br>L''équipe Question d''Allaitement</p></div>',
  variables = '["client_name", "formation_title", "access_url", "is_new_account"]'::jsonb
WHERE name = 'formation_access';
