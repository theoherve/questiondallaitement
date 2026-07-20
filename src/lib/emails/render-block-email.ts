import { Maily } from "@maily-to/render";
import type { JSONContent } from "@maily-to/render";

/**
 * Brand theme pushed into every rendered email so the block editor's defaults
 * line up with the site's design system. Values map to CSS from `globals.css`.
 */
const BRAND_THEME = {
  colors: {
    heading: "#203634", // primary-green
    paragraph: "#203634",
    horizontal: "#e8ddd9", // border
    footer: "#5a6b69", // muted-foreground
  },
  fontSize: {
    paragraph: "16px",
    footer: {
      size: "13px",
      lineHeight: "20px",
    },
  },
  button: {
    backgroundColor: "#a0283e", // primary-red
    color: "#ffffff",
    paddingTop: "12px",
    paddingRight: "32px",
    paddingBottom: "12px",
    paddingLeft: "32px",
  },
  link: {
    color: "#a0283e",
  },
};

type RenderOptions = {
  variables?: Record<string, string>;
  /**
   * If false, `{{var}}` placeholders stay verbatim (useful when another layer
   * — e.g. Brevo — will interpolate them per recipient). Default: true.
   */
  replaceVariables?: boolean;
  preview?: string;
};

/**
 * Render a Maily JSON design to email-safe HTML (tables + inline styles via juice).
 */
export const renderBlockEmail = async (
  design: JSONContent,
  { variables, replaceVariables = true, preview }: RenderOptions = {}
): Promise<string> => {
  const maily = new Maily(design);
  maily.setTheme(BRAND_THEME);

  if (preview) {
    maily.setPreviewText(preview);
  }

  if (replaceVariables && variables) {
    maily.setShouldReplaceVariableValues(true);
    maily.setVariableValues(variables);
  } else {
    maily.setShouldReplaceVariableValues(false);
  }

  return maily.render();
};

/**
 * Convenience: resolve the final HTML to send, preferring block design when
 * present, falling back to raw body_html otherwise. Used by both transactional
 * send paths and the executor.
 */
export const resolveEmailHtml = async (
  bodyDesign: JSONContent | Record<string, unknown> | null | undefined,
  bodyHtml: string | null | undefined,
  variables?: Record<string, string>
): Promise<string> => {
  if (bodyDesign && typeof bodyDesign === "object" && "type" in bodyDesign) {
    const rendered = await renderBlockEmail(bodyDesign as JSONContent, {
      variables,
    });
    // Maily ne substitue que ses noeuds variable(). Un `{{x}}` ecrit en texte
    // brut lui echappe — c'est le seul moyen d'injecter un fragment HTML, comme
    // le bouton Zoom de booking_confirmation, qu'un noeud variable rendrait
    // echappe. On reprend donc la substitution sur le HTML final, comme le fait
    // le chemin legacy ci-dessous.
    return substituteVariables(rendered, variables);
  }
  if (!bodyHtml) return "";
  return substituteVariables(bodyHtml, variables);
};

/** Remplace les `{{cle}}` par leur valeur, telle quelle (HTML compris). */
const substituteVariables = (
  html: string,
  variables?: Record<string, string>,
): string => {
  if (!variables) return html;
  let out = html;
  for (const [key, value] of Object.entries(variables)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
};
