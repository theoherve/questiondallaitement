import { describe, it, expect } from "vitest";
import {
  DEFAULT_TEMPLATE_DESIGNS,
  TEMPLATE_DEFAULT_SUBJECTS,
  TEMPLATE_DEFAULT_VARIABLES,
} from "./default-template-designs";
import { renderBlockEmail, resolveEmailHtml } from "./render-block-email";
import { buildZoomBlock, buildMemoBlock, buildUnsubscribeLink } from "./send";
import type { JSONContent } from "@maily-to/render";

/**
 * Les designs par defaut alimentent le bouton « restaurer les designs par
 * defaut » de l'admin. Un design qui oublie un placeholder ne provoque aucune
 * erreur : la variable est remplacee par rien, et l'email part ampute — un lien
 * Zoom absent, un lien d'acces absent. Personne ne le voit avant qu'une cliente
 * le signale.
 *
 * Ce test fige les placeholders que chaque design doit porter, d'apres ce que
 * `send.ts` fournit reellement a l'envoi.
 */
const REQUIRED_PLACEHOLDERS: Record<string, string[]> = {
  // sendBookingConfirmation fournit zoom_block : un bloc HTML contenant le
  // bouton « Rejoindre la reunion Zoom » pour les teleconsultations.
  booking_confirmation: ["client_name", "consultant_name", "date", "time", "zoom_block"],
  booking_reminder: ["client_name", "consultant_name", "time"],
  booking_cancelled: ["client_name", "date", "refund_info"],
  // sendAccompagnementAccess fournit access_url ET accompagnement_url, pointant sur la
  // meme URL. Le design utilise accompagnement_url ; c'est celui qui doit etre la.
  accompagnement_access: ["client_name", "accompagnement_title", "accompagnement_url"],
  welcome: ["client_name", "dashboard_url"],
  password_reset: ["client_name", "reset_url"],
  // sendMigrationWelcomeEmail fournit setup_url : le lien d'activation du
  // compte migre, valable 72 h. Sans design, ce template restait bloque sur
  // l'apercu HTML en lecture seule dans l'admin.
  migration_welcome: ["client_name", "setup_url"],
  // Creneau vendu deux fois : le montant rembourse doit apparaitre, sinon la
  // cliente ne relie pas l'email au credit sur son relevé.
  booking_slot_conflict: [
    "client_name",
    "date",
    "time",
    "amount_refunded",
    "booking_url",
  ],
  // sendNewsletterWelcome fournit memo_block — le bouton de telechargement du
  // memo, vide tant qu'aucun fichier n'est depose — et unsubscribe_link, dont
  // l'absence rendrait l'envoi illegal.
  newsletter_welcome: ["first_name", "memo_block", "unsubscribe_link"],
};

