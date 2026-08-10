import { describe, it, expect } from "vitest";
import { NOTIFICATION_CATALOG } from "./catalog";
import { PREFERENCE_CATEGORIES } from "./preference-categories";

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

describe("les messages libres", () => {
  it("porte les messages libres sur des catégories désactivables", () => {
    expect(NOTIFICATION_CATALOG.automation_message.preferenceKey).toBe(
      "rappels_suivi"
    );
    expect(NOTIFICATION_CATALOG.broadcast_message.preferenceKey).toBe("annonces");
  });

  it("reprend le titre et le corps fournis à l'appel", () => {
    const def = NOTIFICATION_CATALOG.broadcast_message;
    const data = { title: "Fermeture estivale", body: "Du 1er au 15 août." };
    expect(def.title(data)).toBe("Fermeture estivale");
    expect(def.body?.(data)).toBe("Du 1er au 15 août.");
  });
});

describe("NOTIFICATION_CATALOG et le canal push", () => {
  it("ne déclare jamais le push sur une catégorie qui l'interdit", () => {
    for (const definition of Object.values(NOTIFICATION_CATALOG)) {
      if (!definition.channels.includes("push")) continue;
      expect(
        PREFERENCE_CATEGORIES[definition.preferenceKey].pushForbidden ?? false
      ).toBe(false);
    }
  });

  it("déclare le push exactement sur les événements décidés", () => {
    const pushed = Object.values(NOTIFICATION_CATALOG)
      .filter((d) => d.channels.includes("push"))
      .map((d) => d.key)
      .sort();

    expect(pushed).toEqual(
      [
        "accompagnement_access",
        "admin_job_failed",
        "admin_payment_failed",
        "booking_cancelled",
        "booking_rescheduled",
        "booking_reminder",
        "broadcast_message",
        "consultant_booking_cancelled",
        "consultant_new_booking",
        "formation_reminder",
        "module_reminder",
        "replay_published",
      ].sort()
    );
  });

  it("tout événement qui pousse a une cible utilisable", () => {
    // Un push sans cible ouvrirait la racine du site : la notification serait
    // vue, et l'utilisatrice ne saurait pas quoi en faire.
    for (const definition of Object.values(NOTIFICATION_CATALOG)) {
      if (!definition.channels.includes("push")) continue;
      expect(definition.href).toBeTypeOf("function");
    }
  });
});
