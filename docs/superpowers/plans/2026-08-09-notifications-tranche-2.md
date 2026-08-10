# Notifications tranche 2, préférences et ciblage — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à l'utilisatrice la main sur ce qu'elle reçoit, et permettre d'adresser une notification à une audience plutôt qu'à une personne.

**Architecture:** Une table de préférences qui ne stocke que les écarts au défaut, branchée dans `notify()` par une clé de catégorie portée par le catalogue. Un `resolveAudience()` qui traduit une règle en liste de destinataires, adossé à un évaluateur de segments extrait du CRM pour être utilisable hors session. Un premier événement marketing de bout en bout, le replay d'atelier, pour éprouver la chaîne complète.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (Postgres + RLS), Resend, Vitest, Tailwind, shadcn/ui, Zod v4.

## Global Constraints

- Ce plan suppose la tranche 1 en place : `src/lib/notifications/` (catalog, notify, preferences, recipients), migration `00084`, cloche et pages d'historique. Voir `docs/superpowers/plans/2026-08-09-notifications-socle.md`.
- Périmètre : préférences, ciblage, et **un seul** événement marketing (`replay_published`). Les autres événements marketing font l'objet du plan suivant, voir « Ce que ce plan ne fait pas ».
- `notify()` reste **strictement serveur** et **ne lève jamais**.
- Textes visibles par les visiteurs : **aucun tiret cadratin** (`—`).
- Migrations SQL : fichier numéroté à la suite, commentaire d'en-tête expliquant le pourquoi, comme `00082_bio_links.sql`.
- Vitest tourne en `environment: "node"` : **aucun test de composant React**. Les tâches d'interface se vérifient par `pnpm build`, `pnpm lint` et une vérification manuelle décrite dans la tâche.
- Commandes : `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm db:push:dry`, `pnpm db:push`.
- Le transactionnel et le système ne consultent jamais les préférences. Seul le marketing les respecte.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/00085_notifications_preferences.sql` | `notification_preferences`, `notification_broadcasts`, jeton de désinscription sur `profiles` |
| `src/lib/notifications/preference-categories.ts` | Les sept catégories visibles, leurs libellés, leur caractère imposé et leurs défauts par canal |
| `src/lib/notifications/preferences.ts` | `loadPreferences()`, `resolveChannels()` (réécrit) |
| `src/lib/notifications/audience.ts` | `resolveAudience()`, plafond et journalisation |
| `src/lib/crm/segment-eval.ts` | Évaluateur de segments partagé, sans session : `matchesConditions()`, `loadClientStats()` |
| `src/app/(public)/espace-client/profil/_components/notification-preferences.tsx` | Matrice catégorie par canal |
| `src/app/(public)/espace-client/profil/notification-actions.ts` | Server action d'enregistrement d'une préférence |
| `src/app/(public)/notifications/desinscription/page.tsx` | Désinscription par jeton, sans session |

Fichiers modifiés : `src/lib/notifications/catalog.ts` (clé de préférence par événement), `src/lib/notifications/notify.ts` (consommation des préférences), `src/lib/notifications/types.ts`, `src/types/database.ts` (conditions de segment), `src/validations/crm.ts`, `src/app/(dashboard)/espace-consultante/crm/segments/actions.ts` (délégation à l'évaluateur partagé), `src/app/(dashboard)/espace-consultante/crm/segments/_components/segment-form.tsx`, `src/app/(dashboard)/espace-consultante/crm/actions.ts` (tags globaux), `src/app/(dashboard)/admin/replay-lives/actions.ts`, `src/lib/emails/send.ts`.

---

## Ce que la lecture du code a révélé avant d'écrire ce plan

Trois points où la spec décrivait une réalité qui n'existe pas. Les tâches ci-dessous en tiennent compte, mais autant les énoncer d'emblée.

1. **L'évaluateur de segments n'est pas réutilisable en l'état.** `evaluateSegment` est une server action qui appelle `getSessionUser()` puis `redirect("/connexion")`, et `getConsultantClientStats(consultantId)` ne regarde que les clientes ayant une réservation chez cette consultante ou une inscription à l'un de ses accompagnements. Depuis un cron, il n'y a ni session ni consultante. La spec disait « délègue à l'évaluateur CRM existant » : il faut d'abord l'extraire.
2. **`SegmentCondition.value` est un `number`.** `has_tag` porte un identifiant, `has_accompagnement` un booléen. Le type devient une union discriminée. Le stockage est en jsonb, donc aucune migration, mais les conditions numériques existantes doivent continuer de valider, d'où un test dédié.
3. **« Nouvelle ressource réservée » n'a pas d'entité.** `00059_ressources_publiques.sql` crée un **bucket de stockage**, pas une table. Il n'y a rien à observer pour déclencher une notification. Cet événement de la spec est retiré du périmètre, faute d'objet.

---

### Task 1: Migration des préférences

**Files:**
- Create: `supabase/migrations/00085_notifications_preferences.sql`
- Modify: `src/types/database.ts`

**Interfaces:**
- Consumes: table `notifications` de `00084`
- Produces: tables `notification_preferences` et `notification_broadcasts`, colonne `profiles.notification_unsubscribe_token` ; types TS `NotificationPreference`, `NotificationBroadcast`

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/00085_notifications_preferences.sql` :

```sql
-- Preferences de notification, ciblage et desinscription.
--
-- La table ne stocke que les ECARTS au defaut : le defaut vit dans le code
-- (src/lib/notifications/preference-categories.ts). Stocker une ligne par
-- utilisatrice et par categorie imposerait un backfill a chaque nouvelle
-- categorie, et ferait demarrer tout nouvel evenement desactive pour les
-- comptes existants — l'inverse de ce qu'on veut.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Cle de categorie visible par l'utilisatrice (rendez_vous, articles, ...),
  -- plus fine que la categorie technique portee par `notifications.category`.
  category_key TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email')),
  enabled BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category_key, channel)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_preferences_select_own ON notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notification_preferences_upsert_own ON notification_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Journal des envois cibles. Une erreur de condition sur un segment large,
-- c'est un envoi a toute la base : on veut pouvoir le constater apres coup
-- plutot que de le decouvrir par les reponses.
CREATE TABLE IF NOT EXISTS notification_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  rule JSONB NOT NULL,
  recipient_count INT NOT NULL,
  -- Vrai quand le plafond a coupe la liste : le compte ci-dessus est alors
  -- celui des destinataires REELLEMENT notifies, pas celui des resolus.
  truncated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_broadcasts_created_at
  ON notification_broadcasts(created_at DESC);

ALTER TABLE notification_broadcasts ENABLE ROW LEVEL SECURITY;

-- Lecture reservee a l'administration ; ecriture par le role service seul.
CREATE POLICY notification_broadcasts_select_admin ON notification_broadcasts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND roles && ARRAY['admin']::user_role[]
    )
  );

-- Desinscription depuis un email, donc sans session. Un jeton opaque plutot
-- que l'identifiant en clair, comme pour la newsletter (00060) : une URL
-- `?user=<uuid>` permettrait de desabonner autrui.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_notification_unsubscribe_token
  ON profiles(notification_unsubscribe_token);
```

- [ ] **Step 2: Vérifier la migration à blanc**

Run: `pnpm db:push:dry`
Expected: `00085_notifications_preferences.sql` apparaît dans le plan, sans erreur.

- [ ] **Step 3: Ajouter les types**

Dans `src/types/database.ts`, à la suite du bloc `Notification` :

```ts
export type NotificationChannelName = "in_app" | "email";

export type NotificationPreference = {
  user_id: string;
  category_key: string;
  channel: NotificationChannelName;
  enabled: boolean;
  updated_at: string;
};

export type NotificationBroadcast = {
  id: string;
  event: string;
  rule: Record<string, unknown>;
  recipient_count: number;
  truncated: boolean;
  created_at: string;
};
```

- [ ] **Step 4: Appliquer et vérifier**

Run: `pnpm db:push && pnpm lint && pnpm test`
Expected: migration appliquée, lint propre, suite verte.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/00085_notifications_preferences.sql src/types/database.ts
git commit -m "feat(notifications): tables des preferences, du journal d'envoi et jeton de desinscription"
```

---

### Task 2: Les sept catégories visibles

**Files:**
- Create: `src/lib/notifications/preference-categories.ts`
- Modify: `src/lib/notifications/types.ts`, `src/lib/notifications/catalog.ts`
- Test: `src/lib/notifications/preference-categories.spec.ts`

**Interfaces:**
- Consumes: `NotificationChannel` de `./types`
- Produces: `NotificationPreferenceKey`, `PREFERENCE_CATEGORIES` (métadonnées par clé), champ `preferenceKey` sur chaque définition du catalogue

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/notifications/preference-categories.spec.ts` :

```ts
import { describe, it, expect } from "vitest";
import { PREFERENCE_CATEGORIES } from "./preference-categories";
import { NOTIFICATION_CATALOG } from "./catalog";

describe("PREFERENCE_CATEGORIES", () => {
  it("indexe chaque catégorie sous sa propre clé", () => {
    for (const [key, cat] of Object.entries(PREFERENCE_CATEGORIES)) {
      expect(cat.key).toBe(key);
    }
  });

  it("marque comme imposées toutes les catégories transactionnelles", () => {
    const forced = Object.values(PREFERENCE_CATEGORIES).filter((c) => c.forced);
    expect(forced.map((c) => c.key).sort()).toEqual([
      "acces_contenus",
      "paiements",
      "rendez_vous",
      "systeme",
    ]);
  });

  it("démarre le digest désactivé sur les deux canaux", () => {
    expect(PREFERENCE_CATEGORIES.digest.defaults).toEqual({
      in_app: false,
      email: false,
    });
  });

  it("démarre les autres catégories optionnelles activées", () => {
    for (const key of ["replays", "articles", "rappels_suivi"] as const) {
      expect(PREFERENCE_CATEGORIES[key].defaults).toEqual({
        in_app: true,
        email: true,
      });
    }
  });

  it("donne un libellé à chaque catégorie, pour l'écran de préférences", () => {
    for (const cat of Object.values(PREFERENCE_CATEGORIES)) {
      expect(cat.label.length).toBeGreaterThan(0);
    }
  });

  it("rattache chaque événement du catalogue à une catégorie connue", () => {
    for (const def of Object.values(NOTIFICATION_CATALOG)) {
      expect(PREFERENCE_CATEGORIES[def.preferenceKey]).toBeDefined();
    }
  });

  it("ne rattache un événement marketing qu'à une catégorie non imposée", () => {
    for (const def of Object.values(NOTIFICATION_CATALOG)) {
      if (def.category !== "marketing") continue;
      expect(PREFERENCE_CATEGORIES[def.preferenceKey].forced).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/lib/notifications/preference-categories.spec.ts`
