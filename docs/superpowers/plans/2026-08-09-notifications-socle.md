# Notifications unifiées, socle et événements transactionnels — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les deux chemins parallèles (emails d'un côté, `createNotification` de l'autre) par un `notify()` unique piloté par un catalogue d'événements, et brancher dessus les quinze événements transactionnels.

**Architecture:** Un catalogue TypeScript décrit chaque événement (catégorie, canaux, titre, lien, actions, adaptateur email). `notify()` résout les canaux, insère la ligne in-app de façon idempotente et appelle l'email, sans jamais lever. L'interface expose un panneau dans la cloche et une page d'historique par espace.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (Postgres + RLS), Resend via `src/lib/resend/client`, Vitest, Tailwind, shadcn/ui.

## Global Constraints

- Périmètre de ce plan : étapes 1 et 2 de la spec (`docs/superpowers/specs/2026-08-09-notifications-design.md`). Les préférences utilisateur, `resolveAudience`, les événements marketing et le pilotage font l'objet de plans séparés.
- `notify()` est **strictement serveur** : server actions, route handlers, webhooks, cron. Jamais appelé depuis un composant client.
- `notify()` **ne lève jamais**. Chaque canal est isolé dans son `try/catch`, les échecs partent dans `console.error`.
- Textes visibles par les visiteurs : **aucun tiret cadratin** (`—`). Utiliser des virgules ou des parenthèses.
- Migrations SQL : fichier numéroté à la suite dans `supabase/migrations/`, commentaire d'en-tête expliquant le pourquoi, comme `00082_bio_links.sql`.
- Vitest tourne en `environment: "node"` (`vitest.config.ts`). **Aucun test de composant React** : les tâches d'interface se vérifient par `pnpm build`, `pnpm lint` et une vérification manuelle décrite dans la tâche.
- Commandes : `pnpm test` (Vitest), `pnpm lint` (ESLint), `pnpm build`, `pnpm db:push:dry` (vérification de migration), `pnpm db:push` (application).
- Deux boutons d'action maximum par notification, aucune action destructive dans le panneau.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/00084_notifications_socle.sql` | Colonnes `category`, `href`, `actions`, `dedupe_key`, suppression du `CHECK`, remap des trois valeurs historiques |
| `src/lib/notifications/types.ts` | `NotificationCategory`, `NotificationChannel`, `NotificationDataMap`, `NotificationEvent`, `NotificationDefinition`, `NotificationAction` |
| `src/lib/notifications/catalog.ts` | Une entrée par événement, source de vérité unique |
| `src/lib/notifications/preferences.ts` | `resolveChannels()`, règle catégorie par canal. Point d'accroche des préférences de la tranche 2 |
| `src/lib/notifications/notify.ts` | `notify()`, insertion in-app idempotente et appel email |
| `src/lib/notifications/index.ts` | Réexports publics du module |
| `src/app/api/notifications/route.ts` | GET paginé, POST administration (existant, modifié) |
| `src/app/api/notifications/[id]/read/route.ts` | PATCH lecture d'une notification |
| `src/components/notifications/notification-list.tsx` | Liste partagée entre le panneau et les pages d'historique |
| `src/components/notifications/notification-bell.tsx` | Cloche, compteur, panneau, refetch 60 s |
| `src/app/(public)/espace-client/notifications/page.tsx` | Historique côté cliente |
| `src/app/(dashboard)/espace-consultante/notifications/page.tsx` | Historique côté consultante et administration |

`src/lib/notifications.ts` (l'actuel `createNotification`) est **supprimé** en tâche 9, une fois ses trois appelants migrés.

---

### Task 1: Migration du schéma

**Files:**
- Create: `supabase/migrations/00084_notifications_socle.sql`
- Modify: `src/types/database.ts:613-624`

**Interfaces:**
- Consumes: rien
- Produces: colonnes `category`, `href`, `actions`, `dedupe_key` sur `notifications` ; type TS `Notification` mis à jour avec `category: NotificationCategory`, `href: string | null`, `actions: NotificationAction[] | null`, `dedupe_key: string | null`

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/00084_notifications_socle.sql` :

```sql
-- Socle du systeme de notifications unifie.
--
-- Jusqu'ici la table portait un CHECK a trois valeurs et les emails vivaient
-- dans un chemin separe. Le catalogue TypeScript devient la source de verite
-- des types d'evenement : garder une liste en base imposerait une migration a
-- chaque nouvel evenement, et PostgREST rejetterait a l'execution ce que ni
-- tsc ni les tests ne voient.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Categorie, pour appliquer les preferences sans relire le catalogue en SQL.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'transactional'
    CHECK (category IN ('transactional', 'marketing', 'system'));

-- Cible du lien profond, et boutons d'action de l'item.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS href TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actions JSONB;

-- Idempotence : les deux sources d'evenements sont un cron et des webhooks
-- Stripe, tous deux rejouables. Index partiel : une notification sans cle de
-- deduplication reste toujours insérable.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_key
  ON notifications(dedupe_key) WHERE dedupe_key IS NOT NULL;

-- Remap des trois valeurs historiques vers leur cle d'evenement du catalogue.
UPDATE notifications SET type = 'admin_message' WHERE type = 'admin';
UPDATE notifications SET type = 'consultant_message' WHERE type = 'consultant_message';
-- 'booking_confirmed' garde son nom, il est deja une cle du catalogue.
```

- [ ] **Step 2: Vérifier la migration à blanc**

Run: `pnpm db:push:dry`
Expected: la migration `00084` apparaît dans le plan, sans erreur de syntaxe.

- [ ] **Step 3: Mettre à jour les types TypeScript**

Dans `src/types/database.ts`, remplacer le bloc `NotificationType` / `Notification` (lignes 613 à 624) par :

```ts
/**
 * Le type d'une notification est une clé du catalogue
 * (`src/lib/notifications/catalog.ts`), pas une liste figée en base : ajouter
 * un événement ne doit pas demander de migration.
 */
export type NotificationCategory = "transactional" | "marketing" | "system";

export type NotificationAction = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string | null;
  href: string | null;
  actions: NotificationAction[] | null;
  metadata: Record<string, unknown> | null;
  dedupe_key: string | null;
  read_at: string | null;
  created_at: string;
};
```

- [ ] **Step 4: Vérifier que rien ne casse à la compilation**

Run: `pnpm lint && npx tsc --noEmit`
Expected: les seules erreurs portent sur `src/lib/notifications.ts` et son spec, qui utilisent encore `NotificationType`. Corriger en typant le paramètre `type` de `createNotification` en `string` (ce fichier disparaît en tâche 9).

- [ ] **Step 5: Appliquer la migration**

Run: `pnpm db:push`
Expected: migration appliquée.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/00084_notifications_socle.sql src/types/database.ts src/lib/notifications.ts
git commit -m "feat(notifications): schema du socle, categorie, lien et deduplication"
```

---

### Task 2: Types et catalogue d'événements

**Files:**
- Create: `src/lib/notifications/types.ts`
- Create: `src/lib/notifications/catalog.ts`
- Test: `src/lib/notifications/catalog.spec.ts`

**Interfaces:**
- Consumes: `NotificationCategory`, `NotificationAction` de `@/types/database`
- Produces: `NotificationEvent` (union des clés), `NotificationDataMap` (données par événement), `NOTIFICATION_CATALOG` (objet indexé par clé), `NotificationDefinition<K>`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/notifications/catalog.spec.ts` :

```ts
import { describe, it, expect } from "vitest";
import { NOTIFICATION_CATALOG } from "./catalog";

