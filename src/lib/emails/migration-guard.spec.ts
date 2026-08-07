import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Les templates d'email sont editables par Carole depuis l'admin (Phase 6).
 * Une migration qui ferait `UPDATE email_templates` ecraserait son travail
 * silencieusement, au prochain deploiement, sans que personne ne s'en rende
 * compte avant qu'un client recoive l'ancien contenu.
 *
 * Regle actee le 2026-07-20 : **les migrations creent, elles ne modifient pas**.
 * Une correction de template passe par l'admin, pas par le SQL.
 *
 * Les migrations anterieures a la regle sont tolerees : elles sont deja
 * appliquees en production et les reecrire ne changerait rien a l'etat de la
 * base. Seules les nouvelles sont contraintes.
 */

const MIGRATIONS_DIR = resolve(__dirname, "../../../supabase/migrations");

/** Derniere migration ecrite avant l'adoption de la regle. */
const RULE_ADOPTED_AFTER = 48;

/** Migrations anterieures contenant deja un UPDATE, laissees telles quelles. */
const GRANDFATHERED = [
  "00034_update_booking_confirmation_template.sql",
  "00045_refresh_formation_access_template.sql",
];

/**
 * Exceptions explicites a la regle, distinctes du grandfathering.
 *
 * La regle vise un UPDATE qui *remplace* le contenu d'un template par une
 * version figee dans le SQL : le travail de Carole disparait au deploiement.
 * Un renommage de marqueur de fusion ne fait pas cela. Il applique un
 * `replace()` cible sur `{{ancien}}` -> `{{nouveau}}` et laisse le reste du
 * HTML intact, quel qu'il soit.
 *
 * Il ne peut pas non plus passer par l'admin : le nom de la variable change
 * cote code au meme deploiement. Entre celui-ci et une retouche manuelle,
 * chaque email partirait avec `{{formation_title}}` affiche en clair.
 *
 * N'ajouter une entree ici que pour un renommage mecanique de marqueur, jamais
 * pour une correction de contenu — celle-la passe toujours par l'admin.
 */
const MARKER_RENAMES = [
  "00071_renommage_vocabulaire.sql",
  "00072_renommage_vocabulaire_body_design.sql",
];

const migrationNumber = (filename: string): number =>
  Number.parseInt(filename.slice(0, 5), 10);

/** Retire les commentaires SQL : le mot "UPDATE" y est legitime. */
const stripComments = (sql: string): string =>
  sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

const mutatesEmailTemplates = (sql: string): boolean => {
  const code = stripComments(sql);
  return (
    /\bUPDATE\s+email_templates\b/i.test(code) ||
    /\bDELETE\s+FROM\s+email_templates\b/i.test(code)
  );
};

describe("migrations et templates d'email", () => {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));

  it("trouve bien les migrations (sinon le garde-fou est vide et toujours vert)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("detecte un UPDATE sur email_templates", () => {
    // Verifie que le detecteur mord vraiment, plutot que de passer parce qu'il
    // ne trouve jamais rien.
    expect(mutatesEmailTemplates("UPDATE email_templates SET subject = 'x';")).toBe(true);
    expect(mutatesEmailTemplates("DELETE FROM email_templates WHERE name = 'x';")).toBe(true);
  });

  it("ignore le mot UPDATE dans les commentaires", () => {
    expect(mutatesEmailTemplates("-- UPDATE email_templates un jour\nSELECT 1;")).toBe(false);
  });

  it("laisse passer une insertion idempotente", () => {
    expect(
      mutatesEmailTemplates(
        "INSERT INTO email_templates (name) VALUES ('x') ON CONFLICT (name) DO NOTHING;",
      ),
    ).toBe(false);
  });

  it("aucune nouvelle migration ne modifie email_templates", () => {
    const offenders = files
      .filter((f) => migrationNumber(f) > RULE_ADOPTED_AFTER)
      .filter((f) => !GRANDFATHERED.includes(f) && !MARKER_RENAMES.includes(f))
      .filter((f) =>
        mutatesEmailTemplates(readFileSync(resolve(MIGRATIONS_DIR, f), "utf8")),
      );

    expect(
      offenders,
      `Ces migrations modifient email_templates : ${offenders.join(", ")}.\n` +
        `Les templates sont editables depuis l'admin — un UPDATE en migration ` +
        `ecraserait le travail de Carole au deploiement suivant.\n` +
        `Corriger le template dans l'admin, ou n'inserer que s'il n'existe pas ` +
        `(ON CONFLICT DO NOTHING).`,
    ).toEqual([]);
  });

  it("les exceptions de renommage ne font que du replace(), jamais d'ecrasement", () => {
    // Sans ce test, MARKER_RENAMES deviendrait une porte ouverte : on pourrait
    // y glisser un UPDATE qui reecrit un body_html entier.
    for (const file of MARKER_RENAMES) {
      const code = stripComments(
        readFileSync(resolve(MIGRATIONS_DIR, file), "utf8"),
      );
      const statements = code
        .split(";")
        .filter((s) => /\bUPDATE\s+email_templates\b/i.test(s));

      expect(statements.length, `${file} est liste sans modifier email_templates`)
        .toBeGreaterThan(0);

      for (const statement of statements) {
        // Le renommage de la cle `name` est la seule affectation directe permise.
        const isKeyRename = /SET\s+name\s*=\s*'[a-z_]+'\s*WHERE\s+name\s*=\s*'[a-z_]+'/i.test(
          statement,
        );
        expect(
          isKeyRename || /replace\s*\(/i.test(statement),
          `${file} contient un UPDATE email_templates sans replace() :\n${statement.trim()}`,
        ).toBe(true);
      }
    }
  });
});
