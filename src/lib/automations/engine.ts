import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/resend/client";
import type { AutomationTriggerType, TriggerData } from "./types";

const renderVariables = (template: string, data: TriggerData): string => {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    if (value != null && typeof value === "string") {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
  }
  return result;
};

const executeSendEmail = async (
  action: { subject: string; body_html: string },
  data: TriggerData
): Promise<{ success: boolean; error?: string }> => {
  const email = data.client_email;
  if (!email) return { success: false, error: "No client email" };

  try {
    await sendTransactionalEmail({
      to: email,
      subject: renderVariables(action.subject, data),
      html: renderVariables(action.body_html, data),
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

const executeAddCrmTag = async (
  action: { tag_id: string },
  consultantId: string,
  data: TriggerData
): Promise<{ success: boolean; error?: string }> => {
  const clientId = data.client_id;
  if (!clientId) return { success: false, error: "No client_id" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("crm_contact_tags").upsert(
    {
      client_id: clientId,
      tag_id: action.tag_id,
      consultant_id: consultantId,
    },
    { onConflict: "client_id,tag_id,consultant_id" }
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
};

const executeWebhook = async (
  action: { url: string; method?: string }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const method = (action.method ?? "POST") as "GET" | "POST" | "PUT";
    const res = await fetch(action.url, {
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
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

const matchesCondition = (
  triggerType: AutomationTriggerType,
  triggerConfig: Record<string, unknown>,
  data: TriggerData
): boolean => {
  if (triggerType === "accompagnement_purchased") {
    const formationIds = triggerConfig.accompagnement_ids as string[] | undefined;
    if (!formationIds?.length) return true;
    return !!data.accompagnement_id && formationIds.includes(data.accompagnement_id);
  }
  if (triggerType === "booking_confirmed") {
    const ctIds = triggerConfig.consultation_type_ids as string[] | undefined;
    if (!ctIds?.length) return true;
    return !!data.consultation_type_id && ctIds.includes(data.consultation_type_id);
  }
  if (triggerType === "formation_registered") {
    const eventIds = triggerConfig.formation_ids as string[] | undefined;
    if (!eventIds?.length) return true;
    return !!data.formation_id && eventIds.includes(data.formation_id);
  }
  if (triggerType === "delay_after_formation") {
    const eventIds = triggerConfig.formation_ids as string[] | undefined;
    if (!eventIds?.length) return true;
    return !!data.formation_id && eventIds.includes(data.formation_id);
  }
  return true;
};

type AutomationRow = {
  id: string;
  consultant_id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  actions: unknown[];
};

export const runAutomations = async (
  triggerType: AutomationTriggerType,
  consultantId: string,
  triggerData: TriggerData
): Promise<void> => {
  const supabase = createAdminClient();

  const { data: automations } = await supabase
    .from("automations")
    .select("id, name, trigger_type, trigger_config, actions")
    .eq("consultant_id", consultantId)
    .eq("trigger_type", triggerType)
    .eq("is_active", true);

  if (!automations?.length) return;

  for (const automation of automations as AutomationRow[]) {
    if (!matchesCondition(automation.trigger_type as AutomationTriggerType, automation.trigger_config, triggerData)) {
      continue;
    }

    const results: { action: string; success: boolean; error?: string }[] = [];
    let allSuccess = true;

    for (const rawAction of automation.actions ?? []) {
      const action = rawAction as { type: string; [key: string]: unknown };
      let result: { success: boolean; error?: string };

      if (action.type === "send_email") {
        result = await executeSendEmail(
          { subject: action.subject as string, body_html: action.body_html as string },
          triggerData
        );
      } else if (action.type === "add_crm_tag") {
        result = await executeAddCrmTag(
          { tag_id: action.tag_id as string },
          consultantId,
          triggerData
        );
      } else if (action.type === "webhook") {
        result = await executeWebhook({
          url: action.url as string,
          method: action.method as "GET" | "POST" | "PUT" | undefined,
        });
      } else {
        result = { success: false, error: "Unknown action type" };
      }

      results.push({
        action: action.type,
        success: result.success,
        error: result.error,
      });
      if (!result.success) allSuccess = false;
    }

    await supabase.from("automation_logs").insert({
      automation_id: automation.id,
      trigger_data: triggerData,
      result: { actions: results },
      status: allSuccess ? "success" : "partial",
      executed_at: new Date().toISOString(),
    });
  }
};
