# Refonte page Paramètres admin : onglets + nouveaux réglages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réorganiser `/admin/parametres` en onglets et ajouter 4 réglages pilotables (expéditeur email, email de contact, réseaux sociaux, feature flag réservation), en réutilisant le pattern `platform_settings` déjà en place, y compris le branchement réel sur le code qui lit aujourd'hui ces valeurs en dur.

**Architecture:** Chaque nouveau réglage suit le pattern déjà établi par `src/lib/announcement-banner/store.ts` : une clé JSONB dans `platform_settings`, un module `store.ts` (types, defaults, parse tolérant, get avec cache TTL 60s, save), un module `actions.ts` (server actions admin-only avec audit log), un schéma Zod dédié, et un formulaire client dans `admin/parametres/_components/`. La page `/admin/parametres` passe d'un scroll vertical à des onglets shadcn (`src/components/ui/tabs.tsx`). Les points de lecture historiques (`src/config/site.ts`, `src/config/navigation.ts`, `src/config/features.ts`, `src/lib/resend/client.ts`) sont mis à jour pour lire les nouveaux stores, avec repli sur les anciennes valeurs en dur en cas d'échec.

**Tech Stack:** Next.js App Router, React (Server + Client Components), TypeScript, Zod v4, Supabase (Postgres JSONB), Vitest.

## Global Constraints

- Spec source : `docs/superpowers/specs/2026-08-11-parametres-admin-onglets-design.md`.
- Périmètre : uniquement la page `/admin/parametres` + les points de lecture strictement nécessaires pour que les réglages soient réels. Aucune autre section admin n'est modifiée. Mega menu Livres et `newsletter_memo_url` restent hors périmètre.
- Champ « image OG par défaut » explicitement retiré du périmètre (décision utilisateur : éviter de forcer le rendu dynamique du root layout pour un gain cosmétique).
- Feature flag `booking_enabled` : branchement complet demandé par l'utilisateur, y compris à travers les Client Components (`header.tsx`, `client-space-tabs.tsx`, `completion-celebration.tsx`).
- Prochain numéro de migration Supabase : `00093` (dernière existante : `00092_announcement_banner.sql`).
- Convention d'audit log existante à respecter partout : `{ user_id, action: "<domaine>_updated", entity_type: "platform_settings", entity_id: null, metadata: parsed.data }`.
- Tests : Vitest, suivant le pattern de `src/lib/announcement-banner/store.spec.ts` et `actions.spec.ts`.

---

## Task 1: Migration SQL — 4 nouvelles clés `platform_settings`

**Files:**
- Create: `supabase/migrations/00093_settings_extra.sql`

**Interfaces:**
- Produces: 4 lignes dans `platform_settings` avec les clés `email_sender`, `seo_defaults`, `social_links`, `feature_flags`, consommées par les stores des tâches 2-9.

- [ ] **Step 1: Écrire la migration**

```sql
-- Migration 00093: réglages supplémentaires de la page Paramètres admin
--
-- Quatre nouvelles clés JSONB dans platform_settings, même pattern que
-- email_branding (00070) et announcement_banner (00092) : expéditeur des
-- emails, email de contact public, réseaux sociaux, feature flags.

INSERT INTO platform_settings (key, value) VALUES (
  'email_sender',
  jsonb_build_object(
    'from_address', 'noreply@formation-allaitement.com',
    'from_name', 'Question d''Allaitement'
  )
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO platform_settings (key, value) VALUES (
  'seo_defaults',
  jsonb_build_object(
    'contact_email', 'contact@questiondallaitement.fr'
  )
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO platform_settings (key, value) VALUES (
  'social_links',
  jsonb_build_object(
    'instagram_url', 'https://www.instagram.com/carole.questiondallaitement/',
    'tiktok_url', 'https://www.tiktok.com/@carole_herve',
    'linkedin_url', 'https://www.linkedin.com/in/carole-herve-ibclc/'
  )
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO platform_settings (key, value) VALUES (
  'feature_flags',
  jsonb_build_object(
    'booking_enabled', true
  )
)
ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 2: Appliquer la migration en local et vérifier**

Run: `supabase db reset` (ou la commande de migration locale utilisée par le projet — vérifier `package.json` pour le script exact, ex. `npm run db:migrate`)
Expected: les 4 lignes apparaissent dans `platform_settings` (vérifiable via `select key from platform_settings order by key;`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00093_settings_extra.sql
git commit -m "feat(admin): migration pour les nouveaux réglages plateforme (expéditeur, contact, réseaux, feature flags)"
```

---

## Task 2: Store + validation `email_sender`

**Files:**
- Create: `src/lib/settings/email-sender/store.ts`
- Create: `src/lib/settings/email-sender/store.spec.ts`
- Create: `src/validations/email-sender.ts`

**Interfaces:**
- Consumes: `createAdminClient` de `@/lib/supabase/admin`.
- Produces: `type EmailSender = { from_address: string; from_name: string }`, `DEFAULT_EMAIL_SENDER`, `parseEmailSender(raw: unknown): EmailSender`, `getEmailSender(): Promise<EmailSender>`, `saveEmailSender(sender: EmailSender): Promise<{ error: string | null }>`, `invalidateEmailSenderCache()`. Schéma `emailSenderSchema` (Zod). Utilisés par la Task 3 (actions), la Task 10 (formulaire), la Task 12 (`resend/client.ts`).

- [ ] **Step 1: Écrire les tests du store**

```ts
// src/lib/settings/email-sender/store.spec.ts
import { describe, expect, it } from "vitest";
import { DEFAULT_EMAIL_SENDER, parseEmailSender } from "./store";

describe("parseEmailSender", () => {
  it("retombe sur les valeurs par défaut si la valeur brute est vide", () => {
    expect(parseEmailSender(null)).toEqual(DEFAULT_EMAIL_SENDER);
    expect(parseEmailSender(undefined)).toEqual(DEFAULT_EMAIL_SENDER);
    expect(parseEmailSender("not-json")).toEqual(DEFAULT_EMAIL_SENDER);
  });

  it("fusionne une valeur partielle avec les défauts", () => {
    const result = parseEmailSender({ from_name: "QDA Support" });
    expect(result).toEqual({
      ...DEFAULT_EMAIL_SENDER,
      from_name: "QDA Support",
    });
  });

  it("accepte une chaîne JSON sérialisée", () => {
    const result = parseEmailSender(
      JSON.stringify({ from_address: "hello@questiondallaitement.fr", from_name: "QDA" }),
    );
    expect(result.from_address).toBe("hello@questiondallaitement.fr");
    expect(result.from_name).toBe("QDA");
  });

  it("ignore une clé vide ou de mauvais type et garde le défaut", () => {
    expect(parseEmailSender({ from_name: "" }).from_name).toBe(DEFAULT_EMAIL_SENDER.from_name);
    expect(parseEmailSender({ from_name: 42 }).from_name).toBe(DEFAULT_EMAIL_SENDER.from_name);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run src/lib/settings/email-sender/store.spec.ts`
Expected: FAIL — `Cannot find module './store'`

- [ ] **Step 3: Implémenter le store**

