"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  labelSchema,
  recurringEventDefinitionSchema,
  adminWorkflowSchema,
} from "@/validations/admin-workflows";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";
import type {
  AdminWorkflow,
  AdminWorkflowStep,
  Label,
  RecurringEventDefinition,
  AdminWorkflowLog,
  ScheduledWorkflowAction,
} from "@/lib/admin-workflows/types";
import { triggerManualWorkflow as triggerManual } from "@/lib/admin-workflows/scheduler";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

const REVALIDATE_PATH = "/admin/automations";

// ─── Labels ─────────────────────────────────────────────────

export const getLabels = async (): Promise<Label[]> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("labels")
    .select("*")
    .order("name");
  return (data ?? []) as Label[];
};

export const getLabelsWithCounts = async (): Promise<
  (Label & { contact_count: number })[]
> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const [labelsResult, countsResult] = await Promise.all([
    supabase.from("labels").select("*").order("name"),
    supabase.from("contact_labels").select("label_id"),
  ]);

  const labels = (labelsResult.data ?? []) as Label[];
  const countMap = new Map<string, number>();
  for (const row of countsResult.data ?? []) {
    countMap.set(row.label_id, (countMap.get(row.label_id) ?? 0) + 1);
  }

  return labels.map((l) => ({
    ...l,
    contact_count: countMap.get(l.id) ?? 0,
  }));
};

export const createLabel = async (
  data: unknown,
): Promise<ActionResult<Label>> => {
  await requireAdmin();
  const parsed = labelSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message };

  const supabase = createAdminClient();
  const { data: label, error } = await supabase
    .from("labels")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    if (error.code === "23505")
      return { success: false, error: "Ce nom ou slug existe déjà" };
    return { success: false, error: error.message };
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true, data: label as Label };
};

export const updateLabel = async (
  id: string,
  data: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsed = labelSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("labels")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

export const deleteLabel = async (id: string): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("labels").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

// ─── Recurring Event Definitions ────────────────────────────

export const getRecurringDefinitions = async (): Promise<
  RecurringEventDefinition[]
> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("recurring_event_definitions")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as RecurringEventDefinition[];
};

export const getRecurringDefinition = async (
  id: string,
): Promise<RecurringEventDefinition | null> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("recurring_event_definitions")
    .select("*")
    .eq("id", id)
    .single();
  return data as RecurringEventDefinition | null;
};

export const createRecurringDefinition = async (
  data: unknown,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const parsed = recurringEventDefinitionSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message };

  const supabase = createAdminClient();
  const { data: def, error } = await supabase
    .from("recurring_event_definitions")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { success: true, data: def };
};

export const updateRecurringDefinition = async (
  id: string,
  data: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsed = recurringEventDefinitionSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("recurring_event_definitions")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

export const deleteRecurringDefinition = async (
  id: string,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("recurring_event_definitions")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

// ─── Workflows ──────────────────────────────────────────────

export const getWorkflows = async (): Promise<
  (AdminWorkflow & { steps_count: number })[]
> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const [wfResult, stepsResult] = await Promise.all([
    supabase
      .from("admin_workflows")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("admin_workflow_steps").select("workflow_id"),
  ]);

  const workflows = (wfResult.data ?? []) as AdminWorkflow[];
  const stepCounts = new Map<string, number>();
  for (const s of stepsResult.data ?? []) {
    stepCounts.set(s.workflow_id, (stepCounts.get(s.workflow_id) ?? 0) + 1);
  }

  return workflows.map((w) => ({
    ...w,
    steps_count: stepCounts.get(w.id) ?? 0,
  }));
};

export const getWorkflow = async (
  id: string,
): Promise<(AdminWorkflow & { steps: AdminWorkflowStep[] }) | null> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const [wfResult, stepsResult] = await Promise.all([
    supabase.from("admin_workflows").select("*").eq("id", id).single(),
    supabase
      .from("admin_workflow_steps")
      .select("*")
      .eq("workflow_id", id)
      .order("position"),
  ]);

  if (!wfResult.data) return null;

  return {
    ...(wfResult.data as AdminWorkflow),
    steps: (stepsResult.data ?? []) as AdminWorkflowStep[],
  };
};

