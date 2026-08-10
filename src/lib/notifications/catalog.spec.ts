import { describe, it, expect } from "vitest";
import { NOTIFICATION_CATALOG } from "./catalog";

describe("NOTIFICATION_CATALOG", () => {
  it("indexe chaque définition sous sa propre clé", () => {
    for (const [key, def] of Object.entries(NOTIFICATION_CATALOG)) {
      expect(def.key).toBe(key);
    }
  });

  it("n'utilise que des catégories connues", () => {
    const allowed = ["transactional", "marketing", "system"];
    for (const def of Object.values(NOTIFICATION_CATALOG)) {
      expect(allowed).toContain(def.category);
    }
  });

  it("déclare au moins un canal par événement", () => {
    for (const def of Object.values(NOTIFICATION_CATALOG)) {
      expect(def.channels.length).toBeGreaterThan(0);
    }
  });

  it("limite les actions à deux boutons", () => {
    const sample = {
      booking_id: "b1",
      invoice_id: "i1",
      accompagnement_slug: "s1",
      formation_id: "f1",
      consultation_title: "Consultation",
      title: "Titre",
      number: "2026-0142",
      date: "14 août",
      time: "10h30",
      amount: "60,00 €",
      review_url: "https://search.google.com/local/writereview?placeid=x",
    };
    for (const def of Object.values(NOTIFICATION_CATALOG)) {
      if (!def.actions) continue;
      const actions = def.actions(sample as never);
      expect(actions.length).toBeLessThanOrEqual(2);
    }
  });

  it("construit un titre non vide pour booking_confirmed", () => {
    const def = NOTIFICATION_CATALOG.booking_confirmed;
    const title = def.title({ booking_id: "b1", consultation_title: "Bilan" });
    expect(title).toContain("confirmée");
  });

  // Il n'existe pas de route /espace-client/reservations/[id] : la liste est la
  // seule cible atteignable.
  it("pointe booking_confirmed vers la liste des réservations", () => {
    const def = NOTIFICATION_CATALOG.booking_confirmed;
    expect(def.href?.({ booking_id: "b1", consultation_title: "Bilan" })).toBe(
      "/espace-client/reservations"
    );
  });

  it("ne construit que des liens internes ou absolus connus", () => {
    const sample = {
      booking_id: "b1",
      invoice_id: "i1",
      accompagnement_id: "a1",
      formation_id: "f1",
      title: "Titre",
      number: "2026-0142",
      date: "14 août",
      time: "10h30",
      amount: "60,00 €",
      client_name: "Camille",
      consultant_name: "Carole",
      label: "Consultation",
      author: "Camille",
      rating: 5,
      job: "cron",
      reason: "timeout",
    };
    for (const def of Object.values(NOTIFICATION_CATALOG)) {
      const href = def.href?.(sample as never);
      // `review_request` pointe vers la fiche Google : c'est le seul lien
      // sortant du catalogue, et il est voulu.
      if (href && def.key !== "review_request") {
        expect(href.startsWith("/")).toBe(true);
      }
      for (const action of def.actions?.(sample as never) ?? []) {
        if (def.key === "review_request") continue;
        expect(action.href.startsWith("/")).toBe(true);
      }
    }
  });
});

describe("les événements marketing", () => {
  it("classe les quatre événements marketing dans des catégories désactivables", () => {
    const marketing = [
      "blog_post_published",
      "module_reminder",
      "review_request",
      "weekly_digest",
    ] as const;

    for (const key of marketing) {
      const def = NOTIFICATION_CATALOG[key];
      expect(def).toBeDefined();
      expect(def.category).toBe("marketing");
    }
  });

  it("déclare un adaptateur email sur chaque événement marketing", () => {
    for (const def of Object.values(NOTIFICATION_CATALOG)) {
      if (def.category !== "marketing") continue;
      expect(def.email).toBeTypeOf("function");
    }
  });
});
