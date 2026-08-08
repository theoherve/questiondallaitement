/**
 * Identite visuelle des emails — logique pure (pas d'acces base, pas de React),
 * donc testable et importable des deux cotes (serveur d'envoi et editeur).
 *
 * Deux usages distincts :
 *  1. `applyEmailBranding` enveloppe le HTML final : logo en en-tete, pied de
 *     page. Applique au moment de l'envoi, donc un changement de logo se voit
 *     immediatement, sans re-editer un seul template.
 *  2. `buildBannerNode` / `buildLogoNode` produisent des blocs Maily inseres a
 *     la demande dans l'editeur, a partir de la banniere pre-definie.
 *
 * Couleurs alignees sur `src/app/globals.css` :
 *   primary-red #a0283e · primary-green #203634 · beige #fff8f6
 *   beige-dark #f5ebe8 · muted-fg #5a6b69
 */

export type EmailBranding = {
  header_enabled: boolean;
  logo_url: string | null;
  logo_alt: string;
  logo_width: number;
  header_background: string;
  header_link_url: string | null;
  footer_enabled: boolean;
  footer_text: string;
  banner_image_url: string | null;
  banner_alt: string;
  banner_title: string;
  banner_text: string;
  banner_cta_label: string;
  banner_cta_url: string | null;
  banner_background: string;
};

export const DEFAULT_EMAIL_BRANDING: EmailBranding = {
  header_enabled: true,
  logo_url: null,
  logo_alt: "Question d'Allaitement",
  logo_width: 160,
  header_background: "#fff8f6",
  header_link_url: null,
  footer_enabled: true,
  footer_text:
    "Question d'Allaitement, accompagnement en lactation par des consultantes IBCLC.",
  banner_image_url: null,
  banner_alt: "",
  banner_title: "",
  banner_text: "",
  banner_cta_label: "",
  banner_cta_url: null,
  banner_background: "#f5ebe8",
};

/**
 * Fusionne une valeur brute (JSONB de `platform_settings`, potentiellement
 * partielle ou ecrite par une version anterieure) avec les valeurs par defaut.
 * Toute cle inconnue ou mal typee retombe sur le defaut plutot que de faire
 * echouer un envoi.
 */
export const parseEmailBranding = (raw: unknown): EmailBranding => {
  const src =
    typeof raw === "string"
      ? safeJsonParse(raw)
      : raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};

  const out = { ...DEFAULT_EMAIL_BRANDING };
  for (const key of Object.keys(DEFAULT_EMAIL_BRANDING) as (keyof EmailBranding)[]) {
    const value = src[key];
    const fallback = DEFAULT_EMAIL_BRANDING[key];
    if (value === undefined) continue;
    if (typeof fallback === "boolean" && typeof value === "boolean") {
      (out as Record<string, unknown>)[key] = value;
    } else if (typeof fallback === "number" && typeof value === "number") {
      (out as Record<string, unknown>)[key] = value;
    } else if (
      typeof value === "string" &&
      // `null` par defaut = champ URL optionnel, qui accepte aussi une chaine.
      (typeof fallback === "string" || fallback === null)
    ) {
      (out as Record<string, unknown>)[key] = value;
    } else if (value === null && fallback === null) {
      (out as Record<string, unknown>)[key] = null;
    }
  }
  return out;
};