export const createWorkflow = async (
  data: unknown,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const parsed = adminWorkflowSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message };

  const supabase = createAdminClient();
  const { steps, ...workflowData } = parsed.data;

  const { data: workflow, error } = await supabase
    .from("admin_workflows")
    .insert({
      name: workflowData.name,
      description: workflowData.description ?? null,
      trigger_type: workflowData.trigger_type,
      trigger_config: workflowData.trigger_config,
      audience_config: workflowData.audience_config,
      is_active: workflowData.is_active,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  // Insert steps
  if (steps.length > 0) {
    const stepRows = steps.map((s) => ({
      workflow_id: workflow.id,
      position: s.position,
      delay_days: s.delay_days,
      send_time: s.send_time,
      action_type: s.action_type,
      action_config: s.action_config,
    }));

    const { error: stepsError } = await supabase
      .from("admin_workflow_steps")
      .insert(stepRows);

    if (stepsError) {
      // Rollback workflow
      await supabase.from("admin_workflows").delete().eq("id", workflow.id);
      return { success: false, error: stepsError.message };
    }
  }

  // Handle save_as_template for email steps
  for (const step of steps) {
    if (
      step.action_type === "send_email" &&
      step.action_config &&
      "save_as_template" in step.action_config &&
      step.action_config.save_as_template &&
      "template_name" in step.action_config &&
      step.action_config.template_name
    ) {
      // Upsert by name so re-editing a workflow doesn't duplicate templates.
      await supabase.from("email_templates").upsert(
        {
          name: step.action_config.template_name,
          subject: step.action_config.subject,
          body_html: step.action_config.body_html,
          body_design:
            "body_design" in step.action_config
              ? (step.action_config.body_design ?? null)
              : null,
          type: "transactional",
          variables: [],
        },
        { onConflict: "name" },
      );
    }
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true, data: { id: workflow.id } };
};

export const updateWorkflow = async (
  id: string,
  data: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsed = adminWorkflowSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message };

  const supabase = createAdminClient();
  const { steps, ...workflowData } = parsed.data;

  const { error } = await supabase
    .from("admin_workflows")
    .update({
      name: workflowData.name,
      description: workflowData.description ?? null,
      trigger_type: workflowData.trigger_type,
      trigger_config: workflowData.trigger_config,
      audience_config: workflowData.audience_config,
      is_active: workflowData.is_active,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  /*
   * Steps diff: preserve existing step ids so `scheduled_workflow_actions`
   * (FK cascade delete) aren't wiped on every edit. Rules:
   *   - input step has an `id` matching an existing row → UPDATE in place
   *   - input step has no id or an unknown id → INSERT
   *   - existing row not referenced in input → DELETE (its scheduled
   *     actions cascade away, which is correct when the step is removed)
   */
  const { data: existingRows } = await supabase
    .from("admin_workflow_steps")
    .select("id")
    .eq("workflow_id", id);
  const existingIds = new Set((existingRows ?? []).map((r) => r.id));

  const toUpdate: { id: string; row: Record<string, unknown> }[] = [];
  const toInsert: Record<string, unknown>[] = [];

  for (const s of steps) {
    const row = {
      position: s.position,
      delay_days: s.delay_days,
      send_time: s.send_time,
      action_type: s.action_type,
      action_config: s.action_config,
    };
    if (s.id && existingIds.has(s.id)) {
      toUpdate.push({ id: s.id, row });
      existingIds.delete(s.id);
    } else {
      toInsert.push({ workflow_id: id, ...row });
    }
  }

  // Delete orphan steps first so position collisions don't clash during update.
  if (existingIds.size > 0) {
    await supabase
      .from("admin_workflow_steps")
      .delete()
      .in("id", [...existingIds]);
  }

  for (const { id: stepId, row } of toUpdate) {
    await supabase.from("admin_workflow_steps").update(row).eq("id", stepId);
  }

  if (toInsert.length > 0) {
    await supabase.from("admin_workflow_steps").insert(toInsert);
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

export const deleteWorkflow = async (id: string): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("admin_workflows")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

export const toggleWorkflowActive = async (
  id: string,
  isActive: boolean,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("admin_workflows")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

// ─── Utils ──────────────────────────────────────────────────

export const getAudienceCount = async (
  labelIds: string[],
  match: "any" | "all",
): Promise<number> => {
  await requireAdmin();
  const { resolveAudience } = await import("@/lib/admin-workflows/labels");
  const profileIds = await resolveAudience({ label_ids: labelIds, match });
  return profileIds.length;
};

export const triggerManualWorkflow = async (
  workflowId: string,
): Promise<ActionResult<{ scheduled: number }>> => {
  await requireAdmin();
  const result = await triggerManual(workflowId);
  revalidatePath(REVALIDATE_PATH);
  return { success: true, data: result };
};

export const getWorkflowLogs = async (
  workflowId: string,
): Promise<AdminWorkflowLog[]> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("admin_workflow_logs")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as AdminWorkflowLog[];
};

export const getScheduledActions = async (
  workflowId: string,
): Promise<(ScheduledWorkflowAction & { profile_email?: string })[]> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("scheduled_workflow_actions")
    .select("*, profiles!inner(email)")
    .eq("workflow_id", workflowId)
    .order("scheduled_for", { ascending: false })
    .limit(100);

  return (data ?? []).map((row) => {
    const { profiles, ...rest } = row as Record<string, unknown>;
    return {
      ...rest,
      profile_email: (profiles as { email: string } | null)?.email,
    } as ScheduledWorkflowAction & { profile_email?: string };
  });
};

export const getEmailTemplates = async (): Promise<
  {
    id: string;
    name: string;
    subject: string;
    body_html: string;
    body_design: Record<string, unknown> | null;
  }[]
> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("email_templates")
    .select("id, name, subject, body_html, body_design")
    .order("name");
  return data ?? [];
};

export const getConsultants = async (): Promise<
  { id: string; name: string }[]
> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("consultants")
    .select("id, profiles!consultants_id_fkey(first_name, last_name)")
    .eq("is_active", true);

  return (data ?? []).map((c) => {
    const profiles = c.profiles as unknown as {
      first_name: string | null;
      last_name: string | null;
    } | null;
    return {
      id: c.id,
      name: profiles
        ? `${profiles.first_name ?? ""} ${profiles.last_name ?? ""}`.trim()
        : c.id.slice(0, 8),
    };
  });
};

export const getAccompagnements = async (): Promise<
  { id: string; title: string }[]
> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("formations")
    .select("id, title")
    .eq("status", "published")
    .order("title");
  return data ?? [];
};
