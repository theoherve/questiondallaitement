-- ─── Admin Workflows ────────────────────────────────────────
-- Separate from consultant-scoped automations.
-- Audience-based + timed multi-step execution model.

CREATE TABLE admin_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  audience_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER admin_workflows_updated_at
  BEFORE UPDATE ON admin_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ─── Admin Workflow Steps ───────────────────────────────────

CREATE TABLE admin_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES admin_workflows(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  delay_days INT NOT NULL DEFAULT 0,
  send_time TIME NOT NULL DEFAULT '09:00',
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_workflow_steps_workflow ON admin_workflow_steps(workflow_id);

-- ─── Scheduled Workflow Actions ─────────────────────────────

CREATE TABLE scheduled_workflow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES admin_workflows(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES admin_workflow_steps(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anchor_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_swa_pending ON scheduled_workflow_actions(status, scheduled_for)
  WHERE status = 'pending';
CREATE INDEX idx_swa_workflow ON scheduled_workflow_actions(workflow_id);
CREATE INDEX idx_swa_profile ON scheduled_workflow_actions(profile_id);
CREATE UNIQUE INDEX idx_swa_no_duplicate ON scheduled_workflow_actions(step_id, profile_id, anchor_event_id)
  WHERE anchor_event_id IS NOT NULL;

-- ─── Admin Workflow Logs ────────────────────────────────────

CREATE TABLE admin_workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES admin_workflows(id) ON DELETE CASCADE,
  trigger_data JSONB,
  actions_scheduled INT NOT NULL DEFAULT 0,
  actions_executed INT NOT NULL DEFAULT 0,
  actions_failed INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_admin_workflow_logs_workflow ON admin_workflow_logs(workflow_id);

-- ─── RLS ────────────────────────────────────────────────────

ALTER TABLE admin_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_workflow_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_workflows_all ON admin_workflows
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  );

CREATE POLICY admin_workflow_steps_all ON admin_workflow_steps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  );

CREATE POLICY scheduled_workflow_actions_all ON scheduled_workflow_actions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  );

CREATE POLICY admin_workflow_logs_all ON admin_workflow_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  );
