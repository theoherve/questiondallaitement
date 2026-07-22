"use server";

import { getSessionUser } from "@/lib/auth";
import { renderBlockEmail } from "@/lib/emails/render-block-email";
import { SAMPLE_EMAIL_VARS } from "@/lib/emails/sample-vars";
import type { JSONContent } from "@maily-to/render";
import type { ActionResult } from "@/types";

export const previewEmailHtml = async (
  design: unknown,
  variableOverrides?: Record<string, string>,
): Promise<ActionResult<{ html: string }>> => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) {
    return { success: false, error: "Non autorisé" };
  }

  if (!design || typeof design !== "object") {
    return { success: false, error: "Design vide" };
  }

  try {
    const html = await renderBlockEmail(design as JSONContent, {
      variables: { ...SAMPLE_EMAIL_VARS, ...(variableOverrides ?? {}) },
      replaceVariables: true,
    });
    return { success: true, data: { html } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Rendu échoué",
    };
  }
};