Expected: FAIL, `Cannot find module './preference-categories'`.

- [ ] **Step 3: Écrire les catégories**

Créer `src/lib/notifications/preference-categories.ts` :

```ts
import type { NotificationChannel } from "./types";

export type NotificationPreferenceKey =
  | "rendez_vous"
  | "paiements"
  | "acces_contenus"
  | "systeme"
  | "replays"
  | "articles"
  | "rappels_suivi"
  | "digest";

export type PreferenceCategory = {
  key: NotificationPreferenceKey;
  label: string;
  hint?: string;
  /** Imposée : les préférences ne sont jamais consultées pour cette catégorie. */
  forced: boolean;
  defaults: Record<NotificationChannel, boolean>;
  /** Masquée de l'écran client : concerne la consultante et l'administration. */
  internal?: boolean;
};

const FORCED = { in_app: true, email: true };

/**
 * Les catégories telles que l'utilisatrice les voit. Plus fines que la
 * catégorie technique (`transactional` / `marketing` / `system`), qui ne sert
 * qu'à décider si l'on consulte les préférences.
 *
 * C'est aussi la granularité de ce qu'elle peut couper : sept lignes, pas
 * dix-huit événements.
 */
export const PREFERENCE_CATEGORIES: Record<
  NotificationPreferenceKey,
  PreferenceCategory
> = {
  rendez_vous: {
    key: "rendez_vous",
    label: "Rendez-vous",
    hint: "Confirmation, rappel, annulation",
    forced: true,
    defaults: FORCED,
  },
  paiements: {
    key: "paiements",
    label: "Paiements et factures",
    hint: "Obligation légale",
    forced: true,
    defaults: FORCED,
  },
  acces_contenus: {
    key: "acces_contenus",
    label: "Accès à vos contenus",
    hint: "Ouverture d'accompagnement, inscription à un atelier",
    forced: true,
    defaults: FORCED,
  },
  systeme: {
    key: "systeme",
    label: "Alertes internes",
    hint: "Réservé à l'équipe",
    forced: true,
    defaults: FORCED,
    internal: true,
  },
  replays: {
    key: "replays",
    label: "Nouveaux replays",
    forced: false,
    defaults: { in_app: true, email: true },
  },
  articles: {
    key: "articles",
    label: "Articles du blog",
    forced: false,
    defaults: { in_app: true, email: true },
  },
  rappels_suivi: {
    key: "rappels_suivi",
    label: "Rappels et suivi",
    hint: "Module en cours, demande d'avis",
    forced: false,
    defaults: { in_app: true, email: true },
  },
  digest: {
    key: "digest",
    label: "Résumé hebdomadaire",
    hint: "Désactivé par défaut",
    forced: false,
    defaults: { in_app: false, email: false },
  },
};

/** Catégories affichées dans l'écran de préférences de l'espace client. */
export const CLIENT_PREFERENCE_CATEGORIES = Object.values(
  PREFERENCE_CATEGORIES
).filter((c) => !c.internal);
```

- [ ] **Step 4: Ajouter `preferenceKey` au type des définitions**

Dans `src/lib/notifications/types.ts`, ajouter l'import et le champ :

```ts
import type { NotificationPreferenceKey } from "./preference-categories";
```

puis, dans `NotificationDefinition<K>`, juste après `category` :

```ts
  /** Catégorie visible par l'utilisatrice, qui porte ses préférences. */
  preferenceKey: NotificationPreferenceKey;
```

- [ ] **Step 5: Renseigner la clé sur chaque événement du catalogue**

Dans `src/lib/notifications/catalog.ts`, ajouter une ligne `preferenceKey` à chaque entrée, juste après `category` :

| Événement | `preferenceKey` |
|---|---|
| `booking_confirmed`, `booking_reminder`, `booking_cancelled`, `booking_rescheduled` | `rendez_vous` |
| `payment_received`, `invoice_available` | `paiements` |
| `accompagnement_access`, `formation_registered`, `formation_reminder` | `acces_contenus` |
| `consultant_new_booking`, `consultant_booking_cancelled`, `consultant_message` | `rendez_vous` |
| `admin_purchase`, `admin_refund`, `admin_payment_failed`, `admin_new_review`, `admin_job_failed`, `admin_message` | `systeme` |

Exemple pour la première entrée :

```ts
  booking_confirmed: {
    key: "booking_confirmed",
    category: "transactional",
    preferenceKey: "rendez_vous",
    channels: ["in_app", "email"],
    // ... inchangé
  },
```

- [ ] **Step 6: Lancer les tests**

Run: `pnpm test src/lib/notifications/ && pnpm lint`
Expected: PASS. Le typage refuse toute entrée du catalogue sans `preferenceKey`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/notifications/
git commit -m "feat(notifications): categories de preference visibles par l'utilisatrice"
```

---

### Task 3: Lecture des préférences

**Files:**
- Modify: `src/lib/notifications/preferences.ts`
- Test: `src/lib/notifications/preferences.spec.ts`

**Interfaces:**
- Consumes: `PREFERENCE_CATEGORIES`, `createAdminClient`
- Produces: `loadPreferences(userId): Promise<ChannelOverrides>` indexé par `` `${categoryKey}:${channel}` ``, `resolveChannels(preferenceKey, declared, overrides?)`

Changement de signature volontaire : `resolveChannels` prenait la catégorie technique, elle prend désormais la clé de préférence, qui porte à la fois le caractère imposé et les défauts.

- [ ] **Step 1: Réécrire le test**

Remplacer le contenu de `src/lib/notifications/preferences.spec.ts` par :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: mockSelect }) }),
  }),
}));

import { resolveChannels, loadPreferences } from "./preferences";

describe("resolveChannels", () => {
  it("laisse passer tous les canaux déclarés pour une catégorie imposée", () => {
    expect(resolveChannels("rendez_vous", ["in_app", "email"])).toEqual([
      "in_app",
      "email",
    ]);
  });

  it("ignore les préférences sur une catégorie imposée", () => {
    expect(
      resolveChannels("paiements", ["in_app", "email"], {
        "paiements:email": false,
      })
    ).toEqual(["in_app", "email"]);
  });

  it("applique la préférence sur une catégorie optionnelle", () => {
    expect(
      resolveChannels("replays", ["in_app", "email"], { "replays:email": false })
    ).toEqual(["in_app"]);
  });

  it("laisse passer une catégorie optionnelle sans préférence enregistrée", () => {
    expect(resolveChannels("replays", ["in_app", "email"])).toEqual([
      "in_app",
      "email",
    ]);
  });

  it("coupe le digest en l'absence de préférence, car il est en opt-in", () => {
    expect(resolveChannels("digest", ["in_app", "email"])).toEqual([]);
  });

  it("active le digest quand la préférence l'autorise", () => {
    expect(
      resolveChannels("digest", ["in_app", "email"], { "digest:email": true })
    ).toEqual(["email"]);
  });

  it("ne renvoie jamais un canal non déclaré par l'événement", () => {
    expect(
      resolveChannels("replays", ["in_app"], { "replays:email": true })
    ).toEqual(["in_app"]);
  });
});

describe("loadPreferences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("indexe les écarts par catégorie et par canal", async () => {
    mockSelect.mockResolvedValue({
      data: [
        { category_key: "replays", channel: "email", enabled: false },
        { category_key: "digest", channel: "in_app", enabled: true },
      ],
      error: null,
    });

    expect(await loadPreferences("u1")).toEqual({
      "replays:email": false,
      "digest:in_app": true,
    });
  });

  it("renvoie un objet vide quand la lecture échoue, pour ne rien bloquer", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSelect.mockResolvedValue({ data: null, error: { message: "DB down" } });

    expect(await loadPreferences("u1")).toEqual({});
    consoleSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/lib/notifications/preferences.spec.ts`
Expected: FAIL, `loadPreferences` n'existe pas et `resolveChannels` reçoit une catégorie technique.

- [ ] **Step 3: Réécrire l'implémentation**

Remplacer le contenu de `src/lib/notifications/preferences.ts` par :

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import { PREFERENCE_CATEGORIES } from "./preference-categories";
import type { NotificationPreferenceKey } from "./preference-categories";
import type { NotificationChannel } from "./types";

/** Écarts au défaut, indexés `categorie:canal`. */
export type ChannelOverrides = Record<string, boolean>;

export const overrideKey = (
  category: NotificationPreferenceKey,
  channel: NotificationChannel
): string => `${category}:${channel}`;

/**
 * Charge les écarts au défaut d'une utilisatrice.
 *
 * Un échec de lecture renvoie un objet vide plutôt qu'une erreur : mieux vaut
 * envoyer selon les défauts que perdre la notification. Le cas inverse, taire
 * une notification transactionnelle sur une panne de lecture, serait pire.
 */
export const loadPreferences = async (
  userId: string
): Promise<ChannelOverrides> => {
  const { data, error } = await createAdminClient()
    .from("notification_preferences")
    .select("category_key, channel, enabled")
    .eq("user_id", userId);

  if (error) {
    console.error(`loadPreferences(${userId}) a échoué :`, error);
    return {};
  }

  const overrides: ChannelOverrides = {};
  for (const row of data ?? []) {
    overrides[`${row.category_key}:${row.channel}`] = row.enabled;
  }
  return overrides;
};

