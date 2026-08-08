import { describe, it, expect } from "vitest";
import { PACK_SLUG } from "@/config/accompagnements";
import type { Testimonial } from "@/data/testimonials";
import {
  selectForTopic,
  selectFeatured,
  selectAll,
} from "@/lib/testimonials";

const make = (
  id: string,
  overrides: Partial<Testimonial> = {}
): Testimonial =>
  ({
    id,
    author: `Auteur ${id}`,
    detail: "Maman",
    quote: "Un avis.",
    rating: 5,
    topics: [],
    source: "direct",
    ...overrides,
  }) as Testimonial;

describe("selectForTopic", () => {
  it("ne complète pas quand le sujet a assez d'avis dédiés", () => {
    const pool = [
      make("a", { topics: [PACK_SLUG] }),
      make("b", { topics: [PACK_SLUG] }),
      make("c", { topics: [PACK_SLUG] }),
      make("z", { featured: true }),
    ];

    const result = selectForTopic(pool, PACK_SLUG, 3);

    expect(result.map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("complète avec les avis génériques mis en avant", () => {
    const pool = [
      make("a", { topics: [PACK_SLUG] }),
      make("g1", { featured: true }),
      make("g2", { featured: true }),
      make("non-mis-en-avant"),
    ];

    const result = selectForTopic(pool, PACK_SLUG, 3);

    expect(result.map((t) => t.id)).toEqual(["a", "g1", "g2"]);
  });

  it("ne renvoie jamais deux fois le même avis", () => {
    const pool = [
      make("a", { topics: [PACK_SLUG], featured: true }),
      make("g1", { featured: true }),
    ];

    const result = selectForTopic(pool, PACK_SLUG, 3);

    expect(result.map((t) => t.id)).toEqual(["a", "g1"]);
  });

  it("renvoie ce qui existe quand le vivier est trop petit", () => {
    const result = selectForTopic(
      [make("a", { topics: [PACK_SLUG] })],
      PACK_SLUG,
      3
    );

    expect(result).toHaveLength(1);
  });

  it("renvoie un tableau vide sans avis", () => {
    expect(selectForTopic([], PACK_SLUG, 3)).toEqual([]);
  });

  it("classe du plus récent au plus ancien, à défaut par identifiant", () => {
    const pool = [
      make("b", { topics: [PACK_SLUG] }),
      make("a", { topics: [PACK_SLUG] }),
      make("recent", { topics: [PACK_SLUG], date: "2026-01-01" }),
    ];

    const result = selectForTopic(pool, PACK_SLUG, 3);

    expect(result.map((t) => t.id)).toEqual(["recent", "a", "b"]);
  });
});

describe("selectFeatured", () => {
  it("ne retient que les avis mis en avant, dans la limite demandée", () => {
    const pool = [
      make("f1", { featured: true }),
      make("f2", { featured: true, topics: [PACK_SLUG] }),
      make("autre"),
    ];

    const result = selectFeatured(pool, 6);

    expect(result.map((t) => t.id)).toEqual(["f1", "f2"]);
  });
});

describe("selectAll", () => {
  it("filtre par sujet", () => {
    const pool = [make("a", { topics: [PACK_SLUG] }), make("b")];

    expect(selectAll(pool, { topic: PACK_SLUG }).map((t) => t.id)).toEqual([
      "a",
    ]);
  });

  it("filtre par source", () => {
    const pool = [
      make("g", { source: "google", reviewUrl: "https://exemple.test/avis" }),
      make("d"),
    ];

    expect(selectAll(pool, { source: "google" }).map((t) => t.id)).toEqual([
      "g",
    ]);
  });

  it("renvoie tout sans filtre", () => {
    expect(selectAll([make("a"), make("b")])).toHaveLength(2);
  });
});
