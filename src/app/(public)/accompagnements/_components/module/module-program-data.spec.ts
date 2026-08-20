import { describe, it, expect } from "vitest";
import {
  buildProgramChapters,
  buildProofItems,
  formatChapterCounts,
  formatSingleCount,
  type SectionRow,
} from "./module-program-data";

const section = (
  id: string,
  position: number,
  types: string[],
  salesHook: string | null = null
): SectionRow => ({
  id,
  title: `Chapitre ${id}`,
  position,
  sales_hook: salesHook,
  accompagnement_blocks: types.map((type, i) => ({ id: `${id}-${i}`, type })),
});

describe("buildProgramChapters", () => {
  it("trie les chapitres par position, pas par ordre d'arrivée", () => {
    const chapters = buildProgramChapters([
      section("b", 2, []),
      section("a", 1, []),
    ]);
    expect(chapters.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("compte les blocs par type", () => {
    const [chapter] = buildProgramChapters([
      section("a", 1, ["video", "video", "text", "download"]),
    ]);
    expect(chapter.counts).toEqual({
      video: 2,
      text: 1,
      download: 1,
      image: 0,
      quiz: 0,
    });
  });

  it("ignore un type de bloc inconnu au lieu de casser", () => {
    const [chapter] = buildProgramChapters([
      section("a", 1, ["video", "hologramme"]),
    ]);
    expect(chapter.counts.video).toBe(1);
  });

  it("expose l'accroche quand elle existe et null sinon", () => {
    const chapters = buildProgramChapters([
      section("a", 1, [], "Vous saurez reconnaître une bonne prise du sein."),
      section("b", 2, []),
    ]);
    expect(chapters[0].salesHook).toBe(
      "Vous saurez reconnaître une bonne prise du sein."
    );
    expect(chapters[1].salesHook).toBeNull();
  });

  it("tolère une section sans blocs", () => {
    const chapters = buildProgramChapters([
      { id: "a", title: "Vide", position: 1, sales_hook: null },
    ]);
    expect(chapters[0].counts.video).toBe(0);
  });

  it("renvoie un tableau vide quand il n'y a aucune section", () => {
    expect(buildProgramChapters([])).toEqual([]);
  });

  it("marque un chapitre ameliore si sa propre modif date de moins de 6 mois", () => {
    const now = new Date("2026-08-20T00:00:00Z");
    const [chapter] = buildProgramChapters(
      [
        {
          id: "a",
          title: "Chapitre a",
          position: 1,
          sales_hook: null,
          content_updated_at: "2026-07-01T00:00:00Z",
        },
      ],
      now
    );
    expect(chapter.recentlyImproved).toBe(true);
  });

  it("marque un chapitre ameliore si un de ses blocs a change recemment", () => {
    const now = new Date("2026-08-20T00:00:00Z");
    const [chapter] = buildProgramChapters(
      [
        {
          id: "a",
          title: "Chapitre a",
          position: 1,
          sales_hook: null,
          content_updated_at: null,
          accompagnement_blocks: [
            { id: "a-0", type: "video", content_updated_at: "2026-08-01T00:00:00Z" },
          ],
        },
      ],
      now
    );
    expect(chapter.recentlyImproved).toBe(true);
  });

  it("ne marque pas un chapitre modifie il y a plus de 6 mois", () => {
    const now = new Date("2026-08-20T00:00:00Z");
    const [chapter] = buildProgramChapters(
      [
        {
          id: "a",
          title: "Chapitre a",
          position: 1,
          sales_hook: null,
          content_updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      now
    );
    expect(chapter.recentlyImproved).toBe(false);
  });

  it("ne marque pas un chapitre jamais modifie (content_updated_at absent)", () => {
    const [chapter] = buildProgramChapters([section("a", 1, ["video"])]);
    expect(chapter.recentlyImproved).toBe(false);
  });
});

describe("formatChapterCounts", () => {
  it("n'affiche que les types qui vendent, au pluriel correct", () => {
    const [chapter] = buildProgramChapters([
      section("a", 1, ["video", "video", "download", "quiz", "text", "image"]),
    ]);
    expect(formatChapterCounts(chapter.counts)).toEqual([
      "2 vidéos",
      "1 document",
      "1 quiz",
    ]);
  });

  it("renvoie un tableau vide quand le chapitre n'a que du texte", () => {
    const [chapter] = buildProgramChapters([section("a", 1, ["text", "image"])]);
    expect(formatChapterCounts(chapter.counts)).toEqual([]);
  });
});

describe("formatSingleCount", () => {
  it("accorde le pluriel de chaque type qui vend", () => {
    expect(formatSingleCount("video", 1)).toBe("1 vidéo");
    expect(formatSingleCount("video", 3)).toBe("3 vidéos");
    expect(formatSingleCount("download", 1)).toBe("1 document");
    expect(formatSingleCount("download", 2)).toBe("2 documents");
    expect(formatSingleCount("quiz", 2)).toBe("2 quiz");
  });

  it("renvoie null pour un compte nul ou un type qui ne vend pas", () => {
    expect(formatSingleCount("video", 0)).toBeNull();
    expect(formatSingleCount("text", 5)).toBeNull();
    expect(formatSingleCount("image", 5)).toBeNull();
  });
});

describe("buildProofItems", () => {
  it("agrège les chapitres et les vidéos de tout le module", () => {
    const chapters = buildProgramChapters([
      section("a", 1, ["video", "video", "download"]),
      section("b", 2, ["video"]),
    ]);
    expect(buildProofItems(chapters)).toEqual([
      "2 chapitres",
      "3 vidéos",
      "1 document",
    ]);
  });

  it("accorde le singulier", () => {
    const chapters = buildProgramChapters([section("a", 1, ["video"])]);
    expect(buildProofItems(chapters)).toEqual(["1 chapitre", "1 vidéo"]);
  });

  it("renvoie un tableau vide sans chapitre", () => {
    expect(buildProofItems([])).toEqual([]);
  });
});
