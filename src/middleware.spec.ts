import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────

// vi.hoisted() est évalué avant les vi.mock() hoistés — évite le TDZ
const { mockNext, mockRedirect } = vi.hoisted(() => ({
  mockNext: vi.fn(() => ({ type: "next" })),
  mockRedirect: vi.fn((url: { pathname: string }) => ({ type: "redirect", url })),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    next: mockNext,
    redirect: mockRedirect,
  },
}));

// auth() retourne directement le handler pour tester la logique interne
vi.mock("@/auth", () => ({
  auth: vi.fn((handler: (req: unknown) => unknown) => handler),
}));

import middleware from "@/middleware";

// ─── Helpers ──────────────────────────────────────────────────

const makeReq = (
  pathname: string,
  user?: { roles?: string[]; role?: string } | null,
) => {
  const cloned = {
    pathname,
    searchParams: { set: vi.fn() },
  };
  return {
    nextUrl: { pathname, clone: vi.fn().mockReturnValue(cloned) },
    auth: user ? { user } : null,
  } as unknown as Parameters<typeof middleware>[0];
};

// ─── Tests ────────────────────────────────────────────────────

describe("middleware — protection des routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Routes publiques ──────────────────────────────────────
  describe("routes publiques (sans auth)", () => {
    it.each(["/", "/formations", "/consultantes", "/evenements", "/blog", "/reserver"])(
      "laisse passer %s sans authentification",
      (path) => {
        middleware(makeReq(path));
        expect(mockNext).toHaveBeenCalled();
        expect(mockRedirect).not.toHaveBeenCalled();
      },
    );

    it("laisse passer /formations/mon-module (sous-route publique)", () => {
      middleware(makeReq("/formations/mon-module"));
      expect(mockNext).toHaveBeenCalled();
    });

    it("laisse passer /blog/un-article (sous-route publique)", () => {
      middleware(makeReq("/blog/un-article"));
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ─── Routes API et _next ───────────────────────────────────
  describe("routes api et assets", () => {
    it("laisse passer /api/webhooks/stripe sans auth", () => {
      middleware(makeReq("/api/webhooks/stripe"));
      expect(mockNext).toHaveBeenCalled();
    });

    it("laisse passer /_next/static sans auth", () => {
      middleware(makeReq("/_next/static/chunk.js"));
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ─── Routes d'authentification ─────────────────────────────
  describe("routes d'authentification", () => {
    it("laisse passer /connexion si non connecté", () => {
      middleware(makeReq("/connexion", null));
      expect(mockNext).toHaveBeenCalled();
    });

    it("redirige vers /espace-client si déjà connecté sur /connexion", () => {
      middleware(makeReq("/connexion", { roles: ["client"] }));
      const url = mockRedirect.mock.calls[0][0];
      expect(url.pathname).toBe("/espace-client");
    });

    it("redirige vers /espace-client si déjà connecté sur /inscription", () => {
      middleware(makeReq("/inscription", { roles: ["client"] }));
      const url = mockRedirect.mock.calls[0][0];
      expect(url.pathname).toBe("/espace-client");
    });
  });

  // ─── Route non reconnue sans auth ─────────────────────────
  describe("route protégée sans authentification", () => {
    it("redirige vers /connexion avec le paramètre redirect", () => {
      middleware(makeReq("/espace-client", null));
      const url = mockRedirect.mock.calls[0][0];
      expect(url.pathname).toBe("/connexion");
      expect(url.searchParams.set).toHaveBeenCalledWith("redirect", "/espace-client");
    });
  });

  // ─── 14-01 : Espace client ────────────────────────────────
  describe("14-01 : espace-client (rôle client)", () => {
    it("laisse passer un client sur /espace-client", () => {
      middleware(makeReq("/espace-client", { roles: ["client"] }));
      expect(mockNext).toHaveBeenCalled();
    });

    it("laisse passer un admin sur /espace-client", () => {
      middleware(makeReq("/espace-client", { roles: ["admin"] }));
      expect(mockNext).toHaveBeenCalled();
    });

    it("laisse passer un client sur /espace-client/reservations", () => {
      middleware(makeReq("/espace-client/reservations", { roles: ["client"] }));
      expect(mockNext).toHaveBeenCalled();
    });

    it("redirige vers / si consultant sur /espace-client", () => {
      middleware(makeReq("/espace-client", { roles: ["consultant"] }));
      const url = mockRedirect.mock.calls[0][0];
      expect(url.pathname).toBe("/");
    });

    it("redirige vers / si marketing_manager sur /espace-client", () => {
      middleware(makeReq("/espace-client", { roles: ["marketing_manager"] }));
      const url = mockRedirect.mock.calls[0][0];
      expect(url.pathname).toBe("/");
    });
  });

  // ─── 14-02 : Espace consultante ───────────────────────────
  describe("14-02 : espace-consultante (rôle consultant)", () => {
    it("laisse passer une consultante sur /espace-consultante", () => {
      middleware(makeReq("/espace-consultante", { roles: ["consultant"] }));
      expect(mockNext).toHaveBeenCalled();
    });

    it("laisse passer consultant_limited sur /espace-consultante", () => {
      middleware(makeReq("/espace-consultante", { roles: ["consultant_limited"] }));
      expect(mockNext).toHaveBeenCalled();
    });

    it("laisse passer un admin sur /espace-consultante", () => {
      middleware(makeReq("/espace-consultante", { roles: ["admin"] }));
      expect(mockNext).toHaveBeenCalled();
    });

    it("laisse passer une consultante sur /espace-consultante/crm", () => {
      middleware(makeReq("/espace-consultante/crm", { roles: ["consultant"] }));
      expect(mockNext).toHaveBeenCalled();
    });

    it("redirige vers / si client sur /espace-consultante", () => {
      middleware(makeReq("/espace-consultante", { roles: ["client"] }));
      const url = mockRedirect.mock.calls[0][0];
      expect(url.pathname).toBe("/");
    });

    it("redirige vers / si marketing_manager sur /espace-consultante", () => {
      middleware(makeReq("/espace-consultante", { roles: ["marketing_manager"] }));
      const url = mockRedirect.mock.calls[0][0];
      expect(url.pathname).toBe("/");
    });
  });

  // ─── 14-03 : Admin complet ────────────────────────────────
  describe("14-03 : admin (rôle admin)", () => {
    it("laisse passer un admin sur /admin", () => {
      middleware(makeReq("/admin", { roles: ["admin"] }));
      expect(mockNext).toHaveBeenCalled();
    });

    it("laisse passer un admin sur /admin/formations", () => {
      middleware(makeReq("/admin/formations", { roles: ["admin"] }));
      expect(mockNext).toHaveBeenCalled();
    });

    it("laisse passer un admin sur /admin/consultantes", () => {
      middleware(makeReq("/admin/consultantes", { roles: ["admin"] }));
      expect(mockNext).toHaveBeenCalled();
    });

    it("redirige vers / si client sur /admin", () => {
      middleware(makeReq("/admin", { roles: ["client"] }));
      const url = mockRedirect.mock.calls[0][0];
      expect(url.pathname).toBe("/");
    });

    it("redirige vers / si consultant sur /admin", () => {
      middleware(makeReq("/admin", { roles: ["consultant"] }));
      const url = mockRedirect.mock.calls[0][0];
      expect(url.pathname).toBe("/");
    });
  });

  // ─── 14-04 : Marketing manager (backoffice filtré) ────────
  describe("14-04 : marketing_manager (backoffice filtré)", () => {
    it("laisse passer marketing_manager sur /admin", () => {
      middleware(makeReq("/admin", { roles: ["marketing_manager"] }));
      expect(mockNext).toHaveBeenCalled();
    });

    it("laisse passer marketing_manager sur /admin/marketing", () => {
      middleware(makeReq("/admin/marketing", { roles: ["marketing_manager"] }));
      expect(mockNext).toHaveBeenCalled();
    });

    it("redirige marketing_manager vers / sur /espace-client", () => {
      middleware(makeReq("/espace-client", { roles: ["marketing_manager"] }));
      const url = mockRedirect.mock.calls[0][0];
      expect(url.pathname).toBe("/");
    });

    it("redirige marketing_manager vers / sur /espace-consultante", () => {
      middleware(makeReq("/espace-consultante", { roles: ["marketing_manager"] }));
      const url = mockRedirect.mock.calls[0][0];
      expect(url.pathname).toBe("/");
    });
  });

  // ─── Support rôle legacy (string unique) ──────────────────
  describe("support du rôle legacy (string unique dans JWT)", () => {
    it("accepte role: 'client' (ancien JWT) sur /espace-client", () => {
      middleware(makeReq("/espace-client", { role: "client" } as { role: string }));
      expect(mockNext).toHaveBeenCalled();
    });

    it("accepte role: 'admin' (ancien JWT) sur /admin", () => {
      middleware(makeReq("/admin", { role: "admin" } as { role: string }));
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
