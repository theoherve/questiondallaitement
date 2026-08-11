# Bandeau d'annonce temporaire — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin publish a temporary announcement banner (new site / promo / event) shown above the header on every public page, configurable from `/admin/parametres`, closable by visitors.

**Architecture:** Reuses the existing `platform_settings` JSONB singleton-key pattern (same shape as `email_branding`): one key holds `{enabled, message, link_url, link_label, start_date, end_date}`. A pure store module reads/writes it; a pure `isAnnouncementBannerActive` function evaluates the date window; the public layout fetches it server-side and renders a client component above `<Header>`; the admin gets a new form section on the existing settings page.

**Tech Stack:** Next.js App Router (server actions), Supabase (`platform_settings` table), Zod, Vitest, Tailwind, shadcn/ui components (`Card`, `Input`, `Textarea`, `Switch`, `Button`, `Label`).

## Global Constraints

- Reuse `platform_settings` — no new table (spec: "Stockage").
- Bandeau visible sur toutes les pages publiques, pas seulement la home (spec: "Portée").
- Style neutre/marque unique — pas de variantes de couleur par type (spec: "Style").
- Position : bandeau fin au-dessus du header (spec: "Position").
- Fermeture visiteur mémorisée en `localStorage`, réapparaît si le message change (spec: "Fermeture visiteur").
- Toggle actif/inactif + dates optionnelles (spec: "Planification").
- Une panne de lecture des settings ne doit jamais casser le rendu des pages publiques (pattern existant dans `branding-store.ts` et `maintenance.ts`).

---

### Task 1: Migration + validation schema

**Files:**
- Create: `supabase/migrations/00092_announcement_banner.sql`
- Create: `src/validations/announcement-banner.ts`
- Test: `src/validations/announcement-banner.spec.ts`