```ts
// src/lib/settings/email-sender/store.ts
import { createAdminClient } from "@/lib/supabase/admin";

export const EMAIL_SENDER_KEY = "email_sender";

export type EmailSender = {
  from_address: string;
  from_name: string;
};

export const DEFAULT_EMAIL_SENDER: EmailSender = {
  from_address: process.env.RESEND_FROM_EMAIL ?? "noreply@formation-allaitement.com",
  from_name: process.env.RESEND_FROM_NAME ?? "Question d'Allaitement",
};

const safeJsonParse = (raw: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const parseEmailSender = (raw: unknown): EmailSender => {
  const src =
    typeof raw === "string"
      ? safeJsonParse(raw)
      : raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};

  const out = { ...DEFAULT_EMAIL_SENDER };
  for (const key of Object.keys(DEFAULT_EMAIL_SENDER) as (keyof EmailSender)[]) {
    const value = src[key];
    if (typeof value === "string" && value.length > 0) {
      out[key] = value;
    }
  }
  return out;
};

const TTL_MS = 60_000;
let cached: { value: EmailSender; at: number } | null = null;

export const invalidateEmailSenderCache = () => {
  cached = null;
};

export const getEmailSender = async (): Promise<EmailSender> => {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", EMAIL_SENDER_KEY)
      .maybeSingle();

    const value = parseEmailSender(data?.value);
    cached = { value, at: Date.now() };
    return value;
  } catch (e) {
    console.error("[email-sender] lecture des reglages echouee", e);
    return DEFAULT_EMAIL_SENDER;
  }
};

export const saveEmailSender = async (
  sender: EmailSender,
): Promise<{ error: string | null }> => {
  const supabase = createAdminClient();
  const { error } = await supabase.from("platform_settings").upsert(
    {
      key: EMAIL_SENDER_KEY,
      value: sender as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) return { error: "Erreur lors de l'enregistrement de l'expéditeur." };

  invalidateEmailSenderCache();
  return { error: null };
};
```

- [ ] **Step 4: Écrire le schéma de validation**

```ts
// src/validations/email-sender.ts
import { z } from "zod/v4";

export const emailSenderSchema = z.object({
  from_address: z.string().trim().email("Adresse email invalide"),
  from_name: z.string().trim().min(1, "Le nom est requis").max(120, "120 caractères maximum"),
});

export type EmailSenderInput = z.infer<typeof emailSenderSchema>;
```

- [ ] **Step 5: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/lib/settings/email-sender/store.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/settings/email-sender/store.ts src/lib/settings/email-sender/store.spec.ts src/validations/email-sender.ts
git commit -m "feat(admin): store et validation du réglage expéditeur email"
```

---

## Task 3: Server actions `email_sender`

**Files:**
- Create: `src/lib/settings/email-sender/actions.ts`

**Interfaces:**
- Consumes: `DEFAULT_EMAIL_SENDER`, `getEmailSender`, `saveEmailSender`, `type EmailSender` de `./store` (Task 2) ; `emailSenderSchema` de `@/validations/email-sender` (Task 2) ; `getSessionUser` de `@/lib/auth` ; `createAdminClient` de `@/lib/supabase/admin` ; `type ActionResult` de `@/types`.
- Produces: `getEmailSenderAction(): Promise<EmailSender>`, `updateEmailSenderAction(data: unknown): Promise<ActionResult>`. Utilisés par le formulaire de la Task 10.

- [ ] **Step 1: Implémenter les actions**

```ts
// src/lib/settings/email-sender/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailSenderSchema } from "@/validations/email-sender";
import {
  DEFAULT_EMAIL_SENDER,
  getEmailSender,
  saveEmailSender,
  type EmailSender,
} from "./store";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) return null;
  return user;
};

export const getEmailSenderAction = async (): Promise<EmailSender> => {
  const user = await requireAdmin();
  if (!user) return DEFAULT_EMAIL_SENDER;
  return getEmailSender();
};

export const updateEmailSenderAction = async (
  data: unknown,
): Promise<ActionResult> => {
  const user = await requireAdmin();
  if (!user) return { success: false, error: "Non autorisé" };

  const parsed = emailSenderSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { error } = await saveEmailSender(parsed.data as EmailSender);
  if (error) return { success: false, error };

  const supabase = createAdminClient();
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "email_sender_updated",
    entity_type: "platform_settings",
    entity_id: null,
    metadata: parsed.data as unknown as Record<string, unknown>,
  });

  revalidatePath("/admin/parametres");
  return { success: true };
};
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur liée à ce fichier

- [ ] **Step 3: Commit**

```bash
git add src/lib/settings/email-sender/actions.ts
git commit -m "feat(admin): server actions du réglage expéditeur email"
```

---

## Task 4: Store + validation `seo_defaults` (email de contact)

**Files:**
- Create: `src/lib/settings/seo-defaults/store.ts`
- Create: `src/lib/settings/seo-defaults/store.spec.ts`
- Create: `src/validations/seo-defaults.ts`

**Interfaces:**
- Produces: `type SeoDefaults = { contact_email: string }`, `DEFAULT_SEO_DEFAULTS`, `parseSeoDefaults`, `getSeoDefaults()`, `saveSeoDefaults()`, `invalidateSeoDefaultsCache()`, et le raccourci `getContactEmail(): Promise<string>`. Schéma `seoDefaultsSchema`. Utilisés par la Task 5, la Task 10, et la Task 14 (pages légales/contact).

- [ ] **Step 1: Écrire les tests du store**

```ts
// src/lib/settings/seo-defaults/store.spec.ts
import { describe, expect, it } from "vitest";
import { DEFAULT_SEO_DEFAULTS, parseSeoDefaults } from "./store";

describe("parseSeoDefaults", () => {
  it("retombe sur les valeurs par défaut si la valeur brute est vide", () => {
    expect(parseSeoDefaults(null)).toEqual(DEFAULT_SEO_DEFAULTS);
    expect(parseSeoDefaults(undefined)).toEqual(DEFAULT_SEO_DEFAULTS);
    expect(parseSeoDefaults("not-json")).toEqual(DEFAULT_SEO_DEFAULTS);
  });

  it("prend en compte une valeur valide", () => {
    const result = parseSeoDefaults({ contact_email: "hello@questiondallaitement.fr" });
    expect(result.contact_email).toBe("hello@questiondallaitement.fr");
  });

  it("ignore une valeur de mauvais type et garde le défaut", () => {
    expect(parseSeoDefaults({ contact_email: 42 }).contact_email).toBe(
      DEFAULT_SEO_DEFAULTS.contact_email,
    );
    expect(parseSeoDefaults({ contact_email: "" }).contact_email).toBe(
      DEFAULT_SEO_DEFAULTS.contact_email,
    );
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run src/lib/settings/seo-defaults/store.spec.ts`
Expected: FAIL — `Cannot find module './store'`

- [ ] **Step 3: Implémenter le store**

```ts
// src/lib/settings/seo-defaults/store.ts
import { createAdminClient } from "@/lib/supabase/admin";

export const SEO_DEFAULTS_KEY = "seo_defaults";

export type SeoDefaults = {
  contact_email: string;
};

export const DEFAULT_SEO_DEFAULTS: SeoDefaults = {
  contact_email:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@questiondallaitement.fr",
};

const safeJsonParse = (raw: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const parseSeoDefaults = (raw: unknown): SeoDefaults => {
  const src =
    typeof raw === "string"
      ? safeJsonParse(raw)
      : raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};

  const out = { ...DEFAULT_SEO_DEFAULTS };
  const value = src.contact_email;
  if (typeof value === "string" && value.length > 0) {
    out.contact_email = value;
  }
  return out;
};

const TTL_MS = 60_000;
let cached: { value: SeoDefaults; at: number } | null = null;

export const invalidateSeoDefaultsCache = () => {
  cached = null;
};

export const getSeoDefaults = async (): Promise<SeoDefaults> => {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", SEO_DEFAULTS_KEY)
      .maybeSingle();

    const value = parseSeoDefaults(data?.value);
    cached = { value, at: Date.now() };
    return value;
  } catch (e) {
    console.error("[seo-defaults] lecture des reglages echouee", e);
    return DEFAULT_SEO_DEFAULTS;
  }
};

export const saveSeoDefaults = async (
  defaults: SeoDefaults,
): Promise<{ error: string | null }> => {
  const supabase = createAdminClient();
  const { error } = await supabase.from("platform_settings").upsert(
    {
      key: SEO_DEFAULTS_KEY,
      value: defaults as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) return { error: "Erreur lors de l'enregistrement de l'email de contact." };

  invalidateSeoDefaultsCache();
  return { error: null };
};

/** Raccourci pour les appelants qui n'ont besoin que de l'adresse (pages légales, API routes). */
export const getContactEmail = async (): Promise<string> =>
  (await getSeoDefaults()).contact_email;
```

- [ ] **Step 4: Écrire le schéma de validation**

