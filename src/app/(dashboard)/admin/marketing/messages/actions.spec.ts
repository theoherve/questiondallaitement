import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSessionUser, sendUserBroadcast, countAudience } = vi.hoisted(
  () => ({
    mockGetSessionUser: vi.fn(),
    sendUserBroadcast: vi.fn().mockResolvedValue({ sent: 3 }),
    countAudience: vi.fn().mockResolvedValue(3),
  })
);

vi.mock("@/lib/auth", () => ({ getSessionUser: mockGetSessionUser }));
vi.mock("@/lib/notifications/broadcast", () => ({
  sendUserBroadcast,
  countAudience,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

import { submitBroadcast, previewBroadcast } from "./actions";

const input = {
  title: "Fermeture estivale",
  body: "Du 1er au 15 août.",
  audience: { kind: "all_clients" as const },
};

describe("submitBroadcast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendUserBroadcast.mockResolvedValue({ sent: 3 });
    mockGetSessionUser.mockResolvedValue({
      id: "admin-1",
      email: "a@b.fr",
      roles: ["admin"],
    });
  });

  it("refuse un compte non administrateur", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: "c1",
      email: "c@b.fr",
      roles: ["client"],
    });

    await expect(submitBroadcast(input)).rejects.toThrow("NEXT_REDIRECT");
    expect(sendUserBroadcast).not.toHaveBeenCalled();
  });

  it("diffuse et rend le nombre d'envois", async () => {
    const result = await submitBroadcast(input);

    expect(result).toEqual({ success: true, data: { sent: 3 } });
    expect(sendUserBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Fermeture estivale" })
    );
  });

  it("refuse un titre vide", async () => {
    const result = await submitBroadcast({ ...input, title: "  " });

    expect(result.success).toBe(false);
    expect(sendUserBroadcast).not.toHaveBeenCalled();
  });

  it("refuse un message vide", async () => {
    const result = await submitBroadcast({ ...input, body: "" });

    expect(result.success).toBe(false);
    expect(sendUserBroadcast).not.toHaveBeenCalled();
  });

  it("refuse un lien externe", async () => {
    const result = await submitBroadcast({
      ...input,
      href: "https://exemple.fr",
    });

    expect(result.success).toBe(false);
    expect(sendUserBroadcast).not.toHaveBeenCalled();
  });
});

describe("previewBroadcast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    countAudience.mockResolvedValue(3);
    mockGetSessionUser.mockResolvedValue({
      id: "admin-1",
      email: "a@b.fr",
      roles: ["admin"],
    });
  });

  it("compte sans diffuser", async () => {
    expect(await previewBroadcast({ kind: "all_clients" })).toBe(3);
    expect(sendUserBroadcast).not.toHaveBeenCalled();
  });
});
