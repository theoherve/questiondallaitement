/**
 * Callout presets for the email editor.
 *
 * Emails can't rely on CSS classes (most clients strip them), so "callouts"
 * are implemented as pre-configured Maily `section` nodes — Maily already
 * renders sections with inline styles, so the recipient's inbox gets a
 * correctly-styled block without us touching the renderer.
 */
export type CalloutVariant = "info" | "tip" | "warning" | "error";

type CalloutPreset = {
  variant: CalloutVariant;
  label: string;
  backgroundColor: string;
  borderColor: string;
  placeholder: string;
};

// Brand-aligned palette (cf. globals.css) — light backgrounds with a darker
// left border to read as an info box in major inboxes.
export const CALLOUT_PRESETS: Record<CalloutVariant, CalloutPreset> = {
  info: {
    variant: "info",
    label: "Information",
    backgroundColor: "#f0f6f6",
    borderColor: "#203634",
    placeholder: "Information importante…",
  },
  tip: {
    variant: "tip",
    label: "Astuce",
    backgroundColor: "#f5e9e9",
    borderColor: "#a0283e",
    placeholder: "Astuce utile…",
  },
  warning: {
    variant: "warning",
    label: "Attention",
    backgroundColor: "#fef7e8",
    borderColor: "#d97706",
    placeholder: "Point d'attention…",
  },
  error: {
    variant: "error",
    label: "Erreur",
    backgroundColor: "#fdecec",
    borderColor: "#b91c1c",
    placeholder: "Message d'erreur ou alerte…",
  },
};

/**
 * Build the JSON content for a section node preconfigured as a callout.
 * Padding/borders are set explicitly so Maily's section renderer produces a
 * visible box even when the admin doesn't touch the sidebar controls.
 */
export const buildCalloutSectionNode = (variant: CalloutVariant) => {
  const preset = CALLOUT_PRESETS[variant];
  return {
    type: "section",
    attrs: {
      backgroundColor: preset.backgroundColor,
      borderColor: preset.borderColor,
      borderWidth: 1,
      borderRadius: 6,
      paddingTop: 16,
      paddingRight: 20,
      paddingBottom: 16,
      paddingLeft: 20,
      marginTop: 8,
      marginBottom: 8,
    },
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: preset.placeholder,
          },
        ],
      },
    ],
  };
};