**Interfaces:**
- Produces: `announcementBannerSchema` (Zod), `type AnnouncementBannerInput = z.infer<typeof announcementBannerSchema>` — consumed by Task 2 (store) and Task 4 (action).
  Shape: `{ enabled: boolean; message: string; link_url: string | null; link_label: string; start_date: string | null; end_date: string | null }`.
  Validation rules: `message` required only when `enabled` is `true` (empty message with the toggle off is valid — it's the "nothing configured yet" state); `link_url`, when non-empty, must be a valid absolute URL; `end_date`, when both dates are set, must not be before `start_date`.

- [ ] **Step 1: Write the migration**

```sql
-- Migration 00092: bandeau d'annonce temporaire
--
-- Un seul reglage JSONB dans platform_settings : message, lien optionnel,
-- fenetre de dates optionnelle. Meme pattern que email_branding (00070).

INSERT INTO platform_settings (key, value) VALUES (
  'announcement_banner',
  jsonb_build_object(
    'enabled', false,
    'message', '',
    'link_url', NULL,
    'link_label', '',
    'start_date', NULL,
    'end_date', NULL
  )
)
ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 2: Write the failing validation test**

```typescript
// src/validations/announcement-banner.spec.ts
import { describe, expect, it } from "vitest";
import { announcementBannerSchema } from "./announcement-banner";

const valid = {
  enabled: true,
  message: "Nouveau site en ligne !",
  link_url: "https://example.com/nouveautes",
  link_label: "En savoir plus",
  start_date: null,
  end_date: null,
};

describe("announcementBannerSchema", () => {
  it("accepte un bandeau complet actif", () => {
    expect(announcementBannerSchema.safeParse(valid).success).toBe(true);
  });

  it("accepte un bandeau desactive sans message", () => {
    const result = announcementBannerSchema.safeParse({
      ...valid,
      enabled: false,
      message: "",
    });
    expect(result.success).toBe(true);
  });

  it("refuse un bandeau actif sans message", () => {
    const result = announcementBannerSchema.safeParse({
      ...valid,
      message: "",
    });
    expect(result.success).toBe(false);
  });

  it("refuse une URL de lien invalide", () => {
    const result = announcementBannerSchema.safeParse({
      ...valid,
      link_url: "pas-une-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepte un link_url vide (pas de lien)", () => {
    const result = announcementBannerSchema.safeParse({
      ...valid,
      link_url: "",
    });
    expect(result.success).toBe(true);
  });

  it("refuse une date de fin avant la date de debut", () => {
    const result = announcementBannerSchema.safeParse({
      ...valid,
      start_date: "2026-09-01",
      end_date: "2026-08-01",
    });
    expect(result.success).toBe(false);
  });

  it("accepte une date de fin egale a la date de debut", () => {
    const result = announcementBannerSchema.safeParse({
      ...valid,
      start_date: "2026-09-01",
      end_date: "2026-09-01",
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/validations/announcement-banner.spec.ts`
Expected: FAIL — `Cannot find module './announcement-banner'`

- [ ] **Step 4: Write the schema**

```typescript
// src/validations/announcement-banner.ts
import { z } from "zod/v4";

export const announcementBannerSchema = z
  .object({
    enabled: z.boolean(),
    message: z.string(),
    link_url: z.union([z.literal(""), z.string().url("Lien invalide")]),
    link_label: z.string(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
  })
  .refine((data) => !data.enabled || data.message.trim().length > 0, {
    message: "Le message est requis quand le bandeau est actif",
    path: ["message"],
  })
  .refine(
    (data) =>
      !data.start_date || !data.end_date || data.end_date >= data.start_date,
    {
      message: "La date de fin doit être après la date de début",
      path: ["end_date"],
    },
  );

export type AnnouncementBannerInput = z.infer<typeof announcementBannerSchema>;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/validations/announcement-banner.spec.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: Apply the migration locally**

Run: `npx supabase migration up` (or the project's usual local migration command — check `package.json` scripts for a `db:migrate`/`supabase:*` alias first and prefer that if one exists)
Expected: migration `00092_announcement_banner.sql` applied without error, row `announcement_banner` present in `platform_settings`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/00092_announcement_banner.sql src/validations/announcement-banner.ts src/validations/announcement-banner.spec.ts
git commit -m "feat: add announcement_banner platform_settings key + validation schema"
```

---

### Task 2: Pure store module (get/save/isActive)

**Files:**
- Create: `src/lib/announcement-banner/store.ts`
- Test: `src/lib/announcement-banner/store.spec.ts`

**Interfaces:**
- Consumes: `announcementBannerSchema` (Task 1) for shape reference only (store does not call `.parse` — malformed data falls back to defaults, matching `parseEmailBranding`'s tolerant behavior).
- Produces:
  - `type AnnouncementBanner = { enabled: boolean; message: string; link_url: string | null; link_label: string; start_date: string | null; end_date: string | null }`
  - `const DEFAULT_ANNOUNCEMENT_BANNER: AnnouncementBanner`
  - `parseAnnouncementBanner(raw: unknown): AnnouncementBanner` — tolerant parse, consumed by Task 3 and Task 4.
  - `isAnnouncementBannerActive(banner: AnnouncementBanner, now?: Date): boolean` — consumed by Task 3 (layout).
  - `getAnnouncementBanner(): Promise<AnnouncementBanner>` — consumed by Task 3.
  - `saveAnnouncementBanner(banner: AnnouncementBanner): Promise<{ error: string | null }>` — consumed by Task 4 (action).
  - `const ANNOUNCEMENT_BANNER_KEY = "announcement_banner"`

- [ ] **Step 1: Write the failing tests for the pure logic**

```typescript
// src/lib/announcement-banner/store.spec.ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANNOUNCEMENT_BANNER,
  isAnnouncementBannerActive,
  parseAnnouncementBanner,
  type AnnouncementBanner,
} from "./store";

const base: AnnouncementBanner = {
  enabled: true,
  message: "Nouveau site en ligne !",
  link_url: null,
  link_label: "",
  start_date: null,
  end_date: null,
};

describe("isAnnouncementBannerActive", () => {
  it("est inactif si enabled est false, meme sans dates", () => {
    expect(isAnnouncementBannerActive({ ...base, enabled: false })).toBe(false);
  });

  it("est actif si enabled est true et aucune date definie", () => {
    expect(isAnnouncementBannerActive(base)).toBe(true);
  });

  it("est inactif avant la date de debut", () => {
    const now = new Date("2026-08-01T00:00:00.000Z");
    const banner = { ...base, start_date: "2026-09-01" };
    expect(isAnnouncementBannerActive(banner, now)).toBe(false);
  });

  it("est actif apres la date de debut", () => {
    const now = new Date("2026-09-02T00:00:00.000Z");
    const banner = { ...base, start_date: "2026-09-01" };
    expect(isAnnouncementBannerActive(banner, now)).toBe(true);
  });

  it("est inactif apres la date de fin", () => {
    const now = new Date("2026-09-10T00:00:00.000Z");
    const banner = { ...base, end_date: "2026-09-01" };
    expect(isAnnouncementBannerActive(banner, now)).toBe(false);
  });

  it("est actif avant la date de fin", () => {
    const now = new Date("2026-08-15T00:00:00.000Z");
    const banner = { ...base, end_date: "2026-09-01" };
    expect(isAnnouncementBannerActive(banner, now)).toBe(true);
  });

  it("est actif entre les deux bornes", () => {
    const now = new Date("2026-08-15T00:00:00.000Z");
    const banner = { ...base, start_date: "2026-08-01", end_date: "2026-09-01" };
    expect(isAnnouncementBannerActive(banner, now)).toBe(true);
  });
});

describe("parseAnnouncementBanner", () => {
  it("retombe sur les valeurs par defaut si la valeur brute est vide", () => {
    expect(parseAnnouncementBanner(null)).toEqual(DEFAULT_ANNOUNCEMENT_BANNER);
    expect(parseAnnouncementBanner(undefined)).toEqual(DEFAULT_ANNOUNCEMENT_BANNER);
    expect(parseAnnouncementBanner("not-json")).toEqual(DEFAULT_ANNOUNCEMENT_BANNER);
  });

  it("fusionne une valeur partielle avec les defauts", () => {
    const result = parseAnnouncementBanner({ enabled: true, message: "Promo" });
    expect(result).toEqual({
      ...DEFAULT_ANNOUNCEMENT_BANNER,
      enabled: true,
      message: "Promo",
    });
  });

  it("accepte une chaine JSON serialisee", () => {
    const result = parseAnnouncementBanner(
      JSON.stringify({ enabled: true, message: "Promo" }),
    );
    expect(result.enabled).toBe(true);
    expect(result.message).toBe("Promo");
  });

  it("ignore une cle de type incorrect et garde le defaut", () => {
    const result = parseAnnouncementBanner({ enabled: "oui" });
    expect(result.enabled).toBe(DEFAULT_ANNOUNCEMENT_BANNER.enabled);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/announcement-banner/store.spec.ts`
Expected: FAIL — `Cannot find module './store'`

- [ ] **Step 3: Write the store module**

```typescript
// src/lib/announcement-banner/store.ts
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cle unique dans `platform_settings` (JSONB), meme pattern que
 * `email_branding` (src/lib/emails/branding-store.ts).
 */
export const ANNOUNCEMENT_BANNER_KEY = "announcement_banner";

export type AnnouncementBanner = {
  enabled: boolean;
  message: string;
  link_url: string | null;
  link_label: string;
  start_date: string | null;
  end_date: string | null;
};

export const DEFAULT_ANNOUNCEMENT_BANNER: AnnouncementBanner = {
  enabled: false,
  message: "",
  link_url: null,
  link_label: "",
  start_date: null,
  end_date: null,
};

const safeJsonParse = (raw: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

/**
 * Fusionne une valeur brute (potentiellement partielle ou mal typee) avec les
 * valeurs par defaut. Toute cle inconnue ou mal typee retombe sur le defaut
 * plutot que de faire echouer le rendu des pages publiques.
 */
export const parseAnnouncementBanner = (raw: unknown): AnnouncementBanner => {
  const src =
    typeof raw === "string"
      ? safeJsonParse(raw)
      : raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};

  const out = { ...DEFAULT_ANNOUNCEMENT_BANNER };
  for (const key of Object.keys(DEFAULT_ANNOUNCEMENT_BANNER) as (keyof AnnouncementBanner)[]) {
    const value = src[key];
    const fallback = DEFAULT_ANNOUNCEMENT_BANNER[key];
    if (value === undefined) continue;
    if (typeof fallback === "boolean" && typeof value === "boolean") {
      (out as Record<string, unknown>)[key] = value;
    } else if (
      typeof value === "string" &&
      (typeof fallback === "string" || fallback === null)
    ) {
      (out as Record<string, unknown>)[key] = value;
    } else if (value === null && fallback === null) {
      (out as Record<string, unknown>)[key] = null;
    }
  }
  return out;
};

export const isAnnouncementBannerActive = (
  banner: AnnouncementBanner,
  now: Date = new Date(),
): boolean => {
  if (!banner.enabled) return false;
  if (banner.start_date && now < new Date(banner.start_date)) return false;
  if (banner.end_date) {
    const end = new Date(banner.end_date);
    end.setHours(23, 59, 59, 999);
    if (now > end) return false;
  }
  return true;
};

export const getAnnouncementBanner = async (): Promise<AnnouncementBanner> => {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", ANNOUNCEMENT_BANNER_KEY)
      .maybeSingle();

    return parseAnnouncementBanner(data?.value);
  } catch (e) {
    // Une panne de lecture ici ne doit jamais casser le rendu des pages
    // publiques : on retombe sur "pas de bandeau".
    console.error("[announcement-banner] lecture des reglages echouee", e);
    return DEFAULT_ANNOUNCEMENT_BANNER;
  }
};

export const saveAnnouncementBanner = async (
  banner: AnnouncementBanner,
): Promise<{ error: string | null }> => {
  const supabase = createAdminClient();
  const { error } = await supabase.from("platform_settings").upsert(
    {
      key: ANNOUNCEMENT_BANNER_KEY,
      value: banner as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) return { error: "Erreur lors de l'enregistrement du bandeau." };
  return { error: null };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/announcement-banner/store.spec.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/announcement-banner/store.ts src/lib/announcement-banner/store.spec.ts
git commit -m "feat: add announcement banner store (parse, active-window logic)"
```

---

### Task 3: Public rendering (layout + client banner component)

**Files:**
- Create: `src/components/layout/announcement-banner.tsx`
- Modify: `src/app/(public)/layout.tsx`
- Test: `src/components/layout/announcement-banner.spec.tsx`

**Interfaces:**
- Consumes: `getAnnouncementBanner`, `isAnnouncementBannerActive`, `type AnnouncementBanner` from `@/lib/announcement-banner/store` (Task 2).
- Produces: `AnnouncementBanner` React component, props `{ message: string; linkUrl: string | null; linkLabel: string }` — rendered only by the public layout, no other task depends on it.

- [ ] **Step 1: Check the test environment supports component tests**

Run: `grep -rl "@testing-library/react" package.json`
Expected: a match (project already has React Testing Library — used before writing the component test). If no match, check `src/**/*.spec.tsx` for an existing example of the render/query pattern used in this codebase and follow it instead of assuming an API.

- [ ] **Step 2: Write the failing component test**

```tsx
// src/components/layout/announcement-banner.spec.tsx
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnnouncementBanner } from "./announcement-banner";

describe("AnnouncementBanner", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("affiche le message et le lien", () => {
    render(
      <AnnouncementBanner
        message="Nouveau site en ligne !"
        linkUrl="https://example.com"
        linkLabel="Decouvrir"
      />,
    );
    expect(screen.getByText("Nouveau site en ligne !")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Decouvrir" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });

  it("ne rend rien sans lien configure", () => {
    render(<AnnouncementBanner message="Promo" linkUrl={null} linkLabel="" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("se ferme au clic sur la croix et memorise la fermeture", () => {
    render(<AnnouncementBanner message="Promo" linkUrl={null} linkLabel="" />);
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(screen.queryByText("Promo")).not.toBeInTheDocument();
  });

  it("reste ferme si deja ferme pour ce message exact", () => {
    render(<AnnouncementBanner message="Promo" linkUrl={null} linkLabel="" />);
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));

    render(<AnnouncementBanner message="Promo" linkUrl={null} linkLabel="" />);
    expect(screen.queryByText("Promo")).not.toBeInTheDocument();
  });

  it("reapparait si le message change apres une fermeture", () => {
    render(<AnnouncementBanner message="Promo" linkUrl={null} linkLabel="" />);
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));

    render(<AnnouncementBanner message="Nouvelle annonce" linkUrl={null} linkLabel="" />);
    expect(screen.getByText("Nouvelle annonce")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/layout/announcement-banner.spec.tsx`
Expected: FAIL — `Cannot find module './announcement-banner'`

- [ ] **Step 4: Write the component**

```tsx
// src/components/layout/announcement-banner.tsx
"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type Props = {
  message: string;
  linkUrl: string | null;
  linkLabel: string;
};

/** Hash simple (non cryptographique) pour deriver une cle de dismissal stable par message. */
const hashMessage = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
};

const dismissKey = (message: string) =>
  `announcement-banner-dismissed:${hashMessage(message)}`;

export const AnnouncementBanner = ({ message, linkUrl, linkLabel }: Props) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(dismissKey(message)) === "1");
  }, [message]);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(dismissKey(message), "1");
    setDismissed(true);
  };

  return (
    <div className="flex items-center justify-center gap-3 bg-primary-green px-4 py-2 text-center text-sm text-white">
      <span>
        {message}
        {linkUrl && (
          <a href={linkUrl} className="ml-2 underline underline-offset-2">
            {linkLabel || linkUrl}
          </a>
        )}
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fermer le bandeau d'annonce"
        className="shrink-0 rounded p-0.5 hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/layout/announcement-banner.spec.tsx`
Expected: PASS (5 tests)

- [ ] **Step 6: Wire it into the public layout**

Modify `src/app/(public)/layout.tsx`:

```tsx
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MaintenancePage } from "@/components/maintenance-page";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { getSessionUser } from "@/lib/auth";
import { isMaintenanceMode } from "@/lib/maintenance";
import { getAccompagnementsNavPreview } from "@/lib/accompagnements/nav-preview";
import { handleLogout } from "@/app/(auth)/actions";
import {
  getAnnouncementBanner,
  isAnnouncementBannerActive,
} from "@/lib/announcement-banner/store";

const PublicLayout = async ({ children }: { children: React.ReactNode }) => {
  const [user, maintenance, accompagnements, banner] = await Promise.all([
    getSessionUser(),
    isMaintenanceMode(),
    getAccompagnementsNavPreview(),
    getAnnouncementBanner(),
  ]);

  if (maintenance && !user?.roles.includes("admin")) {
    return <MaintenancePage />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {isAnnouncementBannerActive(banner) && (
        <AnnouncementBanner
          message={banner.message}
          linkUrl={banner.link_url}
          linkLabel={banner.link_label}
        />
      )}
      <Header
        user={user}
        onLogout={handleLogout}
        accompagnements={accompagnements}
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
```

- [ ] **Step 7: Manual check**

Run the dev server (`npm run dev`), temporarily flip `enabled` to `true` for the `announcement_banner` row directly in the local database (or wait for Task 4/5 to do it via the admin UI), and confirm the banner renders above the header on `/` and on at least one other public page (e.g. `/formations`), that the close button hides it, and that a page reload keeps it hidden.

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/announcement-banner.tsx src/components/layout/announcement-banner.spec.tsx "src/app/(public)/layout.tsx"
git commit -m "feat: render announcement banner above header on public pages"
```

---

### Task 4: Server action

**Files:**
- Create: `src/lib/announcement-banner/actions.ts`
- Test: `src/lib/announcement-banner/actions.spec.ts`

**Interfaces:**
- Consumes: `announcementBannerSchema` (Task 1), `getAnnouncementBanner`, `saveAnnouncementBanner`, `DEFAULT_ANNOUNCEMENT_BANNER`, `type AnnouncementBanner` (Task 2), `getSessionUser` from `@/lib/auth`, `createAdminClient` from `@/lib/supabase/admin`, `type ActionResult` from `@/types`.
- Produces:
  - `getAnnouncementBannerAction(): Promise<AnnouncementBanner>` — consumed by Task 5 (admin page).
  - `updateAnnouncementBannerAction(data: unknown): Promise<ActionResult>` — consumed by Task 5 (admin form).

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/announcement-banner/actions.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSessionUser, mockGetAnnouncementBanner, mockSaveAnnouncementBanner, insertMock, fromMock } =
  vi.hoisted(() => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    return {
      mockGetSessionUser: vi.fn(),
      mockGetAnnouncementBanner: vi.fn(),
      mockSaveAnnouncementBanner: vi.fn(),
      insertMock,
      fromMock: vi.fn(() => ({ insert: insertMock })),
    };
  });

vi.mock("@/lib/auth", () => ({ getSessionUser: mockGetSessionUser }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));
vi.mock("@/lib/announcement-banner/store", async () => {
  const actual = await vi.importActual<typeof import("./store")>("./store");
  return {
    ...actual,
    getAnnouncementBanner: mockGetAnnouncementBanner,
    saveAnnouncementBanner: mockSaveAnnouncementBanner,
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  getAnnouncementBannerAction,
  updateAnnouncementBannerAction,
} from "./actions";
import { DEFAULT_ANNOUNCEMENT_BANNER } from "./store";

const validInput = {
  enabled: true,
  message: "Nouveau site en ligne !",
  link_url: "",
  link_label: "",
  start_date: null,
  end_date: null,
};

describe("announcement-banner actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({ id: "admin-1", email: "a@b.fr", roles: ["admin"] });
    mockGetAnnouncementBanner.mockResolvedValue({ ...DEFAULT_ANNOUNCEMENT_BANNER, message: "Promo" });
    mockSaveAnnouncementBanner.mockResolvedValue({ error: null });
  });

  it("renvoie le defaut sans session admin sur getAnnouncementBannerAction", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const result = await getAnnouncementBannerAction();
    expect(result).toEqual(DEFAULT_ANNOUNCEMENT_BANNER);
    expect(mockGetAnnouncementBanner).not.toHaveBeenCalled();
  });

  it("renvoie le bandeau courant pour un admin", async () => {
    const result = await getAnnouncementBannerAction();
    expect(result.message).toBe("Promo");
  });

  it("refuse la mise a jour sans session admin", async () => {
    mockGetSessionUser.mockResolvedValue({ id: "c1", email: "c@b.fr", roles: ["client"] });
    const result = await updateAnnouncementBannerAction(validInput);
    expect(result).toEqual({ success: false, error: "Non autorisé" });
    expect(mockSaveAnnouncementBanner).not.toHaveBeenCalled();
  });

  it("refuse des donnees invalides", async () => {
    const result = await updateAnnouncementBannerAction({ ...validInput, message: "" });
    expect(result.success).toBe(false);
    expect(mockSaveAnnouncementBanner).not.toHaveBeenCalled();
  });

  it("sauvegarde un bandeau valide, journalise, et invalide le cache", async () => {
    const result = await updateAnnouncementBannerAction(validInput);
    expect(result).toEqual({ success: true });
    expect(mockSaveAnnouncementBanner).toHaveBeenCalledWith(validInput);
    expect(fromMock).toHaveBeenCalledWith("audit_logs");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "announcement_banner_updated", user_id: "admin-1" }),
    );
  });

  it("renvoie l'erreur de sauvegarde si l'upsert echoue", async () => {
    mockSaveAnnouncementBanner.mockResolvedValue({ error: "Erreur lors de l'enregistrement du bandeau." });
    const result = await updateAnnouncementBannerAction(validInput);
    expect(result).toEqual({ success: false, error: "Erreur lors de l'enregistrement du bandeau." });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/announcement-banner/actions.spec.ts`
Expected: FAIL — `Cannot find module './actions'`

- [ ] **Step 3: Write the action**

```typescript
// src/lib/announcement-banner/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { announcementBannerSchema } from "@/validations/announcement-banner";
import {
  DEFAULT_ANNOUNCEMENT_BANNER,
  getAnnouncementBanner,
  saveAnnouncementBanner,
  type AnnouncementBanner,
} from "./store";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) return null;
  return user;
};

export const getAnnouncementBannerAction = async (): Promise<AnnouncementBanner> => {
  const user = await requireAdmin();
  if (!user) return DEFAULT_ANNOUNCEMENT_BANNER;
  return getAnnouncementBanner();
};

export const updateAnnouncementBannerAction = async (
  data: unknown,
): Promise<ActionResult> => {
  const user = await requireAdmin();
  if (!user) return { success: false, error: "Non autorisé" };

  const parsed = announcementBannerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { error } = await saveAnnouncementBanner(parsed.data as AnnouncementBanner);
  if (error) return { success: false, error };

  const supabase = createAdminClient();
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "announcement_banner_updated",
    entity_type: "platform_settings",
    entity_id: null,
    metadata: parsed.data as unknown as Record<string, unknown>,
  });

  revalidatePath("/admin/parametres");
  revalidatePath("/");
  return { success: true };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/announcement-banner/actions.spec.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/announcement-banner/actions.ts src/lib/announcement-banner/actions.spec.ts
git commit -m "feat: add admin server actions for the announcement banner"
```

---

### Task 5: Admin form section

**Files:**
- Create: `src/app/(dashboard)/admin/parametres/_components/announcement-banner-form.tsx`
- Modify: `src/app/(dashboard)/admin/parametres/page.tsx`

**Interfaces:**
- Consumes: `getAnnouncementBannerAction`, `updateAnnouncementBannerAction`, `type AnnouncementBanner` (Task 4/2). Component props: `{ banner: AnnouncementBanner }`.
- Produces: `AnnouncementBannerForm` component, rendered only by `page.tsx` — no other task depends on it.

- [ ] **Step 1: Write the form component**

```tsx
// src/app/(dashboard)/admin/parametres/_components/announcement-banner-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { updateAnnouncementBannerAction } from "@/lib/announcement-banner/actions";
import type { AnnouncementBanner } from "@/lib/announcement-banner/store";

type Props = { banner: AnnouncementBanner };

export const AnnouncementBannerForm = ({ banner }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<AnnouncementBanner>(banner);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = <K extends keyof AnnouncementBanner>(key: K, value: AnnouncementBanner[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateAnnouncementBannerAction(form);
      if (!result.success) {
        setError(result.error ?? "Erreur inconnue");
        return;
      }
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">Bandeau d&apos;annonce</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Afficher le bandeau</p>
              <p className="text-sm text-muted-foreground">
                Visible en haut de toutes les pages publiques tant qu&apos;actif.
              </p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => set("enabled", v)}
              aria-label="Afficher le bandeau d'annonce"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner-message">Message</Label>
            <Textarea
              id="banner-message"
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="banner-link-url">Lien (optionnel)</Label>
              <Input
                id="banner-link-url"
                value={form.link_url ?? ""}
                onChange={(e) => set("link_url", e.target.value || null)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner-link-label">Libellé du lien</Label>
              <Input
                id="banner-link-label"
                value={form.link_label}
                onChange={(e) => set("link_label", e.target.value)}
                placeholder="En savoir plus"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="banner-start-date">Date de début (optionnelle)</Label>
              <Input
                id="banner-start-date"
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) => set("start_date", e.target.value || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner-end-date">Date de fin (optionnelle)</Label>
              <Input
                id="banner-end-date"
                type="date"
                value={form.end_date ?? ""}
                onChange={(e) => set("end_date", e.target.value || null)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-primary-green">Enregistré.</p>}

          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </CardContent>
      </Card>
    </form>
  );
};
```

- [ ] **Step 2: Wire it into the settings page**

Modify `src/app/(dashboard)/admin/parametres/page.tsx`:

```tsx
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPlatformSettings } from "./actions";
import { getEmailBranding } from "@/lib/emails/branding-store";
import { getAnnouncementBanner } from "@/lib/announcement-banner/store";
import { SettingsForm } from "./_components/settings-form";
import { EmailBrandingForm } from "./_components/email-branding-form";
import { AnnouncementBannerForm } from "./_components/announcement-banner-form";

export const metadata: Metadata = {
  title: "Paramètres plateforme",
};

const ParametresPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/admin");

  const [settings, branding, banner] = await Promise.all([
    getPlatformSettings(),
    getEmailBranding(),
    getAnnouncementBanner(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Paramètres plateforme
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configuration globale de la plateforme. Ces paramètres s&apos;appliquent à
          toutes les consultantes et tous les clients.
        </p>
      </div>
      <SettingsForm settings={settings} />

      <div className="border-t pt-8">
        <h2 className="font-serif text-xl font-bold text-primary-green">
          Identité visuelle des emails
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Logo, pied de page et bannière utilisés dans tous les emails envoyés par
          la plateforme.
        </p>
      </div>
      <EmailBrandingForm branding={branding} />

      <div className="border-t pt-8">
        <h2 className="font-serif text-xl font-bold text-primary-green">
          Bandeau d&apos;annonce
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Message temporaire affiché en haut de toutes les pages publiques
          (nouveau site, promotion, événement...).
        </p>
      </div>
      <AnnouncementBannerForm banner={banner} />
    </div>
  );
};

export default ParametresPage;
```

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all pre-existing tests plus the new ones from Tasks 1–4 pass, no regression.

- [ ] **Step 4: Manual end-to-end check**

Run the dev server (`npm run dev`), log in as an admin, go to `/admin/parametres`, activate the banner with a message and a link, save. Confirm:
1. Success message appears on the form.
2. Reload `/` and a second public page (e.g. `/formations`) — banner shows on both, above the header.
3. Close the banner on one page — reload that page, it stays closed.
4. Change the message in the admin, save — the banner reappears on next page load even though it was previously dismissed.
5. Turn the toggle off, save — banner disappears from public pages.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/admin/parametres/_components/announcement-banner-form.tsx" "src/app/(dashboard)/admin/parametres/page.tsx"
git commit -m "feat: add announcement banner form to admin settings page"
```

---

## Spec Coverage Check

- Portée (toutes pages publiques) → Task 3, layout wiring.
- Contenu (texte + lien optionnel) → Task 1 schema, Task 5 form fields.
- Fermeture visiteur + réapparition sur changement de message → Task 3, `dismissKey` hashing.
- Planification (toggle + dates) → Task 2 `isAnnouncementBannerActive`, Task 5 date fields.
- Style neutre/marque unique → Task 3 component, single fixed Tailwind class set, no variant prop.
- Position au-dessus du header → Task 3, layout wiring.
- Stockage via `platform_settings` → Task 1 migration, Task 2 store.
- Audit log → Task 4 `announcement_banner_updated`.
- Hors périmètre (pas de variantes couleur, pas de bandeaux multiples, pas de ciblage, pas d'historique) → respected, no task introduces any of these.
