import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail, renderTemplate } from "@/lib/resend/client";
import { resolveEmailHtml } from "@/lib/emails/render-block-email";
import { resolveAudience } from "./labels";
import type {
  AudienceConfig,
  SendEmailStepConfig,
  AddLabelStepConfig,
  WebhookStepConfig,
} from "./types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Shape returned by the `pendingActions` join — keeps the cast local so the
 * loop body doesn't repeat the boilerplate.
 */
type PendingActionRow = {
  id: string;
  workflow_id: string;
  step_id: string;
  profile_id: string;
  anchor_event_id: string | null;
  admin_workflow_steps: {
    action_type: string;
    action_config: Record<string, unknown>;
  };
  admin_workflows: {
    is_active: boolean;
    audience_config: AudienceConfig;
  };
};

/**
 * Resend's free tier allows ~10 emails/sec. Keep a small spacing between
 * sends so a large batch doesn't trip rate limits.
 */
const EMAIL_SEND_SPACING_MS = 120;

/**
 * Execute all pending scheduled workflow actions whose scheduled_for has passed.
 * Called by the cron job.
 */
export const executeScheduledActions = async (): Promise<{
  executed: number;
  failed: number;
}> => {
  const supabase = createAdminClient();
  let executed = 0;
  let failed = 0;

  // Fetch pending actions due for execution
  const { data: pendingActions } = await supabase
    .from("scheduled_workflow_actions")
    .select(
      `
      id,
      workflow_id,
      step_id,
      profile_id,
      anchor_event_id,
      admin_workflow_steps!inner(action_type, action_config),
      admin_workflows!inner(is_active, audience_config)
    `,
    )
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .limit(200);

  if (!pendingActions?.length) return { executed, failed };

  const rows = pendingActions as unknown as PendingActionRow[];

  // Cache resolved audiences to avoid repeated queries
  const audienceCache = new Map<string, Set<string>>();
  const touchedWorkflowIds = new Set<string>();

  for (const action of rows) {
    const workflow = action.admin_workflows;
    const step = action.admin_workflow_steps;
    touchedWorkflowIds.add(action.workflow_id);

    // Skip if workflow deactivated
    if (!workflow.is_active) {
      await markAction(supabase, action.id, "skipped", {
        reason: "workflow_deactivated",
      });
      continue;
    }

    // Check profile still in audience
    const cacheKey = JSON.stringify(workflow.audience_config);
    if (!audienceCache.has(cacheKey)) {
      const profileIds = await resolveAudience(workflow.audience_config);
      audienceCache.set(cacheKey, new Set(profileIds));
    }
    const audienceSet = audienceCache.get(cacheKey)!;

    if (!audienceSet.has(action.profile_id)) {
      await markAction(supabase, action.id, "skipped", {
        reason: "profile_not_in_audience",
      });
      continue;
    }

    // Execute action
    const isEmail = step.action_type === "send_email";
    try {
      const result = await executeAction(
        supabase,
        step.action_type,
        step.action_config,
        action.profile_id,
        action.anchor_event_id,
      );

      if (result.success) {
        // Only persist error details — successful runs store an empty blob
        // to keep `scheduled_workflow_actions.result` small over time.
        await markAction(supabase, action.id, "executed", {});
        executed++;
      } else {
        await markAction(supabase, action.id, "failed", result);
        failed++;
      }
    } catch (err) {
      await markAction(supabase, action.id, "failed", {
        error: err instanceof Error ? err.message : "Unknown error",
      });
      failed++;
    }

    // Resend rate-limit guard (~10/sec). Only sleep after actual email sends.
    if (isEmail) {
      await new Promise((r) => setTimeout(r, EMAIL_SEND_SPACING_MS));
    }
  }

  // Refresh log counters once per touched workflow (was per-action before —
  // O(N²) on large batches). Counters reflect cumulative totals across runs;
  // per-run scoping would require adding a log_id FK on the actions table.
  for (const workflowId of touchedWorkflowIds) {
    await updateLogCounters(supabase, workflowId);
  }

  return { executed, failed };
};

