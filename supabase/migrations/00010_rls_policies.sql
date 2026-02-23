-- Enable RLS on all tables (deny by default)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is a consultant (full or limited)
CREATE OR REPLACE FUNCTION is_consultant()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('consultant', 'consultant_limited')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ===================
-- PROFILES
-- ===================

-- Users can read their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid());

-- Consultants can see profiles of clients they've interacted with
CREATE POLICY profiles_select_consultant_clients ON profiles
  FOR SELECT USING (
    is_consultant() AND (
      id IN (SELECT client_id FROM bookings WHERE consultant_id = auth.uid())
      OR id IN (
        SELECT fe.client_id FROM formation_enrollments fe
        JOIN formations f ON fe.formation_id = f.id
        WHERE f.consultant_id = auth.uid()
      )
    )
  );

-- Admin can see all profiles
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT USING (is_admin());

-- Users can update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin can update any profile
CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE USING (is_admin());

-- ===================
-- CONSULTANTS
-- ===================

-- Anyone can read active consultants (public profiles)
CREATE POLICY consultants_select_public ON consultants
  FOR SELECT USING (is_active = true);

-- Consultant can read their own record even if inactive
CREATE POLICY consultants_select_own ON consultants
  FOR SELECT USING (id = auth.uid());

-- Admin can see all
CREATE POLICY consultants_select_admin ON consultants
  FOR SELECT USING (is_admin());

-- Consultant can update their own record
CREATE POLICY consultants_update_own ON consultants
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin can update any consultant
CREATE POLICY consultants_update_admin ON consultants
  FOR UPDATE USING (is_admin());

-- Admin can insert consultants
CREATE POLICY consultants_insert_admin ON consultants
  FOR INSERT WITH CHECK (is_admin());

-- ===================
-- AVAILABILITIES
-- ===================

CREATE POLICY availabilities_select_public ON availabilities
  FOR SELECT USING (
    consultant_id IN (SELECT id FROM consultants WHERE is_active = true)
  );

CREATE POLICY availabilities_select_own ON availabilities
  FOR SELECT USING (consultant_id = auth.uid());

CREATE POLICY availabilities_insert_own ON availabilities
  FOR INSERT WITH CHECK (consultant_id = auth.uid());

CREATE POLICY availabilities_update_own ON availabilities
  FOR UPDATE USING (consultant_id = auth.uid());

CREATE POLICY availabilities_delete_own ON availabilities
  FOR DELETE USING (consultant_id = auth.uid());

CREATE POLICY availabilities_admin ON availabilities
  FOR ALL USING (is_admin());

-- ===================
-- AVAILABILITY EXCEPTIONS
-- ===================

CREATE POLICY avail_exceptions_select ON availability_exceptions
  FOR SELECT USING (
    consultant_id = auth.uid()
    OR consultant_id IN (SELECT id FROM consultants WHERE is_active = true)
    OR is_admin()
  );

CREATE POLICY avail_exceptions_insert_own ON availability_exceptions
  FOR INSERT WITH CHECK (consultant_id = auth.uid());

CREATE POLICY avail_exceptions_update_own ON availability_exceptions
  FOR UPDATE USING (consultant_id = auth.uid());

CREATE POLICY avail_exceptions_delete_own ON availability_exceptions
  FOR DELETE USING (consultant_id = auth.uid());

CREATE POLICY avail_exceptions_admin ON availability_exceptions
  FOR ALL USING (is_admin());

-- ===================
-- CONSULTATION TYPES
-- ===================

CREATE POLICY consultation_types_select_public ON consultation_types
  FOR SELECT USING (
    is_active = true
    AND consultant_id IN (SELECT id FROM consultants WHERE is_active = true)
  );

CREATE POLICY consultation_types_select_own ON consultation_types
  FOR SELECT USING (consultant_id = auth.uid());

CREATE POLICY consultation_types_insert_own ON consultation_types
  FOR INSERT WITH CHECK (consultant_id = auth.uid() AND is_consultant());

CREATE POLICY consultation_types_update_own ON consultation_types
  FOR UPDATE USING (consultant_id = auth.uid());