/**
 * Canaux effectifs d'un envoi. Ne peut qu'enlever des canaux à ceux que
 * l'événement déclare.
 */
export const resolveChannels = (
  preferenceKey: NotificationPreferenceKey,
  declared: NotificationChannel[],
  overrides: ChannelOverrides = {}
): NotificationChannel[] => {
  const category = PREFERENCE_CATEGORIES[preferenceKey];
  if (category.forced) return declared;

  return declared.filter((channel) => {
    const override = overrides[overrideKey(preferenceKey, channel)];
    return override ?? category.defaults[channel];
  });
};
```

- [ ] **Step 4: Lancer les tests**

Run: `pnpm test src/lib/notifications/preferences.spec.ts`
Expected: PASS, neuf tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications/preferences.ts src/lib/notifications/preferences.spec.ts
git commit -m "feat(notifications): lecture des preferences et resolution par categorie visible"
```

---

### Task 4: `notify()` respecte les préférences

**Files:**
- Modify: `src/lib/notifications/notify.ts`
- Test: `src/lib/notifications/notify.spec.ts`

**Interfaces:**
- Consumes: `loadPreferences`, `resolveChannels`
- Produces: `notify()` inchangé en signature, mais qui consulte les préférences du destinataire pour les événements marketing

- [ ] **Step 1: Ajouter les tests qui échouent**

Dans `src/lib/notifications/notify.spec.ts`, compléter le catalogue simulé avec un événement marketing, puis ajouter les tests. Remplacer le `vi.mock("./catalog", ...)` existant par :

```ts
vi.mock("./catalog", () => ({
  NOTIFICATION_CATALOG: {
    invoice_available: {
      key: "invoice_available",
      category: "transactional",
      preferenceKey: "paiements",
      channels: ["in_app", "email"],
      title: () => "Votre facture est disponible",
      body: (d: { number: string; amount: string }) =>
        `Facture ${d.number}, ${d.amount}.`,
      href: () => "/espace-client/factures",
      actions: (d: { invoice_id: string }) => [
        { label: "Voir la facture", href: `/factures/${d.invoice_id}` },
      ],
      email: (to: string, d: unknown) => sendInvoiceEmail(to, d),
    },
    admin_message: {
      key: "admin_message",
      category: "system",
      preferenceKey: "systeme",
      channels: ["in_app"],
      title: () => "Message de l'équipe",
    },
    replay_published: {
      key: "replay_published",
      category: "marketing",
      preferenceKey: "replays",
      channels: ["in_app", "email"],
      title: () => "Nouveau replay",
      email: (to: string, d: unknown) => sendReplayEmail(to, d),
    },
  },
}));
```

Ajouter le mock du sender, à côté de `sendInvoiceEmail` :

```ts
const sendReplayEmail = vi.fn();
```

Et le mock des préférences, avant l'import de `notify`. **`vi.hoisted` est obligatoire** : `vi.mock` est hissé en haut du fichier, un `const` ordinaire n'existerait pas encore au moment où la fabrique s'exécute, et le test échouerait sur `Cannot access 'loadPreferences' before initialization`.

```ts
const { loadPreferences } = vi.hoisted(() => ({
  loadPreferences: vi.fn().mockResolvedValue({}),
}));

vi.mock("./preferences", async (importOriginal) => {
  // `resolveChannels` reste le vrai : c'est lui qu'on veut voir appliquer les
  // ecarts renvoyes par le faux `loadPreferences`.
  const actual = await importOriginal<typeof import("./preferences")>();
  return { ...actual, loadPreferences };
});
```

Puis les tests :

```ts
describe("notify et les préférences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    sendReplayEmail.mockResolvedValue(undefined);
    loadPreferences.mockResolvedValue({});
  });

  it("ne lit pas les préférences pour un événement transactionnel", async () => {
    await notify("invoice_available", [{ userId: "u1", email: "a@b.fr" }], {
      invoice_id: "i1",
      number: "2026-0142",
      amount: "60,00 €",
    });
    expect(loadPreferences).not.toHaveBeenCalled();
  });

  it("lit les préférences pour un événement marketing", async () => {
    await notify("replay_published", [{ userId: "u1", email: "a@b.fr" }], {});
    expect(loadPreferences).toHaveBeenCalledWith("u1");
  });

  it("respecte une coupure du canal email sur un événement marketing", async () => {
    loadPreferences.mockResolvedValue({ "replays:email": false });

    await notify("replay_published", [{ userId: "u1", email: "a@b.fr" }], {});

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(sendReplayEmail).not.toHaveBeenCalled();
  });

  it("n'insère rien quand les deux canaux sont coupés", async () => {
    loadPreferences.mockResolvedValue({
      "replays:email": false,
      "replays:in_app": false,
    });

    await notify("replay_published", [{ userId: "u1", email: "a@b.fr" }], {});

    expect(mockUpsert).not.toHaveBeenCalled();
    expect(sendReplayEmail).not.toHaveBeenCalled();
  });

  it("lit les préférences de chaque destinataire séparément", async () => {
    loadPreferences
      .mockResolvedValueOnce({ "replays:email": false })
      .mockResolvedValueOnce({});

    await notify(
      "replay_published",
      [
        { userId: "u1", email: "a@b.fr" },
        { userId: "u2", email: "c@d.fr" },
      ],
      {}
    );

    expect(sendReplayEmail).toHaveBeenCalledTimes(1);
    expect(sendReplayEmail).toHaveBeenCalledWith("c@d.fr", {});
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm test src/lib/notifications/notify.spec.ts`
Expected: FAIL, `loadPreferences` n'est jamais appelé.

- [ ] **Step 3: Adapter `notify()`**

Dans `src/lib/notifications/notify.ts`, remplacer le calcul des canaux, aujourd'hui fait une fois avant la boucle, par un calcul par destinataire :

```ts
import { loadPreferences, resolveChannels } from "./preferences";
import { PREFERENCE_CATEGORIES } from "./preference-categories";
```

puis, dans le corps :

```ts
  const def = NOTIFICATION_CATALOG[event];
  const supabase = createAdminClient();
  const forced = PREFERENCE_CATEGORIES[def.preferenceKey].forced;

  for (const recipient of recipients) {
    // Une seule lecture par destinataire, et seulement quand elle peut changer
    // quelque chose : le transactionnel et le systeme ignorent les preferences,
    // les interroger serait une requete par notification pour rien.
    const overrides = forced ? {} : await loadPreferences(recipient.userId);
    const allowed = resolveChannels(def.preferenceKey, def.channels, overrides);
    const channels = options.channels
      ? allowed.filter((c) => options.channels!.includes(c))
      : allowed;

    // ... reste de la boucle inchangé
  }
```

- [ ] **Step 4: Lancer les tests**

Run: `pnpm test src/lib/notifications/ && pnpm lint`
Expected: PASS. Les tests de la tranche 1 passent toujours, `resolveChannels` étant appelé avec la nouvelle clé.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications/
git commit -m "feat(notifications): notify() consulte les preferences du destinataire"
```

---

### Task 5: Évaluateur de segments partagé

**Files:**
- Create: `src/lib/crm/segment-eval.ts`
- Test: `src/lib/crm/segment-eval.spec.ts`
- Modify: `src/types/database.ts`, `src/validations/crm.ts`, `src/app/(dashboard)/espace-consultante/crm/segments/actions.ts`

**Interfaces:**
- Consumes: `createAdminClient`
- Produces: `matchesConditions(client: SegmentClientStats, conditions: SegmentCondition[]): boolean`, `loadClientStats(options?: { consultantId?: string }): Promise<SegmentClientStats[]>`, type `SegmentClientStats` (déplacé ici depuis les actions)

Le type `SegmentClientStats` gagne deux champs, `tag_ids: string[]` et `has_accompagnement: boolean`, pour porter les nouvelles conditions.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/crm/segment-eval.spec.ts` :

```ts
import { describe, it, expect } from "vitest";
import { matchesConditions } from "./segment-eval";
import type { SegmentClientStats } from "./segment-eval";
import type { SegmentCondition } from "@/types/database";

const client = (over: Partial<SegmentClientStats> = {}): SegmentClientStats => ({
  id: "c1",
  first_name: "Camille",
  last_name: "D",
  email: "a@b.fr",
  booking_count: 2,
  total_spent_cents: 9000,
  accompagnement_count: 1,
  formation_count: 0,
  inactive_days: 10,
  days_since_registration: 90,
  score: 50,
  tag_ids: ["tag-instagram"],
  has_accompagnement: true,
  ...over,
});

describe("matchesConditions", () => {
  it("accepte une liste de conditions vide", () => {
    expect(matchesConditions(client(), [])).toBe(true);
  });

  it("applique les opérateurs numériques", () => {
    const cond = (op: string, value: number) =>
      [{ field: "booking_count", op, value }] as SegmentCondition[];
    expect(matchesConditions(client(), cond(">=", 2))).toBe(true);
    expect(matchesConditions(client(), cond(">=", 3))).toBe(false);
    expect(matchesConditions(client(), cond("<=", 2))).toBe(true);
    expect(matchesConditions(client(), cond("=", 2))).toBe(true);
    expect(matchesConditions(client(), cond("!=", 2))).toBe(false);
  });

  it("combine les conditions par ET", () => {
    expect(
      matchesConditions(client(), [
        { field: "booking_count", op: ">=", value: 2 },
        { field: "total_spent_cents", op: ">=", value: 10000 },
      ] as SegmentCondition[])
    ).toBe(false);
  });

  it("reconnaît un tag posé sur la cliente", () => {
    expect(
      matchesConditions(client(), [
        { field: "has_tag", op: "=", value: "tag-instagram" },
      ] as SegmentCondition[])
    ).toBe(true);
  });

  it("rejette un tag absent", () => {
    expect(
      matchesConditions(client(), [
        { field: "has_tag", op: "=", value: "tag-salon" },
      ] as SegmentCondition[])
    ).toBe(false);
  });

  it("sait exclure sur un tag", () => {
    expect(
      matchesConditions(client(), [
        { field: "has_tag", op: "!=", value: "tag-instagram" },
      ] as SegmentCondition[])
    ).toBe(false);
  });

  it("reconnaît la souscription à un accompagnement", () => {
    expect(
      matchesConditions(client(), [
        { field: "has_accompagnement", op: "=", value: true },
      ] as SegmentCondition[])
    ).toBe(true);
    expect(
      matchesConditions(client({ has_accompagnement: false }), [
        { field: "has_accompagnement", op: "=", value: true },
      ] as SegmentCondition[])
    ).toBe(false);
  });

  it("croise un tag et une souscription, le cas d'usage visé", () => {
    expect(
      matchesConditions(client(), [
        { field: "has_accompagnement", op: "=", value: true },
        { field: "has_tag", op: "=", value: "tag-instagram" },
      ] as SegmentCondition[])
    ).toBe(true);
  });

  it("ignore une condition dont le champ est inconnu plutôt que de tout accepter", () => {
    expect(
      matchesConditions(client(), [
        { field: "champ_inexistant", op: "=", value: 1 },
      ] as unknown as SegmentCondition[])
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/lib/crm/segment-eval.spec.ts`
Expected: FAIL, `Cannot find module './segment-eval'`.

