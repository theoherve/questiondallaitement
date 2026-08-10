import { describe, it, expect, vi, beforeEach } from "vitest";

// `server-only` interdit l'import hors composant serveur ; sous vitest il n'y
// a pas de frontiere serveur/client a faire respecter.
vi.mock("server-only", () => ({}));

const { insertMock, fromMock, notify, getRoleRecipients } = vi.hoisted(() => {
  const insertMock = vi.fn();
  return {
    insertMock,
    fromMock: vi.fn(() => ({ insert: insertMock })),
    notify: vi.fn().mockResolvedValue(undefined),
    getRoleRecipients: vi.fn().mockResolvedValue([{ userId: "admin-1", email: "a@b.fr" }]),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));
vi.mock("@/lib/notifications", () => ({ notify, getRoleRecipients }));

import { submitContactMessage } from "./submit";

const input = {
  name: "Marie Dupont",
  email: "marie@exemple.fr",
  subject: "Question sur l'allaitement mixte",
  message: "Bonjour, j'aimerais des conseils.",
};

describe("submitContactMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRoleRecipients.mockResolvedValue([{ userId: "admin-1", email: "a@b.fr" }]);
    insertMock.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "msg-1" }, error: null }),
      }),
    });
  });

  it("enregistre le message et notifie les admins", async () => {
    const outcome = await submitContactMessage(input, null);

    expect(outcome).toEqual({ status: "sent" });
    expect(fromMock).toHaveBeenCalledWith("contact_messages");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ ...input, user_id: null }),
    );
    expect(notify).toHaveBeenCalledWith(
      "contact_message_received",
      [{ userId: "admin-1", email: "a@b.fr" }],
      { contactMessageId: "msg-1", name: input.name, subject: input.subject },
      { dedupeId: "msg-1" },
    );
  });

  it("rattache le user_id quand le visiteur est connecte", async () => {
    await submitContactMessage(input, "user-42");

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-42" }),
    );
  });

  it("renvoie une erreur si l'insertion echoue, sans notifier", async () => {
    insertMock.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: { message: "boom" } }),
      }),
    });

    const outcome = await submitContactMessage(input, null);

    expect(outcome).toEqual({ status: "error" });
    expect(notify).not.toHaveBeenCalled();
  });
});
