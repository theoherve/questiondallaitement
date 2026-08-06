import { describe, it, expect } from "vitest";
import {
  DEFAULT_EMAIL_BRANDING,
  applyEmailBranding,
  buildBannerNode,
  buildLogoNode,
  parseEmailBranding,
  renderBrandFooterHtml,
  renderBrandHeaderHtml,
  type EmailBranding,
} from "./branding";
import { emailBrandingSchema } from "@/validations/email-branding";

const branding = (over: Partial<EmailBranding> = {}): EmailBranding => ({
  ...DEFAULT_EMAIL_BRANDING,
  logo_url: "https://cdn.test/logo.png",
  ...over,
});

const doc = (body: string) =>
  `<!DOCTYPE html><html><head><title>t</title></head><body style="margin:0">${body}</body></html>`;

describe("parseEmailBranding", () => {
  it("retombe sur les valeurs par defaut pour une entree vide ou invalide", () => {
    expect(parseEmailBranding(null)).toEqual(DEFAULT_EMAIL_BRANDING);
    expect(parseEmailBranding("pas du json")).toEqual(DEFAULT_EMAIL_BRANDING);
    expect(parseEmailBranding(42)).toEqual(DEFAULT_EMAIL_BRANDING);
  });

  it("fusionne un reglage partiel sans perdre les autres cles", () => {
    const parsed = parseEmailBranding({ logo_width: 200, logo_url: "https://x/l.png" });
    expect(parsed.logo_width).toBe(200);
    expect(parsed.logo_url).toBe("https://x/l.png");
    expect(parsed.footer_text).toBe(DEFAULT_EMAIL_BRANDING.footer_text);
  });

  it("ignore une valeur du mauvais type plutot que de la propager", () => {
    const parsed = parseEmailBranding({ logo_width: "grand", header_enabled: "oui" });
    expect(parsed.logo_width).toBe(DEFAULT_EMAIL_BRANDING.logo_width);
    expect(parsed.header_enabled).toBe(true);
  });

  it("accepte une chaine JSON (colonne JSONB renvoyee en texte)", () => {
    expect(parseEmailBranding('{"logo_width":120}').logo_width).toBe(120);
  });
});

describe("renderBrandHeaderHtml", () => {
  it("ne rend rien sans logo ou en-tete desactive", () => {
    expect(renderBrandHeaderHtml(branding({ logo_url: null }))).toBe("");
    expect(renderBrandHeaderHtml(branding({ header_enabled: false }))).toBe("");
  });

  it("rend une image dimensionnee avec alt et couleur de fond", () => {
    const html = renderBrandHeaderHtml(
      branding({ logo_width: 180, logo_alt: "Marque", header_background: "#fff8f6" }),
    );
    expect(html).toContain('width="180"');
    expect(html).toContain('alt="Marque"');
    expect(html).toContain("background-color:#fff8f6");
    expect(html).not.toContain("<a ");
  });

  it("rend le logo cliquable quand un lien est defini", () => {
    const html = renderBrandHeaderHtml(
      branding({ header_link_url: "https://exemple.fr" }),
    );
    expect(html).toContain('href="https://exemple.fr"');
  });

  it("echappe le texte alternatif pour ne pas casser l'attribut", () => {
    const html = renderBrandHeaderHtml(branding({ logo_alt: 'Qda "IBCLC" <b>' }));
    expect(html).toContain("&quot;IBCLC&quot;");
    expect(html).not.toContain("<b>");
  });
});

describe("renderBrandFooterHtml", () => {
  it("produit un paragraphe par ligne", () => {
    const html = renderBrandFooterHtml(branding({ footer_text: "Ligne A\nLigne B" }));
    expect(html.match(/<p /g)).toHaveLength(2);
    expect(html).toContain("Ligne A");
    expect(html).toContain("Ligne B");
  });

  it("ne rend rien si desactive ou vide", () => {
    expect(renderBrandFooterHtml(branding({ footer_enabled: false }))).toBe("");
    expect(renderBrandFooterHtml(branding({ footer_text: "  \n " }))).toBe("");
  });
});

