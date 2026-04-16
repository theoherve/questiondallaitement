/**
 * Default Maily block-editor designs for transactional templates.
 *
 * Colors track `src/app/globals.css`:
 *   primary-red   #a0283e   (CTAs, accents)
 *   primary-green #203634   (headings, brand bar)
 *   beige         #fff8f6   (page bg)
 *   beige-dark    #f5ebe8   (soft info boxes, borders)
 *   muted-fg      #5a6b69   (footer)
 *
 * Variables use `{{var}}` syntax and resolve at render time via
 * `resolveEmailHtml` — unset variables render as their literal form so the
 * legacy `renderTemplate` helper still works.
 */

type Node = Record<string, unknown>;

const text = (t: string, marks?: { type: string }[]): Node =>
  marks ? { type: "text", text: t, marks } : { type: "text", text: t };

const variable = (id: string, fallback?: string): Node => ({
  type: "variable",
  attrs: { id, fallback: fallback ?? null, required: false },
});

const heading = (
  level: 1 | 2 | 3,
  content: Node[],
  textAlign: "left" | "center" | "right" = "left",
): Node => ({
  type: "heading",
  attrs: { level, textAlign },
  content,
});

const paragraph = (
  content: Node[],
  textAlign: "left" | "center" | "right" = "left",
): Node => ({
  type: "paragraph",
  attrs: { textAlign },
  content,
});

const spacer = (height = 16): Node => ({
  type: "spacer",
  attrs: { height, showIfKey: null },
});

const button = (
  label: string,
  url: string,
  opts: { variant?: "filled" | "outline"; color?: string; textColor?: string; alignment?: "left" | "center" | "right" } = {},
): Node => ({
  type: "button",
  attrs: {
    text: label,
    isTextVariable: false,
    url,
    isUrlVariable: false,
    alignment: opts.alignment ?? "center",
    variant: opts.variant ?? "filled",
    borderRadius: "smooth",
    buttonColor: opts.color ?? "#a0283e",
    textColor: opts.textColor ?? "#ffffff",
    paddingTop: 12,
    paddingRight: 32,
    paddingBottom: 12,
    paddingLeft: 32,
  },
});

const section = (
  content: Node[],
  opts: {
    bg?: string;
    padding?: number | [number, number];
    borderRadius?: number;
    borderColor?: string;
    borderWidth?: number;
    marginTop?: number;
    marginBottom?: number;
  } = {},
): Node => {
  const pad = opts.padding ?? 24;
  const [py, px] = Array.isArray(pad) ? pad : [pad, pad];
  return {
    type: "section",
    attrs: {
      backgroundColor: opts.bg ?? "#ffffff",
      borderRadius: opts.borderRadius ?? 8,
      borderWidth: opts.borderWidth ?? 0,
      borderColor: opts.borderColor ?? "transparent",
      align: "left",
      paddingTop: py,
      paddingRight: px,
      paddingBottom: py,
      paddingLeft: px,
      marginTop: opts.marginTop ?? 0,
      marginRight: 0,
      marginBottom: opts.marginBottom ?? 16,
      marginLeft: 0,
    },
    content,
  };
};

const footer = (content: Node[]): Node => ({
  type: "footer",
  attrs: { textAlign: "center", textDirection: "ltr" },
  content,
});

/** Reusable brand header: narrow green bar with site name centered. */
const brandHeader = (): Node =>
  section(
    [
      heading(
        2,
        [text("Question d'Allaitement", [{ type: "bold" }])],
        "center",
      ),
    ],
    { bg: "#203634", padding: [20, 16], borderRadius: 8, marginBottom: 0 },
  );

/** Reusable footer block. */
const brandFooter = (): Node =>
  section(
    [
      footer([text("Accompagnement en lactation par des consultantes IBCLC.")]),
      footer([text("© Question d'Allaitement — Tous droits réservés.")]),
    ],
    { bg: "#fff8f6", padding: [16, 16], marginTop: 8, marginBottom: 0 },
  );

/** Convenience wrapper: doc with an array of top-level sections. */
const doc = (sections: Node[]): Node => ({
  type: "doc",
  content: sections,
});

/** Soft-tinted "details" box used to highlight key info. */
const detailsBox = (rows: { label: string; value: Node[] }[]): Node =>
  section(
    rows.flatMap((row, i) => {
      const line = paragraph([
        text(row.label + " ", [{ type: "bold" }]),
        ...row.value,
      ]);
      return i < rows.length - 1 ? [line, spacer(6)] : [line];
    }),
    {
      bg: "#f5ebe8",
      padding: 20,
      borderRadius: 10,
      marginBottom: 24,
    },
  );

// ─── Templates ──────────────────────────────────────────────

export const DESIGN_BOOKING_CONFIRMATION = doc([
  brandHeader(),
  section(
    [
      heading(
        1,
        [text("Réservation confirmée")],
        "center",
      ),
      paragraph([text("Bonjour "), variable("client_name"), text(",")]),
      paragraph([
        text("Votre consultation avec "),
        variable("consultant_name"),
        text(" est confirmée. Nous avons hâte de vous accompagner."),
      ]),
      spacer(8),
      detailsBox([
        { label: "Date :", value: [variable("date")] },
        { label: "Heure :", value: [variable("time")] },
      ]),
      paragraph(
        [
          text(
            "Vous recevrez un rappel la veille du rendez-vous. Pour toute question, répondez directement à cet email.",
          ),
        ],
      ),
      spacer(16),
      paragraph(
        [text("À très bientôt,\nL'équipe Question d'Allaitement")],
        "center",
      ),
    ],
    { bg: "#ffffff", padding: [32, 24], marginTop: 0, marginBottom: 0 },
  ),
  brandFooter(),
]);

