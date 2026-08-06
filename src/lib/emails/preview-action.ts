"use server";

import { getSessionUser } from "@/lib/auth";
import { renderBlockEmail } from "@/lib/emails/render-block-email";
import { applyEmailBranding } from "@/lib/emails/branding";
import { getEmailBranding } from "@/lib/emails/branding-store";
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
    // L'apercu doit montrer ce que recevra la destinataire, logo et pied de
    // page inclus — sinon l'admin valide une mise en page qu'elle ne verra pas.
    const branded = applyEmailBranding(html, await getEmailBranding());
    return { success: true, data: { html: branded } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Rendu échoué",
    };
  }
};