CREATE POLICY consultation_types_delete_own ON consultation_types
  FOR DELETE USING (consultant_id = auth.uid());

CREATE POLICY consultation_types_admin ON consultation_types
  FOR ALL USING (is_admin());

-- ===================
-- BOOKINGS
-- ===================

-- Clients can see their own bookings
CREATE POLICY bookings_select_client ON bookings
  FOR SELECT USING (client_id = auth.uid());

-- Consultants can see bookings assigned to them
CREATE POLICY bookings_select_consultant ON bookings
  FOR SELECT USING (consultant_id = auth.uid());

-- Admin can see all
CREATE POLICY bookings_select_admin ON bookings
  FOR SELECT USING (is_admin());

-- Authenticated clients can create bookings
CREATE POLICY bookings_insert_client ON bookings
  FOR INSERT WITH CHECK (
    client_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'client'
  );

-- Consultants can update booking status
CREATE POLICY bookings_update_consultant ON bookings
  FOR UPDATE USING (consultant_id = auth.uid());

-- Clients can update their own bookings (for cancellation)
CREATE POLICY bookings_update_client ON bookings
  FOR UPDATE USING (client_id = auth.uid());

-- Admin can update any booking
CREATE POLICY bookings_update_admin ON bookings
  FOR UPDATE USING (is_admin());

-- ===================
-- FORMATIONS
-- ===================

-- Anyone can read published formations
CREATE POLICY formations_select_published ON formations
  FOR SELECT USING (status = 'published' AND deleted_at IS NULL);

-- Consultant can see their own formations (any status)
CREATE POLICY formations_select_own ON formations
  FOR SELECT USING (consultant_id = auth.uid());

-- Collaborators can see formations they're part of
CREATE POLICY formations_select_collab ON formations
  FOR SELECT USING (
    id IN (SELECT formation_id FROM formation_collaborators WHERE consultant_id = auth.uid())
  );

-- Admin can see all
CREATE POLICY formations_select_admin ON formations
  FOR SELECT USING (is_admin());

-- Consultant can create formations
CREATE POLICY formations_insert_consultant ON formations
  FOR INSERT WITH CHECK (consultant_id = auth.uid() AND is_consultant());

-- Consultant can update their own
CREATE POLICY formations_update_own ON formations
  FOR UPDATE USING (consultant_id = auth.uid());

-- Collaborators can update
CREATE POLICY formations_update_collab ON formations
  FOR UPDATE USING (
    id IN (SELECT formation_id FROM formation_collaborators WHERE consultant_id = auth.uid())
  );

-- Admin can update any
CREATE POLICY formations_update_admin ON formations
  FOR UPDATE USING (is_admin());

-- Consultant can delete (soft) their own
CREATE POLICY formations_delete_own ON formations
  FOR DELETE USING (consultant_id = auth.uid());

-- ===================
-- FORMATION COLLABORATORS
-- ===================

