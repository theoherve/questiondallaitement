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

/**
 * Retour a la ligne explicite. Un "\n" dans un noeud texte ne produit rien :
 * en HTML c'est un espace, et la signature se retrouve sur une seule ligne.
 */
const lineBreak = (): Node => ({ type: "hardBreak" });

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
      // zoom_block n'est pas une valeur mais un fragment HTML : sendBookingConfirmation
      // y met le bouton « Rejoindre la reunion Zoom » pour les teleconsultations, et
      // une chaine vide sinon. Il doit rester tel quel dans le rendu — d'ou un text()
      // brut plutot qu'un variable(), qui produirait un noeud que Maily stylerait.
      paragraph([text("{{zoom_block}}")]),
      paragraph(
        [
          text(
            "Vous recevrez un rappel la veille du rendez-vous. Pour toute question, répondez directement à cet email.",
          ),
        ],
      ),
      spacer(16),
      paragraph(
        [text("À très bientôt,"), lineBreak(), text("L'équipe Question d'Allaitement")],
        "center",
      ),
    ],
    { bg: "#ffffff", padding: [32, 24], marginTop: 0, marginBottom: 0 },
  ),
  brandFooter(),
]);

/**
 * `booking_reminder` n'expose ni date ni URL de reservation (cf.
 * `sendBookingReminder`) : le lien vers l'espace client est donc ecrit en dur.
 */
const BOOKING_AREA_URL =
  "https://www.formation-allaitement.com/espace-client/reservations";