const safeJsonParse = (raw: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

// ─── HTML injecte a l'envoi ───────────────────────────────────

/**
 * Marqueur d'idempotence. Sans lui, un HTML deja habille (campagne dont le
 * body_html est mis en cache, puis renvoye) recevrait un second logo.
 */
const HEADER_MARKER = "qda-brand-header";
const FOOTER_MARKER = "qda-brand-footer";

const FONT_STACK =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/** Echappe le texte issu de l'administration avant injection dans du HTML. */
export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const renderBrandHeaderHtml = (b: EmailBranding): string => {
  if (!b.header_enabled || !b.logo_url) return "";

  const alt = escapeHtml(b.logo_alt || "Logo");
  // `height:auto` + `max-width:100%` : le logo reste net en retina et ne
  // debordera pas d'un client mobile qui force la largeur du conteneur.
  const img =
    `<img src="${escapeHtml(b.logo_url)}" alt="${alt}" width="${b.logo_width}" ` +
    `style="display:block;width:${b.logo_width}px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;margin:0 auto;" />`;

  const content = b.header_link_url
    ? `<a href="${escapeHtml(b.header_link_url)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">${img}</a>`
    : img;

  return (
    `<!--${HEADER_MARKER}-->` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    `style="background-color:${escapeHtml(b.header_background)};border-collapse:collapse;">` +
    `<tr><td align="center" style="padding:24px 16px;">${content}</td></tr>` +
    `</table>`
  );
};

export const renderBrandFooterHtml = (b: EmailBranding): string => {
  if (!b.footer_enabled) return "";
  const lines = b.footer_text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return "";

  const paragraphs = lines
    .map(
      (line) =>
        `<p style="margin:0 0 6px 0;font-family:${FONT_STACK};font-size:12px;line-height:20px;color:#5a6b69;">${escapeHtml(line)}</p>`,
    )
    .join("");

  return (
    `<!--${FOOTER_MARKER}-->` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    `style="background-color:#ffffff;border-collapse:collapse;">` +
    `<tr><td align="center" style="padding:24px 16px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-collapse:collapse;">` +
    `<tr><td align="center" style="border-top:1px solid #e8ddd9;padding-top:16px;">${paragraphs}</td></tr>` +
    `</table></td></tr></table>`
  );
};

/**
 * Insere en-tete et pied de page dans un HTML d'email deja rendu.
 *
 * Fonctionne aussi bien sur un document complet produit par Maily (injection
 * juste apres `<body>` et juste avant `</body>`) que sur un fragment ecrit a la
 * main dans `send.ts` (le fragment est alors enveloppe). C'est ce qui permet de
 * n'appeler la fonction qu'a un seul endroit — l'envoi — et de couvrir aussi
 * les emails de repli codes en dur.
 */
export const applyEmailBranding = (
  html: string,
  branding: EmailBranding,
): string => {
  if (!html) return html;
  // Deja habille : ne rien faire (campagnes dont le HTML est mis en cache).
  if (html.includes(HEADER_MARKER) || html.includes(FOOTER_MARKER)) return html;

  const header = renderBrandHeaderHtml(branding);
  const footer = renderBrandFooterHtml(branding);
  if (!header && !footer) return html;

  const bodyOpen = /<body[^>]*>/i.exec(html);
  if (bodyOpen) {
    const start = bodyOpen.index + bodyOpen[0].length;
    const closeIdx = html.toLowerCase().lastIndexOf("</body>");
    if (closeIdx > start) {
      return (
        html.slice(0, start) +
        header +
        html.slice(start, closeIdx) +
        footer +
        html.slice(closeIdx)
      );
    }
    return html.slice(0, start) + header + html.slice(start) + footer;
  }

  // Fragment : on fournit le conteneur 600px que Maily aurait produit.
  return (
    `<div style="background-color:#ffffff;">` +
    header +
    `<div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:${FONT_STACK};font-size:16px;line-height:26px;color:#203634;">` +
    html +
    `</div>` +
    footer +
    `</div>`
  );
};

// ─── Blocs Maily inseres depuis l'editeur ─────────────────────

type Node = Record<string, unknown>;

/** Le logo pre-defini, en tant que bloc image centre. */
export const buildLogoNode = (b: EmailBranding): Node | null => {
  if (!b.logo_url) return null;
  return {
    type: "image",
    attrs: {
      src: b.logo_url,
      alt: b.logo_alt || "Logo",
      title: b.logo_alt || "Logo",
      width: b.logo_width,
      height: "auto",
      alignment: "center",
      externalLink: b.header_link_url ?? "",
      isSrcVariable: false,
      isExternalLinkVariable: false,
      borderRadius: 0,
      showIfKey: null,
    },
  };
};

/**
 * La banniere pre-definie : image + titre + texte + bouton, dans une `section`
 * coloree. Le titre et le texte restent des noeuds editables — une banniere
 * tout-image disparait chez les destinataires qui bloquent les images.
 */
export const buildBannerNode = (b: EmailBranding): Node | null => {
  const hasContent =
    b.banner_image_url ||
    b.banner_title ||
    b.banner_text ||
    (b.banner_cta_label && b.banner_cta_url);
  if (!hasContent) return null;

  const content: Node[] = [];

  if (b.banner_image_url) {
    content.push({
      type: "image",
      attrs: {
        src: b.banner_image_url,
        alt: b.banner_alt || b.banner_title || "Banniere",
        title: b.banner_alt || b.banner_title || "Banniere",
        // 552px = 600px de conteneur moins le padding lateral de la section.
        width: 552,
        height: "auto",
        alignment: "center",
        externalLink: b.banner_cta_url ?? "",
        isSrcVariable: false,
        isExternalLinkVariable: false,
        borderRadius: 6,
        showIfKey: null,
      },
    });
  }

  if (b.banner_title) {
    content.push({
      type: "heading",
      attrs: { level: 2, textAlign: "center" },
      content: [{ type: "text", text: b.banner_title, marks: [{ type: "bold" }] }],
    });
  }

  if (b.banner_text) {
    content.push({
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [{ type: "text", text: b.banner_text }],
    });
  }

  if (b.banner_cta_label && b.banner_cta_url) {
    content.push({
      type: "button",
      attrs: {
        text: b.banner_cta_label,
        isTextVariable: false,
        url: b.banner_cta_url,
        isUrlVariable: false,
        alignment: "center",
        variant: "filled",
        borderRadius: "smooth",
        buttonColor: "#a0283e",
        textColor: "#ffffff",
        paddingTop: 12,
        paddingRight: 32,
        paddingBottom: 12,
        paddingLeft: 32,
      },
    });
  }

  // Une section vide de contenu ferait planter le rendu Maily.
  if (content.length === 0) return null;

  return {
    type: "section",
    attrs: {
      backgroundColor: b.banner_background,
      borderRadius: 8,
      borderWidth: 0,
      borderColor: "transparent",
      align: "center",
      paddingTop: 24,
      paddingRight: 24,
      paddingBottom: 24,
      paddingLeft: 24,
      marginTop: 8,
      marginRight: 0,
      marginBottom: 16,
      marginLeft: 0,
    },
    content,
  };
};