- [ ] **Step 3: Élargir le type des conditions**

Dans `src/types/database.ts`, remplacer le bloc `SegmentConditionField` / `SegmentCondition` par :

```ts
export type NumericSegmentField =
  | "booking_count"
  | "total_spent_cents"
  | "accompagnement_count"
  | "formation_count"
  | "inactive_days"
  | "days_since_registration";

export type SegmentConditionField =
  | NumericSegmentField
  | "has_tag"
  | "has_accompagnement";

export type SegmentConditionOp = ">=" | "<=" | "=" | "!=";

/**
 * Union discriminée : `has_tag` porte un identifiant de tag et
 * `has_accompagnement` un booléen, là où les autres champs comparent des
 * nombres. Le stockage est en jsonb, les conditions numériques déjà
 * enregistrées restent donc valides telles quelles.
 */
export type SegmentCondition =
  | { field: NumericSegmentField; op: SegmentConditionOp; value: number }
  | { field: "has_tag"; op: "=" | "!="; value: string }
  | { field: "has_accompagnement"; op: "=" | "!="; value: boolean };
```

- [ ] **Step 4: Élargir la validation**

Dans `src/validations/crm.ts`, remplacer `segmentConditionSchema` par :

```ts
const NUMERIC_SEGMENT_FIELDS = [
  "booking_count",
  "total_spent_cents",
  "accompagnement_count",
  "formation_count",
  "inactive_days",
  "days_since_registration",
] as const;

const SEGMENT_OPS = [">=", "<=", "=", "!="] as const;
const EQUALITY_OPS = ["=", "!="] as const;

export const segmentConditionSchema = z.discriminatedUnion("field", [
  z.object({
    field: z.enum(NUMERIC_SEGMENT_FIELDS),
    op: z.enum(SEGMENT_OPS),
    value: z.number().min(0),
  }),
  z.object({
    field: z.literal("has_tag"),
    op: z.enum(EQUALITY_OPS),
    value: z.uuid("Tag invalide"),
  }),
  z.object({
    field: z.literal("has_accompagnement"),
    op: z.enum(EQUALITY_OPS),
    value: z.boolean(),
  }),
]);
```

Si la constante `SEGMENT_FIELDS` n'est plus référencée ailleurs, la supprimer.

- [ ] **Step 5: Écrire l'évaluateur partagé**

Créer `src/lib/crm/segment-eval.ts`. Le corps de `loadClientStats` reprend celui de `getConsultantClientStats` dans `src/app/(dashboard)/espace-consultante/crm/segments/actions.ts`, avec trois différences : `consultantId` devient facultatif, deux champs sont ajoutés, et la fonction ne dépend plus d'une session.

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import type { SegmentCondition } from "@/types/database";

export type SegmentClientStats = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  booking_count: number;
  total_spent_cents: number;
  accompagnement_count: number;
  formation_count: number;
  inactive_days: number;
  days_since_registration: number;
  score: number;
  tag_ids: string[];
  has_accompagnement: boolean;
};

const NUMERIC_FIELDS = new Set([
  "booking_count",
  "total_spent_cents",
  "accompagnement_count",
  "formation_count",
  "inactive_days",
  "days_since_registration",
]);

/**
 * Vrai quand la cliente satisfait **toutes** les conditions. Les conditions
 * sont combinées par ET : il n'y a pas de OU dans le modèle.
 *
 * Un champ inconnu fait échouer la condition plutôt que de la sauter : un
 * segment corrompu ne doit pas s'élargir silencieusement à toute la base.
 */
export const matchesConditions = (
  client: SegmentClientStats,
  conditions: SegmentCondition[]
): boolean =>
  conditions.every((cond) => {
    if (cond.field === "has_tag") {
      const present = client.tag_ids.includes(cond.value);
      return cond.op === "=" ? present : !present;
    }

    if (cond.field === "has_accompagnement") {
      return cond.op === "="
        ? client.has_accompagnement === cond.value
        : client.has_accompagnement !== cond.value;
    }

    if (!NUMERIC_FIELDS.has(cond.field)) return false;

    const val = client[cond.field] as number;
    switch (cond.op) {
      case ">=":
        return val >= cond.value;
      case "<=":
        return val <= cond.value;
      case "=":
        return val === cond.value;
      case "!=":
        return val !== cond.value;
      default:
        return false;
    }
  });
```

Ajouter ensuite `loadClientStats` dans le même fichier :

```ts
type LoadOptions = {
  /**
   * Restreint aux clientes de cette consultante. Omis, la fonction couvre
   * toutes les clientes : c'est le mode utilisé par le ciblage des
   * notifications, qui n'a ni session ni consultante de référence.
   */
  consultantId?: string;
};

export const loadClientStats = async (
  options: LoadOptions = {}
): Promise<SegmentClientStats[]> => {
  const supabase = createAdminClient();
  const { consultantId } = options;

  let bookingsQuery = supabase
    .from("bookings")
    .select("client_id, starts_at, status")
    .not("status", "eq", "cancelled");
  if (consultantId) bookingsQuery = bookingsQuery.eq("consultant_id", consultantId);

  let accompagnementsQuery = supabase.from("accompagnements").select("id");
  if (consultantId)
    accompagnementsQuery = accompagnementsQuery.eq("consultant_id", consultantId);

  const [bookingsRes, accompagnementIdsRes] = await Promise.all([
    bookingsQuery,
    accompagnementsQuery,
  ]);

  const accompagnementIds = (accompagnementIdsRes.data ?? []).map((a) => a.id);

  const enrollmentsRes =
    accompagnementIds.length > 0
      ? await supabase
          .from("accompagnement_enrollments")
          .select("client_id, enrolled_at")
          .in("accompagnement_id", accompagnementIds)
      : { data: [] as { client_id: string; enrolled_at: string }[] };

  const clientIds = [
    ...new Set([
      ...(bookingsRes.data ?? []).map((b) => b.client_id),
      ...(enrollmentsRes.data ?? []).map((e) => e.client_id),
    ]),
  ];

  if (clientIds.length === 0) return [];

  const [profilesRes, paymentsRes, eventsRes, tagsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, created_at")
      .in("id", clientIds)
      .is("deleted_at", null),
    consultantId
      ? supabase
          .from("payments")
          .select("client_id, amount_cents")
          .eq("consultant_id", consultantId)
          .eq("status", "succeeded")
          .in("client_id", clientIds)
      : supabase
          .from("payments")
          .select("client_id, amount_cents")
          .eq("status", "succeeded")
          .in("client_id", clientIds),
    supabase
      .from("formation_registrations")
      .select("client_id")
      .eq("status", "confirmed")
      .in("client_id", clientIds),
    supabase
      .from("crm_contact_tags")
      .select("client_id, tag_id")
      .in("client_id", clientIds),
  ]);

  const bookingCount = new Map<string, number>();
  const lastActivity = new Map<string, Date>();
  for (const b of bookingsRes.data ?? []) {
    bookingCount.set(b.client_id, (bookingCount.get(b.client_id) ?? 0) + 1);
    const d = new Date(b.starts_at);
    if (!lastActivity.has(b.client_id) || d > lastActivity.get(b.client_id)!) {
      lastActivity.set(b.client_id, d);
    }
  }

  const totalSpent = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    totalSpent.set(p.client_id, (totalSpent.get(p.client_id) ?? 0) + p.amount_cents);
  }

  const accompagnementCount = new Map<string, number>();
  for (const e of enrollmentsRes.data ?? []) {
    accompagnementCount.set(
      e.client_id,
      (accompagnementCount.get(e.client_id) ?? 0) + 1
    );
    const d = new Date(e.enrolled_at);
    if (!lastActivity.has(e.client_id) || d > lastActivity.get(e.client_id)!) {
      lastActivity.set(e.client_id, d);
    }
  }

  const formationCount = new Map<string, number>();
  for (const e of eventsRes.data ?? []) {
    formationCount.set(e.client_id, (formationCount.get(e.client_id) ?? 0) + 1);
  }

  const tagIds = new Map<string, string[]>();
  for (const t of tagsRes.data ?? []) {
    tagIds.set(t.client_id, [...(tagIds.get(t.client_id) ?? []), t.tag_id]);
  }

  const now = Date.now();

  return (profilesRes.data ?? []).map((p) => {
    const last = lastActivity.get(p.id);
    return {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
      booking_count: bookingCount.get(p.id) ?? 0,
      total_spent_cents: totalSpent.get(p.id) ?? 0,
      accompagnement_count: accompagnementCount.get(p.id) ?? 0,
      formation_count: formationCount.get(p.id) ?? 0,
      inactive_days: last
        ? Math.floor((now - last.getTime()) / 86400000)
        : 9999,
      days_since_registration: Math.floor(
        (now - new Date(p.created_at).getTime()) / 86400000
      ),
      // Le score n'est calculable que pour une consultante donnee : la fonction
      // `calculate_client_score` prend les deux identifiants. Hors contexte
      // consultante, il vaut 0 et aucun segment ne devrait s'y fier.
      score: 0,
      tag_ids: tagIds.get(p.id) ?? [],
      has_accompagnement: (accompagnementCount.get(p.id) ?? 0) > 0,
    };
  });
};
```

- [ ] **Step 6: Faire déléguer les actions du CRM**

Dans `src/app/(dashboard)/espace-consultante/crm/segments/actions.ts` :

1. Supprimer `matchesConditions` et `getConsultantClientStats`.
2. Supprimer la déclaration locale de `SegmentClientStats`, et la réexporter depuis le module partagé pour ne pas casser ses consommateurs :

```ts
import { loadClientStats, matchesConditions } from "@/lib/crm/segment-eval";
export type { SegmentClientStats } from "@/lib/crm/segment-eval";
```

3. Dans `evaluateSegment` et `evaluateAllSegments`, remplacer `getConsultantClientStats(user.id)` par `loadClientStats({ consultantId: user.id })`.

Le score renvoyé par le module partagé vaut toujours 0. Si un affichage du CRM s'appuie sur `score`, recalculer les scores dans l'action, après l'appel à `loadClientStats`, avec la RPC `calculate_client_score` déjà utilisée aujourd'hui.

- [ ] **Step 7: Lancer les tests**

Run: `pnpm test src/lib/crm/ "src/app/(dashboard)/espace-consultante/crm/" && pnpm lint`
Expected: PASS, y compris `segments/actions.spec.ts` qui couvre déjà les opérateurs numériques.

- [ ] **Step 8: Commit**

```bash
git add src/lib/crm src/types/database.ts src/validations/crm.ts "src/app/(dashboard)/espace-consultante/crm/segments/actions.ts"
git commit -m "refactor(crm): evaluateur de segments partage, avec conditions tag et accompagnement"
```

---

### Task 6: Les nouvelles conditions dans le formulaire de segment

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/crm/segments/_components/segment-form.tsx`

