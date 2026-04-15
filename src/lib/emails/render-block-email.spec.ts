import { describe, it, expect } from "vitest";
import { resolveEmailHtml, renderBlockEmail } from "./render-block-email";
import type { JSONContent } from "@maily-to/render";

// Minimal valid Maily design used across the resolver tests.
const minimalDesign: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      attrs: { textAlign: "left" },
      content: [
        { type: "text", text: "Bonjour " },
        { type: "variable", attrs: { id: "client_name" } },
      ],
    },
  ],
};

// ─── resolveEmailHtml ─────────────────────────────────────────

describe("resolveEmailHtml", () => {
  it("rend le body_design via Maily quand il a un `type`", async () => {
    const html = await resolveEmailHtml(minimalDesign, null, {
      client_name: "Marie",
    });
    expect(html).toContain("Marie");
    expect(html.toLowerCase()).toContain("<body");
  });

  it("fallback sur body_html quand body_design est null", async () => {
    const html = await resolveEmailHtml(null, "<p>Hello {{name}}</p>", {
      name: "Alice",
    });
    expect(html).toBe("<p>Hello Alice</p>");
  });

  it("fallback sur body_html quand body_design est undefined", async () => {
    const html = await resolveEmailHtml(
      undefined,
      "<p>Hi {{x}}</p>",
      { x: "world" },
    );
    expect(html).toBe("<p>Hi world</p>");
  });

  it("retourne la string body_html raw sans variables", async () => {
    const html = await resolveEmailHtml(null, "<p>Static</p>");
    expect(html).toBe("<p>Static</p>");
  });

  it("retourne une string vide si body_design ET body_html null", async () => {
    expect(await resolveEmailHtml(null, null)).toBe("");
    expect(await resolveEmailHtml(undefined, undefined)).toBe("");
  });

  it("body_design sans champ `type` → fallback sur body_html", async () => {
    // Un objet vide `{}` n'a pas la clé "type" → passe par la branche HTML
    const html = await resolveEmailHtml({}, "<p>Fallback {{v}}</p>", {
      v: "OK",
    });
    expect(html).toBe("<p>Fallback OK</p>");
  });

  it("remplace plusieurs occurrences d'une même variable", async () => {
    const html = await resolveEmailHtml(
      null,
      "<p>{{n}} et {{n}} et {{n}}</p>",
      { n: "A" },
    );
    expect(html).toBe("<p>A et A et A</p>");
  });

  it("gère les accents dans les valeurs de variables", async () => {
    const html = await resolveEmailHtml(null, "<p>{{msg}}</p>", {
      msg: "Éléonore — à bientôt !",
    });
    expect(html).toBe("<p>Éléonore — à bientôt !</p>");
  });

  it("n'interpole pas si variables est undefined (passe-plat)", async () => {
    const html = await resolveEmailHtml(null, "<p>{{keep}}</p>");
    // Avec body_html + pas de variables, la string est retournée telle quelle.
    expect(html).toBe("<p>{{keep}}</p>");
  });
});

// ─── renderBlockEmail ─────────────────────────────────────────

describe("renderBlockEmail", () => {
  it("remplace les variables par défaut (replaceVariables=true)", async () => {
    const html = await renderBlockEmail(minimalDesign, {
      variables: { client_name: "Marie" },
    });
    expect(html).toContain("Marie");
    expect(html).not.toContain("{{client_name}}");
  });

  it("garde `{{var}}` intact quand replaceVariables=false", async () => {
    const html = await renderBlockEmail(minimalDesign, {
      variables: { client_name: "Marie" },
      replaceVariables: false,
    });
    // Maily formatte `{{client_name}}` quand rien n'est remplacé.
    expect(html).toContain("{{client_name}}");
    expect(html).not.toContain("Marie");
  });

  it("applique le preheader quand fourni", async () => {
    // Éviter l'apostrophe — React Email encode `'` en `&#x27;` dans le HTML
    // de sortie, ce qui complique le matching direct.
    const html = await renderBlockEmail(minimalDesign, {
      variables: { client_name: "Marie" },
      preview: "Texte visible dans la liste de la boite mail",
    });
    expect(html).toContain("Texte visible dans la liste de la boite mail");
  });

  it("produit un HTML email-safe (tables + inline styles)", async () => {
    const html = await renderBlockEmail(minimalDesign);
    // `juice` inline les styles et Maily utilise React Email (tables).
    expect(html).toContain("<html");
    expect(html).toContain("<body");
  });
});