export const DESIGN_BOOKING_REMINDER = doc([
  brandHeader(),
  section(
    [
      heading(1, [text("C'est pour demain !")], "center"),
      paragraph([text("Bonjour "), variable("client_name"), text(",")]),
      paragraph([
        text("Petit rappel : votre consultation avec "),
        variable("consultant_name"),
        text(" a lieu "),
        text("demain à ", [{ type: "bold" }]),
        variable("time"),
        text("."),
      ]),
      spacer(8),
      detailsBox([
        { label: "Consultante :", value: [variable("consultant_name")] },
        { label: "Heure :", value: [variable("time")] },
      ]),
      paragraph([
        text(
          "Préparez vos questions et installez-vous dans un endroit calme. Nous sommes là pour vous.",
        ),
      ]),
      spacer(16),
      paragraph([text("À demain,\nL'équipe Question d'Allaitement")], "center"),
    ],
    { bg: "#ffffff", padding: [32, 24], marginBottom: 0 },
  ),
  brandFooter(),
]);

export const DESIGN_BOOKING_CANCELLED = doc([
  brandHeader(),
  section(
    [
      heading(1, [text("Rendez-vous annulé")], "center"),
      paragraph([text("Bonjour "), variable("client_name"), text(",")]),
      paragraph([
        text(
          "Nous vous confirmons l'annulation de votre consultation prévue le ",
        ),
        variable("date"),
        text("."),
      ]),
      spacer(8),
      detailsBox([
        { label: "Information :", value: [variable("refund_info")] },
      ]),
      paragraph([
        text(
          "N'hésitez pas à reprendre un rendez-vous dès que vous le souhaitez. Nous restons à votre écoute.",
        ),
      ]),
      spacer(16),
      paragraph(
        [text("Prenez soin de vous,\nL'équipe Question d'Allaitement")],
        "center",
      ),
    ],
    { bg: "#ffffff", padding: [32, 24], marginBottom: 0 },
  ),
  brandFooter(),
]);

export const DESIGN_FORMATION_ACCESS = doc([
  brandHeader(),
  section(
    [
      heading(1, [text("Votre formation est disponible")], "center"),
      paragraph([text("Bonjour "), variable("client_name"), text(",")]),
      paragraph([
        text("Bonne nouvelle : vous avez désormais accès à la formation "),
        text("« ", [{ type: "bold" }]),
        { ...variable("formation_title"), marks: [{ type: "bold" }] },
        text(" »", [{ type: "bold" }]),
        text("."),
      ]),
      spacer(16),
      button("Accéder à ma formation", "{{formation_url}}"),
      spacer(16),
      paragraph([
        text(
          "Avancez à votre rythme. Tout le contenu reste accessible depuis votre espace personnel.",
        ),
      ]),
      spacer(16),
      paragraph(
        [text("Belle formation,\nL'équipe Question d'Allaitement")],
        "center",
      ),
    ],
    { bg: "#ffffff", padding: [32, 24], marginBottom: 0 },
  ),
  brandFooter(),
]);

export const DESIGN_WELCOME = doc([
  brandHeader(),
  section(
    [
      heading(1, [text("Bienvenue parmi nous")], "center"),
      paragraph([text("Bonjour "), variable("client_name"), text(",")]),
      paragraph([
        text(
          "Nous sommes ravies de vous accueillir sur Question d'Allaitement, un espace pensé pour soutenir toutes les mamans dans leur parcours d'allaitement.",
        ),
      ]),
      spacer(12),
      section(
        [
          heading(3, [text("Par où commencer ?")]),
          paragraph([
            text("• Prenez rendez-vous avec une consultante IBCLC"),
          ]),
          paragraph([
            text("• Explorez nos formations en autonomie"),
          ]),
          paragraph([
            text("• Lisez les articles du blog pour vous informer"),
          ]),
        ],
        { bg: "#f5ebe8", padding: 20, borderRadius: 10, marginBottom: 24 },
      ),
      button("Découvrir mon espace", "{{dashboard_url}}"),
      spacer(16),
      paragraph(
        [text("Avec douceur,\nL'équipe Question d'Allaitement")],
        "center",
      ),
    ],
    { bg: "#ffffff", padding: [32, 24], marginBottom: 0 },
  ),
  brandFooter(),
]);

export const DESIGN_PASSWORD_RESET = doc([
  brandHeader(),
  section(
    [
      heading(1, [text("Réinitialiser votre mot de passe")], "center"),
      paragraph([text("Bonjour "), variable("client_name"), text(",")]),
      paragraph([
        text(
          "Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.",
        ),
      ]),
      spacer(20),
      button("Réinitialiser mon mot de passe", "{{reset_url}}"),
      spacer(20),
      section(
        [
          paragraph([
            text(
              "Ce lien est valide pendant 24 heures. Si vous n'avez pas fait cette demande, vous pouvez ignorer cet email en toute sécurité.",
              [{ type: "italic" }],
            ),
          ]),
        ],
        {
          bg: "#f5ebe8",
          padding: 16,
          borderRadius: 8,
          marginBottom: 16,
        },
      ),
      paragraph(
        [text("À bientôt,\nL'équipe Question d'Allaitement")],
        "center",
      ),
    ],
    { bg: "#ffffff", padding: [32, 24], marginBottom: 0 },
  ),
  brandFooter(),
]);

export const DEFAULT_TEMPLATE_DESIGNS: Record<string, Node> = {
  booking_confirmation: DESIGN_BOOKING_CONFIRMATION,
  booking_reminder: DESIGN_BOOKING_REMINDER,
  booking_cancelled: DESIGN_BOOKING_CANCELLED,
  formation_access: DESIGN_FORMATION_ACCESS,
  welcome: DESIGN_WELCOME,
  password_reset: DESIGN_PASSWORD_RESET,
};
