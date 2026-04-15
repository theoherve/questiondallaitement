import { createAdminClient } from "@/lib/supabase/admin";
import type { AutoAssignRule, AudienceConfig } from "./types";

/**
 * Auto-assign labels when a client purchases a formation.
 * Checks all labels with auto_assign_rule and assigns matching ones.
 * Also schedules catch-up workflow actions for future events.
 */
export const autoAssignLabelsOnEnrollment = async (
  clientId: string,
  formationId: string,
): Promise<void> => {
  const supabase = createAdminClient();

  const { data: labels } = await supabase
    .from("labels")
    .select("id, auto_assign_rule")
    .not("auto_assign_rule", "is", null);

  if (!labels?.length) return;

  const labelsToAssign: string[] = [];

  for (const label of labels) {
    const rule = label.auto_assign_rule as AutoAssignRule | null;
    if (!rule || rule.trigger !== "formation_enrolled") continue;

    // No formation_ids = any formation triggers this label
    if (!rule.formation_ids?.length || rule.formation_ids.includes(formationId)) {
      labelsToAssign.push(label.id);
    }
  }

  if (!labelsToAssign.length) return;

  // Upsert contact_labels for each matching label
  const rows = labelsToAssign.map((labelId) => ({
    profile_id: clientId,
    label_id: labelId,
    assigned_by: "auto",
  }));

  await supabase
    .from("contact_labels")
    .upsert(rows, { onConflict: "profile_id,label_id" });

  // Catch-up: schedule workflow actions for future events
  await scheduleCatchUpActions(clientId, labelsToAssign);
};

/**
 * When a user gets new labels, check if there are active workflows
 * targeting those labels with future scheduled events. Schedule any
 * missing actions for steps that haven't passed yet.
 */
const scheduleCatchUpActions = async (
  profileId: string,
  newLabelIds: string[],
): Promise<void> => {
  const supabase = createAdminClient();

  // Find active workflows that target any of the newly assigned labels
  const { data: workflows } = await supabase
    .from("admin_workflows")
    .select("id, trigger_type, trigger_config, audience_config")
    .eq("is_active", true)
    .eq("trigger_type", "recurring_event");

  if (!workflows?.length) return;

  const now = new Date();

  for (const workflow of workflows) {
    const audience = workflow.audience_config as AudienceConfig;
    // Check if any of the new labels match this workflow's audience
    const hasMatch = audience.label_ids.some((id) =>
      newLabelIds.includes(id),
    );
    if (!hasMatch) continue;

    const triggerConfig = workflow.trigger_config as {
      recurring_definition_id?: string;
    };
    if (!triggerConfig.recurring_definition_id) continue;

    // Find future events for this recurring definition
    const { data: futureEvents } = await supabase
      .from("events")
      .select("id, occurrence_date")
      .eq("recurring_definition_id", triggerConfig.recurring_definition_id)
      .gte("starts_at", now.toISOString());

    if (!futureEvents?.length) continue;

    // Get workflow steps
    const { data: steps } = await supabase
      .from("admin_workflow_steps")
      .select("id, delay_days, send_time")
      .eq("workflow_id", workflow.id)
      .order("position");

    if (!steps?.length) continue;

    // Schedule actions for future steps only
    for (const event of futureEvents) {
      if (!event.occurrence_date) continue;

      for (const step of steps) {
        const scheduledFor = computeScheduledFor(
          event.occurrence_date,
          step.delay_days,
          step.send_time,
        );

        // Only schedule if in the future
        if (new Date(scheduledFor) <= now) continue;

        await supabase
          .from("scheduled_workflow_actions")
          .upsert(
            {
              workflow_id: workflow.id,
              step_id: step.id,
              profile_id: profileId,
              anchor_event_id: event.id,
              scheduled_for: scheduledFor,
              status: "pending",
            },
            {
              onConflict: "step_id,profile_id,anchor_event_id",
              ignoreDuplicates: true,
            },
          );
      }
    }
  }
};

/**
 * Resolve audience profiles for a workflow's audience config.
 * Returns array of profile IDs matching the label criteria.
 */
export const resolveAudience = async (
  audienceConfig: AudienceConfig,
): Promise<string[]> => {
  const supabase = createAdminClient();
  const { label_ids, match } = audienceConfig;

  if (!label_ids.length) return [];

  if (match === "any") {
    // Profiles with at least one of the labels
    const { data } = await supabase
      .from("contact_labels")
      .select("profile_id")
      .in("label_id", label_ids);

    // Deduplicate
    return [...new Set((data ?? []).map((r) => r.profile_id))];
  }

  // match === "all": profiles with every label
  const { data } = await supabase
    .from("contact_labels")
    .select("profile_id, label_id")
    .in("label_id", label_ids);

  if (!data?.length) return [];

  const countByProfile = new Map<string, number>();
  for (const row of data) {
    countByProfile.set(
      row.profile_id,
      (countByProfile.get(row.profile_id) ?? 0) + 1,
    );
  }

  return [...countByProfile.entries()]
    .filter(([, count]) => count >= label_ids.length)
    .map(([profileId]) => profileId);
};

/**
 * Compute absolute scheduled_for timestamp from occurrence date + delay + send time.
 * Interprets send_time in Europe/Paris timezone.
 */
export const computeScheduledFor = (
  occurrenceDate: string,
  delayDays: number,
  sendTime: string,
): string => {
  // Parse occurrence date (YYYY-MM-DD)
  const [year, month, day] = occurrenceDate.split("-").map(Number);

  // Apply delay
  const date = new Date(year, month - 1, day + delayDays);

  // Parse send time (HH:MM)
  const [hours, minutes] = sendTime.split(":").map(Number);

  // Create date in Europe/Paris then convert to UTC
  // Use a temporary date to find the UTC offset for this specific datetime in Paris
  const parisDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

  // Get UTC offset for this date in Paris
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find((p) => p.type === "timeZoneName");
  const offsetStr = offsetPart?.value ?? "GMT+1";

  // Parse offset (e.g., "GMT+2" → +2, "GMT+1" → +1)
  const offsetMatch = offsetStr.match(/GMT([+-]\d+)/);
  const offsetHours = offsetMatch ? parseInt(offsetMatch[1], 10) : 1;

  // Build UTC date
  const utcDate = new Date(`${parisDateStr}:00.000Z`);
  utcDate.setHours(utcDate.getHours() - offsetHours);

  return utcDate.toISOString();
};
