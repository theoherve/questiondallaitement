import { createAdminClient } from "@/lib/supabase/admin";
import type { AutoAssignRule, AudienceConfig } from "./types";

/**
 * Auto-assign labels when a client purchases a formation.
 * Checks all labels with auto_assign_rule and assigns matching ones.
 * Also schedules catch-up workflow actions for future formations.
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
    if (!rule || rule.trigger !== "accompagnement_enrolled") continue;

    // No accompagnement_ids = any formation triggers this label
    if (!rule.accompagnement_ids?.length || rule.accompagnement_ids.includes(formationId)) {
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

  // Catch-up: schedule workflow actions for future formations
  await scheduleCatchUpActions(clientId, labelsToAssign);
};

/**
 * When a user gets new labels, check if there are active workflows
 * targeting those labels with future scheduled formations. Schedule any
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
    .eq("trigger_type", "recurring_formation");

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

    // Find future formations for this recurring definition
    const { data: futureFormations } = await supabase
      .from("formations")
      .select("id, occurrence_date")
      .eq("recurring_definition_id", triggerConfig.recurring_definition_id)
      .gte("starts_at", now.toISOString());

    if (!futureFormations?.length) continue;

    // Get workflow steps
    const { data: steps } = await supabase
      .from("admin_workflow_steps")
      .select("id, delay_days, send_time")
      .eq("workflow_id", workflow.id)
      .order("position");

    if (!steps?.length) continue;

    // Schedule actions for future steps only
    for (const formation of futureFormations) {
      if (!formation.occurrence_date) continue;

      for (const step of steps) {
        const scheduledFor = computeScheduledFor(
          formation.occurrence_date,
          step.delay_days,
          step.send_time,
        );

        // Only schedule if in the future
        if (new Date(scheduledFor) <= now) continue;

        // INSERT + swallow 23505 (see scheduler.ts for rationale — partial
        // unique index doesn't support ON CONFLICT inference).
        const { error } = await supabase
          .from("scheduled_workflow_actions")
          .insert({
            workflow_id: workflow.id,
            step_id: step.id,
            profile_id: profileId,
            anchor_formation_id: formation.id,
            scheduled_for: scheduledFor,
            status: "pending",
          });

        if (error && error.code !== "23505") {
          console.error(
            `catchup: failed to schedule action for profile ${profileId} on step ${step.id}:`,
            error.message,
          );
        }
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
 *
 * Uses the offset Intl reports for the *target* Paris datetime (candidate
 * UTC instant), which correctly resolves DST for CET (+01:00) vs CEST
 * (+02:00). Handles any hh:mm offset shape, not just whole-hour.
 */
export const computeScheduledFor = (
  occurrenceDate: string,
  delayDays: number,
  sendTime: string,
): string => {
  const [year, month, day] = occurrenceDate.split("-").map(Number);
  const [hours, minutes] = sendTime.split(":").map(Number);

  // First approximation: treat the local time as UTC, then adjust by the
  // offset Paris had at that instant.
  const pretendUtc = new Date(
    Date.UTC(year, month - 1, day + delayDays, hours, minutes, 0),
  );

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    timeZoneName: "longOffset",
  }).formatToParts(pretendUtc);
  // longOffset emits "GMT+01:00" / "GMT+02:00" reliably.
  const offsetStr =
    parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+01:00";
  const match = offsetStr.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  const sign = match?.[1] === "-" ? -1 : 1;
  const offH = match ? Number(match[2]) : 1;
  const offM = match?.[3] ? Number(match[3]) : 0;
  const offsetMs = sign * (offH * 60 + offM) * 60 * 1000;

  return new Date(pretendUtc.getTime() - offsetMs).toISOString();
};