describe("designs par defaut des templates d'email", () => {
  it("couvre tous les designs par defaut existants", () => {
    // Sinon un design ajoute plus tard echapperait silencieusement au controle.
    expect(Object.keys(DEFAULT_TEMPLATE_DESIGNS).sort()).toEqual(
      Object.keys(REQUIRED_PLACEHOLDERS).sort(),
    );
  });

  for (const [name, placeholders] of Object.entries(REQUIRED_PLACEHOLDERS)) {
    it(`${name} rend tous ses placeholders`, async () => {
      const design = DEFAULT_TEMPLATE_DESIGNS[name];
      expect(design, `design absent pour ${name}`).toBeDefined();

      const html = await renderBlockEmail(design as JSONContent, {
        replaceVariables: false,
      });

      const missing = placeholders.filter((p) => !html.includes(`{{${p}}}`));
      expect(
        missing,
        `${name} : placeholders absents du rendu — la variable sera remplacee ` +
          `par du vide a l'envoi`,
      ).toEqual([]);
    });
  }

  it("chaque design a un objet et des variables par defaut", () => {
    // `restoreDefaultTemplates` fait `TEMPLATE_DEFAULT_SUBJECTS[name] ?? name`.
    // Un design sans entree ici verrait son objet remplace par son nom brut :
    // une cliente recevrait un email intitule « migration_welcome ».
    const designs = Object.keys(DEFAULT_TEMPLATE_DESIGNS).sort();
    expect(Object.keys(TEMPLATE_DEFAULT_SUBJECTS).sort()).toEqual(designs);
    expect(Object.keys(TEMPLATE_DEFAULT_VARIABLES).sort()).toEqual(designs);
  });

  it("les variables par defaut correspondent aux placeholders du design", async () => {
    // Une variable declaree mais absente du design ne sert a rien ; un
    // placeholder present mais non declare n'est pas propose dans l'editeur.
    for (const [name, design] of Object.entries(DEFAULT_TEMPLATE_DESIGNS)) {
      const html = await renderBlockEmail(design as JSONContent, {
        replaceVariables: false,
      });
      const inDesign = new Set(
        [...html.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]),
      );
      expect(
        [...inDesign].sort(),
        `${name} : la liste de variables par defaut ne colle pas au design`,
      ).toEqual([...(TEMPLATE_DEFAULT_VARIABLES[name] ?? [])].sort());
    }
  });

  /**
   * Qui signe chaque email. Les transactionnels sont signes par l'equipe ; la
   * newsletter est signee par Carole, parce qu'elle emane d'une personne et
   * non du site. Le nom attendu est explicite plutot que devine : sans lui, le
   * test se contenterait de constater la presence d'un <br> n'importe ou.
   */
  const SIGNATURES: Record<string, string> = {
    newsletter_welcome: "Carole Hervé",
  };
  const DEFAULT_SIGNATURE = "L&#x27;équipe";

  it("aucune signature ne compte sur un \\n pour aller a la ligne", async () => {
    // En HTML un \n est un espace. « À bientôt,\nL'équipe » s'affiche sur une
    // seule ligne : il faut un <br> explicite.
    for (const [name, design] of Object.entries(DEFAULT_TEMPLATE_DESIGNS)) {
      const html = await renderBlockEmail(design as JSONContent, {
        replaceVariables: false,
      });
      const signature = SIGNATURES[name] ?? DEFAULT_SIGNATURE;
      const collapsed = html.replace(/\n/g, "␊");
      expect(
        new RegExp(`␊\\s*${signature}`).test(collapsed),
        `${name} : signature coupee par un \\n, qui ne produit pas de retour a la ligne`,
      ).toBe(false);

      // Sans cette seconde assertion, supprimer purement le retour a la ligne
      // ferait passer le test alors que la signature serait sur une seule ligne.
      expect(
        new RegExp(`<br\\s*/?>\\s*${signature}`).test(html),
        `${name} : la signature doit etre coupee par un <br>`,
      ).toBe(true);
    }
  });

  it("le bloc Zoom n'imbrique pas un <p> dans un <p>", async () => {
    // zoom_block est injecte a l'interieur d'un paragraphe : s'il porte lui-meme
    // un <p>, le HTML devient invalide et les clients mail referment le
    // paragraphe exterieur, cassant l'espacement du reste de l'email.
    // On injecte ce que sendBookingConfirmation produit reellement, pas un
    // fragment de complaisance : c'est la seule facon que ce test morde.
    const html = await resolveEmailHtml(
      DEFAULT_TEMPLATE_DESIGNS.booking_confirmation as JSONContent,
      null,
      { zoom_block: buildZoomBlock("https://zoom.us/j/123") },
    );
    expect(/<p[^>]*>\s*<p[^>]*>/.test(html)).toBe(false);
    expect(html).toContain('href="https://zoom.us/j/123"');
  });

  it("le bloc mémo et le lien de désinscription n'imbriquent pas un <p> dans un <p>", async () => {
    // Meme piege que zoom_block : les deux fragments sont injectes a
    // l'interieur d'un paragraphe. On injecte ce que sendNewsletterWelcome
    // produit reellement, pas un fragment de complaisance.
    const html = await resolveEmailHtml(
      DEFAULT_TEMPLATE_DESIGNS.newsletter_welcome as JSONContent,
      null,
      {
        memo_block: buildMemoBlock("https://exemple.test/memo.pdf"),
        unsubscribe_link: buildUnsubscribeLink("https://exemple.test/desinscription?token=abc"),
      },
    );
    expect(/<p[^>]*>\s*<p[^>]*>/.test(html)).toBe(false);
    expect(html).toContain('href="https://exemple.test/memo.pdf"');
    expect(html).not.toContain("{{memo_block}}");
  });

  it("newsletter_welcome porte toujours un lien de désinscription", async () => {
    // Obligation legale, et l'email part par Resend : contrairement aux
    // campagnes Brevo, personne ne l'ajoute a notre place.
    const html = await resolveEmailHtml(
      DEFAULT_TEMPLATE_DESIGNS.newsletter_welcome as JSONContent,
      null,
      {
        memo_block: buildMemoBlock(null),
        unsubscribe_link: buildUnsubscribeLink("https://exemple.test/desinscription?token=abc"),
      },
    );
    expect(html).toContain("desinscription?token=abc");
    expect(html).not.toContain("{{unsubscribe_link}}");
  });

  it("buildMemoBlock ne produit rien tant qu'aucun mémo n'est déposé", () => {
    // Sinon l'email porterait un bouton vers une URL vide.
    expect(buildMemoBlock(null)).toBe("");
  });

  it("buildZoomBlock ne produit rien hors teleconsultation", () => {
    expect(buildZoomBlock(undefined)).toBe("");
  });

  it("booking_confirmation rend le bloc Zoom en HTML cliquable", async () => {
    // zoom_block n'est pas une valeur mais un fragment HTML porteur d'un <a>.
    // Maily ne substitue que ses noeuds variable(), jamais un {{x}} ecrit en
    // texte : sans reprise cote resolveEmailHtml, la cliente lirait
    // « {{zoom_block}} » au lieu de voir un bouton.
    const zoomHtml = '<p><a href="https://zoom.us/j/123">Rejoindre</a></p>';

    const html = await resolveEmailHtml(
      DEFAULT_TEMPLATE_DESIGNS.booking_confirmation as JSONContent,
      null,
      { zoom_block: zoomHtml },
    );

    expect(html).toContain('href="https://zoom.us/j/123"');
    expect(html).not.toContain("{{zoom_block}}");
  });

  it("laisse vide un placeholder sans valeur plutot que de l'afficher", async () => {
    // Consultation en cabinet : zoom_block vaut "". Le placeholder doit
    // disparaitre, pas rester visible dans l'email.
    const html = await resolveEmailHtml(
      DEFAULT_TEMPLATE_DESIGNS.booking_confirmation as JSONContent,
      null,
      { zoom_block: "" },
    );

    expect(html).not.toContain("{{zoom_block}}");
  });
});