describe("applyEmailBranding", () => {
  it("insere en-tete apres <body> et pied avant </body>", () => {
    const out = applyEmailBranding(doc("<p>Bonjour</p>"), branding());
    const headerIdx = out.indexOf("qda-brand-header");
    const contentIdx = out.indexOf("<p>Bonjour</p>");
    const footerIdx = out.indexOf("qda-brand-footer");
    expect(headerIdx).toBeGreaterThan(out.indexOf("<body"));
    expect(contentIdx).toBeGreaterThan(headerIdx);
    expect(footerIdx).toBeGreaterThan(contentIdx);
    expect(footerIdx).toBeLessThan(out.indexOf("</body>"));
  });

  it("est idempotent — un HTML deja habille n'est pas modifie", () => {
    const once = applyEmailBranding(doc("<p>Bonjour</p>"), branding());
    expect(applyEmailBranding(once, branding())).toBe(once);
  });

  it("enveloppe un fragment sans <body> dans un conteneur", () => {
    const out = applyEmailBranding("<h1>Facture</h1>", branding());
    expect(out).toContain("qda-brand-header");
    expect(out).toContain("<h1>Facture</h1>");
    expect(out).toContain("qda-brand-footer");
    expect(out).toContain("max-width:600px");
  });

  it("rend le HTML inchange quand rien n'est configure", () => {
    const html = doc("<p>Bonjour</p>");
    const none = branding({
      logo_url: null,
      footer_enabled: false,
    });
    expect(applyEmailBranding(html, none)).toBe(html);
  });

  it("laisse une chaine vide telle quelle", () => {
    expect(applyEmailBranding("", branding())).toBe("");
  });
});

describe("buildLogoNode", () => {
  it("renvoie null sans logo", () => {
    expect(buildLogoNode(branding({ logo_url: null }))).toBeNull();
  });

  it("produit un noeud image centre a la largeur configuree", () => {
    const node = buildLogoNode(branding({ logo_width: 140 })) as {
      type: string;
      attrs: Record<string, unknown>;
    };
    expect(node.type).toBe("image");
    expect(node.attrs.width).toBe(140);
    expect(node.attrs.alignment).toBe("center");
  });
});

describe("buildBannerNode", () => {
  it("renvoie null quand aucun champ de banniere n'est rempli", () => {
    expect(buildBannerNode(branding())).toBeNull();
  });

  it("assemble image, titre, texte et bouton dans une section", () => {
    const node = buildBannerNode(
      branding({
        banner_image_url: "https://cdn.test/b.png",
        banner_title: "Formation",
        banner_text: "Deux jours",
        banner_cta_label: "S'inscrire",
        banner_cta_url: "https://exemple.fr/formations",
        banner_background: "#f5ebe8",
      }),
    ) as { type: string; attrs: Record<string, unknown>; content: { type: string }[] };

    expect(node.type).toBe("section");
    expect(node.attrs.backgroundColor).toBe("#f5ebe8");
    expect(node.content.map((c) => c.type)).toEqual([
      "image",
      "heading",
      "paragraph",
      "button",
    ]);
  });

  it("omet le bouton si le lien manque — un bouton sans URL est un cul-de-sac", () => {
    const node = buildBannerNode(
      branding({ banner_title: "Titre", banner_cta_label: "Cliquer" }),
    ) as { content: { type: string }[] };
    expect(node.content.map((c) => c.type)).toEqual(["heading"]);
  });
});

describe("emailBrandingSchema", () => {
  const valid = {
    header_enabled: true,
    logo_url: "https://cdn.test/logo.png",
    logo_alt: "Qda",
    logo_width: 160,
    header_background: "#fff8f6",
    header_link_url: "",
    footer_enabled: true,
    footer_text: "Pied",
    banner_image_url: "",
    banner_alt: "",
    banner_title: "",
    banner_text: "",
    banner_cta_label: "",
    banner_cta_url: "",
    banner_background: "#f5ebe8",
  };

  it("accepte un reglage complet et transforme les chaines vides en null", () => {
    const parsed = emailBrandingSchema.parse(valid);
    expect(parsed.header_link_url).toBeNull();
    expect(parsed.banner_image_url).toBeNull();
  });

  it("refuse un logo SVG — non affiche par Gmail et Outlook", () => {
    const r = emailBrandingSchema.safeParse({
      ...valid,
      logo_url: "https://cdn.test/logo.svg",
    });
    expect(r.success).toBe(false);
  });

  it("refuse une couleur non hexadecimale", () => {
    expect(
      emailBrandingSchema.safeParse({ ...valid, header_background: "beige" }).success,
    ).toBe(false);
  });

  it("refuse une largeur de logo hors bornes", () => {
    expect(emailBrandingSchema.safeParse({ ...valid, logo_width: 400 }).success).toBe(
      false,
    );
    expect(emailBrandingSchema.safeParse({ ...valid, logo_width: 10 }).success).toBe(
      false,
    );
  });
});