export const DESIGN_BOOKING_REMINDER = doc([
  brandHeader(),
  section(
    [
      heading(1, [text("J-1 avant notre rendez-vous")], "center"),
      paragraph([text("Bonjour "), variable("client_name"), text(",")]),
      paragraph([
        text(
          "Demain, vous prendrez enfin ce temps pour vous, pour poser toutes vos questions, faire le point sur votre situation et repartir avec des réponses concrètes.",
        ),
      ]),
      paragraph([
        text("Et si c'était justement le bon moment pour y penser quelques minutes ?"),
      ]),
      spacer(8),
      // Rappel des infos pratiques : `sendBookingReminder` fournit
      // consultant_name et time, et l'objet seul ne les porte pas jusqu'au corps.
      detailsBox([
        { label: "Consultante :", value: [variable("consultant_name")] },
        { label: "Heure :", value: [variable("time")] },
      ]),
      paragraph([
        text(
          "Que vous soyez de la team qui prépare tout à l'avance avec une liste de questions bien ficelée, ou plutôt de ceux qui préfèrent voir où la discussion les mène, voici quelques idées pour profiter pleinement de votre consultation :",
        ),
      ]),
      spacer(8),
      section(
        [
          paragraph([text("✨ Les sujets qui vous préoccupent en ce moment.")]),
          spacer(6),
          paragraph([
            text("✨ Les changements ou difficultés rencontrés récemment."),
          ]),
          spacer(6),
          paragraph([
            text(
              "✨ Vos objectifs, vos envies ou simplement ce que vous aimeriez mieux comprendre.",
            ),
          ]),
        ],
        { bg: "#f5ebe8", padding: 20, borderRadius: 10, marginBottom: 24 },
      ),
      paragraph([
        text(
          "Il n'y a pas de « bonne » façon de préparer ce rendez-vous : venez comme vous êtes, on s'occupe du reste.",
        ),
      ]),
      spacer(8),
      button("Je prépare ma consultation", BOOKING_AREA_URL),
      spacer(16),
      paragraph([
        text(
          "Et si vous avez besoin de modifier votre rendez-vous, retrouvez votre lien de réservation juste ici 👉 ",
        ),
        text("Votre lien de réservation", [
          {
            type: "link",
            attrs: {
              href: BOOKING_AREA_URL,
              target: "_blank",
              rel: "noopener noreferrer",
            },
          } as { type: string },
        ]),
        text(" 👈."),
      ]),
      spacer(16),
      paragraph(
        [text("À demain,"), lineBreak(), text("L'équipe de Carole Hervé")],
        "center",
      ),
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
        [text("Prenez soin de vous,"), lineBreak(), text("L'équipe Question d'Allaitement")],
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
      heading(
        1,
        [text("Votre accompagnement est disponible")],
        "center",
      ),
      spacer(4),
      paragraph(
        [
          text(
            "Un nouvel espace vient d'être ouvert pour vous.",
            [{ type: "italic" }],
          ),
        ],
        "center",
      ),
      spacer(20),
      paragraph([text("Bonjour "), variable("client_name"), text(",")]),
      paragraph([
        text(
          "Nous sommes ravies de vous accueillir. Votre accès est activé — vous pouvez dès maintenant retrouver l'ensemble du contenu dans votre espace personnel.",
        ),
      ]),
      spacer(8),
      detailsBox([
        {
          label: "Votre accompagnement :",
          value: [
            { ...variable("formation_title"), marks: [{ type: "bold" }] },
          ],
        },
      ]),
      paragraph([
        text("Ce qui vous attend :", [{ type: "bold" }]),
      ]),
      paragraph([
        text("• Des vidéos et ressources accessibles à tout moment"),
      ]),
      paragraph([
        text("• Une progression à votre rythme, sans limite de durée"),
      ]),
      paragraph([
        text("• Le soutien bienveillant de consultantes IBCLC"),
      ]),
      spacer(24),
      button("J'accède à mon accompagnement", "{{formation_url}}"),
      spacer(12),
      paragraph(
        [
          text(
            "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur : ",
            [{ type: "italic" }],
          ),
          text("{{formation_url}}", [
            { type: "italic" },
            {
              type: "link",
              attrs: {
                href: "{{formation_url}}",
                target: "_blank",
                rel: "noopener noreferrer",
              },
            } as { type: string },
          ]),
        ],
        "center",
      ),
      spacer(24),
      paragraph([
        text(
          "Une question, un doute ? Répondez directement à cet email, nous sommes à votre écoute.",
        ),
      ]),
      spacer(20),
      paragraph(
        [text("Avec douceur,"), lineBreak(), text("L'équipe Question d'Allaitement")],
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
            text("• Explorez nos accompagnements en autonomie"),
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
        [text("Avec douceur,"), lineBreak(), text("L'équipe Question d'Allaitement")],
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
        [text("À bientôt,"), lineBreak(), text("L'équipe Question d'Allaitement")],
        "center",
      ),
    ],
    { bg: "#ffffff", padding: [32, 24], marginBottom: 0 },
  ),
  brandFooter(),
]);

/**
 * Reprend le contenu du template historique issu de la migration Wix, mis en
 * blocs. Le delai de 72 h et le renvoi vers « Mot de passe oublie » sont des
 * informations dont depend la cliente : ils sont conserves tels quels.
 */
