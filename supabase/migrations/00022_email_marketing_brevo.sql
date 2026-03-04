-- ============================================================
-- Migration 00021 : Email Marketing (Brevo) — EPIC-21
-- ============================================================
-- Adds columns to email_campaigns for recipient targeting,
-- creates consultant_brevo_lists for admin-assigned list access,
-- and adds updated_at + body_html to email_campaigns.
-- ============================================================
-- 1. Add missing columns to email_campaigns
ALTER TABLE email_campaigns
ADD COLUMN IF NOT EXISTS body_html TEXT,
    ADD COLUMN IF NOT EXISTS recipient_list_ids INTEGER [] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS recipient_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE TRIGGER email_campaigns_updated_at BEFORE
UPDATE ON email_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- 2. Table: consultant_brevo_lists (admin assigns Brevo lists to consultantes)
CREATE TABLE consultant_brevo_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
    brevo_list_id INTEGER NOT NULL,
    list_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (consultant_id, brevo_list_id)
);
CREATE INDEX idx_consultant_brevo_lists_consultant ON consultant_brevo_lists(consultant_id);
-- 3. RLS for consultant_brevo_lists
ALTER TABLE consultant_brevo_lists ENABLE ROW LEVEL SECURITY;
-- Admin can do everything
CREATE POLICY consultant_brevo_lists_admin_all ON consultant_brevo_lists FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
-- Consultants can read their own assigned lists
CREATE POLICY consultant_brevo_lists_consultant_select ON consultant_brevo_lists FOR
SELECT TO authenticated USING (
        consultant_id = auth.uid()
        OR is_admin()
    );