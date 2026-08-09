import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSessionUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getSessionUser: () => mockGetSessionUser() }));

const rows = [
  {
    id: "n2",
    type: "invoice_available",
    created_at: "2026-08-08T10:00:00Z",
    read_at: null,
  },
  {
    id: "n1",
    type: "booking_confirmed",
    created_at: "2026-08-07T10:00:00Z",
    read_at: "2026-08-07T11:00:00Z",
  },
];

const listQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn(),
};

const countQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn(),
};

// Le GET fait deux requêtes : la liste puis le compteur de non lues.
let call = 0;
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => (call++ % 2 === 0 ? listQuery : countQuery),
  }),
}));

import { GET } from "./route";

describe("GET /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    call = 0;
    listQuery.select.mockReturnThis();
    listQuery.eq.mockReturnThis();
    listQuery.lt.mockReturnThis();
    listQuery.order.mockReturnThis();
    listQuery.limit.mockResolvedValue({ data: rows, error: null });
    countQuery.select.mockReturnThis();
    countQuery.eq.mockReturnThis();
    countQuery.is.mockResolvedValue({ count: 1, error: null });
    mockGetSessionUser.mockResolvedValue({
      id: "u1",
      email: "a@b.fr",
      roles: ["client"],
    });
  });

  it("refuse une requête sans session", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/notifications"));
    expect(res.status).toBe(401);
  });

  it("renvoie les notifications lues et non lues avec le compteur", async () => {
    const res = await GET(new Request("http://localhost/api/notifications"));
    const json = await res.json();
    expect(json.items).toHaveLength(2);
    expect(json.unreadCount).toBe(1);
  });

  it("renvoie un curseur quand la page est pleine", async () => {
    const full = Array.from({ length: 20 }, (_, i) => ({
      id: `n${i}`,
      created_at: `2026-08-0${(i % 9) + 1}T10:00:00Z`,
      read_at: null,
    }));
    listQuery.limit.mockResolvedValue({ data: full, error: null });
    const res = await GET(new Request("http://localhost/api/notifications"));
    const json = await res.json();
    expect(json.nextCursor).toBe(full[full.length - 1].created_at);
  });

  it("ne renvoie pas de curseur quand la page est incomplète", async () => {
    const res = await GET(new Request("http://localhost/api/notifications"));
    const json = await res.json();
    expect(json.nextCursor).toBeNull();
  });

  it("filtre sur le curseur fourni", async () => {
    await GET(
      new Request(
        "http://localhost/api/notifications?cursor=2026-08-08T10:00:00Z"
      )
    );
    expect(listQuery.lt).toHaveBeenCalledWith(
      "created_at",
      "2026-08-08T10:00:00Z"
    );
  });
});