export const DESIGN_MIGRATION_WELCOME = doc([
  brandHeader(),
  section(
    [
      heading(1, [text("Bienvenue sur votre nouvel espace")], "center"),
      paragraph([text("Bonjour "), variable("client_name"), text(",")]),
      paragraph([
        text(
          "Votre compte Question d'Allaitement a été transféré vers notre nouvelle plateforme.",
        ),
      ]),
      paragraph([
        text(
          "Pour accéder à votre espace personnel, il vous suffit de définir votre mot de passe.",
        ),
      ]),
      spacer(20),
      button("Activer mon compte", "{{setup_url}}"),
      spacer(20),
      section(
        [
          paragraph([
            text(
              "Ce lien est valide pendant 72 heures. Passé ce délai, vous pourrez en demander un nouveau depuis la page de connexion en cliquant sur « Mot de passe oublié ».",
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
      paragraph([
        text("Si vous avez des questions, n'hésitez pas à nous contacter."),
      ]),
      paragraph(
        [text("À très bientôt,"), lineBreak(), text("L'équipe Question d'Allaitement")],
        "center",
      ),
    ],
    { bg: "#ffffff", padding: [32, 24], marginBottom: 0 },
  ),
  brandFooter(),
]);

/**
 * Le creneau a ete vendu deux fois. La cliente a paye, elle est remboursee, et
 * elle n'a pas de rendez-vous. Le ton compte ici : c'est notre erreur, pas la
 * sienne, et le montant rembourse doit etre visible sans chercher.
 */
export const DESIGN_BOOKING_SLOT_CONFLICT = doc([
  brandHeader(),
  section(
    [
      heading(1, [text("Ce créneau vient d'être réservé")], "center"),
      paragraph([text("Bonjour "), variable("client_name"), text(",")]),
      paragraph([
        text(
          "Nous sommes vraiment désolées : le créneau que vous venez de réserver a été pris par une autre personne quelques instants avant la validation de votre paiement.",
        ),
      ]),
      spacer(8),
      detailsBox([
        { label: "Créneau concerné :", value: [variable("date"), text(" à "), variable("time")] },
        { label: "Montant remboursé :", value: [{ ...variable("amount_refunded"), marks: [{ type: "bold" }] }] },
      ]),
      paragraph([
        text(
          "Le remboursement a déjà été effectué. Il apparaîtra sur votre relevé sous 5 à 10 jours ouvrés selon votre banque — vous n'avez aucune démarche à faire.",
        ),
      ]),
      spacer(20),
      button("Choisir un autre créneau", "{{booking_url}}"),
      spacer(16),
      paragraph([
        text(
          "Encore toutes nos excuses pour ce contretemps. Si vous préférez en parler, répondez simplement à cet email.",
        ),
      ]),
      paragraph(
        [text("Avec toute notre attention,"), lineBreak(), text("L'équipe Question d'Allaitement")],
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
  migration_welcome: DESIGN_MIGRATION_WELCOME,
  booking_slot_conflict: DESIGN_BOOKING_SLOT_CONFLICT,
};

/**
 * Objet et variables accompagnant chaque design par defaut.
 *
 * Vit ici plutot que dans les actions admin : c'est de la metadonnee de
 * template, et la garder aupres des designs permet de verifier par test que les
 * trois restent d'accord. `restoreDefaultTemplates` retombe sur le nom du
 * template si l'objet manque — une cliente recevrait alors un email intitule
 * « migration_welcome ».
 */
export const TEMPLATE_DEFAULT_SUBJECTS: Record<string, string> = {
  booking_confirmation: "Votre réservation est confirmée — {{date}}",
  booking_reminder: "Rappel : votre consultation demain à {{time}}",
  booking_cancelled: "Votre réservation du {{date}} a été annulée",
  formation_access:
    "Votre accompagnement « {{formation_title}} » est disponible",
  welcome: "Bienvenue sur Question d'Allaitement",
  password_reset: "Réinitialisation de votre mot de passe",
  migration_welcome: "Votre espace Question d'Allaitement a migré",
  booking_slot_conflict:
    "Votre réservation n'a pas pu être confirmée — vous êtes remboursée",
};

export const TEMPLATE_DEFAULT_VARIABLES: Record<string, string[]> = {
  // zoom_block porte le bouton Zoom des teleconsultations : l'oublier ici le
  // retirerait de la liste proposee dans l'editeur.
  booking_confirmation: [
    "client_name",
    "consultant_name",
    "date",
    "time",
    "zoom_block",
  ],
  booking_reminder: ["client_name", "consultant_name", "time"],
  booking_cancelled: ["client_name", "date", "refund_info"],
  formation_access: ["client_name", "formation_title", "formation_url"],
  welcome: ["client_name", "dashboard_url"],
  password_reset: ["client_name", "reset_url"],
  migration_welcome: ["client_name", "setup_url"],
  booking_slot_conflict: [
    "client_name",
    "date",
    "time",
    "amount_refunded",
    "booking_url",
  ],
};
