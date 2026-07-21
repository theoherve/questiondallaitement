import { describe, it, expect, beforeEach } from "vitest";

const inserts: Array<Record<string, unknown>> = [];
let insertError: { message: string } | null = null;

const makeSupabase = () =>
  ({
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        inserts.push(row);
        return Promise.resolve({ error: insertError });
      },
    }),
  }) as unknown as Parameters<typeof recordWithdrawalWaiver>[0];

import { recordWithdrawalWaiver } from "./record-waiver";
import { WITHDRAWAL_TEXTS, WITHDRAWAL_TEXT_VERSION } from "./withdrawal";

describe("recordWithdrawalWaiver", () => {
  beforeEach(() => {
    inserts.length = 0;
    insertError = null;
  });

  it("conserve le texte exact accepte, pas seulement sa version", async () => {
    // La version seule ne suffirait pas : il faudrait retrouver le texte
    // correspondant dans une version du code. La preuve doit se lire dans la
    // ligne elle-meme.
    await recordWithdrawalWaiver(makeSupabase(), {
      clientId: "client-1",
      context: "booking",
      referenceId: "booking-1",
    });

    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      client_id: "client-1",
      context: "booking",
      reference_id: "booking-1",
      text_version: WITHDRAWAL_TEXT_VERSION,
      accepted_text: WITHDRAWAL_TEXTS.booking,
    });
  });

  it("enregistre le texte propre a l'accompagnement", async () => {
    await recordWithdrawalWaiver(makeSupabase(), {
      clientId: "client-1",
      context: "formation",
      referenceId: "formation-1",
    });

    expect(inserts[0]).toMatchObject({
      accepted_text: WITHDRAWAL_TEXTS.formation,
    });
  });

  it("signale un echec d'enregistrement", async () => {
    // Contrairement aux emails, cette trace n'est pas accessoire : sans elle,
    // la plateforme ne peut pas prouver la renonciation. L'appelant doit
    // pouvoir refuser la vente.
    insertError = { message: "table absente" };

    const ok = await recordWithdrawalWaiver(makeSupabase(), {
      clientId: "client-1",
      context: "booking",
      referenceId: "booking-1",
    });

    expect(ok).toBe(false);
  });

  it("confirme l'enregistrement reussi", async () => {
    const ok = await recordWithdrawalWaiver(makeSupabase(), {
      clientId: "client-1",
      context: "booking",
      referenceId: "booking-1",
    });

    expect(ok).toBe(true);
  });
});