/**
 * Execute a single action based on type.
 */
const executeAction = async (
  supabase: ReturnType<typeof createAdminClient>,
  actionType: string,
  actionConfig: Record<string, unknown>,
  profileId: string,
  eventId: string | null,
): Promise<{ success: boolean; error?: string }> => {
  // Load profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, first_name, last_name")
    .eq("id", profileId)
    .single();

  if (!profile?.email) {
    return { success: false, error: "No profile email" };
  }

  // Build template variables
  const vars: Record<string, string> = {
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    email: profile.email,
    replay_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/replay-lives`,
  };

  // Load event data if available
  if (eventId) {
    const { data: event } = await supabase
      .from("events")
      .select("title, starts_at, location, zoom_join_url")
      .eq("id", eventId)
      .single();

    if (event) {
      const startsAt = new Date(event.starts_at);
      vars.event_title = event.title;
      vars.event_date = format(startsAt, "EEEE d MMMM yyyy", { locale: fr });
      vars.event_time = format(startsAt, "HH'h'mm", { locale: fr });
      vars.event_location = event.location ?? "";
      vars.zoom_join_url = event.zoom_join_url ?? "";
    }
  }

  switch (actionType) {
    case "send_email": {
      const config = actionConfig as unknown as SendEmailStepConfig;
      return executeSendEmail(config, profile.email, vars);
    }
    case "add_label": {
      const config = actionConfig as unknown as AddLabelStepConfig;
      return executeAddLabel(supabase, config, profileId);
    }
    case "webhook": {
      const config = actionConfig as unknown as WebhookStepConfig;
      return executeWebhook(config);
    }
    default:
      return { success: false, error: `Unknown action type: ${actionType}` };
  }
};

const executeSendEmail = async (
  config: SendEmailStepConfig,
  email: string,
  vars: Record<string, string>,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const html = await resolveEmailHtml(config.body_design, config.body_html, vars);
    await sendTransactionalEmail({
      to: email,
      subject: renderTemplate(config.subject, vars),
      html,
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Email send failed",
    };
  }
};

const executeAddLabel = async (
  supabase: ReturnType<typeof createAdminClient>,
  config: AddLabelStepConfig,
  profileId: string,
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase.from("contact_labels").upsert(
    {
      profile_id: profileId,
      label_id: config.label_id,
      assigned_by: "workflow",
    },
    { onConflict: "profile_id,label_id" },
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
};

const executeWebhook = async (
  config: WebhookStepConfig,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const method = config.method ?? "POST";
    const res = await fetch(config.url, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(method !== "GET" && { body: JSON.stringify({}) }),
    });
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Webhook failed",
    };
  }
};

const markAction = async (
  supabase: ReturnType<typeof createAdminClient>,
  actionId: string,
  status: string,
  result: Record<string, unknown>,
): Promise<void> => {
  await supabase
    .from("scheduled_workflow_actions")
    .update({
      status,
      result,
      executed_at: new Date().toISOString(),
    })
    .eq("id", actionId);
};

const updateLogCounters = async (
  supabase: ReturnType<typeof createAdminClient>,
  workflowId: string,
): Promise<void> => {
  // Get the most recent log for this workflow
  const { data: log } = await supabase
    .from("admin_workflow_logs")
    .select("id")
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!log) return;

  // Count statuses
  const { data: counts } = await supabase
    .from("scheduled_workflow_actions")
    .select("status")
    .eq("workflow_id", workflowId);

  if (!counts) return;

  const executedCount = counts.filter((c) => c.status === "executed").length;
  const failedCount = counts.filter((c) => c.status === "failed").length;
  const pendingCount = counts.filter((c) => c.status === "pending").length;

  await supabase
    .from("admin_workflow_logs")
    .update({
      actions_executed: executedCount,
      actions_failed: failedCount,
      status: pendingCount > 0 ? "in_progress" : "completed",
      completed_at: pendingCount === 0 ? new Date().toISOString() : null,
    })
    .eq("id", log.id);
};