```ts
// src/validations/seo-defaults.ts
import { z } from "zod/v4";

export const seoDefaultsSchema = z.object({
  contact_email: z.string().trim().email("Adresse email invalide"),
});

export type SeoDefaultsInput = z.infer<typeof seoDefaultsSchema>;
```

- [ ] **Step 5: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/lib/settings/seo-defaults/store.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/settings/seo-defaults/store.ts src/lib/settings/seo-defaults/store.spec.ts src/validations/seo-defaults.ts
git commit -m "feat(admin): store et validation du réglage email de contact"
```

---

## Task 5: Server actions `seo_defaults`

**Files:**
- Create: `src/lib/settings/seo-defaults/actions.ts`

**Interfaces:**
- Consumes: `DEFAULT_SEO_DEFAULTS`, `getSeoDefaults`, `saveSeoDefaults`, `type SeoDefaults` de `./store` (Task 4) ; `seoDefaultsSchema` de `@/validations/seo-defaults`.
- Produces: `getSeoDefaultsAction(): Promise<SeoDefaults>`, `updateSeoDefaultsAction(data: unknown): Promise<ActionResult>`. Utilisés par le formulaire de la Task 10.

- [ ] **Step 1: Implémenter les actions**

```ts
// src/lib/settings/seo-defaults/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { seoDefaultsSchema } from "@/validations/seo-defaults";
import {
  DEFAULT_SEO_DEFAULTS,
  getSeoDefaults,
  saveSeoDefaults,
  type SeoDefaults,
} from "./store";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) return null;
  return user;
};

export const getSeoDefaultsAction = async (): Promise<SeoDefaults> => {
  const user = await requireAdmin();
  if (!user) return DEFAULT_SEO_DEFAULTS;
  return getSeoDefaults();
};

export const updateSeoDefaultsAction = async (
  data: unknown,
): Promise<ActionResult> => {
  const user = await requireAdmin();
  if (!user) return { success: false, error: "Non autorisé" };

  const parsed = seoDefaultsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { error } = await saveSeoDefaults(parsed.data as SeoDefaults);
  if (error) return { success: false, error };

  const supabase = createAdminClient();
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "seo_defaults_updated",
    entity_type: "platform_settings",
    entity_id: null,
    metadata: parsed.data as unknown as Record<string, unknown>,
  });

  revalidatePath("/admin/parametres");
  revalidatePath("/cgv");
  revalidatePath("/mentions-legales");
  revalidatePath("/politique-de-confidentialite");
  revalidatePath("/newsletter/desinscription");
  return { success: true };
};
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur liée à ce fichier

- [ ] **Step 3: Commit**

```bash
git add src/lib/settings/seo-defaults/actions.ts
git commit -m "feat(admin): server actions du réglage email de contact"
```

---

## Task 6: Store + validation `social_links`

**Files:**
- Create: `src/lib/settings/social-links/store.ts`
- Create: `src/lib/settings/social-links/store.spec.ts`
- Create: `src/validations/social-links.ts`

**Interfaces:**
- Produces: `type SocialLinks = { instagram_url: string | null; tiktok_url: string | null; linkedin_url: string | null }`, `DEFAULT_SOCIAL_LINKS`, `parseSocialLinks`, `getSocialLinks()`, `saveSocialLinks()`, `invalidateSocialLinksCache()`. Schéma `socialLinksSchema`. Utilisés par la Task 7, la Task 10, la Task 13 (footer + page liens).

- [ ] **Step 1: Écrire les tests du store**

```ts
// src/lib/settings/social-links/store.spec.ts
import { describe, expect, it } from "vitest";
import { DEFAULT_SOCIAL_LINKS, parseSocialLinks } from "./store";

describe("parseSocialLinks", () => {
  it("retombe sur les valeurs par défaut si la valeur brute est vide", () => {
    expect(parseSocialLinks(null)).toEqual(DEFAULT_SOCIAL_LINKS);
    expect(parseSocialLinks(undefined)).toEqual(DEFAULT_SOCIAL_LINKS);
    expect(parseSocialLinks("not-json")).toEqual(DEFAULT_SOCIAL_LINKS);
  });

  it("fusionne une valeur partielle avec les défauts", () => {
    const result = parseSocialLinks({ instagram_url: "https://instagram.com/x" });
    expect(result).toEqual({
      ...DEFAULT_SOCIAL_LINKS,
      instagram_url: "https://instagram.com/x",
    });
  });

  it("accepte explicitement null pour masquer un lien", () => {
    const result = parseSocialLinks({ tiktok_url: null });
    expect(result.tiktok_url).toBeNull();
  });

  it("ignore une clé de mauvais type et garde le défaut", () => {
    expect(parseSocialLinks({ instagram_url: 42 }).instagram_url).toBe(
      DEFAULT_SOCIAL_LINKS.instagram_url,
    );
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run src/lib/settings/social-links/store.spec.ts`
Expected: FAIL — `Cannot find module './store'`

- [ ] **Step 3: Implémenter le store**

```ts
// src/lib/settings/social-links/store.ts
import { createAdminClient } from "@/lib/supabase/admin";

export const SOCIAL_LINKS_KEY = "social_links";

export type SocialLinks = {
  instagram_url: string | null;
  tiktok_url: string | null;
  linkedin_url: string | null;
};

export const DEFAULT_SOCIAL_LINKS: SocialLinks = {
  instagram_url: "https://www.instagram.com/carole.questiondallaitement/",
  tiktok_url: "https://www.tiktok.com/@carole_herve",
  linkedin_url: "https://www.linkedin.com/in/carole-herve-ibclc/",
};

const safeJsonParse = (raw: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const parseSocialLinks = (raw: unknown): SocialLinks => {
  const src =
    typeof raw === "string"
      ? safeJsonParse(raw)
      : raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};

  const out = { ...DEFAULT_SOCIAL_LINKS };
  for (const key of Object.keys(DEFAULT_SOCIAL_LINKS) as (keyof SocialLinks)[]) {
    if (!(key in src)) continue;
    const value = src[key];
    if (typeof value === "string" && value.length > 0) {
      out[key] = value;
    } else if (value === null) {
      out[key] = null;
    }
  }
  return out;
};

const TTL_MS = 60_000;
let cached: { value: SocialLinks; at: number } | null = null;

export const invalidateSocialLinksCache = () => {
  cached = null;
};

export const getSocialLinks = async (): Promise<SocialLinks> => {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", SOCIAL_LINKS_KEY)
      .maybeSingle();

    const value = parseSocialLinks(data?.value);
    cached = { value, at: Date.now() };
    return value;
  } catch (e) {
    console.error("[social-links] lecture des reglages echouee", e);
    return DEFAULT_SOCIAL_LINKS;
  }
};

export const saveSocialLinks = async (
  links: SocialLinks,
): Promise<{ error: string | null }> => {
  const supabase = createAdminClient();
  const { error } = await supabase.from("platform_settings").upsert(
    {
      key: SOCIAL_LINKS_KEY,
      value: links as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) return { error: "Erreur lors de l'enregistrement des réseaux sociaux." };

  invalidateSocialLinksCache();
  return { error: null };
};
```

- [ ] **Step 4: Écrire le schéma de validation**

```ts
// src/validations/social-links.ts
import { z } from "zod/v4";

const optionalUrl = z
  .union([z.string().trim().url("Lien invalide"), z.literal("")])
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .default(null);

export const socialLinksSchema = z.object({
  instagram_url: optionalUrl,
  tiktok_url: optionalUrl,
  linkedin_url: optionalUrl,
});

export type SocialLinksInput = z.infer<typeof socialLinksSchema>;
```