**Interfaces:**
- Consumes: `SegmentCondition` élargi de la tâche 5, `getTags()` de `src/app/(dashboard)/espace-consultante/crm/actions.ts`

Pas de test Vitest : composant React, environnement `node`.

- [ ] **Step 1: Étendre les libellés de champ**

Dans `segment-form.tsx`, compléter `FIELD_LABELS` :

```tsx
const FIELD_LABELS: Record<string, string> = {
  booking_count: "Nombre de consultations",
  total_spent_cents: "Total dépensé (centimes)",
  accompagnement_count: "Nombre d'accompagnements",
  formation_count: "Nombre de formations",
  inactive_days: "Jours d'inactivité",
  days_since_registration: "Jours depuis l'inscription",
  has_tag: "Porte le libellé",
  has_accompagnement: "A souscrit un accompagnement",
};
```

- [ ] **Step 2: Adapter la saisie de la valeur selon le champ**

Le champ de valeur est aujourd'hui un `<Input type="number">`. Il devient conditionnel. Ajouter la prop `tags` au composant (`{ id: string; name: string }[]`, chargée par la page parente via `getTags()`), puis remplacer le champ de valeur par :

```tsx
{condition.field === "has_tag" ? (
  <Select
    value={String(condition.value)}
    onValueChange={(value) => updateCondition(index, { value })}
  >
    <SelectTrigger className="w-48">
      <SelectValue placeholder="Choisir un libellé" />
    </SelectTrigger>
    <SelectContent>
      {tags.map((tag) => (
        <SelectItem key={tag.id} value={tag.id}>
          {tag.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
) : condition.field === "has_accompagnement" ? (
  <Select
    value={condition.value ? "true" : "false"}
    onValueChange={(value) => updateCondition(index, { value: value === "true" })}
  >
    <SelectTrigger className="w-32">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="true">Oui</SelectItem>
      <SelectItem value="false">Non</SelectItem>
    </SelectContent>
  </Select>
) : (
  <Input
    type="number"
    min={0}
    value={Number(condition.value)}
    onChange={(e) => updateCondition(index, { value: Number(e.target.value) })}
    className="w-32"
  />
)}
```

- [ ] **Step 3: Réinitialiser la valeur au changement de champ**

Changer de champ doit remettre une valeur du bon type, sinon la validation Zod rejette la condition. Dans le `onValueChange` du sélecteur de champ :

```tsx
onValueChange={(field) => {
  // Changer de champ change le type de la valeur : un identifiant de tag
  // laisse dans une condition numerique ferait echouer la validation a
  // l'enregistrement, avec un message peu parlant.
  const value =
    field === "has_tag" ? "" : field === "has_accompagnement" ? true : 0;
  const op = field === "has_tag" || field === "has_accompagnement" ? "=" : ">=";
  updateCondition(index, { field, op, value } as SegmentCondition);
}}
```

Restreindre aussi la liste d'opérateurs à `=` et `!=` pour ces deux champs.

- [ ] **Step 4: Ajouter un préréglage pour le cas d'usage visé**

Dans `PRESET_SEGMENTS`, ajouter :

```tsx
  {
    label: "Ayants droit d'un accompagnement",
    color: "#2F5D50",
    conditions: [
      { field: "has_accompagnement", op: "=", value: true },
    ] as SegmentCondition[],
  },
```

- [ ] **Step 5: Vérifier**

Run: `pnpm lint && pnpm build`
Expected: aucune erreur.

Vérification manuelle : créer un segment « Instagram et accompagnement » avec les deux conditions, l'enregistrer, rouvrir la fiche et constater que les valeurs sont bien rechargées.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/espace-consultante/crm/segments/_components/segment-form.tsx"
git commit -m "feat(crm): conditions de segment par libelle et par accompagnement"
```

---

### Task 7: Libellés globaux

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/crm/actions.ts`, `src/app/(dashboard)/espace-consultante/crm/_components/tags-manager.tsx`
- Test: `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts`

**Interfaces:**
- Consumes: `createTag(data)` existant
- Produces: `createTag(data, scope?: "personal" | "global")`, `getTags()` qui remonte les tags personnels **et** globaux

Le schéma le permet déjà : `crm_tags.consultant_id` est nullable. Ce qui manque, c'est de pouvoir en créer un et de le voir.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts`, ajouter :

```ts
it("crée un libellé global sans consultante rattachée", async () => {
  mockGetSessionUser.mockResolvedValue({
    id: "admin-1",
    email: "a@b.fr",
    roles: ["admin"],
  });

  await createTag({ name: "Vient d'Instagram", color: "#2F5D50" }, "global");

  expect(insertCalls.at(-1)).toMatchObject({
    table: "crm_tags",
    data: { name: "Vient d'Instagram", consultant_id: null },
  });
});

it("refuse un libellé global à une consultante non administratrice", async () => {
  mockGetSessionUser.mockResolvedValue({
    id: "consultant-1",
    email: "c@b.fr",
    roles: ["consultant"],
  });

  const result = await createTag({ name: "Test" }, "global");

  expect(result.success).toBe(false);
});

it("rattache par défaut le libellé à la consultante", async () => {
  mockGetSessionUser.mockResolvedValue({
    id: "consultant-1",
    email: "c@b.fr",
    roles: ["consultant"],
  });

  await createTag({ name: "Suivi renforcé" });

  expect(insertCalls.at(-1)).toMatchObject({
    data: { consultant_id: "consultant-1" },
  });
});
```

Si le fichier de spec n'expose pas `insertCalls` ni `mockGetSessionUser`, reprendre le style de mock de `src/app/(dashboard)/espace-consultante/reservations/actions.spec.ts` : un `createChain(table)` qui empile les insertions dans un tableau, et `vi.mock("@/lib/auth")`.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm test "src/app/(dashboard)/espace-consultante/crm/actions.spec.ts"`
Expected: FAIL, `createTag` ne prend qu'un argument.

- [ ] **Step 3: Adapter `createTag`**

```ts
export const createTag = async (
  data: unknown,
  scope: "personal" | "global" = "personal",
): Promise<ActionResult<{ id: string }>> => {
  const user = await requireConsultant();
  const parsed = crmTagSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  // Un libelle global sert au ciblage de toute la base : le creer engage plus
  // qu'un libelle personnel, il reste donc reserve a l'administration.
  if (scope === "global" && !user.roles.includes("admin")) {
    return {
      success: false,
      error: "Seule l'administration peut créer un libellé global",
    };
  }

  const supabase = createAdminClient();
  const { data: tag, error } = await supabase
    .from("crm_tags")
    .insert({
      name: parsed.data.name,
      color: parsed.data.color ?? null,
      consultant_id: scope === "global" ? null : user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Erreur lors de la création du tag" };
  }

  revalidatePath("/espace-consultante/crm");
  return { success: true, data: tag };
};
```

- [ ] **Step 4: Remonter les libellés globaux à la lecture**

Dans `getTags()` (même fichier), remplacer le filtre `.eq("consultant_id", user.id)` par :

```ts
    .or(`consultant_id.eq.${user.id},consultant_id.is.null`)
```

- [ ] **Step 5: Exposer le choix dans l'interface**

Dans `tags-manager.tsx`, ajouter une case à cocher « Libellé global, visible par toute l'équipe », affichée seulement si l'utilisatrice est administratrice, et passer `"global"` en second argument de `createTag`. Marquer les tags globaux dans la liste, par exemple par le suffixe « (global) », pour qu'on ne les confonde pas avec les siens.

- [ ] **Step 6: Lancer les tests**