CREATE POLICY formation_collab_select ON formation_collaborators
  FOR SELECT USING (
    consultant_id = auth.uid()
    OR formation_id IN (SELECT id FROM formations WHERE consultant_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY formation_collab_insert ON formation_collaborators
  FOR INSERT WITH CHECK (
    formation_id IN (SELECT id FROM formations WHERE consultant_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY formation_collab_delete ON formation_collaborators
  FOR DELETE USING (
    formation_id IN (SELECT id FROM formations WHERE consultant_id = auth.uid())
    OR is_admin()
  );

-- ===================
-- FORMATION SECTIONS & BLOCKS
-- ===================

CREATE POLICY sections_select ON formation_sections
  FOR SELECT USING (
    formation_id IN (SELECT id FROM formations WHERE status = 'published' AND deleted_at IS NULL)
    OR formation_id IN (SELECT id FROM formations WHERE consultant_id = auth.uid())
    OR formation_id IN (SELECT formation_id FROM formation_collaborators WHERE consultant_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY sections_insert ON formation_sections
  FOR INSERT WITH CHECK (
    formation_id IN (SELECT id FROM formations WHERE consultant_id = auth.uid())
    OR formation_id IN (SELECT formation_id FROM formation_collaborators WHERE consultant_id = auth.uid())
  );

CREATE POLICY sections_update ON formation_sections
  FOR UPDATE USING (
    formation_id IN (SELECT id FROM formations WHERE consultant_id = auth.uid())
    OR formation_id IN (SELECT formation_id FROM formation_collaborators WHERE consultant_id = auth.uid())
  );

CREATE POLICY sections_delete ON formation_sections
  FOR DELETE USING (
    formation_id IN (SELECT id FROM formations WHERE consultant_id = auth.uid())
  );

CREATE POLICY blocks_select ON formation_blocks
  FOR SELECT USING (
    section_id IN (
      SELECT fs.id FROM formation_sections fs
      JOIN formations f ON fs.formation_id = f.id
      WHERE f.status = 'published' AND f.deleted_at IS NULL
    )
    OR section_id IN (
      SELECT fs.id FROM formation_sections fs
      JOIN formations f ON fs.formation_id = f.id
      WHERE f.consultant_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY blocks_insert ON formation_blocks
  FOR INSERT WITH CHECK (
    section_id IN (
      SELECT fs.id FROM formation_sections fs
      JOIN formations f ON fs.formation_id = f.id
      WHERE f.consultant_id = auth.uid()
    )
  );

CREATE POLICY blocks_update ON formation_blocks
  FOR UPDATE USING (
    section_id IN (
      SELECT fs.id FROM formation_sections fs
      JOIN formations f ON fs.formation_id = f.id
      WHERE f.consultant_id = auth.uid()
    )
  );

CREATE POLICY blocks_delete ON formation_blocks
  FOR DELETE USING (
    section_id IN (
      SELECT fs.id FROM formation_sections fs
      JOIN formations f ON fs.formation_id = f.id
      WHERE f.consultant_id = auth.uid()
    )
  );

-- ===================
-- FORMATION ENROLLMENTS & PROGRESS
-- ===================

-- Client can see their own enrollments
CREATE POLICY enrollments_select_client ON formation_enrollments
  FOR SELECT USING (client_id = auth.uid());

-- Consultant can see enrollments for their formations
CREATE POLICY enrollments_select_consultant ON formation_enrollments
  FOR SELECT USING (
    formation_id IN (SELECT id FROM formations WHERE consultant_id = auth.uid())
  );

-- Admin can see all
CREATE POLICY enrollments_select_admin ON formation_enrollments
  FOR SELECT USING (is_admin());

-- Progress: client can see and update their own
CREATE POLICY progress_select_own ON formation_progress
  FOR SELECT USING (
    enrollment_id IN (SELECT id FROM formation_enrollments WHERE client_id = auth.uid())
  );

CREATE POLICY progress_insert_own ON formation_progress
  FOR INSERT WITH CHECK (
    enrollment_id IN (SELECT id FROM formation_enrollments WHERE client_id = auth.uid())
  );

CREATE POLICY progress_update_own ON formation_progress
  FOR UPDATE USING (
    enrollment_id IN (SELECT id FROM formation_enrollments WHERE client_id = auth.uid())
  );

-- ===================
-- EVENTS & REGISTRATIONS
-- ===================

CREATE POLICY events_select_published ON events
  FOR SELECT USING (is_published = true);

CREATE POLICY events_select_own ON events
  FOR SELECT USING (consultant_id = auth.uid());

CREATE POLICY events_select_admin ON events
  FOR SELECT USING (is_admin());

CREATE POLICY events_insert_consultant ON events
  FOR INSERT WITH CHECK (consultant_id = auth.uid() AND is_consultant());

CREATE POLICY events_update_own ON events
  FOR UPDATE USING (consultant_id = auth.uid());

CREATE POLICY events_update_admin ON events
  FOR UPDATE USING (is_admin());

CREATE POLICY event_reg_select_client ON event_registrations
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY event_reg_select_consultant ON event_registrations
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE consultant_id = auth.uid())
  );

CREATE POLICY event_reg_select_admin ON event_registrations
  FOR SELECT USING (is_admin());

CREATE POLICY event_reg_insert_client ON event_registrations
  FOR INSERT WITH CHECK (client_id = auth.uid());

-- ===================
-- PAYMENTS
-- ===================

CREATE POLICY payments_select_client ON payments
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY payments_select_consultant ON payments
  FOR SELECT USING (consultant_id = auth.uid());

CREATE POLICY payments_select_admin ON payments
  FOR SELECT USING (is_admin());

-- ===================
-- CRM
-- ===================

CREATE POLICY crm_notes_select_own ON crm_notes
  FOR SELECT USING (consultant_id = auth.uid());

CREATE POLICY crm_notes_select_admin ON crm_notes
  FOR SELECT USING (is_admin());

CREATE POLICY crm_notes_insert_own ON crm_notes
  FOR INSERT WITH CHECK (consultant_id = auth.uid() AND is_consultant());

CREATE POLICY crm_notes_update_own ON crm_notes
  FOR UPDATE USING (consultant_id = auth.uid());

CREATE POLICY crm_notes_delete_own ON crm_notes
  FOR DELETE USING (consultant_id = auth.uid());

CREATE POLICY crm_tags_select ON crm_tags
  FOR SELECT USING (
    consultant_id = auth.uid() OR consultant_id IS NULL OR is_admin()
  );

CREATE POLICY crm_tags_insert ON crm_tags
  FOR INSERT WITH CHECK (consultant_id = auth.uid() OR is_admin());

CREATE POLICY crm_tags_update ON crm_tags
  FOR UPDATE USING (consultant_id = auth.uid() OR is_admin());

CREATE POLICY crm_tags_delete ON crm_tags
  FOR DELETE USING (consultant_id = auth.uid() OR is_admin());

CREATE POLICY crm_contact_tags_select ON crm_contact_tags
  FOR SELECT USING (consultant_id = auth.uid() OR is_admin());

CREATE POLICY crm_contact_tags_insert ON crm_contact_tags
  FOR INSERT WITH CHECK (consultant_id = auth.uid());

CREATE POLICY crm_contact_tags_delete ON crm_contact_tags
  FOR DELETE USING (consultant_id = auth.uid());

-- ===================
-- EMAILS & AUTOMATIONS
-- ===================

CREATE POLICY email_templates_select ON email_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY email_templates_insert ON email_templates
  FOR INSERT WITH CHECK (is_consultant() OR is_admin());

CREATE POLICY email_templates_update ON email_templates
  FOR UPDATE USING (created_by = auth.uid() OR is_admin());

CREATE POLICY email_campaigns_select ON email_campaigns
  FOR SELECT USING (consultant_id = auth.uid() OR is_admin());

CREATE POLICY email_campaigns_insert ON email_campaigns
  FOR INSERT WITH CHECK (consultant_id = auth.uid() OR is_admin());

CREATE POLICY email_campaigns_update ON email_campaigns
  FOR UPDATE USING (consultant_id = auth.uid() OR is_admin());

CREATE POLICY automations_select ON automations
  FOR SELECT USING (consultant_id = auth.uid() OR is_admin());

CREATE POLICY automations_insert ON automations
  FOR INSERT WITH CHECK (consultant_id = auth.uid() OR is_admin());

CREATE POLICY automations_update ON automations
  FOR UPDATE USING (consultant_id = auth.uid() OR is_admin());

CREATE POLICY automations_delete ON automations
  FOR DELETE USING (consultant_id = auth.uid() OR is_admin());

CREATE POLICY automation_logs_select ON automation_logs
  FOR SELECT USING (
    automation_id IN (SELECT id FROM automations WHERE consultant_id = auth.uid())
    OR is_admin()
  );

-- ===================
-- AUDIT LOGS & SETTINGS
-- ===================

CREATE POLICY audit_logs_select_admin ON audit_logs
  FOR SELECT USING (is_admin());

CREATE POLICY audit_logs_select_own ON audit_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY platform_settings_select ON platform_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY platform_settings_update ON platform_settings
  FOR UPDATE USING (is_admin());
