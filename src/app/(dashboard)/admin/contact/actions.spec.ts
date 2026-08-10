import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSessionUser, selectMock, eqMock, orderMock, maybeSingleMock, updateMock, fromMock } =
  vi.hoisted(() => {
    const maybeSingleMock = vi.fn();
    const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const orderMock = vi.fn();
    const selectMock = vi.fn(() => ({ eq: eqMock, order: orderMock }));
    const updateMock = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    return {
      mockGetSessionUser: vi.fn(),
      selectMock,
      eqMock,
      orderMock,
      maybeSingleMock,
      updateMock,
      fromMock: vi.fn(() => ({ select: selectMock, update: updateMock })),
    };
  });

vi.mock("@/lib/auth", () => ({ getSessionUser: mockGetSessionUser }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

import {
  listContactMessages,
  getContactMessageForAdmin,
  markContactMessageTreated,
} from "./actions";

const row = {
  id: "msg-1",
  name: "Marie Dupont",
  email: "marie@exemple.fr",
  subject: "Question",
  message: "Bonjour",
  status: "nouveau",
  created_at: "2026-08-10T10:00:00.000Z",
};

describe("admin/contact actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({
      id: "admin-1",
      email: "a@b.fr",
      roles: ["admin"],
    });
    orderMock.mockResolvedValue({ data: [row] });
    maybeSingleMock.mockResolvedValue({ data: row });
  });

  it("refuse un compte non administrateur sur listContactMessages", async () => {
    mockGetSessionUser.mockResolvedValue({ id: "c1", email: "c@b.fr", roles: ["client"] });

    await expect(listContactMessages()).rejects.toThrow("NEXT_REDIRECT");
  });

  it("liste les messages", async () => {
    const result = await listContactMessages();

    expect(fromMock).toHaveBeenCalledWith("contact_messages");
    expect(result).toEqual([row]);
  });

  it("passe un message nouveau en lu a l'ouverture du detail", async () => {
    maybeSingleMock.mockResolvedValue({ data: { ...row, status: "nouveau" } });

    await getContactMessageForAdmin("msg-1");

    expect(updateMock).toHaveBeenCalledWith({ status: "lu", updated_at: expect.any(String) });
  });

  it("ne re-ecrit pas le statut d'un message deja lu ou traite", async () => {
    maybeSingleMock.mockResolvedValue({ data: { ...row, status: "traite" } });

    await getContactMessageForAdmin("msg-1");

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("renvoie null si le message n'existe pas", async () => {
    maybeSingleMock.mockResolvedValue({ data: null });

    expect(await getContactMessageForAdmin("absent")).toBeNull();
  });

  it("marque un message comme traite", async () => {
    const result = await markContactMessageTreated("msg-1");

    expect(result).toEqual({ success: true });
    expect(updateMock).toHaveBeenCalledWith({ status: "traite", updated_at: expect.any(String) });
  });
});
