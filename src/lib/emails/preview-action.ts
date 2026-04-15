"use server";

import { getSessionUser } from "@/lib/auth";
import { renderBlockEmail } from "@/lib/emails/render-block-email";
import type { JSONContent } from "@maily-to/render";
import type { ActionResult } from "@/types";

/**
 * Sample values used when the caller does not provide any — keeps the preview
 * readable instead of showing raw `{{var}}` placeholders.
 */
const DEFAULT_SAMPLE_VARS: Record<string, string> = {
  client_name: "Marie Dupont",
  consultant_name: "Carole Hervé",
  date: "samedi 25 avril 2026",
  time: "14h30",
  formation_title: "Les bases de l'allaitement",
  formation_url: "https://example.com/formations",
  dashboard_url: "https://example.com/espace-client",
  reset_url: "https://example.com/reset?token=abc",
  verification_url: "https://example.com/verify?token=abc",
  refund_info: "Votre paiement a été remboursé sur votre compte.",
  event_title: "Atelier portage bébé",
  event_date: "lundi 3 mai 2026",
  event_time: "10h00",
  event_location: "En ligne (Zoom)",
  zoom_join_url: "https://zoom.us/j/123456789",
  replay_url: "https://example.com/replay-lives",
  email: "exemple@question-allaitement.fr",
  first_name: "Marie",
  last_name: "Dupont",
};

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
      variables: { ...DEFAULT_SAMPLE_VARS, ...(variableOverrides ?? {}) },
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
