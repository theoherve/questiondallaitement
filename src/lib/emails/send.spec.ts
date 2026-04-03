import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────
// vi.mock est hoisté avant les déclarations const — les références
// aux variables doivent être dans des closures pour éviter la TDZ.

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

const mockSendTransactionalEmail = vi.fn();
const mockRenderTemplate = vi.fn(
  (template: string, vars: Record<string, string>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? ""),
);

vi.mock("@/lib/resend/client", () => ({
  sendTransactionalEmail: (
    ...args: Parameters<typeof mockSendTransactionalEmail>
  ) => mockSendTransactionalEmail(...args),
  renderTemplate: (...args: Parameters<typeof mockRenderTemplate>) =>
    mockRenderTemplate(...args),
}));

import { sendBookingConfirmation } from "./send";

// ─── sendBookingConfirmation ──────────────────────────────────

const BASE_VARS = {
  client_name: "Marie",
  consultant_name: "Claire Dupont",
  date: "mercredi 9 avril 2025",
  time: "14h30",
};

const TEMPLATE = {
  subject: "Confirmation — {{date}}",
  body_html: "<p>Bonjour {{client_name}} {{zoom_block}}</p>",
};

describe("sendBookingConfirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingle.mockResolvedValue({ data: TEMPLATE });
    mockSendTransactionalEmail.mockResolvedValue(undefined);
  });

  it("génère zoom_block vide quand zoom_join_url est absent", async () => {
    await sendBookingConfirmation("test@example.com", BASE_VARS);

    const templateVars = mockRenderTemplate.mock.calls[0][1];
    expect(templateVars.zoom_block).toBe("");
  });

  it("génère zoom_block avec le bon href quand zoom_join_url est présent", async () => {
    const joinUrl = "https://zoom.us/j/123456789";

    await sendBookingConfirmation("test@example.com", {
      ...BASE_VARS,
      zoom_join_url: joinUrl,
    });

    const templateVars = mockRenderTemplate.mock.calls[0][1];
    expect(templateVars.zoom_block).toContain(`href="${joinUrl}"`);
    expect(templateVars.zoom_block).toContain("<a ");
  });

  it("ne passe pas zoom_join_url comme variable de template", async () => {
    await sendBookingConfirmation("test@example.com", {
      ...BASE_VARS,
      zoom_join_url: "https://zoom.us/j/123",
    });

    const templateVars = mockRenderTemplate.mock.calls[0][1];
    expect(templateVars).not.toHaveProperty("zoom_join_url");
  });

  it("passe exactement 5 variables à renderTemplate", async () => {
    await sendBookingConfirmation("test@example.com", BASE_VARS);

    const templateVars = mockRenderTemplate.mock.calls[0][1];
    expect(Object.keys(templateVars)).toHaveLength(5);
    expect(Object.keys(templateVars)).toEqual(
      expect.arrayContaining([
        "client_name",
        "consultant_name",
        "date",
        "time",
        "zoom_block",
      ]),
    );
  });

  it("n'envoie pas d'email si le template est introuvable en base", async () => {
    mockSingle.mockResolvedValue({ data: null });

    await sendBookingConfirmation("test@example.com", BASE_VARS);

    expect(mockSendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("envoie l'email à la bonne adresse", async () => {
    await sendBookingConfirmation("destinataire@example.com", BASE_VARS);

    expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "destinataire@example.com" }),
    );
  });
});
