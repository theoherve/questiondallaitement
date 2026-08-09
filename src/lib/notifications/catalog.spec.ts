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

  it("pointe booking_confirmed vers la réservation concernée", () => {
    const def = NOTIFICATION_CATALOG.booking_confirmed;
    expect(def.href?.({ booking_id: "b1", consultation_title: "Bilan" })).toBe(
      "/espace-client/reservations/b1"
    );
  });
});