Run: `pnpm test "src/app/(dashboard)/espace-consultante/crm/" && pnpm lint && pnpm build`
Expected: PASS, build vert.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(dashboard)/espace-consultante/crm/"
git commit -m "feat(crm): libelles globaux, creables par l'administration"
```

---

### Task 8: `resolveAudience()`

**Files:**
- Create: `src/lib/notifications/audience.ts`
- Test: `src/lib/notifications/audience.spec.ts`
- Modify: `src/lib/notifications/index.ts`

**Interfaces:**
- Consumes: `loadClientStats`, `matchesConditions` de `@/lib/crm/segment-eval`, `getRoleRecipients` de `./recipients`, `createAdminClient`
- Produces: `type AudienceRule`, `resolveAudience(event, rule, options?): Promise<NotificationRecipient[]>`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/notifications/audience.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { loadClientStats, matchesConditions, getRoleRecipients, mockInsert } =
  vi.hoisted(() => ({
    loadClientStats: vi.fn(),
    matchesConditions: vi.fn(),
    getRoleRecipients: vi.fn(),
    mockInsert: vi.fn(),
  }));

vi.mock("@/lib/crm/segment-eval", () => ({ loadClientStats, matchesConditions }));
vi.mock("./recipients", () => ({ getRoleRecipients }));

const segmentRow = { conditions: [{ field: "has_accompagnement", op: "=", value: true }] };
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) =>
      table === "notification_broadcasts"
        ? { insert: mockInsert }
        : {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: segmentRow, error: null }),
              }),
            }),
          },
  }),
}));

import { resolveAudience } from "./audience";

const clients = [
  { id: "c1", email: "c1@b.fr" },
  { id: "c2", email: "c2@b.fr" },
];

describe("resolveAudience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    loadClientStats.mockResolvedValue(clients);
    matchesConditions.mockReturnValue(true);
    getRoleRecipients.mockResolvedValue([{ userId: "admin-1", email: "a@b.fr" }]);
  });

  it("renvoie le destinataire unique sans requête", async () => {
    const result = await resolveAudience("replay_published", {
      kind: "recipient",
      userId: "u1",
      email: "u1@b.fr",
    });

    expect(result).toEqual([{ userId: "u1", email: "u1@b.fr" }]);
    expect(loadClientStats).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("délègue la règle de rôle à getRoleRecipients", async () => {
    const result = await resolveAudience("admin_purchase", {
      kind: "role",
      role: "admin",
    });

    expect(result).toEqual([{ userId: "admin-1", email: "a@b.fr" }]);
  });

  it("filtre les clientes par les conditions du segment", async () => {
    matchesConditions.mockImplementation((c: { id: string }) => c.id === "c2");

    const result = await resolveAudience("replay_published", {
      kind: "segment",
      segmentId: "seg-1",
    });

    expect(result).toEqual([{ userId: "c2", email: "c2@b.fr" }]);
  });

  it("journalise un envoi ciblé avec son effectif", async () => {
    await resolveAudience("replay_published", { kind: "segment", segmentId: "seg-1" });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "replay_published",
        recipient_count: 2,
        truncated: false,
      })
    );
  });

  it("plafonne la liste et signale la coupure", async () => {
    const result = await resolveAudience(
      "replay_published",
      { kind: "segment", segmentId: "seg-1" },
      { maxRecipients: 1 }
    );

    expect(result).toHaveLength(1);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ recipient_count: 1, truncated: true })
    );
  });

  it("renvoie une liste vide quand le segment est introuvable", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
        }),
      }),
    } as never);

    const result = await resolveAudience("replay_published", {
      kind: "segment",
      segmentId: "inconnu",
    });

    expect(result).toEqual([]);
  });

  it("cible les détenteurs d'un accompagnement sans passer par un segment", async () => {
    loadClientStats.mockResolvedValue([
      { id: "c1", email: "c1@b.fr", has_accompagnement: true },
      { id: "c2", email: "c2@b.fr", has_accompagnement: false },
    ]);

    const result = await resolveAudience("replay_published", {
      kind: "accompagnement_holders",
    });

    expect(result).toEqual([{ userId: "c1", email: "c1@b.fr" }]);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/lib/notifications/audience.spec.ts`
Expected: FAIL, `Cannot find module './audience'`.

- [ ] **Step 3: Écrire l'implémentation**

Créer `src/lib/notifications/audience.ts` :

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import { loadClientStats, matchesConditions } from "@/lib/crm/segment-eval";
import { getRoleRecipients } from "./recipients";
import type { SegmentCondition } from "@/types/database";
import type { NotificationRecipient } from "./types";

export type AudienceRule =
  | { kind: "recipient"; userId: string; email?: string | null }
  | { kind: "role"; role: "admin" | "consultant" }
  | { kind: "segment"; segmentId: string }
  /** Toutes les clientes ayant souscrit au moins un accompagnement. */
  | { kind: "accompagnement_holders" };

type ResolveOptions = {
  /** Plafond de destinataires. Au-delà, la liste est coupée et la coupure journalisée. */
  maxRecipients?: number;
};

const DEFAULT_MAX_RECIPIENTS = 2000;

/**
 * Traduit une règle d'audience en liste de destinataires.
 *
 * Tout ce qui dépasse le destinataire unique est journalisé dans
 * `notification_broadcasts` : une erreur de condition sur un segment large,
 * c'est un envoi à toute la base, et on préfère pouvoir le constater plutôt
 * que de le découvrir par les réponses.
 */
export const resolveAudience = async (
  event: string,
  rule: AudienceRule,
  options: ResolveOptions = {}
): Promise<NotificationRecipient[]> => {
  if (rule.kind === "recipient") {
    return [{ userId: rule.userId, email: rule.email }];
  }

  const max = options.maxRecipients ?? DEFAULT_MAX_RECIPIENTS;
  let resolved: NotificationRecipient[] = [];

  if (rule.kind === "role") {
    resolved = await getRoleRecipients(rule.role);
  } else {
    const stats = await loadClientStats();

    if (rule.kind === "accompagnement_holders") {
      resolved = stats
        .filter((c) => c.has_accompagnement)
        .map((c) => ({ userId: c.id, email: c.email }));
    } else {
      const { data: segment } = await createAdminClient()
        .from("crm_segments")
        .select("conditions")
        .eq("id", rule.segmentId)
        .maybeSingle();

      // Segment introuvable : ne rien envoyer. Traiter l'absence de conditions
      // comme « aucune condition » toucherait toute la base.
      if (!segment) return [];

      const conditions = segment.conditions as SegmentCondition[];
      resolved = stats
        .filter((client) => matchesConditions(client, conditions))
        .map((c) => ({ userId: c.id, email: c.email }));
    }
  }

  const truncated = resolved.length > max;
  const recipients = truncated ? resolved.slice(0, max) : resolved;

  try {
    await createAdminClient()
      .from("notification_broadcasts")
      .insert({
        event,
        rule,
        recipient_count: recipients.length,
        truncated,
      });
  } catch (error) {
    // Le journal ne doit pas empecher l'envoi.
    console.error(`resolveAudience: journalisation échouée (${event}) :`, error);
  }

  return recipients;
};
```

- [ ] **Step 4: Réexporter**

Dans `src/lib/notifications/index.ts`, ajouter :

```ts
export { resolveAudience } from "./audience";
export type { AudienceRule } from "./audience";
```

- [ ] **Step 5: Lancer les tests**

Run: `pnpm test src/lib/notifications/audience.spec.ts && pnpm lint`
Expected: PASS, sept tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/notifications/audience.ts src/lib/notifications/audience.spec.ts src/lib/notifications/index.ts
git commit -m "feat(notifications): resolveAudience, avec plafond et journalisation"
```

---

### Task 9: Écran de préférences

**Files:**
- Create: `src/app/(public)/espace-client/profil/notification-actions.ts`
- Create: `src/app/(public)/espace-client/profil/_components/notification-preferences.tsx`
- Modify: `src/app/(public)/espace-client/profil/page.tsx`
- Test: `src/app/(public)/espace-client/profil/notification-actions.spec.ts`

**Interfaces:**
- Consumes: `CLIENT_PREFERENCE_CATEGORIES`, `loadPreferences`, `getSupabaseAndUser`
- Produces: `setNotificationPreference(categoryKey, channel, enabled): Promise<ActionResult>`, `getNotificationPreferences(): Promise<ChannelOverrides>`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/app/(public)/espace-client/profil/notification-actions.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpsert, mockGetSessionUser } = vi.hoisted(() => ({
  mockUpsert: vi.fn(),
  mockGetSessionUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: mockGetSessionUser }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ upsert: mockUpsert }) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setNotificationPreference } from "./notification-actions";

