import { describe, it, expect } from "vitest";
import {
  canEditAccompagnement,
  canEditSection,
  canEditBlock,
} from "./authorization";

const OWNER = "consultante-proprietaire";
const COLLABORATOR = "consultante-collaboratrice";
const OUTSIDER = "consultante-tierce";

const FORMATION = "accompagnement-1";
const SECTION = "section-1";
const BLOCK = "bloc-1";

/**
 * Supabase minimal adosse a des tables en memoire, honorant les `.eq()`.
 *
 * Un mock qui ignore les filtres ne saurait pas distinguer « trouve la
 * accompagnement » de « trouve la accompagnement **de cette consultante** », ce qui est
 * precisement la question posee ici.
 */
const makeSupabase = (
  tables: Record<string, Array<Record<string, unknown>>>,
) => ({
  from: (table: string) => {
    const filters: Array<[string, unknown]> = [];
    const chain = {
      select: () => chain,
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return chain;
      },
      maybeSingle: () => {
        const row = (tables[table] ?? []).find((candidate) =>
          filters.every(([column, value]) => candidate[column] === value),
        );
        return Promise.resolve({ data: row ?? null, error: null });
      },
    };
    return chain;
  },
});

const supabase = () =>
  makeSupabase({
    accompagnements: [{ id: FORMATION, consultant_id: OWNER }],
    accompagnement_collaborators: [
      { accompagnement_id: FORMATION, consultant_id: COLLABORATOR },
    ],
    accompagnement_sections: [{ id: SECTION, accompagnement_id: FORMATION }],
    accompagnement_blocks: [{ id: BLOCK, section_id: SECTION }],
  }) as unknown as Parameters<typeof canEditAccompagnement>[0];

describe("canEditAccompagnement", () => {
  it("autorise la consultante proprietaire", async () => {
    expect(await canEditAccompagnement(supabase(), FORMATION, OWNER)).toBe(true);
  });

  it("autorise une collaboratrice declaree", async () => {
    // L'espace consultante liste les accompagnements ou elle est collaboratrice :
    // les lui montrer sans la laisser les editer n'aurait pas de sens.
    expect(await canEditAccompagnement(supabase(), FORMATION, COLLABORATOR)).toBe(
      true,
    );
  });

  it("refuse une consultante tierce", async () => {
    expect(await canEditAccompagnement(supabase(), FORMATION, OUTSIDER)).toBe(false);
  });

  it("refuse une accompagnement inexistante", async () => {
    expect(await canEditAccompagnement(supabase(), "inconnue", OWNER)).toBe(false);
  });
});

describe("canEditSection", () => {
  it("remonte a la accompagnement pour trancher", async () => {
    expect(await canEditSection(supabase(), SECTION, OWNER)).toBe(true);
    expect(await canEditSection(supabase(), SECTION, COLLABORATOR)).toBe(true);
    expect(await canEditSection(supabase(), SECTION, OUTSIDER)).toBe(false);
  });

  it("refuse une section inexistante", async () => {
    expect(await canEditSection(supabase(), "inconnue", OWNER)).toBe(false);
  });
});

describe("canEditBlock", () => {
  it("remonte la chaine bloc → section → accompagnement", async () => {
    expect(await canEditBlock(supabase(), BLOCK, OWNER)).toBe(true);
    expect(await canEditBlock(supabase(), BLOCK, COLLABORATOR)).toBe(true);
    expect(await canEditBlock(supabase(), BLOCK, OUTSIDER)).toBe(false);
  });

  it("refuse un bloc inexistant", async () => {
    expect(await canEditBlock(supabase(), "inconnu", OWNER)).toBe(false);
  });
});
