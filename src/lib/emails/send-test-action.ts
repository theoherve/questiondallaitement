"use server";

import { getSessionUser } from "@/lib/auth";
import { renderBlockEmail } from "@/lib/emails/render-block-email";
import { sendTransactionalEmail, renderTemplate } from "@/lib/resend/client";
import { SAMPLE_EMAIL_VARS } from "@/lib/emails/sample-vars";
import type { JSONContent } from "@maily-to/render";
import type { ActionResult } from "@/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SendTestInput = {
  to: string;
  subject: string;
  /** Design en blocs (prioritaire) ou HTML brut d'un template hérité. */
  design?: Record<string, unknown> | null;
  bodyHtml?: string | null;
};

/**
 * Envoie un email de test rendu comme l'apercu (memes valeurs d'exemple), a une
 * adresse choisie par l'admin. Permet de verifier un template en conditions
 * reelles — client mail, images, mise en page — avant de s'en servir.
 *
 * Le sujet est prefixe « [Test] » pour qu'un envoi de verification ne soit
 * jamais confondu avec un vrai message transactionnel.
 */
export const sendTestEmail = async ({
  to,
  subject,
  design,
  bodyHtml,
}: SendTestInput): Promise<ActionResult> => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) {
    return { success: false, error: "Non autorisé" };
  }

  if (!EMAIL_RE.test(to.trim())) {
    return { success: false, error: "Adresse email invalide." };
  }

  let html: string;
  try {
    const hasDesign =
      design &&
      typeof design === "object" &&
      Object.keys(design).length > 0;

    if (hasDesign) {
      html = await renderBlockEmail(design as JSONContent, {
        variables: SAMPLE_EMAIL_VARS,
        replaceVariables: true,
      });
    } else if (bodyHtml && bodyHtml.trim().length > 0) {
      // Template hérité (HTML brut) : on remplace au moins les variables.
      html = renderTemplate(bodyHtml, SAMPLE_EMAIL_VARS);
    } else {
      return { success: false, error: "Aucun contenu à envoyer." };
    }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Rendu échoué.",
    };
  }

  const renderedSubject = `[Test] ${renderTemplate(
    subject?.trim() || "(sans objet)",
    SAMPLE_EMAIL_VARS,
  )}`;

  try {
    await sendTransactionalEmail({ to: to.trim(), subject: renderedSubject, html });
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Envoi échoué.",
    };
  }
};