describe("NOTIFICATION_CATALOG", () => {
  it("indexe chaque définition sous sa propre clé", () => {
    for (const [key, def] of Object.entries(NOTIFICATION_CATALOG)) {
      expect(def.key).toBe(key);
    }
  });

  it("n'utilise que des catégories connues", () => {
    const allowed = ["transactional", "marketing", "system"];
    for (const def of Object.values(NOTIFICATION_CATALOG)) {
      expect(allowed).toContain(def.category);
    }
  });

  it("déclare au moins un canal par événement", () => {
    for (const def of Object.values(NOTIFICATION_CATALOG)) {
      expect(def.channels.length).toBeGreaterThan(0);
    }
  });

  it("limite les actions à deux boutons", () => {
    for (const def of Object.values(NOTIFICATION_CATALOG)) {
      if (!def.actions) continue;
      const actions = def.actions({
        booking_id: "b1",
        invoice_id: "i1",
        accompagnement_slug: "s1",
        formation_id: "f1",
        consultation_title: "Consultation",
        date: "14 août",
        time: "10h30",
        amount: "60,00 €",
      } as never);
      expect(actions.length).toBeLessThanOrEqual(2);
    }
  });

  it("construit un titre non vide pour booking_confirmed", () => {
    const def = NOTIFICATION_CATALOG.booking_confirmed;
    const title = def.title({ booking_id: "b1", consultation_title: "Bilan" });
    expect(title).toContain("confirmée");
  });

  it("pointe booking_confirmed vers la réservation concernée", () => {
    const def = NOTIFICATION_CATALOG.booking_confirmed;
    expect(def.href?.({ booking_id: "b1", consultation_title: "Bilan" })).toBe(
      "/espace-client/reservations/b1"
    );
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/lib/notifications/catalog.spec.ts`
Expected: FAIL, `Cannot find module './catalog'`.

- [ ] **Step 3: Écrire les types**

Créer `src/lib/notifications/types.ts` :

```ts
import type { NotificationAction, NotificationCategory } from "@/types/database";

export type NotificationChannel = "in_app" | "email";

/**
 * Données attendues par chaque événement. Le typage part d'ici : ajouter une
 * entrée ici force à compléter le catalogue, et `notify()` refuse une clé
 * inconnue à la compilation.
 */
export type NotificationDataMap = {
  booking_confirmed: { booking_id: string; consultation_title?: string };
  booking_reminder: { booking_id: string; time: string };
  booking_cancelled: { booking_id: string; date: string };
  booking_rescheduled: { booking_id: string; date: string; time: string };
  payment_received: { amount: string; label: string };
  invoice_available: { invoice_id: string; number: string; amount: string };
  accompagnement_access: { accompagnement_slug: string; title: string };
  formation_registered: { formation_id: string; title: string; date: string };
  formation_reminder: { formation_id: string; title: string; time: string };
  consultant_new_booking: { booking_id: string; client_name: string; date: string };
  consultant_booking_cancelled: { booking_id: string; client_name: string; date: string };
  admin_purchase: { label: string; amount: string; client_name: string };
  admin_refund: { label: string; amount: string; client_name: string };
  admin_payment_failed: { label: string; client_name: string; reason: string };
  admin_new_review: { author: string; rating: number };
  admin_job_failed: { job: string; reason: string };
  admin_message: { source?: string };
  consultant_message: { source?: string };
};

export type NotificationEvent = keyof NotificationDataMap;

export type NotificationRecipient = { userId: string; email?: string | null };

export type NotificationDefinition<K extends NotificationEvent> = {
  key: K;
  category: NotificationCategory;
  channels: NotificationChannel[];
  title: (data: NotificationDataMap[K]) => string;
  body?: (data: NotificationDataMap[K]) => string;
  href?: (data: NotificationDataMap[K]) => string;
  actions?: (data: NotificationDataMap[K]) => NotificationAction[];
  /**
   * Adaptateur email. Reçoit l'adresse du destinataire, car les fonctions de
   * `src/lib/emails/send.ts` ont chacune leur propre signature de variables.
   * Absent quand l'événement n'existe qu'en in-app.
   */
  email?: (to: string, data: NotificationDataMap[K]) => Promise<void>;
};

export type NotificationCatalog = {
  [K in NotificationEvent]: NotificationDefinition<K>;
};

export type { NotificationAction, NotificationCategory };
```

- [ ] **Step 4: Écrire le catalogue sans adaptateur email**

Créer `src/lib/notifications/catalog.ts`. Les adaptateurs `email` sont ajoutés tâche par tâche en fin de plan, au moment où l'envoi direct est retiré de son point d'appel. Ici, uniquement le in-app.

```ts
import type { NotificationCatalog } from "./types";

/**
 * Source de vérité des événements de notification. Une entrée par événement.
 *
 * `title`, `body`, `href` et `actions` sont évalués **à l'insertion** puis
 * figés en base : une notification ancienne doit garder son libellé même si la
 * définition change ensuite.
 */
export const NOTIFICATION_CATALOG: NotificationCatalog = {
  booking_confirmed: {
    key: "booking_confirmed",
    category: "transactional",
    channels: ["in_app", "email"],
    title: () => "Consultation confirmée",
    body: (d) =>
      d.consultation_title
        ? `Votre consultation "${d.consultation_title}" a été confirmée.`
        : "Votre consultation a été confirmée.",
    href: (d) => `/espace-client/reservations/${d.booking_id}`,
  },
  booking_reminder: {
    key: "booking_reminder",
    category: "transactional",
    channels: ["in_app", "email"],
    title: (d) => `Rappel : consultation demain à ${d.time}`,
    href: (d) => `/espace-client/reservations/${d.booking_id}`,
    actions: (d) => [
      { label: "Voir le rendez-vous", href: `/espace-client/reservations/${d.booking_id}`, variant: "primary" },
    ],
  },
  booking_cancelled: {
    key: "booking_cancelled",
    category: "transactional",
    channels: ["in_app", "email"],
    title: () => "Consultation annulée",
    body: (d) => `Votre consultation du ${d.date} a été annulée.`,
    href: () => "/espace-client/reservations",
  },
  booking_rescheduled: {
    key: "booking_rescheduled",
    category: "transactional",
    channels: ["in_app", "email"],
    title: () => "Consultation reprogrammée",
    body: (d) => `Nouvelle date : ${d.date} à ${d.time}.`,
    href: (d) => `/espace-client/reservations/${d.booking_id}`,
  },
  payment_received: {
    key: "payment_received",
    category: "transactional",
    channels: ["in_app"],
    title: () => "Paiement reçu",
    body: (d) => `${d.label}, ${d.amount}.`,
    href: () => "/espace-client/factures",
  },
  invoice_available: {
    key: "invoice_available",
    category: "transactional",
    channels: ["in_app", "email"],
    title: () => "Votre facture est disponible",
    body: (d) => `Facture ${d.number}, ${d.amount}.`,
    href: () => "/espace-client/factures",
    actions: (d) => [
      { label: "Télécharger", href: `/api/invoices/${d.invoice_id}/pdf`, variant: "primary" },
    ],
  },
  accompagnement_access: {
    key: "accompagnement_access",
    category: "transactional",
    channels: ["in_app", "email"],
    title: () => "Votre accompagnement est ouvert",
    body: (d) => d.title,
    href: (d) => `/espace-client/accompagnements/${d.accompagnement_slug}`,
    actions: (d) => [
      { label: "Commencer", href: `/espace-client/accompagnements/${d.accompagnement_slug}`, variant: "primary" },
    ],
  },
  formation_registered: {
    key: "formation_registered",
    category: "transactional",
    channels: ["in_app", "email"],
    title: () => "Inscription confirmée",
    body: (d) => `${d.title}, le ${d.date}.`,
    href: (d) => `/espace-client/formations/${d.formation_id}`,
  },
  formation_reminder: {
    key: "formation_reminder",
    category: "transactional",
    channels: ["in_app", "email"],
    title: (d) => `Rappel : ${d.title} demain à ${d.time}`,
    href: (d) => `/espace-client/formations/${d.formation_id}`,
    actions: (d) => [
      { label: "Voir la session", href: `/espace-client/formations/${d.formation_id}`, variant: "primary" },
    ],
  },
  consultant_new_booking: {
    key: "consultant_new_booking",
    category: "transactional",
    channels: ["in_app", "email"],
    title: () => "Nouvelle réservation",
    body: (d) => `${d.client_name}, le ${d.date}.`,
    href: (d) => `/espace-consultante/reservations?booking=${d.booking_id}`,
  },
  consultant_booking_cancelled: {
    key: "consultant_booking_cancelled",
    category: "transactional",
    channels: ["in_app", "email"],
    title: () => "Réservation annulée",
    body: (d) => `${d.client_name}, le ${d.date}.`,
    href: () => "/espace-consultante/reservations",
  },
  admin_purchase: {
    key: "admin_purchase",
    category: "system",
    channels: ["in_app"],
    title: () => "Nouvel achat",
    body: (d) => `${d.label}, ${d.amount}, par ${d.client_name}.`,
    href: () => "/admin/paiements",
  },
  admin_refund: {
    key: "admin_refund",
    category: "system",
    channels: ["in_app"],
    title: () => "Remboursement effectué",
    body: (d) => `${d.label}, ${d.amount}, pour ${d.client_name}.`,
    href: () => "/admin/paiements",
  },
  admin_payment_failed: {
    key: "admin_payment_failed",
    category: "system",
    channels: ["in_app", "email"],
    title: () => "Échec de paiement",
    body: (d) => `${d.label}, ${d.client_name}. Motif : ${d.reason}.`,
    href: () => "/admin/paiements",
  },
  admin_new_review: {
    key: "admin_new_review",
    category: "system",
    channels: ["in_app"],
    title: () => "Nouvel avis client",
    body: (d) => `${d.author}, ${d.rating} sur 5.`,
    href: () => "/admin/avis",
  },
  admin_job_failed: {
    key: "admin_job_failed",
    category: "system",
    channels: ["in_app", "email"],
    title: (d) => `Échec : ${d.job}`,
    body: (d) => d.reason,
    href: () => "/admin",
  },
  admin_message: {
    key: "admin_message",
    category: "system",
    channels: ["in_app"],
    title: () => "Message de l'équipe",
  },
  consultant_message: {
    key: "consultant_message",
    category: "transactional",
    channels: ["in_app"],
    title: () => "Message de votre consultante",
  },
};
```

- [ ] **Step 5: Lancer le test**

Run: `pnpm test src/lib/notifications/catalog.spec.ts`
Expected: PASS, six tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/notifications/types.ts src/lib/notifications/catalog.ts src/lib/notifications/catalog.spec.ts
git commit -m "feat(notifications): catalogue d'evenements type"
```

---

### Task 3: Résolution des canaux

**Files:**
- Create: `src/lib/notifications/preferences.ts`
- Test: `src/lib/notifications/preferences.spec.ts`

**Interfaces:**
- Consumes: `NotificationCategory`, `NotificationChannel` de `./types`
- Produces: `resolveChannels(category, declared, overrides?): NotificationChannel[]`, `CATEGORY_DEFAULTS`

Ce module est la couture des préférences de la tranche 2. Ici, `overrides` est toujours vide : le plan suivant remplacera son alimentation par une lecture de `notification_preferences`, sans toucher à `notify()`.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/notifications/preferences.spec.ts` :

```ts
import { describe, it, expect } from "vitest";
import { resolveChannels } from "./preferences";

describe("resolveChannels", () => {
  it("laisse passer tous les canaux déclarés pour le transactionnel", () => {
    expect(resolveChannels("transactional", ["in_app", "email"])).toEqual([
      "in_app",
      "email",
    ]);
  });

  it("ignore les préférences sur le transactionnel", () => {
    expect(
      resolveChannels("transactional", ["in_app", "email"], { email: false })
    ).toEqual(["in_app", "email"]);
  });

  it("ignore les préférences sur le système", () => {
    expect(
      resolveChannels("system", ["in_app", "email"], { in_app: false })
    ).toEqual(["in_app", "email"]);
  });

  it("applique les préférences sur le marketing", () => {
    expect(
      resolveChannels("marketing", ["in_app", "email"], { email: false })
    ).toEqual(["in_app"]);
  });

  it("laisse passer le marketing sans préférence enregistrée", () => {
    expect(resolveChannels("marketing", ["in_app", "email"])).toEqual([
      "in_app",
      "email",
    ]);
  });

  it("ne renvoie jamais un canal non déclaré par l'événement", () => {
    expect(resolveChannels("marketing", ["in_app"], { email: true })).toEqual([
      "in_app",
    ]);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/lib/notifications/preferences.spec.ts`
Expected: FAIL, `Cannot find module './preferences'`.

- [ ] **Step 3: Écrire l'implémentation**

Créer `src/lib/notifications/preferences.ts` :

```ts
import type { NotificationCategory, NotificationChannel } from "./types";

export type ChannelOverrides = Partial<Record<NotificationChannel, boolean>>;

/**
 * Valeur de départ d'une catégorie, canal par canal. La table des préférences
 * (tranche 2) ne stockera que les écarts à ces valeurs, ce qui évite tout
 * backfill sur les profils existants et permet au digest de démarrer désactivé
 * pendant que le reste du marketing démarre activé.
 */
export const CATEGORY_DEFAULTS: Record<
  NotificationCategory,
  Record<NotificationChannel, boolean>
> = {
  transactional: { in_app: true, email: true },
  system: { in_app: true, email: true },
  marketing: { in_app: true, email: true },
};

/**
 * Les catégories imposées ne consultent jamais les préférences : le
 * transactionnel n'a pas besoin de consentement, et couper une alerte système
 * reviendrait à se priver du signal d'une panne.
 */
const FORCED: NotificationCategory[] = ["transactional", "system"];

export const resolveChannels = (
  category: NotificationCategory,
  declared: NotificationChannel[],
  overrides: ChannelOverrides = {}
): NotificationChannel[] => {
  if (FORCED.includes(category)) return declared;
  return declared.filter((channel) => {
    const override = overrides[channel];
    return override ?? CATEGORY_DEFAULTS[category][channel];
  });
};
```

- [ ] **Step 4: Lancer le test**

Run: `pnpm test src/lib/notifications/preferences.spec.ts`
Expected: PASS, six tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications/preferences.ts src/lib/notifications/preferences.spec.ts
git commit -m "feat(notifications): resolution des canaux par categorie"
```

---

### Task 4: `notify()`

**Files:**
- Create: `src/lib/notifications/notify.ts`
- Create: `src/lib/notifications/index.ts`
- Test: `src/lib/notifications/notify.spec.ts`

**Interfaces:**
- Consumes: `NOTIFICATION_CATALOG`, `resolveChannels`, `createAdminClient` de `@/lib/supabase/admin`
- Produces: `notify<K extends NotificationEvent>(event: K, recipients: NotificationRecipient[], data: NotificationDataMap[K], options?: { dedupeId?: string }): Promise<void>`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/notifications/notify.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpsert = vi.fn();
const mockFrom = vi.fn(() => ({ upsert: mockUpsert }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

const sendInvoiceEmail = vi.fn();

vi.mock("./catalog", () => ({
  NOTIFICATION_CATALOG: {
    invoice_available: {
      key: "invoice_available",
      category: "transactional",
      channels: ["in_app", "email"],
      title: () => "Votre facture est disponible",
      body: (d: { number: string; amount: string }) =>
        `Facture ${d.number}, ${d.amount}.`,
      href: () => "/espace-client/factures",
      actions: (d: { invoice_id: string }) => [
        { label: "Télécharger", href: `/api/invoices/${d.invoice_id}/pdf` },
      ],
      email: (to: string, d: unknown) => sendInvoiceEmail(to, d),
    },
    admin_message: {
      key: "admin_message",
      category: "system",
      channels: ["in_app"],
      title: () => "Message de l'équipe",
    },
  },
}));

import { notify } from "./notify";

const invoiceData = { invoice_id: "inv-1", number: "2026-0142", amount: "60,00 €" };

describe("notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    sendInvoiceEmail.mockResolvedValue(undefined);
  });

  it("insère la notification in-app avec titre, lien et actions figés", async () => {
    await notify("invoice_available", [{ userId: "u1", email: "a@b.fr" }], invoiceData);

    expect(mockFrom).toHaveBeenCalledWith("notifications");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        type: "invoice_available",
        category: "transactional",
        title: "Votre facture est disponible",
        body: "Facture 2026-0142, 60,00 €.",
        href: "/espace-client/factures",
        actions: [{ label: "Télécharger", href: "/api/invoices/inv-1/pdf" }],
        dedupe_key: null,
      }),
      expect.anything()
    );
  });

  it("appelle l'adaptateur email avec l'adresse du destinataire", async () => {
    await notify("invoice_available", [{ userId: "u1", email: "a@b.fr" }], invoiceData);
    expect(sendInvoiceEmail).toHaveBeenCalledWith("a@b.fr", invoiceData);
  });

  it("n'envoie pas d'email quand le destinataire n'a pas d'adresse", async () => {
    await notify("invoice_available", [{ userId: "u1" }], invoiceData);
    expect(sendInvoiceEmail).not.toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it("construit une clé de déduplication quand dedupeId est fourni", async () => {
    await notify("invoice_available", [{ userId: "u1" }], invoiceData, {
      dedupeId: "inv-1",
    });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ dedupe_key: "invoice_available:u1:inv-1" }),
      { onConflict: "dedupe_key", ignoreDuplicates: true }
    );
  });

  it("garde la notification in-app quand l'email échoue", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    sendInvoiceEmail.mockRejectedValue(new Error("Resend down"));

    await expect(
      notify("invoice_available", [{ userId: "u1", email: "a@b.fr" }], invoiceData)
    ).resolves.toBeUndefined();

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("ne lève pas quand l'insertion échoue", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockUpsert.mockResolvedValue({ error: { message: "DB down" } });

    await expect(
      notify("admin_message", [{ userId: "u1" }], {})
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("traite chaque destinataire, un échec n'empêche pas les suivants", async () => {
    mockUpsert
      .mockResolvedValueOnce({ error: { message: "DB down" } })
      .mockResolvedValueOnce({ error: null });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await notify("admin_message", [{ userId: "u1" }, { userId: "u2" }], {});

    expect(mockUpsert).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/lib/notifications/notify.spec.ts`
Expected: FAIL, `Cannot find module './notify'`.

- [ ] **Step 3: Écrire l'implémentation**

Créer `src/lib/notifications/notify.ts` :

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import { NOTIFICATION_CATALOG } from "./catalog";
import { resolveChannels } from "./preferences";
import type {
  NotificationDataMap,
  NotificationEvent,
  NotificationRecipient,
} from "./types";

type NotifyOptions = {
  /**
   * Identifiant métier de ce qui est notifié (facture, réservation). Présent,
   * il rend l'insertion idempotente : un webhook rejoué ou un cron relancé ne
   * crée pas de doublon.
   */
  dedupeId?: string;
};

/**
 * Point d'entrée unique des notifications. Strictement serveur : l'insertion
 * chez autrui passe par le client admin Supabase.
 *
 * Ne lève jamais. Chaque canal et chaque destinataire sont isolés : un échec
 * d'email ne doit pas faire échouer le webhook Stripe qui l'a déclenché.
 */
export const notify = async <K extends NotificationEvent>(
  event: K,
  recipients: NotificationRecipient[],
  data: NotificationDataMap[K],
  options: NotifyOptions = {}
): Promise<void> => {
  const def = NOTIFICATION_CATALOG[event];
  const channels = resolveChannels(def.category, def.channels);
  const supabase = createAdminClient();

  for (const recipient of recipients) {
    if (channels.includes("in_app")) {
      try {
        const dedupeKey = options.dedupeId
          ? `${event}:${recipient.userId}:${options.dedupeId}`
          : null;

        const { error } = await supabase.from("notifications").upsert(
          {
            user_id: recipient.userId,
            type: event,
            category: def.category,
            title: def.title(data),
            body: def.body?.(data) ?? null,
            href: def.href?.(data) ?? null,
            actions: def.actions?.(data) ?? null,
            metadata: data as Record<string, unknown>,
            dedupe_key: dedupeKey,
          },
          { onConflict: "dedupe_key", ignoreDuplicates: true }
        );

        if (error) {
          console.error(
            `notify: insertion in-app échouée pour ${recipient.userId} (${event}):`,
            error
          );
        }
      } catch (error) {
        console.error(`notify: insertion in-app levée (${event}):`, error);
      }
    }

    if (channels.includes("email") && def.email && recipient.email) {
      try {
        await def.email(recipient.email, data);
      } catch (error) {
        console.error(
          `notify: email échoué pour ${recipient.email} (${event}):`,
          error
        );
      }
    }
  }
};
```

Créer `src/lib/notifications/index.ts` :

```ts
export { notify } from "./notify";
export { NOTIFICATION_CATALOG } from "./catalog";
export { resolveChannels, CATEGORY_DEFAULTS } from "./preferences";
export type {
  NotificationChannel,
  NotificationDataMap,
  NotificationEvent,
  NotificationRecipient,
} from "./types";
```

- [ ] **Step 4: Lancer le test**

Run: `pnpm test src/lib/notifications/notify.spec.ts`
Expected: PASS, sept tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications/notify.ts src/lib/notifications/index.ts src/lib/notifications/notify.spec.ts
git commit -m "feat(notifications): notify(), point d'entree unique"
```

---

### Task 5: API paginée et lecture par item

**Files:**
- Modify: `src/app/api/notifications/route.ts`
- Create: `src/app/api/notifications/[id]/read/route.ts`
- Test: `src/app/api/notifications/route.spec.ts`

**Interfaces:**
- Consumes: `getSessionUser` de `@/lib/auth`, `createAdminClient`
- Produces: `GET /api/notifications?cursor=<iso>&limit=<n>` renvoyant `{ items: Notification[]; nextCursor: string | null; unreadCount: number }` ; `PATCH /api/notifications/:id/read` renvoyant `{ success: true }`

Changement de contrat volontaire : le GET renvoyait un tableau de non lues, il renvoie désormais un objet paginé contenant lues **et** non lues. Le panneau a besoin des deux, et le compteur ne peut plus se déduire de la longueur du tableau.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/app/api/notifications/route.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSessionUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getSessionUser: () => mockGetSessionUser() }));

const rows = [
  { id: "n2", type: "invoice_available", created_at: "2026-08-08T10:00:00Z", read_at: null },
  { id: "n1", type: "booking_confirmed", created_at: "2026-08-07T10:00:00Z", read_at: "2026-08-07T11:00:00Z" },
];

const listQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
};

const countQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockResolvedValue({ count: 1, error: null }),
};

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
    listQuery.limit.mockResolvedValue({ data: rows, error: null });
    countQuery.is.mockResolvedValue({ count: 1, error: null });
    mockGetSessionUser.mockResolvedValue({ id: "u1", email: "a@b.fr", roles: ["client"] });
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
      new Request("http://localhost/api/notifications?cursor=2026-08-08T10:00:00Z")
    );
    expect(listQuery.lt).toHaveBeenCalledWith("created_at", "2026-08-08T10:00:00Z");
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/app/api/notifications/route.spec.ts`
Expected: FAIL, le GET actuel renvoie un tableau, `json.items` est `undefined`.

- [ ] **Step 3: Réécrire le GET**

Dans `src/app/api/notifications/route.ts`, remplacer le handler `GET` par :

```ts
const PAGE_SIZE = 20;

// GET /api/notifications?cursor=<iso>&limit=<n>
// Renvoie les notifications lues et non lues, de la plus récente à la plus
// ancienne, avec le nombre de non lues pour le compteur de la cloche.
export const GET = async (request: Request) => {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(Number(url.searchParams.get("limit")) || PAGE_SIZE, 50);

  const supabase = createAdminClient();

  let query = supabase
    .from("notifications")
    .select("id, type, category, title, body, href, actions, metadata, read_at, created_at")
    .eq("user_id", user.id);

  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  const items = data ?? [];

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return NextResponse.json({
    items,
    nextCursor: items.length === limit ? items[items.length - 1].created_at : null,
    unreadCount: count ?? 0,
  });
};
```

Le `POST` administrateur reste inchangé, à ceci près que `type: "admin"` devient `type: "admin_message"` et qu'il ajoute `category: "system"`.

- [ ] **Step 4: Créer la route de lecture par item**

Créer `src/app/api/notifications/[id]/read/route.ts` :

```ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// PATCH /api/notifications/:id/read — marque une notification comme lue.
// Le filtre sur user_id est la garantie d'isolation : le client admin passe
// outre RLS, c'est donc ici que se joue le cloisonnement entre comptes.
export const PATCH = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
};
```

- [ ] **Step 5: Lancer les tests**

Run: `pnpm test src/app/api/notifications/route.spec.ts && pnpm lint`
Expected: PASS, cinq tests, lint propre.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/notifications
git commit -m "feat(notifications): api paginee et lecture par item"
```

---

### Task 6: Liste partagée et cloche

**Files:**
- Create: `src/components/notifications/notification-list.tsx`
- Create: `src/components/notifications/notification-bell.tsx`
- Modify: `src/components/layout/header.tsx:39-59` et `:128-155`

**Interfaces:**
- Consumes: `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`
- Produces: `<NotificationList items onRead />`, `<NotificationBell />`

Pas de test Vitest : l'environnement est `node`. Vérification par build, lint et parcours manuel.

- [ ] **Step 1: Écrire la liste partagée**

Créer `src/components/notifications/notification-list.tsx` :

```tsx
"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/database";

type Props = {
  items: Notification[];
  onRead: (id: string) => void;
  emptyLabel?: string;
};

/**
 * Liste partagée entre le panneau de la cloche et les pages d'historique.
 *
 * Le bouton d'action n'apparaît que quand le catalogue en déclare un : un
 * bouton « Voir » à côté d'un titre déjà cliquable n'ajoute que du bruit.
 */
export const NotificationList = ({ items, onRead, emptyLabel }: Props) => {
  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        {emptyLabel ?? "Aucune notification pour le moment."}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((n) => {
        const unread = n.read_at === null;
        return (
          <li
            key={n.id}
            className={cn("px-4 py-3", unread && "bg-primary-green/5")}
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {n.href ? (
                  <Link
                    href={n.href}
                    onClick={() => unread && onRead(n.id)}
                    className="block"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {n.title}
                    </span>
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-foreground">
                    {n.title}
                  </span>
                )}
                {n.body && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                )}
                {n.actions && n.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {n.actions.slice(0, 2).map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        onClick={() => unread && onRead(n.id)}
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs font-medium",
                          action.variant === "secondary"
                            ? "border-border text-muted-foreground"
                            : "border-primary-green bg-primary-green text-white"
                        )}
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(n.created_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </p>
              </div>
              {unread && (
                <span
                  aria-label="Non lue"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-red"
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
```

- [ ] **Step 2: Écrire la cloche**

Créer `src/components/notifications/notification-bell.tsx` :

```tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationList } from "@/components/notifications/notification-list";
import type { Notification } from "@/types/database";

const REFETCH_MS = 60_000;

type Props = { historyHref: string };

export const NotificationBell = ({ historyHref }: Props) => {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: Notification[];
        unreadCount: number;
      };
      setItems(data.items);
      setUnread(data.unreadCount);
    } catch {
      // Le compteur peut rester en retard, ce n'est pas une erreur bloquante.
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFETCH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const markRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnread((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  };

  const markAllRead = async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    setUnread(0);
    await fetch("/api/notifications/read-all", { method: "PATCH" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-primary-green hover:bg-primary-red/10 hover:text-primary-red"
          aria-label={
            unread > 0 ? `Notifications, ${unread} non lues` : "Notifications"
          }
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary-red px-1 text-[10px] font-semibold leading-4 text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-90 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-sm font-semibold text-primary-green">
            Notifications
          </span>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[11px] text-muted-foreground underline"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          <NotificationList items={items} onRead={markRead} />
        </div>
        <Link
          href={historyHref}
          className="block border-t border-border px-4 py-2.5 text-center text-xs font-semibold text-primary-green"
        >
          Voir tout l&apos;historique
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

- [ ] **Step 3: Brancher la cloche dans le header**

Dans `src/components/layout/header.tsx` :

1. Supprimer l'état `notifications`, le `useEffect` de chargement et la fonction `markAllRead` (lignes 39 à 59).
2. Supprimer `onOpenChange={(open) => { if (open && notifications.length > 0) markAllRead(); }}` du `DropdownMenu` du compte, ainsi que le bloc `notifications.length > 0 && (...)` qui affichait trois items et la pastille sur l'icône `User`.
3. Ajouter l'import `import { NotificationBell } from "@/components/notifications/notification-bell";` et supprimer `Bell` de l'import `lucide-react` ainsi que l'import `type { Notification }`.
4. Dans le bloc `{user ? (` du bandeau desktop, placer la cloche juste avant le `DropdownMenu` du compte :

```tsx
{user ? (
  <>
    <NotificationBell
      historyHref={
        isConsultant(user.roles) || isAdmin(user.roles)
          ? "/espace-consultante/notifications"
          : "/espace-client/notifications"
      }
    />
    <DropdownMenu>
      {/* ... menu du compte inchangé ... */}
    </DropdownMenu>
  </>
) : (
```

5. Dans l'overlay mobile, ajouter un lien vers l'historique dans la section authentifiée, juste après les liens de `getClientNav` :

```tsx
<Link
  href="/espace-client/notifications"
  className="py-2 text-base font-medium text-primary-green/70 transition-colors hover:text-primary-red"
  onClick={() => setMenuOpen(false)}
>
  Mes notifications
</Link>
```

- [ ] **Step 4: Vérifier**

Run: `pnpm lint && pnpm build`
Expected: aucune erreur.

Vérification manuelle avec `pnpm dev`, connecté à un compte ayant au moins quatre notifications non lues en base :
1. Le badge de la cloche affiche le nombre de non lues.
2. Ouvrir le panneau ne change pas le compteur.
3. Cliquer un item le marque lu, décrémente le compteur, et navigue vers `href`.
4. Recharger la page : les items lus restent visibles, sans pastille.
5. « Tout marquer comme lu » remet le compteur à zéro.

- [ ] **Step 5: Commit**

```bash
git add src/components/notifications src/components/layout/header.tsx
git commit -m "feat(notifications): cloche avec compteur et lecture par item"
```

---

### Task 7: Pages d'historique

**Files:**
- Create: `src/components/notifications/notification-history.tsx`
- Create: `src/app/(public)/espace-client/notifications/page.tsx`
- Create: `src/app/(dashboard)/espace-consultante/notifications/page.tsx`

**Interfaces:**
- Consumes: `<NotificationList />`, `GET /api/notifications`
- Produces: `<NotificationHistory />`, deux routes de page

- [ ] **Step 1: Écrire le composant d'historique**

Créer `src/components/notifications/notification-history.tsx` :

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { NotificationList } from "@/components/notifications/notification-list";
import type { Notification } from "@/types/database";

/**
 * Historique paginé, partagé par l'espace client et le dashboard. Un seul
 * séparateur, entre non lues et lues : à quelques notifications par semaine,
 * des filtres occuperaient plus de place qu'ils n'en feraient gagner.
 */
export const NotificationHistory = () => {
  const [items, setItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (from: string | null) => {
    setLoading(true);
    try {
      const url = from
        ? `/api/notifications?cursor=${encodeURIComponent(from)}`
        : "/api/notifications";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: Notification[];
        nextCursor: string | null;
      };
      setItems((prev) => (from ? [...prev, ...data.items] : data.items));
      setCursor(data.nextCursor);
      setDone(data.nextCursor === null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(null);
  }, [load]);

  const markRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  };

  const unread = items.filter((n) => n.read_at === null);
  const read = items.filter((n) => n.read_at !== null);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <NotificationList
          items={unread}
          onRead={markRead}
          emptyLabel="Vous êtes à jour, aucune notification non lue."
        />
      </div>

      {read.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Déjà lues
          </p>
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <NotificationList items={read} onRead={markRead} />
          </div>
        </div>
      )}

      {!done && (
        <div className="text-center">
          <Button variant="outline" disabled={loading} onClick={() => load(cursor)}>
            {loading ? "Chargement..." : "Charger les 20 suivantes"}
          </Button>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Créer la page côté cliente**

Créer `src/app/(public)/espace-client/notifications/page.tsx` :

```tsx
import { Metadata } from "next";
import { NotificationHistory } from "@/components/notifications/notification-history";

export const metadata: Metadata = { title: "Mes notifications" };

const NotificationsPage = () => (
  <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <h1 className="font-serif text-2xl font-bold text-primary-green">
      Mes notifications
    </h1>
    <NotificationHistory />
  </div>
);

export default NotificationsPage;
```

- [ ] **Step 3: Créer la page côté dashboard**

Créer `src/app/(dashboard)/espace-consultante/notifications/page.tsx` :

```tsx
import { Metadata } from "next";
import { NotificationHistory } from "@/components/notifications/notification-history";

export const metadata: Metadata = { title: "Notifications" };

const ConsultanteNotificationsPage = () => (
  <div className="space-y-6">
    <h1 className="font-serif text-2xl font-bold text-primary-green">
      Notifications
    </h1>
    <NotificationHistory />
  </div>
);

export default ConsultanteNotificationsPage;
```

- [ ] **Step 4: Vérifier**

Run: `pnpm lint && pnpm build`
Expected: aucune erreur.

Vérification manuelle : ouvrir `/espace-client/notifications` avec plus de 20 notifications en base, vérifier le séparateur non lues / lues et que « Charger les 20 suivantes » ajoute une page puis disparaît en fin de liste.

- [ ] **Step 5: Commit**

```bash
git add src/components/notifications/notification-history.tsx "src/app/(public)/espace-client/notifications" "src/app/(dashboard)/espace-consultante/notifications"
git commit -m "feat(notifications): pages d'historique par espace"
```

---

### Task 8: Migration des trois appelants existants

**Files:**
- Modify: `src/lib/stripe/webhooks.ts:550-565`
- Modify: `src/app/(dashboard)/espace-consultante/reservations/actions.ts:10,56-62`
- Modify: `src/lib/invoicing/emit.ts` (appel à `createNotification`)
- Delete: `src/lib/notifications.ts`, `src/lib/notifications.spec.ts`
- Modify: `src/lib/stripe/webhooks.spec.ts` (mock de `@/lib/notifications`)

**Interfaces:**
- Consumes: `notify` de `@/lib/notifications`
- Produces: plus aucun appel à `createNotification` dans le dépôt

Le module supprimé s'appelait `@/lib/notifications` (fichier), le nouveau s'appelle `@/lib/notifications` (dossier avec `index.ts`) : les imports existants qui pointaient vers ce chemin continuent de résoudre, seule la fonction change.

- [ ] **Step 1: Migrer le webhook Stripe**

Dans `src/lib/stripe/webhooks.ts`, remplacer l'import ligne 17 par `import { notify } from "@/lib/notifications";` et le bloc lignes 550 à 565 par :

```ts
  // Notification in-app pour la cliente (non bloquant).
  // dedupeId sur la reference du booking : Stripe rejoue ses evenements.
  try {
    const { data: ct } = await getSupabase()
      .from("consultation_types")
      .select("title")
      .eq("id", meta.consultation_type_id)
      .single();
    await notify(
      "booking_confirmed",
      [{ userId: meta.client_id }],
      { booking_id: meta.reference_id, consultation_title: ct?.title },
      { dedupeId: meta.reference_id }
    );
```

- [ ] **Step 2: Migrer l'action consultante**

Dans `src/app/(dashboard)/espace-consultante/reservations/actions.ts`, remplacer l'import ligne 10 par `import { notify } from "@/lib/notifications";` et le bloc lignes 56 à 62 par :

```ts
      await notify(
        "booking_confirmed",
        [{ userId: booking.client_id }],
        { booking_id: bookingId, consultation_title: ct?.title },
        { dedupeId: bookingId }
      );
```

- [ ] **Step 3: Migrer la facturation**

Dans `src/lib/invoicing/emit.ts`, remplacer l'import et l'appel à `createNotification` par :

```ts
import { notify } from "@/lib/notifications";

// ... au point d'appel, en conservant les identifiants déjà disponibles :
await notify(
  "invoice_available",
  [{ userId: clientId }],
  { invoice_id: invoiceId, number: invoiceNumber, amount: formattedAmount },
  { dedupeId: invoiceId }
);
```

Adapter les noms de variables à ceux du fichier. Si le montant formaté n'existe pas déjà, le construire avec `new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amountCents / 100)`.

- [ ] **Step 4: Supprimer l'ancien module et ajuster les mocks**

```bash
git rm src/lib/notifications.ts src/lib/notifications.spec.ts
```

Dans `src/lib/stripe/webhooks.spec.ts`, remplacer le mock de `@/lib/notifications` :

```ts
vi.mock("@/lib/notifications", () => ({ notify: vi.fn() }));
```

Faire de même dans `src/app/(dashboard)/espace-consultante/reservations/actions.spec.ts`.

- [ ] **Step 5: Vérifier qu'aucun appelant ne subsiste**

Run: `grep -rn "createNotification" src/`
Expected: aucun résultat.

Run: `pnpm test && pnpm lint && pnpm build`
Expected: toute la suite passe.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(notifications): migre les appelants vers notify() et supprime createNotification"
```

---

### Task 9: Événements du webhook Stripe

**Files:**
- Modify: `src/lib/notifications/catalog.ts` (adaptateurs email)
- Modify: `src/lib/stripe/webhooks.ts`
- Test: `src/lib/stripe/webhooks.spec.ts`

**Interfaces:**
- Consumes: `notify`, fonctions de `@/lib/emails/send`
- Produces: événements `payment_received`, `accompagnement_access`, `formation_registered`, `consultant_new_booking`, `admin_purchase` émis depuis les webhooks

**Règle appliquée dans cette tâche et les suivantes :** quand un événement reçoit son adaptateur email dans le catalogue, l'appel direct correspondant est **retiré du point d'appel dans le même commit**. Sinon l'email part deux fois.

**Deux événements de la spec restent sans émetteur, faute de source :**

- `admin_new_review` : les avis ne sont pas saisis par les clientes, ce sont des données statiques (`src/data/testimonials.ts`) et un import Google (`src/lib/google-reviews.ts`). Rien ne se produit à notifier.
- `admin_payment_failed` : aucun `payment_intent.payment_failed` ni `charge.failed` n'est traité aujourd'hui dans `src/lib/stripe/webhooks.ts`.

Les deux définitions restent dans le catalogue, prêtes à l'emploi. Brancher un émetteur suppose d'ajouter d'abord la source correspondante, ce qui dépasse le périmètre de ce plan.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/lib/stripe/webhooks.spec.ts`, ajouter :

```ts
it("notifie la cliente de l'ouverture de son accompagnement", async () => {
  const { notify } = await import("@/lib/notifications");
  await handleCheckoutCompleted(accompagnementCheckoutEvent);
  expect(notify).toHaveBeenCalledWith(
    "accompagnement_access",
    [{ userId: "client-1", email: "cliente@example.com" }],
    expect.objectContaining({ accompagnement_slug: expect.any(String) }),
    expect.objectContaining({ dedupeId: expect.any(String) })
  );
});

it("notifie l'administration de l'achat", async () => {
  const { notify } = await import("@/lib/notifications");
  await handleCheckoutCompleted(accompagnementCheckoutEvent);
  expect(notify).toHaveBeenCalledWith(
    "admin_purchase",
    expect.arrayContaining([expect.objectContaining({ userId: expect.any(String) })]),
    expect.objectContaining({ amount: expect.any(String) }),
    expect.anything()
  );
});
```

Réutiliser la fixture d'événement Stripe déjà présente dans le fichier ; si elle porte un autre nom, l'adapter.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm test src/lib/stripe/webhooks.spec.ts`
Expected: FAIL, `notify` n'est pas appelé avec ces événements.

- [ ] **Step 3: Ajouter un helper de destinataires administrateurs**

Créer `src/lib/notifications/recipients.ts` :

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationRecipient } from "./types";

/**
 * Destinataires d'une alerte interne. Renvoie un tableau vide plutôt que de
 * lever : une alerte perdue vaut mieux qu'un webhook en échec.
 */
export const getRoleRecipients = async (
  role: "admin" | "consultant"
): Promise<NotificationRecipient[]> => {
  try {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("id, email")
      .contains("roles", [role]);
    return (data ?? []).map((p) => ({ userId: p.id, email: p.email }));
  } catch (error) {
    console.error(`getRoleRecipients(${role}) a échoué :`, error);
    return [];
  }
};
```

Exporter depuis `src/lib/notifications/index.ts` :

```ts
export { getRoleRecipients } from "./recipients";
```

- [ ] **Step 4: Ajouter les adaptateurs email au catalogue**

Dans `src/lib/notifications/catalog.ts`, importer les senders et compléter les entrées concernées :

```ts
import { sendAccompagnementAccess } from "@/lib/emails/send";

// dans accompagnement_access :
    email: (to, d) =>
      sendAccompagnementAccess(to, {
        client_name: d.client_name,
        accompagnement_title: d.title,
        access_url: `${process.env.NEXT_PUBLIC_SITE_URL}/espace-client/accompagnements/${d.accompagnement_slug}`,
      }),
```

Ajouter `client_name: string` à l'entrée `accompagnement_access` de `NotificationDataMap`. Vérifier la signature exacte de `sendAccompagnementAccess` dans `src/lib/emails/send.ts:158` et aligner les variables.

- [ ] **Step 5: Émettre les événements dans le webhook**

Dans `src/lib/stripe/webhooks.ts`, après chaque traitement réussi, remplacer les appels directs à `sendAccompagnementAccess` par `notify("accompagnement_access", ...)`, et ajouter les notifications internes :

```ts
await notify(
  "admin_purchase",
  await getRoleRecipients("admin"),
  { label: productLabel, amount: formattedAmount, client_name: clientName },
  { dedupeId: session.id }
);
```

Appliquer le même schéma pour `payment_received` (cliente, in-app seul), `formation_registered` et `consultant_new_booking`.

- [ ] **Step 6: Lancer les tests**

Run: `pnpm test src/lib/stripe/webhooks.spec.ts && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Vérifier qu'aucun email ne part deux fois**

Run: `grep -n "sendAccompagnementAccess\|sendBookingConfirmation" src/lib/stripe/webhooks.ts`
Expected: aucun résultat, ces envois passent désormais par le catalogue.

- [ ] **Step 8: Commit**

```bash
git add src/lib/notifications src/lib/stripe/webhooks.ts src/lib/stripe/webhooks.spec.ts
git commit -m "feat(notifications): evenements des webhooks stripe"
```

---

### Task 10: Événements du cron

**Files:**
- Modify: `src/app/api/cron/route.ts`
- Modify: `src/lib/notifications/catalog.ts`
- Test: `src/app/api/cron/route.spec.ts`

**Interfaces:**
- Consumes: `notify`, `getRoleRecipients`, `sendBookingReminder`
- Produces: `booking_reminder` et `formation_reminder` émis par le cron, avec déduplication

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/app/api/cron/route.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/notifications", () => ({
  notify: vi.fn(),
  getRoleRecipients: vi.fn().mockResolvedValue([]),
}));

describe("cron", () => {
  beforeEach(() => vi.clearAllMocks());

  it("déduplique le rappel de consultation sur l'identifiant de réservation", async () => {
    const { notify } = await import("@/lib/notifications");
    const { GET } = await import("./route");
    process.env.CRON_SECRET = "s3cr3t";

    await GET(
      new Request("http://localhost/api/cron", {
        headers: { authorization: "Bearer s3cr3t" },
      })
    );

    const reminderCalls = (notify as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter(
      (c) => c[0] === "booking_reminder"
    );
    for (const call of reminderCalls) {
      expect(call[3]).toMatchObject({ dedupeId: expect.stringContaining("") });
    }
  });
});
```

Compléter les mocks Supabase du fichier en suivant le style de `src/app/api/notifications/route.spec.ts`, de façon à ce que la requête des réservations du lendemain renvoie une ligne.

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/app/api/cron/route.spec.ts`
Expected: FAIL, aucun appel `booking_reminder`.

- [ ] **Step 3: Ajouter l'adaptateur email du rappel**

Dans `src/lib/notifications/catalog.ts`, sur `booking_reminder` :

```ts
    email: (to, d) =>
      sendBookingReminder(to, {
        client_name: d.client_name,
        consultant_name: d.consultant_name,
        time: d.time,
      }),
```

Ajouter `client_name: string; consultant_name: string` à `booking_reminder` dans `NotificationDataMap`.

- [ ] **Step 4: Remplacer les envois directs du cron**

Dans `src/app/api/cron/route.ts`, remplacer l'appel à `sendBookingReminder` par :

```ts
await notify(
  "booking_reminder",
  [{ userId: booking.client_id, email: client.email }],
  {
    booking_id: booking.id,
    time: format(new Date(booking.starts_at), "HH'h'mm", { locale: fr }),
    client_name: client.first_name ?? "",
    consultant_name: consultantName,
  },
  // La date rend la cle unique par jour : un cron relance le meme jour ne
  // renotifie pas, une relance le lendemain le fait.
  { dedupeId: `${booking.id}:${format(new Date(), "yyyy-MM-dd")}` }
);
```

Faire de même pour le rappel de formation avec `formation_reminder`, et remplacer la notification d'article publié aux administrateurs par `notify("admin_job_failed", ...)` **uniquement pour les échecs** : la publication réussie d'un article est un événement marketing, traité dans le plan de la tranche 2. Conserver `sendBlogPostPublishedNotification` tel quel jusque-là.

- [ ] **Step 5: Lancer les tests**

Run: `pnpm test src/app/api/cron/route.spec.ts && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/cron src/lib/notifications/catalog.ts
git commit -m "feat(notifications): rappels de consultation et de formation via notify()"
```

---

### Task 11: Événements des actions serveur

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/reservations/actions.ts`
- Test: `src/app/(dashboard)/espace-consultante/reservations/actions.spec.ts`

**Interfaces:**
- Consumes: `notify`, `getRoleRecipients`
- Produces: `booking_cancelled`, `booking_rescheduled`, `consultant_booking_cancelled`, `admin_refund` émis depuis les actions de réservation

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/app/(dashboard)/espace-consultante/reservations/actions.spec.ts`, ajouter :

```ts
it("notifie la cliente de l'annulation", async () => {
  const { notify } = await import("@/lib/notifications");
  await cancelBooking("booking-1");
  expect(notify).toHaveBeenCalledWith(
    "booking_cancelled",
    [expect.objectContaining({ userId: "client-1" })],
    expect.objectContaining({ booking_id: "booking-1" }),
    expect.objectContaining({ dedupeId: "booking-1" })
  );
});

it("notifie l'administration du remboursement", async () => {
  const { notify } = await import("@/lib/notifications");
  await cancelBooking("booking-1");
  expect(notify).toHaveBeenCalledWith(
    "admin_refund",
    expect.any(Array),
    expect.objectContaining({ amount: expect.any(String) }),
    expect.anything()
  );
});
```

Adapter les noms de fonctions exportées à ceux réellement présents dans `actions.ts`.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm test "src/app/(dashboard)/espace-consultante/reservations/actions.spec.ts"`
Expected: FAIL.

- [ ] **Step 3: Émettre les événements**

Dans les actions d'annulation et de reprogrammation, après la mise à jour en base et l'éventuel remboursement :

```ts
await notify(
  "booking_cancelled",
  [{ userId: booking.client_id, email: client?.email }],
  { booking_id: bookingId, date: formattedDate },
  { dedupeId: bookingId }
);

if (refund) {
  await notify(
    "admin_refund",
    await getRoleRecipients("admin"),
    { label: ct?.title ?? "Consultation", amount: formattedAmount, client_name: clientName },
    { dedupeId: `${bookingId}:refund` }
  );
}
```

- [ ] **Step 4: Lancer les tests**

Run: `pnpm test "src/app/(dashboard)/espace-consultante/reservations" && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/espace-consultante/reservations"
git commit -m "feat(notifications): annulation, reprogrammation et remboursement"
```

---

### Task 12: Vérification d'ensemble

**Files:** aucun fichier modifié sauf correctifs

- [ ] **Step 1: Suite complète**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: tout passe.

- [ ] **Step 2: Vérifier la couverture du catalogue**

Run: `grep -rn "sendBookingConfirmation\|sendBookingReminder\|sendAccompagnementAccess\|sendBookingCancelled" src/ --include=*.ts | grep -v "src/lib/emails/" | grep -v "src/lib/notifications/"`
Expected: aucun résultat. Tout envoi de ces emails passe par le catalogue.

- [ ] **Step 3: Vérifier l'idempotence en conditions réelles**

Sur un environnement de préproduction, rejouer deux fois le même événement Stripe de test.
Expected: une seule ligne dans `notifications` pour cet événement, un seul email.

- [ ] **Step 4: Vérifier le parcours complet**

1. Cliente : réserver, payer, constater la notification et l'email, cliquer l'item, arriver sur la réservation.
2. Consultante : constater `consultant_new_booking` dans sa cloche, ouvrir `/espace-consultante/notifications`.
3. Administration : constater `admin_purchase`.

- [ ] **Step 5: Commit des correctifs éventuels**

```bash
git add -A
git commit -m "fix(notifications): correctifs de la verification d'ensemble"
```

---

## Ce que ce plan ne fait pas

Ces points sont dans la spec mais relèvent des plans suivants :

- Table `notification_preferences`, écran de préférences, lien de désinscription (tranche 2)
- `resolveAudience` et conditions de segment `has_tag` / `has_accompagnement`, tags globaux (tranche 2)
- Événements marketing : replay, ressource réservée, article de blog, relance, demande d'avis, digest (tranche 2)
- Action `send_notification` dans les automations, diffusion ciblée, `acquisition_source`, digest administrateur (tranche 3)
- Web Push (phase 2)
- Émetteurs de `admin_new_review` et `admin_payment_failed` : ces deux sources n'existent pas dans l'application, voir la note de la tâche 9. La spec les listait dans la tranche 1 sans que ce manque soit visible à ce moment-là.