- [ ] **Step 5: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/lib/settings/social-links/store.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/settings/social-links/store.ts src/lib/settings/social-links/store.spec.ts src/validations/social-links.ts
git commit -m "feat(admin): store et validation du réglage réseaux sociaux"
```

---

## Task 7: Server actions `social_links`

**Files:**
- Create: `src/lib/settings/social-links/actions.ts`

**Interfaces:**
- Consumes: `DEFAULT_SOCIAL_LINKS`, `getSocialLinks`, `saveSocialLinks`, `type SocialLinks` de `./store` (Task 6) ; `socialLinksSchema` de `@/validations/social-links`.
- Produces: `getSocialLinksAction(): Promise<SocialLinks>`, `updateSocialLinksAction(data: unknown): Promise<ActionResult>`. Utilisés par le formulaire de la Task 10.

- [ ] **Step 1: Implémenter les actions**

```ts
// src/lib/settings/social-links/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { socialLinksSchema } from "@/validations/social-links";
import {
  DEFAULT_SOCIAL_LINKS,
  getSocialLinks,
  saveSocialLinks,
  type SocialLinks,
} from "./store";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) return null;
  return user;
};

export const getSocialLinksAction = async (): Promise<SocialLinks> => {
  const user = await requireAdmin();
  if (!user) return DEFAULT_SOCIAL_LINKS;
  return getSocialLinks();
};

export const updateSocialLinksAction = async (
  data: unknown,
): Promise<ActionResult> => {
  const user = await requireAdmin();
  if (!user) return { success: false, error: "Non autorisé" };

  const parsed = socialLinksSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { error } = await saveSocialLinks(parsed.data as SocialLinks);
  if (error) return { success: false, error };

  const supabase = createAdminClient();
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "social_links_updated",
    entity_type: "platform_settings",
    entity_id: null,
    metadata: parsed.data as unknown as Record<string, unknown>,
  });

  revalidatePath("/admin/parametres");
  revalidatePath("/", "layout");
  revalidatePath("/liens");
  return { success: true };
};
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur liée à ce fichier

- [ ] **Step 3: Commit**

```bash
git add src/lib/settings/social-links/actions.ts
git commit -m "feat(admin): server actions du réglage réseaux sociaux"
```

---

## Task 8: Store + validation `feature_flags`

**Files:**
- Create: `src/lib/settings/feature-flags/store.ts`
- Create: `src/lib/settings/feature-flags/store.spec.ts`
- Create: `src/validations/feature-flags.ts`

**Interfaces:**
- Produces: `type FeatureFlags = { booking_enabled: boolean }`, `DEFAULT_FEATURE_FLAGS`, `parseFeatureFlags`, `getFeatureFlags()`, `saveFeatureFlags()`, `invalidateFeatureFlagsCache()`, raccourci `isBookingEnabled(): Promise<boolean>`. Schéma `featureFlagsSchema`. `isBookingEnabled` est le point d'entrée utilisé par toutes les Tasks 15-17 (branchement du flag).

- [ ] **Step 1: Écrire les tests du store**

```ts
// src/lib/settings/feature-flags/store.spec.ts
import { describe, expect, it } from "vitest";
import { DEFAULT_FEATURE_FLAGS, parseFeatureFlags } from "./store";

describe("parseFeatureFlags", () => {
  it("retombe sur les valeurs par défaut si la valeur brute est vide", () => {
    expect(parseFeatureFlags(null)).toEqual(DEFAULT_FEATURE_FLAGS);
    expect(parseFeatureFlags(undefined)).toEqual(DEFAULT_FEATURE_FLAGS);
    expect(parseFeatureFlags("not-json")).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it("prend en compte une valeur booléenne valide", () => {
    expect(parseFeatureFlags({ booking_enabled: false }).booking_enabled).toBe(false);
    expect(parseFeatureFlags({ booking_enabled: true }).booking_enabled).toBe(true);
  });

  it("ignore une valeur de mauvais type et garde le défaut", () => {
    expect(parseFeatureFlags({ booking_enabled: "false" }).booking_enabled).toBe(
      DEFAULT_FEATURE_FLAGS.booking_enabled,
    );
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run src/lib/settings/feature-flags/store.spec.ts`
Expected: FAIL — `Cannot find module './store'`

- [ ] **Step 3: Implémenter le store**

```ts
// src/lib/settings/feature-flags/store.ts
import { createAdminClient } from "@/lib/supabase/admin";

export const FEATURE_FLAGS_KEY = "feature_flags";

export type FeatureFlags = {
  booking_enabled: boolean;
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  booking_enabled: process.env.NEXT_PUBLIC_BOOKING_ENABLED !== "false",
};

const safeJsonParse = (raw: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const parseFeatureFlags = (raw: unknown): FeatureFlags => {
  const src =
    typeof raw === "string"
      ? safeJsonParse(raw)
      : raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};

  const out = { ...DEFAULT_FEATURE_FLAGS };
  if (typeof src.booking_enabled === "boolean") {
    out.booking_enabled = src.booking_enabled;
  }
  return out;
};

const TTL_MS = 60_000;
let cached: { value: FeatureFlags; at: number } | null = null;

export const invalidateFeatureFlagsCache = () => {
  cached = null;
};

export const getFeatureFlags = async (): Promise<FeatureFlags> => {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", FEATURE_FLAGS_KEY)
      .maybeSingle();

    const value = parseFeatureFlags(data?.value);
    cached = { value, at: Date.now() };
    return value;
  } catch (e) {
    console.error("[feature-flags] lecture des reglages echouee", e);
    return DEFAULT_FEATURE_FLAGS;
  }
};

export const saveFeatureFlags = async (
  flags: FeatureFlags,
): Promise<{ error: string | null }> => {
  const supabase = createAdminClient();
  const { error } = await supabase.from("platform_settings").upsert(
    {
      key: FEATURE_FLAGS_KEY,
      value: flags as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) return { error: "Erreur lors de l'enregistrement des feature flags." };

  invalidateFeatureFlagsCache();
  return { error: null };
};

/** Raccourci pour les Server Components qui n'ont besoin que du booléen. */
export const isBookingEnabled = async (): Promise<boolean> =>
  (await getFeatureFlags()).booking_enabled;
```

- [ ] **Step 4: Écrire le schéma de validation**

```ts
// src/validations/feature-flags.ts
import { z } from "zod/v4";

export const featureFlagsSchema = z.object({
  booking_enabled: z.boolean(),
});

export type FeatureFlagsInput = z.infer<typeof featureFlagsSchema>;
```

- [ ] **Step 5: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/lib/settings/feature-flags/store.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/settings/feature-flags/store.ts src/lib/settings/feature-flags/store.spec.ts src/validations/feature-flags.ts
git commit -m "feat(admin): store et validation du feature flag réservation"
```

---

## Task 9: Server actions `feature_flags`

**Files:**
- Create: `src/lib/settings/feature-flags/actions.ts`

**Interfaces:**
- Consumes: `DEFAULT_FEATURE_FLAGS`, `getFeatureFlags`, `saveFeatureFlags`, `type FeatureFlags` de `./store` (Task 8) ; `featureFlagsSchema` de `@/validations/feature-flags`.
- Produces: `getFeatureFlagsAction(): Promise<FeatureFlags>`, `updateFeatureFlagsAction(data: unknown): Promise<ActionResult>`. Utilisés par le formulaire de la Task 10.

- [ ] **Step 1: Implémenter les actions**

```ts
// src/lib/settings/feature-flags/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { featureFlagsSchema } from "@/validations/feature-flags";
import {
  DEFAULT_FEATURE_FLAGS,
  getFeatureFlags,
  saveFeatureFlags,
  type FeatureFlags,
} from "./store";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) return null;
  return user;
};

export const getFeatureFlagsAction = async (): Promise<FeatureFlags> => {
  const user = await requireAdmin();
  if (!user) return DEFAULT_FEATURE_FLAGS;
  return getFeatureFlags();
};

export const updateFeatureFlagsAction = async (
  data: unknown,
): Promise<ActionResult> => {
  const user = await requireAdmin();
  if (!user) return { success: false, error: "Non autorisé" };

  const parsed = featureFlagsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { error } = await saveFeatureFlags(parsed.data as FeatureFlags);
  if (error) return { success: false, error };

  const supabase = createAdminClient();
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "feature_flags_updated",
    entity_type: "platform_settings",
    entity_id: null,
    metadata: parsed.data as unknown as Record<string, unknown>,
  });

  // Le flag conditionne des blocs dans quasi toutes les pages publiques et
  // l'espace client (nav, CTA) : on invalide tout le site plutôt que de
  // lister chaque route individuellement.
  revalidatePath("/", "layout");
  return { success: true };
};
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur liée à ce fichier

