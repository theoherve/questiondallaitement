import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAudience, computeScheduledFor } from "./labels";
import type { AudienceConfig } from "./types";

/**
 * Schedule workflow actions for all upcoming formations that don't have actions yet.
 * Called by the cron job after formation generation.
 */
export const scheduleWorkflowActionsForUpcomingFormations = async (): Promise<{
  scheduled: number;
}> => {
  const supabase = createAdminClient();
  let scheduled = 0;

  // Find active recurring_formation workflows
  const { data: workflows } = await supabase
    .from("admin_workflows")
    .select("id, trigger_type, trigger_config, audience_config")
    .eq("is_active", true)
    .eq("trigger_type", "recurring_formation");

  if (!workflows?.length) return { scheduled };

  for (const workflow of workflows) {
    const triggerConfig = workflow.trigger_config as {
      recurring_definition_id?: string;
    };
    if (!triggerConfig.recurring_definition_id) continue;

    // Get future formations for this definition
    const { data: formations } = await supabase
      .from("formations")
      .select("id, occurrence_date")
      .eq("recurring_definition_id", triggerConfig.recurring_definition_id)
      .gte("starts_at", new Date().toISOString());

    if (!formations?.length) continue;

    // Get workflow steps
    const { data: steps } = await supabase
      .from("admin_workflow_steps")
      .select("id, delay_days, send_time")
      .eq("workflow_id", workflow.id)
      .order("position");

    if (!steps?.length) continue;

    // Resolve audience
    const audience = workflow.audience_config as AudienceConfig;
    const profileIds = await resolveAudience(audience);

    if (!profileIds.length) continue;

    // Create log entry
    const { data: log } = await supabase
      .from("admin_workflow_logs")
      .insert({
        workflow_id: workflow.id,
        trigger_data: { formation_count: formations.length, audience_count: profileIds.length },
        status: "pending",
      })
      .select("id")
      .single();

    let workflowScheduled = 0;

    for (const formation of formations) {
      if (!formation.occurrence_date) continue;

      for (const step of steps) {
        const scheduledForStr = computeScheduledFor(
          formation.occurrence_date,
          step.delay_days,
          step.send_time,
        );

        // Only schedule future actions
        if (new Date(scheduledForStr) <= new Date()) continue;

        for (const profileId of profileIds) {
          // The migration's unique index is PARTIAL (WHERE anchor_formation_id
          // IS NOT NULL), so PG's ON CONFLICT can't infer it. We INSERT and
          // swallow duplicate-key (23505) errors — the partial index still
          // enforces uniqueness at write time.
          const { error } = await supabase
            .from("scheduled_workflow_actions")
            .insert({
              workflow_id: workflow.id,
              step_id: step.id,
              profile_id: profileId,
              anchor_formation_id: formation.id,
              scheduled_for: scheduledForStr,
              status: "pending",
            });

          if (!error) {
            workflowScheduled++;
          } else if (error.code !== "23505") {
            // Log anything that isn't an idempotent duplicate — silent
            // failures here hide genuine scheduling bugs.
            console.error(
              `scheduler: failed to schedule action for profile ${profileId} on step ${step.id}:`,
              error.message,
            );
          }
        }
      }
    }

    // Update log
    if (log) {
      await supabase
        .from("admin_workflow_logs")
        .update({
          actions_scheduled: workflowScheduled,
          status: workflowScheduled > 0 ? "in_progress" : "completed",
        })
        .eq("id", log.id);
    }

    scheduled += workflowScheduled;
  }

  return { scheduled };
};

/**
 * Schedule actions for a manual workflow trigger.
 * delay_days are relative to "today".
 */
export const triggerManualWorkflow = async (
  workflowId: string,
): Promise<{ scheduled: number }> => {
  const supabase = createAdminClient();
  let scheduled = 0;

  const { data: workflow } = await supabase
    .from("admin_workflows")
    .select("id, trigger_type, audience_config")
    .eq("id", workflowId)
    .eq("trigger_type", "manual")
    .single();

  if (!workflow) return { scheduled };

  const { data: steps } = await supabase
    .from("admin_workflow_steps")
    .select("id, delay_days, send_time")
    .eq("workflow_id", workflowId)
    .order("position");

  if (!steps?.length) return { scheduled };

  const audience = workflow.audience_config as AudienceConfig;
  const profileIds = await resolveAudience(audience);

  if (!profileIds.length) return { scheduled };

  // Today as occurrence date
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Create log
  const { data: log } = await supabase
    .from("admin_workflow_logs")
    .insert({
      workflow_id: workflowId,
      trigger_data: {
        type: "manual",
        triggered_at: new Date().toISOString(),
        audience_count: profileIds.length,
      },
      status: "in_progress",
    })
    .select("id")
    .single();

  for (const step of steps) {
    const scheduledForStr = computeScheduledFor(
      todayStr,
      step.delay_days,
      step.send_time,
    );

    for (const profileId of profileIds) {
      const { error } = await supabase
        .from("scheduled_workflow_actions")
        .insert({
          workflow_id: workflowId,
          step_id: step.id,
          profile_id: profileId,
          anchor_formation_id: null,
          scheduled_for: scheduledForStr,
          status: "pending",
        });

      if (!error) scheduled++;
    }
  }

  if (log) {
    await supabase
      .from("admin_workflow_logs")
      .update({ actions_scheduled: scheduled })
      .eq("id", log.id);
  }

  return { scheduled };
};