describe("setNotificationPreference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    mockGetSessionUser.mockResolvedValue({
      id: "u1",
      email: "a@b.fr",
      roles: ["client"],
    });
  });

  it("refuse sans session", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const result = await setNotificationPreference("replays", "email", false);
    expect(result.success).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("enregistre l'écart pour l'utilisatrice connectée", async () => {
    const result = await setNotificationPreference("replays", "email", false);

    expect(result.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        category_key: "replays",
        channel: "email",
        enabled: false,
      }),
      { onConflict: "user_id,category_key,channel" }
    );
  });

  it("refuse de modifier une catégorie imposée", async () => {
    const result = await setNotificationPreference("paiements", "email", false);

    expect(result.success).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("refuse une catégorie inconnue", async () => {
    const result = await setNotificationPreference(
      "inexistante" as never,
      "email",
      false
    );

    expect(result.success).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("refuse un canal inconnu", async () => {
    const result = await setNotificationPreference(
      "replays",
      "sms" as never,
      false
    );

    expect(result.success).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/app/\(public\)/espace-client/profil/notification-actions.spec.ts`
Expected: FAIL, module absent.

- [ ] **Step 3: Écrire la server action**

Créer `src/app/(public)/espace-client/profil/notification-actions.ts` :

```ts
"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPreferences } from "@/lib/notifications/preferences";
import { PREFERENCE_CATEGORIES } from "@/lib/notifications/preference-categories";
import type { NotificationPreferenceKey } from "@/lib/notifications/preference-categories";
import type { ChannelOverrides } from "@/lib/notifications/preferences";
import type { NotificationChannel } from "@/lib/notifications/types";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

const CHANNELS: NotificationChannel[] = ["in_app", "email"];

export const getNotificationPreferences = async (): Promise<ChannelOverrides> => {
  const user = await getSessionUser();
  if (!user) return {};
  return loadPreferences(user.id);
};

/**
 * Enregistre un écart au défaut. Les catégories imposées sont refusées côté
 * serveur, pas seulement grisées dans l'interface : l'action est appelable
 * directement.
 */
export const setNotificationPreference = async (
  categoryKey: NotificationPreferenceKey,
  channel: NotificationChannel,
  enabled: boolean,
): Promise<ActionResult> => {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const category = PREFERENCE_CATEGORIES[categoryKey];
  if (!category) return { success: false, error: "Catégorie inconnue" };
  if (category.forced) {
    return {
      success: false,
      error: "Cette catégorie est toujours envoyée",
    };
  }
  if (!CHANNELS.includes(channel)) {
    return { success: false, error: "Canal inconnu" };
  }

  const { error } = await createAdminClient()
    .from("notification_preferences")
    .upsert(
      {
        user_id: user.id,
        category_key: categoryKey,
        channel,
        enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,category_key,channel" },
    );

  if (error) {
    return { success: false, error: "Erreur lors de l'enregistrement" };
  }

  revalidatePath("/espace-client/profil");
  return { success: true };
};
```

- [ ] **Step 4: Écrire le composant**

Créer `src/app/(public)/espace-client/profil/_components/notification-preferences.tsx` :

```tsx
"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { CLIENT_PREFERENCE_CATEGORIES } from "@/lib/notifications/preference-categories";
import { setNotificationPreference } from "../notification-actions";
import type { NotificationChannel } from "@/lib/notifications/types";

const CHANNELS: { key: NotificationChannel; label: string }[] = [
  { key: "in_app", label: "Sur le site" },
  { key: "email", label: "Par email" },
];

type Props = { overrides: Record<string, boolean> };

/**
 * Les catégories imposées restent affichées, en lecture seule : les cacher
 * ferait croire qu'on envoie des choses non déclarées.
 */
export const NotificationPreferences = ({ overrides }: Props) => {
  const [state, setState] = useState(overrides);
  const [, startTransition] = useTransition();

  const isOn = (key: string, channel: NotificationChannel, fallback: boolean) =>
    state[`${key}:${channel}`] ?? fallback;

  const toggle = (
    key: (typeof CLIENT_PREFERENCE_CATEGORIES)[number]["key"],
    channel: NotificationChannel,
    next: boolean,
  ) => {
    setState((prev) => ({ ...prev, [`${key}:${channel}`]: next }));
    startTransition(async () => {
      const result = await setNotificationPreference(key, channel, next);
      // Rollback visuel : sans cela, un refus serveur laisserait la bascule
      // dans un etat que la base ne connait pas.
      if (!result.success) {
        setState((prev) => ({ ...prev, [`${key}:${channel}`]: !next }));
      }
    });
  };

  const forced = CLIENT_PREFERENCE_CATEGORIES.filter((c) => c.forced);
  const optional = CLIENT_PREFERENCE_CATEGORIES.filter((c) => !c.forced);

  return (
    <div className="space-y-6">
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Toujours envoyé
        </p>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {forced.map((cat) => (
            <li key={cat.key} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{cat.label}</p>
                {cat.hint && (
                  <p className="text-xs text-muted-foreground">{cat.hint}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground">Toujours envoyé</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          À votre choix
        </p>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {optional.map((cat) => (
            <li key={cat.key} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{cat.label}</p>
                {cat.hint && (
                  <p className="text-xs text-muted-foreground">{cat.hint}</p>
                )}
              </div>
              <div className="flex items-center gap-6">
                {CHANNELS.map((channel) => (
                  <label key={channel.key} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {channel.label}
                    </span>
                    <Switch
                      checked={isOn(cat.key, channel.key, cat.defaults[channel.key])}
                      onCheckedChange={(next) => toggle(cat.key, channel.key, next)}
                    />
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
```

Si `src/components/ui/switch.tsx` n'existe pas, l'ajouter avec `npx shadcn@latest add switch`.

- [ ] **Step 5: Brancher dans la page de profil**

Dans `src/app/(public)/espace-client/profil/page.tsx`, ajouter les imports et une carte après « Informations personnelles » :

```tsx
import { getNotificationPreferences } from "./notification-actions";
import { NotificationPreferences } from "./_components/notification-preferences";

// dans le composant, avant le return :
const preferences = await getNotificationPreferences();

// dans le JSX :
<Card className="max-w-3xl">
  <CardHeader>
    <CardTitle className="font-serif text-lg">Mes notifications</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="mb-4 text-sm text-muted-foreground">
      Vous gardez la main sur tout ce qui n&apos;est pas lié à un achat ou à un
      rendez-vous.
    </p>
    <NotificationPreferences overrides={preferences} />
  </CardContent>
</Card>
```

- [ ] **Step 6: Vérifier**

Run: `pnpm test src/app/\(public\)/espace-client/profil/ && pnpm lint && pnpm build`
Expected: PASS, build vert.

Vérification manuelle : couper « Nouveaux replays » par email, recharger la page, constater que la bascule reste en position coupée.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(public)/espace-client/profil"
git commit -m "feat(notifications): ecran de preferences dans l'espace client"
```

---

### Task 10: Désinscription depuis un email

**Files:**
- Create: `src/app/(public)/notifications/desinscription/page.tsx`
- Create: `src/lib/notifications/unsubscribe.ts`
- Test: `src/lib/notifications/unsubscribe.spec.ts`

**Interfaces:**
- Consumes: `profiles.notification_unsubscribe_token` de la tâche 1, `PREFERENCE_CATEGORIES`
- Produits: `unsubscribeByToken(token, categoryKey): Promise<{ ok: boolean; label?: string }>`, `buildUnsubscribeUrl(token, categoryKey): string`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/notifications/unsubscribe.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockMaybeSingle, mockUpsert } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
  mockUpsert: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) =>
      table === "profiles"
        ? { select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }) }
        : { upsert: mockUpsert },
  }),
}));

import { unsubscribeByToken, buildUnsubscribeUrl } from "./unsubscribe";

describe("unsubscribeByToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: { id: "u1" }, error: null });
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("coupe le canal email de la catégorie visée", async () => {
    const result = await unsubscribeByToken("tok-1", "replays");

    expect(result.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        category_key: "replays",
        channel: "email",
        enabled: false,
      }),
      { onConflict: "user_id,category_key,channel" }
    );
  });

  it("refuse un jeton inconnu", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await unsubscribeByToken("inconnu", "replays");

    expect(result.ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("refuse de désinscrire d'une catégorie imposée", async () => {
    const result = await unsubscribeByToken("tok-1", "paiements");

    expect(result.ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("refuse une catégorie inconnue", async () => {
    const result = await unsubscribeByToken("tok-1", "inexistante");

    expect(result.ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe("buildUnsubscribeUrl", () => {
  it("construit une URL absolue portant le jeton et la catégorie", () => {
    const url = buildUnsubscribeUrl("tok-1", "replays");
    expect(url).toContain("/notifications/desinscription");
    expect(url).toContain("token=tok-1");
    expect(url).toContain("categorie=replays");
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/lib/notifications/unsubscribe.spec.ts`
Expected: FAIL, module absent.

- [ ] **Step 3: Écrire l'implémentation**

Créer `src/lib/notifications/unsubscribe.ts` :

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import { siteConfig } from "@/config/site";
import { PREFERENCE_CATEGORIES } from "./preference-categories";
import type { NotificationPreferenceKey } from "./preference-categories";

export const buildUnsubscribeUrl = (
  token: string,
  categoryKey: NotificationPreferenceKey
): string =>
  `${siteConfig.url}/notifications/desinscription?token=${token}&categorie=${categoryKey}`;

/**
 * Coupe le canal email d'une catégorie, depuis un lien d'email, donc sans
 * session. Le jeton est opaque et unique par profil : une URL portant
 * l'identifiant en clair permettrait de désabonner autrui, comme pour la
 * newsletter (`00060`).
 */
export const unsubscribeByToken = async (
  token: string,
  categoryKey: string
): Promise<{ ok: boolean; label?: string }> => {
  const category = PREFERENCE_CATEGORIES[categoryKey as NotificationPreferenceKey];
  if (!category || category.forced) return { ok: false };

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("notification_unsubscribe_token", token)
    .maybeSingle();

  if (!profile) return { ok: false };

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: profile.id,
      category_key: categoryKey,
      channel: "email",
      enabled: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,category_key,channel" }
  );

  if (error) return { ok: false };
  return { ok: true, label: category.label };
};
```

- [ ] **Step 4: Écrire la page**

Créer `src/app/(public)/notifications/desinscription/page.tsx` :

```tsx
import { Metadata } from "next";
import Link from "next/link";
import { unsubscribeByToken } from "@/lib/notifications/unsubscribe";

export const metadata: Metadata = {
  title: "Désinscription",
  robots: { index: false, follow: false },
};

const DesinscriptionPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; categorie?: string }>;
}) => {
  const { token, categorie } = await searchParams;
  const result =
    token && categorie
      ? await unsubscribeByToken(token, categorie)
      : { ok: false };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        {result.ok ? "C'est fait" : "Lien invalide"}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {result.ok
          ? `Vous ne recevrez plus d'email pour la catégorie « ${result.label} ». Les emails liés à vos rendez-vous et à vos achats continuent de vous être envoyés.`
          : "Ce lien de désinscription n'est plus valide. Vous pouvez régler vos préférences depuis votre espace."}
      </p>
      <Link
        href="/espace-client/profil"
        className="mt-6 rounded-md bg-primary-green px-5 py-2.5 text-sm font-semibold text-white"
      >
        Gérer mes préférences
      </Link>
    </div>
  );
};

export default DesinscriptionPage;
```

- [ ] **Step 5: Vérifier**

Run: `pnpm test src/lib/notifications/unsubscribe.spec.ts && pnpm lint && pnpm build`
Expected: PASS, build vert.

- [ ] **Step 6: Commit**

```bash
git add src/lib/notifications/unsubscribe.ts src/lib/notifications/unsubscribe.spec.ts "src/app/(public)/notifications"
git commit -m "feat(notifications): desinscription par jeton depuis un email"
```

---

### Task 11: Premier événement marketing, le replay d'atelier

**Files:**
- Modify: `src/lib/notifications/types.ts`, `src/lib/notifications/catalog.ts`, `src/lib/emails/send.ts`, `src/app/(dashboard)/admin/replay-lives/actions.ts`, `src/app/(dashboard)/admin/replay-lives/_components/` (formulaire)
- Test: `src/app/(dashboard)/admin/replay-lives/actions.spec.ts`

**Interfaces:**
- Consumes: `notify`, `resolveAudience`, `buildUnsubscribeUrl`
- Produces: événement `replay_published`, `sendReplayPublished(to, variables)`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/app/(dashboard)/admin/replay-lives/actions.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { notify, resolveAudience, mockGetSessionUser, insertCalls } = vi.hoisted(
  () => ({
    notify: vi.fn().mockResolvedValue(undefined),
    resolveAudience: vi.fn().mockResolvedValue([{ userId: "c1", email: "c1@b.fr" }]),
    mockGetSessionUser: vi.fn(),
    insertCalls: [] as unknown[],
  })
);

vi.mock("@/lib/notifications", () => ({ notify, resolveAudience }));
vi.mock("@/lib/auth", () => ({ getSessionUser: mockGetSessionUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (data: unknown) => {
        insertCalls.push(data);
        return {
          select: () => ({
            single: () =>
              Promise.resolve({ data: { id: "replay-1" }, error: null }),
          }),
        };
      },
    }),
  }),
}));

import { createReplayLive } from "./actions";

const replay = {
  title: "Atelier de juillet",
  vimeo_url: "https://vimeo.com/123",
  live_date: "2026-07-01",
};

describe("createReplayLive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls.length = 0;
    mockGetSessionUser.mockResolvedValue({
      id: "admin-1",
      email: "a@b.fr",
      roles: ["admin"],
    });
  });

  it("notifie les détenteurs d'un accompagnement quand on le demande", async () => {
    await createReplayLive(replay, { notifyHolders: true });

    expect(resolveAudience).toHaveBeenCalledWith("replay_published", {
      kind: "accompagnement_holders",
    });
    expect(notify).toHaveBeenCalledWith(
      "replay_published",
      [{ userId: "c1", email: "c1@b.fr" }],
      expect.objectContaining({ title: "Atelier de juillet" }),
      expect.objectContaining({ dedupeId: "replay-1" })
    );
  });

  it("ne notifie personne par défaut", async () => {
    await createReplayLive(replay);

    expect(resolveAudience).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("n'insère pas l'option de notification en base", async () => {
    await createReplayLive(replay, { notifyHolders: true });

    expect(insertCalls.at(-1)).toEqual(replay);
  });
});
```

`createReplayLive(data: unknown)` valide `data` avec `replayLiveSchema` puis insère `parsed.data` tel quel. L'option de notification passe donc par un **second argument**, et non par un champ du formulaire : Zod le retirerait de `parsed.data`, mais le faire transiter par l'objet validé mélangerait une donnée de replay et une décision d'envoi.

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test "src/app/(dashboard)/admin/replay-lives/actions.spec.ts"`
Expected: FAIL, aucun appel à `resolveAudience`.

- [ ] **Step 3: Ajouter l'événement au catalogue**

Dans `src/lib/notifications/types.ts`, ajouter à `NotificationDataMap` :

```ts
  replay_published: { replay_id: string; title: string; unsubscribe_url?: string };
```

Dans `src/lib/notifications/catalog.ts`, ajouter l'entrée et l'import du sender :

```ts
  replay_published: {
    key: "replay_published",
    category: "marketing",
    preferenceKey: "replays",
    channels: ["in_app", "email"],
    title: () => "Nouveau replay disponible",
    body: (d) => d.title,
    href: () => "/replay-lives",
    actions: () => [
      { label: "Regarder", href: "/replay-lives", variant: "primary" },
    ],
    email: (to, d) =>
      sendReplayPublished(to, {
        title: d.title,
        replay_url: `${siteUrl()}/replay-lives`,
        unsubscribe_url: d.unsubscribe_url ?? `${siteUrl()}/espace-client/profil`,
      }),
  },
```

- [ ] **Step 4: Ajouter le sender**

Dans `src/lib/emails/send.ts`, à la suite des autres, en HTML en ligne comme `sendBookingConfirmedToConsultant` :

```ts
/**
 * Annonce d'un nouveau replay. Email marketing, donc porteur d'un lien de
 * desinscription : sans lui, l'envoi n'est pas conforme.
 */
export const sendReplayPublished = async (
  clientEmail: string,
  variables: { title: string; replay_url: string; unsubscribe_url: string },
) => {
  await sendTransactionalEmail({
    to: clientEmail,
    subject: `Nouveau replay : ${variables.title}`,
    html: `
      <h1>Le replay est en ligne</h1>
      <p>${variables.title} est disponible dans votre espace.</p>
      <p><a href="${variables.replay_url}" style="display:inline-block;padding:12px 24px;background-color:#2F5D50;color:#fff;text-decoration:none;border-radius:6px;">Regarder le replay</a></p>
      <p style="margin-top:32px;font-size:12px;color:#888;">
        Vous recevez cet email parce que vous avez accès aux ateliers mensuels.
        <a href="${variables.unsubscribe_url}">Ne plus recevoir ces annonces</a>.
      </p>
    `,
  });
};
```

- [ ] **Step 5: Émettre depuis l'action de publication**

Dans `src/app/(dashboard)/admin/replay-lives/actions.ts`, élargir la signature et émettre après l'insertion réussie, avant le `return` :

```ts
export const createReplayLive = async (
  data: unknown,
  options: { notifyHolders?: boolean } = {},
): Promise<ActionResult<{ id: string }>> => {
```

puis, juste après les `revalidatePath` :

```ts
  // Desactive par defaut : republier un replay corrige ne doit pas renotifier
  // tout le monde. Le dedupeId protege en plus d'un double clic.
  if (options.notifyHolders) {
    const recipients = await resolveAudience("replay_published", {
      kind: "accompagnement_holders",
    });

    await notify(
      "replay_published",
      recipients,
      { replay_id: created.id, title: parsed.data.title },
      { dedupeId: created.id },
    );
  }
```

Ajouter l'import `import { notify, resolveAudience } from "@/lib/notifications";`.

- [ ] **Step 6: Ajouter la case au formulaire**

Dans le formulaire de création de replay (`src/app/(dashboard)/admin/replay-lives/_components/`), ajouter un état local et une case avant le bouton d'envoi, puis passer la valeur en second argument de `createReplayLive` :

```tsx
const [notifyHolders, setNotifyHolders] = useState(false);

// dans le JSX, avant le bouton :
<label className="flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    checked={notifyHolders}
    onChange={(e) => setNotifyHolders(e.target.checked)}
    className="h-4 w-4"
  />
  Prévenir les personnes ayant accès aux ateliers
</label>

// a l'envoi :
await createReplayLive(values, { notifyHolders });
```

- [ ] **Step 7: Lancer les tests**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: PASS, build vert.

- [ ] **Step 8: Commit**

```bash
git add src/lib/notifications src/lib/emails/send.ts "src/app/(dashboard)/admin/replay-lives"
git commit -m "feat(notifications): annonce de replay ciblee sur les ayants droit"
```

---

### Task 12: Vérification d'ensemble

**Files:** aucun fichier modifié sauf correctifs

- [ ] **Step 1: Suite complète**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: tout passe.

- [ ] **Step 2: Vérifier que chaque événement porte une clé de préférence**

Run: `grep -c "preferenceKey" src/lib/notifications/catalog.ts`
Expected: un nombre égal au nombre d'événements du catalogue. Le typage l'impose déjà, ce compte confirme qu'aucune entrée n'a été ajoutée sans.

- [ ] **Step 3: Vérifier la chaîne complète, à la main**

1. Créer un segment avec les conditions « a souscrit un accompagnement » et « porte le libellé Instagram », vérifier l'effectif affiché.
2. Depuis l'espace client d'une cliente ayant un accompagnement, couper « Nouveaux replays » par email.
3. Publier un replay avec la case cochée.
4. Vérifier : la notification apparaît dans sa cloche, aucun email ne lui parvient, et une autre cliente n'ayant pas coupé reçoit les deux.
5. Vérifier qu'une ligne est apparue dans `notification_broadcasts` avec le bon effectif.
6. Cliquer le lien de désinscription d'un email de replay, vérifier que la bascule correspondante est passée à « coupé » dans l'espace client.

- [ ] **Step 4: Commit des correctifs éventuels**

```bash
git add -A
git commit -m "fix(notifications): correctifs de la verification d'ensemble"
```

---

## Ce que ce plan ne fait pas

- **Les autres événements marketing** : article de blog, relance de module en cours, demande d'avis à J+2, digest hebdomadaire. Chacun demande sa propre logique de planification (quand déclencher, sur quelle fenêtre, avec quelle déduplication), qui n'a rien à voir avec l'infrastructure posée ici. Ils font l'objet du plan suivant, une fois la chaîne éprouvée par `replay_published`. Les sources de données existent : `blog_posts`, `accompagnement_progress` (renommée en `00071`), `bookings` au statut `completed`, et la table `notifications` elle-même pour le digest.
- **« Nouvelle ressource réservée »** : retiré du périmètre, `00059` crée un bucket de stockage et non une table. Il n'y a aucune ligne dont la création puisse déclencher quoi que ce soit.
- **`acquisition_source` sur `profiles`** : tranche 3. Un libellé global posé à la main couvre le besoin en attendant, ce que la tâche 7 rend possible.
- **Action `send_notification` dans le moteur d'automations, composer de diffusion admin** : tranche 3.
- **Web Push** : phase 2.
- **Le score client hors contexte consultante** vaut 0 dans l'évaluateur partagé, la RPC `calculate_client_score` prenant les deux identifiants. Un segment de ciblage ne doit donc pas s'appuyer sur `score`. Le CRM, lui, conserve son score puisqu'il passe `consultantId`.