- [ ] **Step 3: Commit**

```bash
git add src/lib/settings/feature-flags/actions.ts
git commit -m "feat(admin): server actions du feature flag réservation"
```

---

## Task 10: Formulaires admin + page à onglets

**Files:**
- Create: `src/app/(dashboard)/admin/parametres/_components/email-sender-form.tsx`
- Create: `src/app/(dashboard)/admin/parametres/_components/seo-defaults-form.tsx`
- Create: `src/app/(dashboard)/admin/parametres/_components/social-links-form.tsx`
- Create: `src/app/(dashboard)/admin/parametres/_components/feature-flags-form.tsx`
- Modify: `src/app/(dashboard)/admin/parametres/page.tsx` (remplacement intégral)

**Interfaces:**
- Consumes: `updateEmailSenderAction`/`type EmailSender` (Task 3), `updateSeoDefaultsAction`/`type SeoDefaults` (Task 5), `updateSocialLinksAction`/`type SocialLinks` (Task 7), `updateFeatureFlagsAction`/`type FeatureFlags` (Task 9), `getEmailSender`/`getSeoDefaults`/`getSocialLinks`/`getFeatureFlags` (Tasks 2/4/6/8), `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` de `@/components/ui/tabs`, composants existants `SettingsForm`, `EmailBrandingForm`, `AnnouncementBannerForm`.
- Produces: page `/admin/parametres` fonctionnelle avec 5 onglets. Aucun autre fichier ne dépend de cette page.

- [ ] **Step 1: Créer le formulaire expéditeur email**

```tsx
// src/app/(dashboard)/admin/parametres/_components/email-sender-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { updateEmailSenderAction } from "@/lib/settings/email-sender/actions";
import type { EmailSender } from "@/lib/settings/email-sender/store";

type Props = { sender: EmailSender };

export const EmailSenderForm = ({ sender }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<EmailSender>(sender);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = <K extends keyof EmailSender>(key: K, value: EmailSender[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const domain = form.from_address.split("@")[1];
  const domainWarning =
    domain && domain !== "questiondallaitement.fr" && domain !== "questiondallaitement.com";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateEmailSenderAction(form);
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
          <CardTitle className="text-primary-green">Expéditeur des emails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="from_name">Nom affiché</Label>
              <Input
                id="from_name"
                value={form.from_name}
                onChange={(e) => set("from_name", e.target.value)}
                aria-label="Nom affiché de l'expéditeur"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from_address">Adresse d&apos;expédition</Label>
              <Input
                id="from_address"
                type="email"
                value={form.from_address}
                onChange={(e) => set("from_address", e.target.value)}
                aria-label="Adresse email d'expédition"
              />
            </div>
          </div>
          {domainWarning && (
            <p className="text-xs text-amber-600">
              Le domaine « {domain} » doit être vérifié dans Resend pour que les emails ne
              partent pas en spam.
            </p>
          )}

          {error && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm font-medium text-green-600" role="status">
              Expéditeur enregistré.
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary-red hover:bg-primary-red-dark"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Enregistrer l&apos;expéditeur
          </Button>
        </CardContent>
      </Card>
    </form>
  );
};
```

- [ ] **Step 2: Créer le formulaire email de contact**

```tsx
// src/app/(dashboard)/admin/parametres/_components/seo-defaults-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { updateSeoDefaultsAction } from "@/lib/settings/seo-defaults/actions";
import type { SeoDefaults } from "@/lib/settings/seo-defaults/store";

type Props = { defaults: SeoDefaults };

export const SeoDefaultsForm = ({ defaults }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [contactEmail, setContactEmail] = useState(defaults.contact_email);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateSeoDefaultsAction({ contact_email: contactEmail });
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
          <CardTitle className="text-primary-green">Email de contact public</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact_email">Adresse affichée aux visiteurs</Label>
            <Input
              id="contact_email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              aria-label="Email de contact public"
            />
            <p className="text-xs text-muted-foreground">
              Affichée dans les CGV, mentions légales, politique de confidentialité et
              désinscription newsletter.
            </p>
          </div>

          {error && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm font-medium text-green-600" role="status">
              Email de contact enregistré.
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary-red hover:bg-primary-red-dark"
          >
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

- [ ] **Step 3: Créer le formulaire réseaux sociaux**

```tsx
// src/app/(dashboard)/admin/parametres/_components/social-links-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { updateSocialLinksAction } from "@/lib/settings/social-links/actions";
import type { SocialLinks } from "@/lib/settings/social-links/store";

type Props = { links: SocialLinks };

