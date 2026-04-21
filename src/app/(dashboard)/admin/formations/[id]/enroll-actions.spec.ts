import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockIs = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockNot = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

const buildChain = () => ({
  select: mockSelect,
  insert: mockInsert,
  delete: mockDelete,
  eq: mockEq,
  is: mockIs,
  not: mockNot,
  or: mockOr,
  order: mockOrder,
  limit: mockLimit,
  single: mockSingle,
  maybeSingle: mockMaybeSingle,
});

const mockFrom = vi.fn(() => buildChain());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockSendFormationAccess = vi.fn();
vi.mock("@/lib/emails/send", () => ({
  sendFormationAccess: (...args: unknown[]) => mockSendFormationAccess(...args),
}));

import {
  manualEnrollExistingClient,
  manualEnrollNewClient,
  searchClientsForEnroll,
} from "./enroll-actions";
import { getSessionUser } from "@/lib/auth";

const ADMIN = { id: "a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5", roles: ["admin"] };
const MKT_MANAGER = {
  id: "b1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5",
  roles: ["marketing_manager"],
};
const FORMATION_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const CLIENT_ID = "6ba7b810-9dad-41d0-80b4-00c04fd430c8";

const setAuth = (user: unknown) => {
  vi.mocked(getSessionUser).mockResolvedValue(user as never);
};

beforeEach(() => {
  vi.clearAllMocks();
  // Fluent default: chain-returning methods return the chain; resolvers yield
  // null/empty by default. Tests override the specific call they care about.
  mockSelect.mockReturnValue(buildChain());
  mockEq.mockReturnValue(buildChain());
  mockIs.mockReturnValue(buildChain());
  mockNot.mockReturnValue(buildChain());
  mockOr.mockReturnValue(buildChain());
  mockOrder.mockReturnValue(buildChain());
  mockLimit.mockResolvedValue({ data: [], error: null });
  mockInsert.mockReturnValue(buildChain());
  mockDelete.mockReturnValue(buildChain());
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  setAuth(ADMIN);
});

// ─── Role guard ───────────────────────────────────────────────

describe("guard", () => {
  it("redirige si utilisateur non authentifié", async () => {
    setAuth(null);
    await expect(
      manualEnrollExistingClient(FORMATION_ID, CLIENT_ID),
    ).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("redirige un simple client", async () => {
    setAuth({ id: "c", roles: ["client"] });
    await expect(
      manualEnrollExistingClient(FORMATION_ID, CLIENT_ID),
    ).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("autorise un marketing_manager", async () => {
    setAuth(MKT_MANAGER);
    const result = await manualEnrollExistingClient("not-a-uuid", CLIENT_ID);
    expect(result).toEqual({ success: false, error: "Identifiants invalides" });
  });
});

// ─── Validation ───────────────────────────────────────────────

describe("manualEnrollNewClient — validation", () => {
  it("refuse un email invalide", async () => {
    const result = await manualEnrollNewClient(FORMATION_ID, {
      email: "pas-un-email",
      first_name: "Alice",
      last_name: "Martin",
      phone: "",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/email/i);
  });

  it("refuse un prénom vide", async () => {
    const result = await manualEnrollNewClient(FORMATION_ID, {
      email: "a@b.fr",
      first_name: "",
      last_name: "Martin",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/prénom/i);
  });

  it("refuse un formationId invalide", async () => {
    const result = await manualEnrollNewClient("not-uuid", {
      email: "a@b.fr",
      first_name: "Alice",
      last_name: "Martin",
    });
    expect(result).toEqual({ success: false, error: "Formation invalide" });
  });
});

// ─── searchClientsForEnroll ───────────────────────────────────

describe("searchClientsForEnroll", () => {
  it("renvoie tableau vide pour une query < 2 chars", async () => {
    const result = await searchClientsForEnroll("a", FORMATION_ID);
    expect(result).toEqual({ success: true, data: [] });
  });

  it("refuse un formationId invalide", async () => {
    const result = await searchClientsForEnroll("alice", "pas-uuid");
    expect(result).toEqual({ success: false, error: "Formation invalide" });
  });
});