export const SocialLinksForm = ({ links }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<SocialLinks>(links);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = <K extends keyof SocialLinks>(key: K, value: SocialLinks[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateSocialLinksAction(form);
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
          <CardTitle className="text-primary-green">Réseaux sociaux</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instagram_url">Instagram</Label>
            <Input
              id="instagram_url"
              type="url"
              value={form.instagram_url ?? ""}
              onChange={(e) => set("instagram_url", e.target.value || null)}
              placeholder="https://www.instagram.com/..."
              aria-label="Lien Instagram"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tiktok_url">TikTok</Label>
            <Input
              id="tiktok_url"
              type="url"
              value={form.tiktok_url ?? ""}
              onChange={(e) => set("tiktok_url", e.target.value || null)}
              placeholder="https://www.tiktok.com/@..."
              aria-label="Lien TikTok"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn</Label>
            <Input
              id="linkedin_url"
              type="url"
              value={form.linkedin_url ?? ""}
              onChange={(e) => set("linkedin_url", e.target.value || null)}
              placeholder="https://www.linkedin.com/in/..."
              aria-label="Lien LinkedIn"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Un champ vide masque l&apos;icône correspondante dans le pied de page et la page de
            liens.
          </p>

          {error && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm font-medium text-green-600" role="status">
              Réseaux sociaux enregistrés.
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary-red hover:bg-primary-red-dark"
          >
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

- [ ] **Step 4: Créer le formulaire feature flags**

```tsx
// src/app/(dashboard)/admin/parametres/_components/feature-flags-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { updateFeatureFlagsAction } from "@/lib/settings/feature-flags/actions";
import type { FeatureFlags } from "@/lib/settings/feature-flags/store";

type Props = { flags: FeatureFlags };

export const FeatureFlagsForm = ({ flags }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bookingEnabled, setBookingEnabled] = useState(flags.booking_enabled);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateFeatureFlagsAction({ booking_enabled: bookingEnabled });
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
          <CardTitle className="text-primary-green">Réservation de rendez-vous</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Activer la réservation de rendez-vous</p>
              <p className="text-sm text-muted-foreground">
                Désactivé : les CTA et menus « Prendre rendez-vous » disparaissent du site, le
                mode devient formations uniquement.
              </p>
            </div>
            <Switch
              checked={bookingEnabled}
              onCheckedChange={setBookingEnabled}
              aria-label="Activer la réservation de rendez-vous"
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm font-medium text-green-600" role="status">
              Feature flags enregistrés.
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary-red hover:bg-primary-red-dark"
          >
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

- [ ] **Step 5: Remplacer la page par la version à onglets**

```tsx
// src/app/(dashboard)/admin/parametres/page.tsx
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPlatformSettings } from "./actions";
import { getEmailBranding } from "@/lib/emails/branding-store";
import { getEmailSender } from "@/lib/settings/email-sender/store";
import { getAnnouncementBanner } from "@/lib/announcement-banner/store";
import { getSeoDefaults } from "@/lib/settings/seo-defaults/store";
import { getSocialLinks } from "@/lib/settings/social-links/store";
import { getFeatureFlags } from "@/lib/settings/feature-flags/store";
import { SettingsForm } from "./_components/settings-form";
import { EmailBrandingForm } from "./_components/email-branding-form";
import { EmailSenderForm } from "./_components/email-sender-form";
import { AnnouncementBannerForm } from "./_components/announcement-banner-form";
import { SeoDefaultsForm } from "./_components/seo-defaults-form";
import { SocialLinksForm } from "./_components/social-links-form";
import { FeatureFlagsForm } from "./_components/feature-flags-form";

export const metadata: Metadata = {
  title: "Paramètres plateforme",
};

const ParametresPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/admin");

  const [settings, branding, sender, banner, seoDefaults, socialLinks, featureFlags] =
    await Promise.all([
      getPlatformSettings(),
      getEmailBranding(),
      getEmailSender(),
      getAnnouncementBanner(),
      getSeoDefaults(),
      getSocialLinks(),
      getFeatureFlags(),
    ]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Paramètres plateforme
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configuration globale de la plateforme. Ces paramètres s&apos;appliquent à
          toutes les consultantes et tous les clients.
        </p>
      </div>

      <Tabs defaultValue="plateforme">
        <TabsList variant="line">
          <TabsTrigger value="plateforme">Plateforme</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="bandeau">Bandeau d&apos;annonce</TabsTrigger>
          <TabsTrigger value="contact">Contact &amp; réseaux</TabsTrigger>
          <TabsTrigger value="flags">Feature flags</TabsTrigger>
        </TabsList>

        <TabsContent value="plateforme" className="pt-6">
          <SettingsForm settings={settings} />
        </TabsContent>

        <TabsContent value="email" className="space-y-6 pt-6">
          <EmailSenderForm sender={sender} />
          <EmailBrandingForm branding={branding} />
        </TabsContent>

        <TabsContent value="bandeau" className="pt-6">
          <AnnouncementBannerForm banner={banner} />
        </TabsContent>

        <TabsContent value="contact" className="space-y-6 pt-6">
          <SeoDefaultsForm defaults={seoDefaults} />
          <SocialLinksForm links={socialLinks} />
        </TabsContent>

        <TabsContent value="flags" className="pt-6">
          <FeatureFlagsForm flags={featureFlags} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ParametresPage;
```

- [ ] **Step 6: Vérifier la compilation et lancer les tests existants du dossier**

Run: `npx tsc --noEmit && npx vitest run src/app/\(dashboard\)/admin/parametres`
Expected: compilation OK, aucun test cassé

- [ ] **Step 7: Vérification visuelle manuelle**

Lancer `npm run dev`, se connecter en admin, ouvrir `/admin/parametres` : vérifier que les 5 onglets s'affichent, que chaque formulaire pré-remplit les valeurs par défaut de la migration (Task 1), et qu'un enregistrement dans chaque onglet fonctionne sans erreur.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(dashboard\)/admin/parametres
git commit -m "feat(admin): page Paramètres à onglets avec les nouveaux réglages"
```

---

## Task 11: Brancher l'expéditeur email dans `resend/client.ts`

**Files:**
- Modify: `src/lib/resend/client.ts`

**Interfaces:**
- Consumes: `getEmailSender` de `@/lib/settings/email-sender/store` (Task 2).

- [ ] **Step 1: Remplacer la constante `DEFAULT_FROM` par une résolution paresseuse**

Remplacer :
```ts
const DEFAULT_FROM =
  process.env.RESEND_FROM ??
  `${process.env.RESEND_FROM_NAME ?? "Question d'Allaitement"} <${process.env.RESEND_FROM_EMAIL ?? "noreply@formation-allaitement.com"}>`;
```
par (suppression pure, plus besoin de constante de module) et ajouter l'import :
```ts
import { getEmailSender } from "@/lib/settings/email-sender/store";
```

- [ ] **Step 2: Adapter la signature et le corps de `sendTransactionalEmail`**

Remplacer :
```ts
export const sendTransactionalEmail = async ({
  to,
  subject,
  html,
  from = DEFAULT_FROM,
  attachments,
  branded = true,
}: SendEmailParams) => {
  const resend = getResend();
  const finalHtml = branded
    ? applyEmailBranding(html, await getEmailBranding())
    : html;
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html: finalHtml,
    ...(attachments?.length ? { attachments } : {}),
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(`Failed to send email: ${error.message} (from: ${from})`);
  }

  return data;
};
```
par :
```ts
export const sendTransactionalEmail = async ({
  to,
  subject,
  html,
  from,
  attachments,
  branded = true,
}: SendEmailParams) => {
  const resend = getResend();
  const finalHtml = branded
    ? applyEmailBranding(html, await getEmailBranding())
    : html;

  let finalFrom = from;
  if (!finalFrom) {
    const sender = await getEmailSender();
    finalFrom = `${sender.from_name} <${sender.from_address}>`;
  }

  const { data, error } = await resend.emails.send({
    from: finalFrom,
    to,
    subject,
    html: finalHtml,
    ...(attachments?.length ? { attachments } : {}),
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(`Failed to send email: ${error.message} (from: ${finalFrom})`);
  }

  return data;
};
```

- [ ] **Step 3: Vérifier la compilation et les tests existants**

Run: `npx tsc --noEmit && npx vitest run src/lib/resend`
Expected: compilation OK, tests existants toujours au vert (si un test mockait `DEFAULT_FROM`, adapter le mock pour mocker `getEmailSender` à la place)

- [ ] **Step 4: Commit**

```bash
git add src/lib/resend/client.ts
git commit -m "feat(admin): l'expéditeur des emails transactionnels lit platform_settings"
```

---

## Task 12: Brancher les réseaux sociaux dans le footer et la page liens

**Files:**
- Modify: `src/components/layout/footer.tsx`
- Modify: `src/app/liens/page.tsx`

**Interfaces:**
- Consumes: `getSocialLinks` de `@/lib/settings/social-links/store` (Task 6).

- [ ] **Step 1: Adapter `footer.tsx`**

Remplacer l'import :
```ts
import { publicNav, socialLinks } from "@/config/navigation";
```
par :
```ts
import { publicNav } from "@/config/navigation";
import { getSocialLinks } from "@/lib/settings/social-links/store";
```

Rendre le composant `async` (s'il ne l'est pas déjà) et construire la liste localement avant le map existant (qui utilise `social.title`, `social.href`, `social.iconKey` — ne pas y toucher) :
```ts
const links = await getSocialLinks();
const socialLinks = (
  [
    { title: "Instagram", href: links.instagram_url, iconKey: "Instagram" as const },
    { title: "TikTok", href: links.tiktok_url, iconKey: "TikTok" as const },
    { title: "LinkedIn", href: links.linkedin_url, iconKey: "Linkedin" as const },
  ] satisfies { title: string; href: string | null; iconKey: "Instagram" | "TikTok" | "Linkedin" }[]
).filter(
  (l): l is { title: string; href: string; iconKey: "Instagram" | "TikTok" | "Linkedin" } =>
    Boolean(l.href),
);
```

- [ ] **Step 2: Adapter `src/app/liens/page.tsx`** de la même façon (import + construction de `socialLinks` avant le bloc `{socialLinks.length > 0 && (...)}` existant, ligne ~70)

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur

- [ ] **Step 4: Vérification manuelle**

Lancer `npm run dev`, ouvrir la page d'accueil et `/liens` : les 3 icônes s'affichent avec les URLs par défaut de la migration. Vider un des champs dans `/admin/parametres` (onglet Contact & réseaux) et vérifier que l'icône correspondante disparaît du footer après enregistrement.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/footer.tsx src/app/liens/page.tsx
git commit -m "feat(admin): footer et page liens lisent les réseaux sociaux depuis platform_settings"
```

---

## Task 13: Brancher l'email de contact dans les pages légales et les API routes

**Files:**
- Modify: `src/app/(public)/cgv/page.tsx` (lignes 176, 179)
- Modify: `src/app/(public)/politique-de-confidentialite/page.tsx` (lignes 28, 218, 222)
- Modify: `src/app/(public)/mentions-legales/page.tsx` (ligne 43)
- Modify: `src/app/(public)/newsletter/desinscription/page.tsx` (ligne 41)
- Modify: `src/app/api/contact/route.ts` (ligne 49)
- Modify: `src/app/api/newsletter/route.ts` (ligne 70)

**Interfaces:**
- Consumes: `getContactEmail` de `@/lib/settings/seo-defaults/store` (Task 4).

- [ ] **Step 1: Pour chacune des 4 pages (`cgv`, `politique-de-confidentialite`, `mentions-legales`, `newsletter/desinscription`)**

Dans chaque composant `page.tsx` (déjà `async`, ou à rendre `async` s'il ne l'est pas) :
1. Remplacer l'import `siteConfig` par `import { getContactEmail } from "@/lib/settings/seo-defaults/store";` — sauf si `siteConfig` est utilisé pour autre chose dans le fichier (grep `siteConfig\.` dans le fichier avant de retirer l'import ; s'il reste des usages, garder les deux imports).
2. Ajouter en tête du corps de la fonction : `const contactEmail = await getContactEmail();`
3. Remplacer chaque occurrence de `siteConfig.contactEmail` par `contactEmail` (ex : `href={\`mailto:${siteConfig.contactEmail}\`}` devient `href={\`mailto:${contactEmail}\`}`).

- [ ] **Step 2: Pour les 2 API routes (`api/contact/route.ts`, `api/newsletter/route.ts`)**

Dans le handler (déjà `async`) :
1. Remplacer l'import `siteConfig` par `getContactEmail` (même règle : garder `siteConfig` si utilisé ailleurs dans le fichier).
2. Ajouter `const contactEmail = await getContactEmail();` avant la construction du message d'erreur qui utilisait `siteConfig.contactEmail`.
3. Remplacer `siteConfig.contactEmail` par `contactEmail` dans ce message.

- [ ] **Step 3: Laisser inchangés les 2 usages Client Component**

`src/app/(public)/contact/_components/contact-form.tsx:62` et `src/app/(public)/newsletter/_components/newsletter-signup-form.tsx:94` gardent `siteConfig.contactEmail` (texte de repli d'erreur affiché côté client, valeur non critique) — ne pas les modifier, ça éviterait un prop-drilling disproportionné pour un message d'erreur de secours.

- [ ] **Step 4: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur

- [ ] **Step 5: Vérification manuelle**

Lancer `npm run dev`, ouvrir `/cgv`, `/mentions-legales`, `/politique-de-confidentialite`, `/newsletter/desinscription` : l'email affiché correspond à la valeur de `/admin/parametres` (onglet Contact & réseaux). Changer la valeur dans l'admin, recharger une des pages, vérifier la mise à jour.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(public\)/cgv/page.tsx src/app/\(public\)/politique-de-confidentialite/page.tsx src/app/\(public\)/mentions-legales/page.tsx src/app/\(public\)/newsletter/desinscription/page.tsx src/app/api/contact/route.ts src/app/api/newsletter/route.ts
git commit -m "feat(admin): pages légales et API contact/newsletter lisent l'email de contact depuis platform_settings"
```

---

## Task 14: Brancher `booking_enabled` — Header public + layout

**Files:**
- Modify: `src/components/layout/header.tsx`
- Modify: `src/app/(public)/layout.tsx`

**Interfaces:**
- Consumes: `isBookingEnabled` de `@/lib/settings/feature-flags/store` (Task 8).
- Produces: `HeaderProps` gagne un champ `bookingEnabled: boolean`. `PublicLayout` devient responsable de fournir cette valeur — les futurs consommateurs de `Header` doivent la passer explicitement (plus de lecture implicite via `@/config/features`).

- [ ] **Step 1: Adapter `header.tsx`**

Remplacer la signature :
```ts
type HeaderProps = {
  user: SessionUser | null;
  onLogout: (formData: FormData) => void | Promise<void>;
  accompagnements: AccompagnementsNavPreview;
};
export const Header = ({ user, onLogout, accompagnements }: HeaderProps) => {
```
par :
```ts
type HeaderProps = {
  user: SessionUser | null;
  onLogout: (formData: FormData) => void | Promise<void>;
  accompagnements: AccompagnementsNavPreview;
  bookingEnabled: boolean;
};
export const Header = ({ user, onLogout, accompagnements, bookingEnabled }: HeaderProps) => {
```

Supprimer la ligne `import { features } from "@/config/features";`.

Remplacer les 5 usages de `features.bookingEnabled` par `bookingEnabled` :
- L.137 et L.297 : `getClientNav(features.bookingEnabled)` → `getClientNav(bookingEnabled)`
- L.219, L.234, L.369 : chaque ternaire `features.bookingEnabled ? ... : ...` → `bookingEnabled ? ... : ...`

- [ ] **Step 2: Adapter `src/app/(public)/layout.tsx`**

Ajouter l'import :
```ts
import { isBookingEnabled } from "@/lib/settings/feature-flags/store";
```

Remplacer :
```ts
const [user, maintenance, accompagnements, banner] = await Promise.all([
  getSessionUser(),
  isMaintenanceMode(),
  getAccompagnementsNavPreview(),
  getAnnouncementBanner(),
]);
```
par :
```ts
const [user, maintenance, accompagnements, banner, bookingEnabled] = await Promise.all([
  getSessionUser(),
  isMaintenanceMode(),
  getAccompagnementsNavPreview(),
  getAnnouncementBanner(),
  isBookingEnabled(),
]);
```

Remplacer :
```tsx
<Header
  user={user}
  onLogout={handleLogout}
  accompagnements={accompagnements}
/>
```
par :
```tsx
<Header
  user={user}
  onLogout={handleLogout}
  accompagnements={accompagnements}
  bookingEnabled={bookingEnabled}
/>
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur (toute utilisation de `<Header>` sans la prop `bookingEnabled` serait signalée ici — vérifier qu'il n'y en a pas d'autre dans le repo avec `grep -rn "<Header" src`)

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/header.tsx src/app/\(public\)/layout.tsx
git commit -m "feat(admin): le header public reçoit booking_enabled depuis platform_settings"
```

---

## Task 15: Brancher `booking_enabled` — espace client (tabs + parcours accompagnement)

**Files:**
- Modify: `src/components/espace-client/client-space-tabs.tsx`
- Modify: `src/app/(public)/espace-client/layout.tsx` (remplacement intégral)
- Modify: `src/app/(public)/espace-client/accompagnements/[id]/_components/completion-celebration.tsx`
- Modify: `src/app/(public)/espace-client/accompagnements/[id]/_components/accompagnement-reader.tsx`
- Modify: `src/app/(public)/espace-client/accompagnements/[id]/page.tsx`

**Interfaces:**
- Consumes: `isBookingEnabled` de `@/lib/settings/feature-flags/store` (Task 8).
- Produces: `ClientSpaceTabs` et `CompletionCelebration` gagnent une prop `bookingEnabled: boolean`, plus de lecture implicite de `@/config/features`.

- [ ] **Step 1: Adapter `client-space-tabs.tsx`**

Remplacer :
```ts
import { features } from "@/config/features";
```
(retirer cet import)

Remplacer :
```ts
const nav = getClientNav(features.bookingEnabled);

export const ClientSpaceTabs = () => {
```
par :
```ts
type ClientSpaceTabsProps = {
  bookingEnabled: boolean;
};

export const ClientSpaceTabs = ({ bookingEnabled }: ClientSpaceTabsProps) => {
  const nav = getClientNav(bookingEnabled);
```

(Le calcul de `nav` passe du niveau module au corps du composant : il dépend désormais de la prop, il ne peut plus être figé au chargement du module.)

- [ ] **Step 2: Remplacer `src/app/(public)/espace-client/layout.tsx` par la version intégrale**

```tsx
// src/app/(public)/espace-client/layout.tsx
import { ClientSpaceTabs } from "@/components/espace-client/client-space-tabs";
import { isBookingEnabled } from "@/lib/settings/feature-flags/store";

const EspaceClientLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const bookingEnabled = await isBookingEnabled();

  return (
    <div className="flex flex-col">
      <ClientSpaceTabs bookingEnabled={bookingEnabled} />
      <div className="flex-1">{children}</div>
    </div>
  );
};

export default EspaceClientLayout;
```

- [ ] **Step 3: Adapter `completion-celebration.tsx`**

Remplacer :
```ts
type CompletionCelebrationProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accompagnementTitle: string;
};
export const CompletionCelebration = ({ open, onOpenChange, accompagnementTitle }: CompletionCelebrationProps) => {
```
par :
```ts
type CompletionCelebrationProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accompagnementTitle: string;
  bookingEnabled: boolean;
};
export const CompletionCelebration = ({
  open,
  onOpenChange,
  accompagnementTitle,
  bookingEnabled,
}: CompletionCelebrationProps) => {
```

Retirer l'import `features` s'il n'est plus utilisé ailleurs dans ce fichier, et remplacer :
```tsx
{features.bookingEnabled && (
  <Button asChild className="flex-1 rounded-2xl bg-primary-red hover:bg-primary-red-dark">
    <Link href="/reserver" tabIndex={0}>Prendre un rendez-vous</Link>
  </Button>
)}
```
par :
```tsx
{bookingEnabled && (
  <Button asChild className="flex-1 rounded-2xl bg-primary-red hover:bg-primary-red-dark">
    <Link href="/reserver" tabIndex={0}>Prendre un rendez-vous</Link>
  </Button>
)}
```

- [ ] **Step 4: Adapter `accompagnement-reader.tsx`**

Ajouter `bookingEnabled: boolean` au type `AccompagnementReaderProps` et le destructurer dans la signature du composant.

Remplacer :
```tsx
<CompletionCelebration
  open={celebrationOpen}
  onOpenChange={setCelebrationOpen}
  accompagnementTitle={accompagnement.title}
/>
```
par :
```tsx
<CompletionCelebration
  open={celebrationOpen}
  onOpenChange={setCelebrationOpen}
  accompagnementTitle={accompagnement.title}
  bookingEnabled={bookingEnabled}
/>
```

- [ ] **Step 5: Adapter `src/app/(public)/espace-client/accompagnements/[id]/page.tsx`**

Ajouter l'import `import { isBookingEnabled } from "@/lib/settings/feature-flags/store";`.

Dans `AccompagnementReaderPage`, ajouter `const bookingEnabled = await isBookingEnabled();` avant le `return`, puis ajouter `bookingEnabled={bookingEnabled}` aux props passées à `<AccompagnementReader ... />` dans le JSX retourné.

- [ ] **Step 6: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur — toute prop manquante sur `<ClientSpaceTabs>` ou `<CompletionCelebration>` ailleurs dans le repo serait signalée ici (`grep -rn "<ClientSpaceTabs\|<CompletionCelebration" src`)

- [ ] **Step 7: Vérification manuelle**

Dans `/admin/parametres` (onglet Feature flags), désactiver la réservation. Vérifier : le menu « Mes réservations » disparaît de l'espace client, le CTA de célébration de fin d'accompagnement disparaît. Réactiver, vérifier le retour à la normale.

- [ ] **Step 8: Commit**

```bash
git add src/components/espace-client/client-space-tabs.tsx src/app/\(public\)/espace-client/layout.tsx src/app/\(public\)/espace-client/accompagnements/\[id\]/_components/completion-celebration.tsx src/app/\(public\)/espace-client/accompagnements/\[id\]/_components/accompagnement-reader.tsx src/app/\(public\)/espace-client/accompagnements/\[id\]/page.tsx
git commit -m "feat(admin): espace client lit booking_enabled depuis platform_settings"
```

---

## Task 16: Brancher `booking_enabled` — pages publiques restantes

**Files:**
- Modify: `src/app/sitemap.ts` (ligne 76)
- Modify: `src/app/(public)/page.tsx` (lignes 149, 236, 852, 862)
- Modify: `src/app/(public)/consultantes/[slug]/page.tsx` (ligne 308)
- Modify: `src/app/(public)/espace-client/reservations/page.tsx` (ligne 36)
- Modify: `src/app/(public)/espace-client/page.tsx` (ligne 442)
- Modify: `src/app/(public)/reserver/page.tsx` (ligne 18)
- Modify: `src/app/(public)/a-propos/page.tsx` (lignes 102, 467 + conversion en `async`)

**Interfaces:**
- Consumes: `isBookingEnabled` de `@/lib/settings/feature-flags/store` (Task 8).

- [ ] **Step 1: Pour les 6 fichiers déjà `async`** (`sitemap.ts`, `page.tsx` d'accueil, `consultantes/[slug]/page.tsx`, `espace-client/reservations/page.tsx`, `espace-client/page.tsx`, `reserver/page.tsx`)

Dans chacun :
1. Remplacer `import { features } from "@/config/features";` par `import { isBookingEnabled } from "@/lib/settings/feature-flags/store";` (garder `features` si le fichier l'utilise pour autre chose — vérifier par grep avant de retirer l'import).
2. Ajouter `const bookingEnabled = await isBookingEnabled();` en tête du corps de la fonction async englobante.
3. Remplacer chaque occurrence de `features.bookingEnabled` par `bookingEnabled` dans le fichier.

- [ ] **Step 2: Adapter `src/app/(public)/a-propos/page.tsx`**

Convertir la fonction du composant, actuellement synchrone :
```ts
const AProposPage = () => {
```
en composant asynchrone :
```ts
const AProposPage = async () => {
```

Ajouter l'import `isBookingEnabled` (retirer `features` si plus utilisé), ajouter `const bookingEnabled = await isBookingEnabled();` en tête du corps, puis remplacer les 2 occurrences de `features.bookingEnabled` (lignes 102 et 467) par `bookingEnabled`.

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur

- [ ] **Step 4: Vérifier qu'aucun usage de `features.bookingEnabled` ne subsiste**

Run: `grep -rn "features.bookingEnabled" src`
Expected: aucun résultat (tous les usages ont été remplacés dans les Tasks 14-16). `src/config/features.ts` et son test `features.spec.ts` peuvent rester tels quels : `DEFAULT_FEATURE_FLAGS` (Task 8) s'en sert encore comme valeur de repli initiale.

- [ ] **Step 5: Vérification manuelle**

Désactiver la réservation dans `/admin/parametres`. Vérifier sur `/`, `/a-propos`, `/consultantes/[une-slug]`, `/reserver` (doit rediriger), `/espace-client/reservations` (doit rediriger), `/espace-client`, et `/sitemap.xml` que les CTA et URLs liés à la réservation ont disparu. Réactiver et vérifier le retour à la normale.

- [ ] **Step 6: Commit**

```bash
git add src/app/sitemap.ts src/app/\(public\)/page.tsx src/app/\(public\)/consultantes/\[slug\]/page.tsx src/app/\(public\)/espace-client/reservations/page.tsx src/app/\(public\)/espace-client/page.tsx src/app/\(public\)/reserver/page.tsx src/app/\(public\)/a-propos/page.tsx
git commit -m "feat(admin): dernières pages publiques lisent booking_enabled depuis platform_settings"
```

---

## Task 17: Vérification finale

**Files:** aucun (validation transverse)

- [ ] **Step 1: Suite de tests complète**

Run: `npx vitest run`
Expected: tous les tests passent, y compris les nouveaux (Tasks 2, 4, 6, 8) et `src/config/features.spec.ts` (inchangé, toujours au vert car `features.ts` n'a pas été modifié)

- [ ] **Step 2: Compilation et lint complets**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur

- [ ] **Step 3: Build de production**

Run: `npm run build`
Expected: build réussi (vérifie notamment que `espace-client/layout.tsx`, `a-propos/page.tsx` etc. compilent bien en tant que composants async côté serveur)

- [ ] **Step 4: Parcours manuel de bout en bout**

Dans `/admin/parametres` : modifier chacun des 5 onglets, recharger la page, vérifier la persistance. Vérifier les effets de bord déjà listés dans les Tasks 12, 13, 14-16 (footer, pages légales, header, espace client).
