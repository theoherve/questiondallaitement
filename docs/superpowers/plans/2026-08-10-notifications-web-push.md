# Web Push navigateur — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter le push navigateur comme troisième canal du système de notifications existant, avec abonnement par appareil depuis l'écran de préférences.

**Architecture :** Le canal `push` rejoint `in_app` et `email` dans `NotificationChannel` et dans le modèle de préférences par catégorie. Il ne demande aucun adaptateur par événement : il lit `title`, `body` et `href` que le catalogue calcule déjà pour la ligne in-app. Une table `push_subscriptions` porte une ligne par navigateur ; `notify()` envoie à chacune via `web-push`, et supprime celles qui répondent `404` ou `410`. Un service worker statique à la racine reçoit et affiche.

**Tech Stack :** Next.js 16 App Router, React 19, TypeScript, Supabase (Postgres + RLS), `web-push`, Vitest (environnement `node`), Tailwind, shadcn/ui.

**Spec :** `docs/superpowers/specs/2026-08-10-web-push-design.md`

## Global Constraints

- **Vitest tourne en environnement `node`** : aucun test de composant React n'est possible, nulle part. Les composants se vérifient à la main.
- **`vi.hoisted()` est obligatoire** pour toute variable référencée dans une fabrique `vi.mock()` : `vi.mock` est hissé en haut du fichier, un `const` ordinaire n'existerait pas encore.
- **Aucun tiret cadratin (`—`) dans un texte vu par une visiteuse.** Les commentaires de code et ce plan peuvent en contenir ; les libellés d'interface, jamais.
- **Ne jamais faire `git add -A` ni `git add .`** Dix fichiers modifiés par Théo (contenus de modules, `pack-content.ts`, `page.tsx`, un document de plan) dorment dans l'arbre de travail et ne doivent **ni être commités ni être annulés**. Chaque `git add` de ce plan nomme ses fichiers explicitement.
- `notify()` **ne lève jamais** : chaque canal et chaque destinataire sont isolés dans leur `try/catch`.
- Les préférences ne stockent que les **écarts au défaut** ; les défauts vivent dans `src/lib/notifications/preference-categories.ts`.
- Trois catégories **n'autorisent pas le push du tout** : `paiements`, `articles`, `digest`. C'est un garde-fou dans le code, pas un défaut modifiable.
- Les abonnements **ne sont pas supprimés à la déconnexion**. Choix assumé ; la liste des appareils est le remède.
- `pnpm test` lance la suite complète. `pnpm lint` lance ESLint.

## Structure des fichiers

**Créés**

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/00087_push_subscriptions.sql` | Table des abonnements, RLS, extension de la contrainte de canal |
| `src/lib/notifications/push/keys.ts` | Lecture des clés VAPID, `null` si incomplètes |
| `src/lib/notifications/push/send.ts` | Envoi serveur à tous les abonnements d'une utilisatrice, nettoyage des morts |
| `src/lib/notifications/push/send.spec.ts` | Tests de l'envoi |
| `src/lib/notifications/push/client.ts` | Helpers navigateur : détection, abonnement, extraction des clés |
| `public/sw.js` | Service worker : réception et clic. Aucune mise en cache |
| `src/app/manifest.ts` | Manifeste de l'application, requis pour l'installation |
| `src/app/(public)/espace-client/profil/push-actions.ts` | Server actions d'abonnement, de liste et de retrait |
| `src/app/(public)/espace-client/profil/push-actions.spec.ts` | Tests des server actions |
| `src/app/(public)/espace-client/profil/_components/push-activation.tsx` | Bouton d'activation, trois états d'autorisation, liste des appareils |
| `src/app/(public)/espace-client/profil/_components/ios-install-hint.tsx` | Encadré informatif iOS |

**Modifiés**

| Fichier | Changement |
|---|---|
| `src/lib/notifications/types.ts` | `"push"` dans `NotificationChannel` |
| `src/types/database.ts` | `PushSubscriptionRow`, `PushDevice`, `"push"` dans `NotificationChannelName` |
| `src/lib/notifications/preference-categories.ts` | Défauts du canal `push`, drapeau `pushForbidden` |
| `src/lib/notifications/preferences.ts` | `resolveChannels` retire `push` des catégories interdites |
| `src/lib/notifications/notify.ts` | Branche `push` |
| `src/lib/notifications/catalog.ts` | `"push"` sur les événements où l'immédiateté compte |
| `src/lib/notifications/index.ts` | Export de `sendPushToUser` |
| `next.config.ts` | En-tête de cache sur `/sw.js` |
| `src/app/(public)/espace-client/profil/_components/notification-preferences.tsx` | Troisième colonne, grisée hors abonnement |
| `src/app/(public)/espace-client/profil/page.tsx` | Passe l'état d'abonnement et monte les nouveaux composants |
| `.env.example` | Trois variables VAPID |

**Livraison en deux étapes.** Tâches 1 à 7 : le socle, sans interface. À l'issue de la tâche 7, aucun abonnement n'existe, donc aucun push ne part : le déploiement est inerte. Tâches 8 et 9 : l'interface, qui rend l'abonnement possible.

---

## Task 1 : Table des abonnements et types de base

**Files:**
- Create: `supabase/migrations/00087_push_subscriptions.sql`
- Modify: `src/types/database.ts:656`

**Interfaces:**
- Consomme : rien.
- Produit : la table `push_subscriptions` (`id`, `user_id`, `endpoint` unique, `p256dh`, `auth`, `user_agent`, `last_success_at`, `failure_count`, `created_at`) ; les types `PushSubscriptionRow` et `PushDevice` ; `NotificationChannelName = "in_app" | "email" | "push"`.

- [ ] **Step 1 : écrire la migration**

Créer `supabase/migrations/00087_push_subscriptions.sql` :

```sql
-- Abonnements au push navigateur.
--
-- Une ligne par NAVIGATEUR, pas par personne : la meme cliente peut s'abonner
-- depuis son telephone et depuis son ordinateur, et les deux doivent sonner.
-- L'endpoint est l'identifiant que le navigateur fournit ; il est unique, et
-- c'est lui qui sert de cle de conflit a l'enregistrement.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  -- Les deux cles de chiffrement fournies par le navigateur. Sans elles, la
  -- charge utile ne peut pas etre chiffree, donc pas envoyee.
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  -- Pour que l'utilisatrice reconnaisse ses appareils dans la liste.
  user_agent TEXT,
  last_success_at TIMESTAMPTZ,
  failure_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Lecture et suppression de ses propres appareils : la liste des appareils et
-- le bouton de retrait passent par une session. L'ecriture reste au role
-- service, comme pour les preferences : c'est une server action qui enregistre.
DROP POLICY IF EXISTS push_subscriptions_select_own ON push_subscriptions;
CREATE POLICY push_subscriptions_select_own ON push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_delete_own ON push_subscriptions;
CREATE POLICY push_subscriptions_delete_own ON push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- Le push devient un troisieme canal du modele de preferences existant. La
-- contrainte posee en 00085 n'admettait que deux valeurs : sans cette
-- reecriture, enregistrer une preference de push echouerait en base.
ALTER TABLE notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_channel_check;

ALTER TABLE notification_preferences
  ADD CONSTRAINT notification_preferences_channel_check
  CHECK (channel IN ('in_app', 'email', 'push'));
```

- [ ] **Step 2 : vérifier le nom réel de la contrainte avant de pousser**

Run :

```bash
grep -n "channel TEXT NOT NULL CHECK" supabase/migrations/00085_notifications_preferences.sql
```

Attendu : la contrainte est déclarée en ligne, donc Postgres l'a nommée `notification_preferences_channel_check`. Le `DROP CONSTRAINT IF EXISTS` ci-dessus ne lève pas si le nom diffère, mais l'`ADD` échouerait alors sur un doublon : si le `grep` ne montre pas une contrainte en ligne sur `channel`, lister les contraintes réelles avant de continuer.

- [ ] **Step 3 : ajouter les types**

Dans `src/types/database.ts`, remplacer la ligne 656 :

```ts
export type NotificationChannelName = "in_app" | "email";
```

par :

```ts
export type NotificationChannelName = "in_app" | "email" | "push";

/**
 * Un abonnement au push navigateur, une ligne par navigateur. `endpoint` est
 * l'identifiant fourni par le navigateur : il est unique, et il sert de clé de
 * conflit à l'enregistrement.
 *
 * Suffixe `Row` volontaire : `PushSubscription` est déjà un type global du DOM,
 * et deux sens pour un même nom dans un composant client se paie cher.
 */
export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  last_success_at: string | null;
  failure_count: number;
  created_at: string;
};

/** Ce que l'écran de préférences montre d'un appareil abonné. */
export type PushDevice = Pick<
  PushSubscriptionRow,
  "endpoint" | "user_agent" | "created_at"
>;
```

- [ ] **Step 4 : vérifier que la compilation passe**

Run : `pnpm exec tsc --noEmit`
Attendu : aucune erreur. `NotificationChannelName` n'est consommé que par `NotificationPreference`, élargir son union ne casse rien.

- [ ] **Step 5 : commit**

```bash
git add supabase/migrations/00087_push_subscriptions.sql src/types/database.ts
git commit -m "feat(push): table des abonnements et canal push en base"
```

---

## Task 2 : Le canal `push` dans le modèle de préférences

**Files:**
- Modify: `src/lib/notifications/types.ts:4`
- Modify: `src/lib/notifications/preference-categories.ts`
- Modify: `src/lib/notifications/preferences.ts:46-58`
- Test: `src/lib/notifications/preferences.spec.ts`
- Test: `src/lib/notifications/preference-categories.spec.ts`

**Interfaces:**
- Consomme : `NotificationChannelName` élargi (tâche 1).
- Produit : `NotificationChannel = "in_app" | "email" | "push"` ; `PreferenceCategory.defaults` porte désormais les trois canaux ; `PreferenceCategory.pushForbidden?: boolean` ; `resolveChannels(preferenceKey, declared, overrides)` retire `push` des catégories interdites, y compris quand un écart en base le demanderait.

- [ ] **Step 1 : écrire les tests qui échouent**

Ajouter à la fin du `describe("resolveChannels")` de `src/lib/notifications/preferences.spec.ts` :

```ts
  it("laisse passer le push sur une catégorie imposée qui l'autorise", () => {
    expect(resolveChannels("rendez_vous", ["in_app", "email", "push"])).toEqual([
      "in_app",
      "email",
      "push",
    ]);
  });

  it("coupe le push sur une catégorie optionnelle sans préférence, car il est en opt-in", () => {
    expect(resolveChannels("replays", ["in_app", "email", "push"])).toEqual([
      "in_app",
      "email",
    ]);
  });

  it("active le push d'une catégorie optionnelle quand la préférence l'autorise", () => {
    expect(
      resolveChannels("replays", ["in_app", "email", "push"], {
        "replays:push": true,
      })
    ).toEqual(["in_app", "email", "push"]);
  });

  it("refuse le push sur une catégorie interdite, même déclaré par l'événement", () => {
    expect(resolveChannels("paiements", ["in_app", "email", "push"])).toEqual([
      "in_app",
      "email",
    ]);
  });

  it("refuse le push sur une catégorie interdite, même demandé par une préférence", () => {
    expect(
      resolveChannels("digest", ["in_app", "email", "push"], {
        "digest:push": true,
        "digest:email": true,
      })
    ).toEqual(["email"]);
  });
```

Ajouter dans `src/lib/notifications/preference-categories.spec.ts` :

```ts
  it("interdit le push exactement sur les trois catégories décidées", () => {
    const forbidden = Object.values(PREFERENCE_CATEGORIES)
      .filter((c) => c.pushForbidden)
      .map((c) => c.key)
      .sort();

    expect(forbidden).toEqual(["articles", "digest", "paiements"]);
  });

  it("n'active le push par défaut que sur les catégories imposées", () => {
    const on = Object.values(PREFERENCE_CATEGORIES)
      .filter((c) => c.defaults.push)
      .map((c) => c.key)
      .sort();

    expect(on).toEqual(["acces_contenus", "rendez_vous", "systeme"]);
  });

  it("n'autorise jamais un défaut de push sur une catégorie qui l'interdit", () => {
    for (const category of Object.values(PREFERENCE_CATEGORIES)) {
      if (category.pushForbidden) expect(category.defaults.push).toBe(false);
    }
  });
```

Vérifier que `PREFERENCE_CATEGORIES` est bien importé en tête de ce fichier de test ; sinon l'ajouter.

- [ ] **Step 2 : lancer les tests pour les voir échouer**

Run : `pnpm exec vitest run src/lib/notifications/preferences.spec.ts src/lib/notifications/preference-categories.spec.ts`
Attendu : ÉCHEC, avec des erreurs de type sur `"push"` et des tableaux vides sur `pushForbidden`.

- [ ] **Step 3 : élargir `NotificationChannel`**

Dans `src/lib/notifications/types.ts`, remplacer la ligne 4 :

```ts
export type NotificationChannel = "in_app" | "email";
```

par :

```ts
export type NotificationChannel = "in_app" | "email" | "push";
```

- [ ] **Step 4 : ajouter les défauts de push et le garde-fou**

Dans `src/lib/notifications/preference-categories.ts` :

Remplacer `const FORCED = { in_app: true, email: true };` par :

```ts
const FORCED = { in_app: true, email: true, push: true };

/** Défauts d'une catégorie optionnelle : les deux canaux calmes, pas le push. */
const OPT_OUT = { in_app: true, email: true, push: false };
```

Ajouter le drapeau au type `PreferenceCategory`, juste après `internal?: boolean;` :

```ts
  /**
   * Le push est interdit pour cette catégorie, quoi qu'en dise une préférence
   * ou un événement. Garde-fou et non simple défaut : on ne veut pas qu'un
   * réglage ou un ajout de canal au catalogue permette un jour de pousser une
   * facture ou un article de blog sur le téléphone d'une cliente.
   */
  pushForbidden?: boolean;
```

Puis, dans `PREFERENCE_CATEGORIES` :

- `paiements` : ajouter `pushForbidden: true` et remplacer `defaults: FORCED` par `defaults: { in_app: true, email: true, push: false }`.
- `rendez_vous`, `acces_contenus`, `systeme` : laisser `defaults: FORCED` (le push y est actif par défaut).
- `replays`, `articles`, `annonces`, `rappels_suivi` : remplacer `defaults: { in_app: true, email: true }` par `defaults: OPT_OUT`.
- `articles` : ajouter `pushForbidden: true`.
- `digest` : remplacer `defaults: { in_app: false, email: false }` par `defaults: { in_app: false, email: false, push: false }` et ajouter `pushForbidden: true`.

- [ ] **Step 5 : ajouter le garde-fou dans `resolveChannels`**

Dans `src/lib/notifications/preferences.ts`, remplacer le corps de `resolveChannels` (lignes 46-58) par :

```ts
export const resolveChannels = (
  preferenceKey: NotificationPreferenceKey,
  declared: NotificationChannel[],
  overrides: ChannelOverrides = {}
): NotificationChannel[] => {
  const category = PREFERENCE_CATEGORIES[preferenceKey];

  // Le push interdit tombe avant tout le reste : ni une categorie imposee ni un
  // ecart enregistre ne doit pouvoir le faire revenir.
  const candidates = category.pushForbidden
    ? declared.filter((channel) => channel !== "push")
    : declared;

  if (category.forced) return candidates;

  return candidates.filter((channel) => {
    const override = overrides[overrideKey(preferenceKey, channel)];
    return override ?? category.defaults[channel];
  });
};
```

- [ ] **Step 6 : lancer les tests**

Run : `pnpm exec vitest run src/lib/notifications/`
Attendu : PASS pour tous les fichiers, y compris `notify.spec.ts` et `catalog.spec.ts` inchangés (aucun événement ne déclare encore `push`).

- [ ] **Step 7 : commit**

```bash
git add src/lib/notifications/types.ts src/lib/notifications/preference-categories.ts src/lib/notifications/preferences.ts src/lib/notifications/preferences.spec.ts src/lib/notifications/preference-categories.spec.ts
git commit -m "feat(push): canal push dans le modele de preferences, interdit sur trois categories"
```

---

## Task 3 : Clés VAPID et envoi serveur

**Files:**
- Create: `src/lib/notifications/push/keys.ts`
- Create: `src/lib/notifications/push/send.ts`
- Test: `src/lib/notifications/push/send.spec.ts`
- Modify: `.env.example`
- Modify: `package.json` (dépendance `web-push`)

**Interfaces:**
- Consomme : la table `push_subscriptions` (tâche 1).
- Produit :
  - `vapidConfig(): { publicKey: string; privateKey: string; subject: string } | null`
  - `type PushPayload = { title: string; body?: string | null; href?: string | null; tag?: string | null }`
  - `sendPushToUser(userId: string, payload: PushPayload): Promise<number>` — renvoie le nombre d'envois acceptés. Ne lève jamais.

- [ ] **Step 1 : installer la dépendance**

Run :

```bash
pnpm add web-push
pnpm add -D @types/web-push
```

- [ ] **Step 2 : écrire le test qui échoue**

Créer `src/lib/notifications/push/send.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSelect, mockUpdateEq, mockDeleteEq, sendNotification, setVapidDetails } =
  vi.hoisted(() => ({
    mockSelect: vi.fn(),
    mockUpdateEq: vi.fn(),
    mockDeleteEq: vi.fn(),
    sendNotification: vi.fn(),
    setVapidDetails: vi.fn(),
  }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: mockSelect }),
      update: () => ({ eq: mockUpdateEq }),
      delete: () => ({ eq: mockDeleteEq }),
    }),
  }),
}));

vi.mock("web-push", () => ({
  default: { setVapidDetails, sendNotification },
}));

import { sendPushToUser } from "./send";

const SUBS = [
  { endpoint: "https://push.example/a", p256dh: "key-a", auth: "auth-a" },
  { endpoint: "https://push.example/b", p256dh: "key-b", auth: "auth-b" },
];

/** Erreur telle que `web-push` la lève : le statut HTTP porte le sens. */
const httpError = (statusCode: number) =>
  Object.assign(new Error(`status ${statusCode}`), { statusCode });

describe("sendPushToUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "pub");
    vi.stubEnv("VAPID_PRIVATE_KEY", "priv");
    vi.stubEnv("VAPID_SUBJECT", "mailto:contact@questiondallaitement.fr");
    mockSelect.mockResolvedValue({ data: SUBS, error: null });
    mockUpdateEq.mockResolvedValue({ error: null });
    mockDeleteEq.mockResolvedValue({ error: null });
    sendNotification.mockResolvedValue(undefined);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("envoie à tous les abonnements de l'utilisatrice", async () => {
    const sent = await sendPushToUser("u1", { title: "Rappel" });

    expect(sent).toBe(2);
    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(sendNotification.mock.calls[0][0]).toEqual({
      endpoint: "https://push.example/a",
      keys: { p256dh: "key-a", auth: "auth-a" },
    });
  });

  it("transmet titre, corps et cible dans la charge utile", async () => {
    await sendPushToUser("u1", {
      title: "Rappel",
      body: "Demain à 10h",
      href: "/espace-client/reservations",
    });

    expect(JSON.parse(sendNotification.mock.calls[0][1] as string)).toEqual(
      expect.objectContaining({
        title: "Rappel",
        body: "Demain à 10h",
        href: "/espace-client/reservations",
      })
    );
  });

  it("supprime l'abonnement quand le service répond 410", async () => {
    sendNotification.mockRejectedValueOnce(httpError(410));

    const sent = await sendPushToUser("u1", { title: "Rappel" });

    expect(sent).toBe(1);
    expect(mockDeleteEq).toHaveBeenCalledWith(
      "endpoint",
      "https://push.example/a"
    );
  });

  it("supprime l'abonnement quand le service répond 404", async () => {
    sendNotification.mockRejectedValueOnce(httpError(404));

    await sendPushToUser("u1", { title: "Rappel" });

    expect(mockDeleteEq).toHaveBeenCalledWith(
      "endpoint",
      "https://push.example/a"
    );
  });

  it("garde l'abonnement sur une panne passagère", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    sendNotification.mockRejectedValueOnce(httpError(500));

    const sent = await sendPushToUser("u1", { title: "Rappel" });

    expect(sent).toBe(1);
    expect(mockDeleteEq).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("n'envoie rien et ne lève pas quand les clés VAPID manquent", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("VAPID_PRIVATE_KEY", "");

    expect(await sendPushToUser("u1", { title: "Rappel" })).toBe(0);
    expect(sendNotification).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("renvoie zéro sans abonnement, sans interroger le service", async () => {
    mockSelect.mockResolvedValue({ data: [], error: null });

    expect(await sendPushToUser("u1", { title: "Rappel" })).toBe(0);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("tronque un titre et un corps trop longs", async () => {
    await sendPushToUser("u1", {
      title: "T".repeat(200),
      body: "B".repeat(500),
    });

    const payload = JSON.parse(sendNotification.mock.calls[0][1] as string);
    expect(payload.title.length).toBe(80);
    expect(payload.body.length).toBe(160);
  });
});
```

- [ ] **Step 3 : lancer le test pour le voir échouer**

Run : `pnpm exec vitest run src/lib/notifications/push/send.spec.ts`
Attendu : ÉCHEC, `Failed to resolve import "./send"`.

- [ ] **Step 4 : écrire la lecture des clés**

Créer `src/lib/notifications/push/keys.ts` :

```ts
export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

/**
 * Clés VAPID, ou `null` si la configuration est incomplète.
 *
 * `null` plutôt qu'une exception : une notification in-app ne doit pas échouer
 * parce que le push est mal configuré. L'appelant logue et passe.
 *
 * Ces clés sont engendrées une fois et jamais changées : les changer
 * invaliderait tous les abonnements existants d'un coup.
 */
export const vapidConfig = (): VapidConfig | null => {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
};
```

- [ ] **Step 5 : écrire l'envoi**

Créer `src/lib/notifications/push/send.ts` :

```ts
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { vapidConfig } from "./keys";

/**
 * Longueurs maximales de la charge utile. Le protocole plafonne la taille du
 * message chiffré ; au-delà, l'envoi est refusé pour tous les abonnements d'un
 * coup. Tronquer vaut mieux que ne rien recevoir.
 */
const MAX_TITLE = 80;
const MAX_BODY = 160;

/** Une heure de conservation : au-delà, un rappel n'a plus d'intérêt. */
const TTL_SECONDS = 3600;

export type PushPayload = {
  title: string;
  body?: string | null;
  href?: string | null;
  /** Regroupe les notifications : une même clé remplace la précédente. */
  tag?: string | null;
};

/**
 * Envoie à tous les navigateurs abonnés d'une utilisatrice. Renvoie le nombre
 * d'envois acceptés.
 *
 * Ne lève jamais. Chaque abonnement est isolé : un ancien téléphone en échec ne
 * doit pas empêcher l'ordinateur de sonner.
 */
export const sendPushToUser = async (
  userId: string,
  payload: PushPayload,
): Promise<number> => {
  const config = vapidConfig();
  if (!config) {
    console.warn("push: clés VAPID absentes, canal désactivé");
    return 0;
  }

  const supabase = createAdminClient();
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    console.error(`push: lecture des abonnements échouée (${userId}) :`, error);
    return 0;
  }
  if (!subscriptions || subscriptions.length === 0) return 0;

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);

  const body = JSON.stringify({
    title: payload.title.slice(0, MAX_TITLE),
    body: payload.body ? payload.body.slice(0, MAX_BODY) : undefined,
    href: payload.href ?? "/",
    tag: payload.tag ?? undefined,
  });

  let sent = 0;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint as string,
          keys: {
            p256dh: subscription.p256dh as string,
            auth: subscription.auth as string,
          },
        },
        body,
        { TTL: TTL_SECONDS },
      );
      sent += 1;

      await supabase
        .from("push_subscriptions")
        .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
        .eq("endpoint", subscription.endpoint as string);
    } catch (sendError) {
      const status = (sendError as { statusCode?: number }).statusCode;

      // 404 et 410 : c'est ainsi que le protocole signale un abonnement mort
      // (navigateur reinstalle, cache vide, autorisation retiree). Le garder
      // ferait grossir la table de dechets qui echoueront a chaque envoi.
      if (status === 404 || status === 410) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint as string);
        continue;
      }

      console.error(
        `push: envoi échoué (${status ?? "sans statut"}) pour ${userId} :`,
        sendError,
      );
    }
  }

  return sent;
};
```

- [ ] **Step 6 : lancer le test**

Run : `pnpm exec vitest run src/lib/notifications/push/send.spec.ts`
Attendu : PASS, dix tests.

- [ ] **Step 7 : documenter les variables d'environnement**

Ajouter à `.env.example` :

```
# Web Push (VAPID). Engendrees une fois avec `pnpm exec web-push generate-vapid-keys`
# et JAMAIS changees ensuite : les changer invalide tous les abonnements existants.
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:contact@questiondallaitement.fr
```

- [ ] **Step 8 : commit**

```bash
git add package.json pnpm-lock.yaml .env.example src/lib/notifications/push/keys.ts src/lib/notifications/push/send.ts src/lib/notifications/push/send.spec.ts
git commit -m "feat(push): envoi serveur et nettoyage des abonnements morts"
```

---

## Task 4 : Le canal `push` dans `notify()`

**Files:**
- Modify: `src/lib/notifications/notify.ts`
- Modify: `src/lib/notifications/index.ts`
- Test: `src/lib/notifications/notify.spec.ts`

**Interfaces:**
- Consomme : `sendPushToUser(userId, payload)` (tâche 3), `resolveChannels` (tâche 2).
- Produit : `notify()` envoie un push quand l'événement déclare `"push"` et que les préférences le laissent passer. Le `tag` vaut `event` seul, ou `event:dedupeId` quand un identifiant de déduplication est fourni.

- [ ] **Step 1 : écrire les tests qui échouent**

Dans `src/lib/notifications/notify.spec.ts`, ajouter le mock du module d'envoi juste après le bloc `vi.mock("./preferences", …)` (ligne 58) :

```ts
const { sendPushToUser } = vi.hoisted(() => ({
  sendPushToUser: vi.fn().mockResolvedValue(1),
}));

vi.mock("./push/send", () => ({ sendPushToUser }));
```

Dans la fabrique `vi.mock("./catalog", …)`, ajouter `"push"` aux canaux de `replay_published` :

```ts
      channels: ["in_app", "email", "push"],
```

et ajouter une quatrième entrée au catalogue simulé, après `replay_published` :

```ts
    booking_reminder: {
      key: "booking_reminder",
      category: "transactional",
      preferenceKey: "rendez_vous",
      channels: ["in_app", "email", "push"],
      title: (d: { time: string }) => `Rappel : consultation demain à ${d.time}`,
      href: () => "/espace-client/reservations",
    },
```

Puis ajouter ce bloc à la fin du fichier :

```ts
describe("notify et le canal push", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    sendPushToUser.mockResolvedValue(1);
    loadPreferences.mockResolvedValue({});
  });

  it("pousse un événement imposé qui déclare le canal", async () => {
    await notify("booking_reminder", [{ userId: "u1" }], {
      booking_id: "b1",
      time: "10h",
      client_name: "Léa",
      consultant_name: "Carole",
    });

    expect(sendPushToUser).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        title: "Rappel : consultation demain à 10h",
        href: "/espace-client/reservations",
      })
    );
  });

  it("ne pousse pas un événement qui ne déclare pas le canal", async () => {
    await notify("admin_message", [{ userId: "u1" }], {});
    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it("respecte le défaut coupé d'une catégorie optionnelle", async () => {
    await notifyUntyped("replay_published", [{ userId: "u1" }], {});
    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it("pousse une catégorie optionnelle quand la préférence l'autorise", async () => {
    loadPreferences.mockResolvedValue({ "replays:push": true });

    await notifyUntyped("replay_published", [{ userId: "u1" }], {});

    expect(sendPushToUser).toHaveBeenCalledTimes(1);
  });

  it("reprend l'identifiant de déduplication dans le tag", async () => {
    await notify(
      "booking_reminder",
      [{ userId: "u1" }],
      { booking_id: "b1", time: "10h", client_name: "Léa", consultant_name: "Carole" },
      { dedupeId: "b1" }
    );

    expect(sendPushToUser).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ tag: "booking_reminder:b1" })
    );
  });

  it("garde la ligne in-app quand le push échoue", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    sendPushToUser.mockRejectedValue(new Error("web-push down"));

    await expect(
      notify("booking_reminder", [{ userId: "u1" }], {
        booking_id: "b1",
        time: "10h",
        client_name: "Léa",
        consultant_name: "Carole",
      })
    ).resolves.toBeUndefined();

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("n'ajoute pas le push quand l'appel restreint les canaux", async () => {
    await notify(
      "booking_reminder",
      [{ userId: "u1" }],
      { booking_id: "b1", time: "10h", client_name: "Léa", consultant_name: "Carole" },
      { channels: ["in_app"] }
    );

    expect(sendPushToUser).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 : lancer les tests pour les voir échouer**

Run : `pnpm exec vitest run src/lib/notifications/notify.spec.ts`
Attendu : ÉCHEC, `sendPushToUser` n'est jamais appelé.

- [ ] **Step 3 : ajouter la branche push**

Dans `src/lib/notifications/notify.ts`, ajouter l'import après celui de `buildUnsubscribeUrl` :

```ts
import { sendPushToUser } from "./push/send";
```

Puis insérer ce bloc après la branche `email`, avant la fermeture de la boucle `for` :

```ts
    if (channels.includes("push")) {
      try {
        // Le push n'a pas d'adaptateur par evenement : il n'a qu'un titre, un
        // corps et une cible, exactement ce que le catalogue calcule deja pour
        // la ligne in-app. Declarer "push" dans les canaux suffit donc.
        await sendPushToUser(recipient.userId, {
          title: def.title(data),
          body: def.body?.(data) ?? null,
          href: def.href?.(data) ?? null,
          // Meme tag qu'une notification deja affichee : la nouvelle remplace
          // l'ancienne au lieu de s'empiler. Sans dedupeId, le nom de
          // l'evenement suffit a grouper.
          tag: options.dedupeId ? `${event}:${options.dedupeId}` : event,
        });
      } catch (error) {
        console.error(`notify: push levé (${event}):`, error);
      }
    }
```

- [ ] **Step 4 : exporter l'envoi**

Dans `src/lib/notifications/index.ts`, ajouter après la ligne `export { notify } from "./notify";` :

```ts
export { sendPushToUser } from "./push/send";
export type { PushPayload } from "./push/send";
```

- [ ] **Step 5 : lancer les tests**

Run : `pnpm exec vitest run src/lib/notifications/`
Attendu : PASS.

- [ ] **Step 6 : commit**

```bash
git add src/lib/notifications/notify.ts src/lib/notifications/notify.spec.ts src/lib/notifications/index.ts
git commit -m "feat(push): canal push dans notify()"
```

---

## Task 5 : Service worker et manifeste

**Files:**
- Create: `public/sw.js`
- Create: `src/app/manifest.ts`
- Modify: `next.config.ts` (fonction `headers()`)

**Interfaces:**
- Consomme : la charge utile écrite par `sendPushToUser` (`{ title, body?, href, tag? }`).
- Produit : un service worker de périmètre racine qui affiche la notification et ouvre `href` au clic ; un manifeste servi à `/manifest.webmanifest`.

- [ ] **Step 1 : écrire le service worker**

Créer `public/sw.js` :

```js
/*
 * Service worker du push navigateur.
 *
 * Servi depuis /public, donc a la racine du site : c'est une contrainte du
 * navigateur, un service worker ne recoit de push que pour son perimetre, et un
 * fichier servi depuis /_next/ ne couvrirait pas le site.
 *
 * PAS DE MISE EN CACHE, PAS DE MODE HORS LIGNE. Ce n'est pas le sujet, et un
 * cache mal regle sert des pages perimees sans qu'on s'en apercoive.
 */

self.addEventListener("install", () => {
  // Prendre la main tout de suite : sans cela, une nouvelle version attend la
  // fermeture de tous les onglets avant d'etre active.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (error) {
    // Une charge utile illisible ne doit pas faire disparaitre la notification :
    // le navigateur afficherait alors un message generique bien plus opaque.
    payload = { title: event.data.text() };
  }

  const title = payload.title || "Question d'Allaitement";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body,
      icon: "/logo.svg",
      badge: "/logo.svg",
      tag: payload.tag,
      data: { href: payload.href || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const href =
    (event.notification.data && event.notification.data.href) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Reutiliser un onglet deja ouvert plutot qu'en empiler un nouveau a
        // chaque clic.
        for (const client of clientList) {
          if (client.url.includes(href) && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(href);
      })
  );
});
```

- [ ] **Step 2 : écrire le manifeste**

Créer `src/app/manifest.ts` :

```ts
import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * Manifeste de l'application. Route de métadonnées de Next plutôt que fichier
 * statique : nom, couleurs et icônes vivent alors à côté du reste de la
 * configuration.
 *
 * Il est indispensable au push : sur iOS, aucune notification n'est délivrée
 * tant que le site n'est pas installé sur l'écran d'accueil, et l'installation
 * exige un manifeste.
 *
 * Les icônes pointent sur le logo SVG, le seul visuel de marque disponible. Sur
 * iPhone, Safari se rabat alors sur une capture de la page pour l'icône de
 * l'écran d'accueil : dégradé accepté, un jeu de PNG pourra le corriger plus
 * tard sans rien changer d'autre.
 */
const manifest = (): MetadataRoute.Manifest => ({
  name: siteConfig.name,
  short_name: "Allaitement",
  description: siteConfig.description,
  // L'espace client : c'est là que vivent les notifications et leurs réglages.
  start_url: "/espace-client",
  display: "standalone",
  background_color: "#fff8f6",
  theme_color: "#203634",
  icons: [{ src: "/logo.svg", sizes: "any", type: "image/svg+xml" }],
});

export default manifest;
```

- [ ] **Step 3 : empêcher la mise en cache du service worker**

Dans `next.config.ts`, dans le tableau renvoyé par `headers()`, ajouter une seconde entrée après celle de `/(.*)` :

```ts
      {
        // Un service worker mis en cache est un service worker qu'on ne peut
        // plus corriger : le navigateur garderait l'ancienne version pendant des
        // heures. Le fichier est minuscule, le revalider a chaque fois ne coute
        // rien.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
```

- [ ] **Step 4 : vérifier que la CSP n'interdit rien**

Run :

```bash
grep -n "script-src\|default-src\|worker-src" next.config.ts
```

Attendu : `default-src 'self'` et un `script-src` qui contient `'self'`. Le navigateur résout `worker-src` en se rabattant sur `child-src`, puis `script-src` : `'self'` autorise donc `/sw.js`, et `manifest-src` se rabat sur `default-src 'self'`. **Aucune modification de CSP n'est nécessaire.** Si l'un de ces deux directives ne contenait plus `'self'`, ajouter `"worker-src 'self'"` et `"manifest-src 'self'"` à la politique.

- [ ] **Step 5 : vérifier la construction et le service des deux fichiers**

Run : `pnpm build`
Attendu : succès, et `/manifest.webmanifest` apparaît dans la liste des routes.

Puis, dans un second terminal après `pnpm dev` :

```bash
curl -sI http://localhost:3000/sw.js | head -5
curl -s http://localhost:3000/manifest.webmanifest
```

Attendu : `200` et `content-type: application/javascript` pour le premier ; un JSON contenant `"start_url": "/espace-client"` pour le second.

- [ ] **Step 6 : commit**

```bash
git add public/sw.js src/app/manifest.ts next.config.ts
git commit -m "feat(push): service worker et manifeste d'application"
```

---

## Task 6 : Server actions d'abonnement

**Files:**
- Create: `src/app/(public)/espace-client/profil/push-actions.ts`
- Test: `src/app/(public)/espace-client/profil/push-actions.spec.ts`

**Interfaces:**
- Consomme : `getSessionUser()` de `@/lib/auth`, `createAdminClient()`, le type `ActionResult` de `@/types`, le type `PushDevice` de `@/types/database` (tâche 1).
- Produit :
  - `registerPushSubscription(input: { endpoint: string; p256dh: string; auth: string; userAgent?: string }): Promise<ActionResult>`
  - `listPushDevices(): Promise<{ endpoint: string; user_agent: string | null; created_at: string }[]>`
  - `removePushDevice(endpoint: string): Promise<ActionResult>`

- [ ] **Step 1 : écrire le test qui échoue**

Créer `src/app/(public)/espace-client/profil/push-actions.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { getSessionUser, mockUpsert, mockSelectEq, mockDeleteMatch } = vi.hoisted(
  () => ({
    getSessionUser: vi.fn(),
    mockUpsert: vi.fn(),
    mockSelectEq: vi.fn(),
    mockDeleteMatch: vi.fn(),
  })
);

vi.mock("@/lib/auth", () => ({ getSessionUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      upsert: mockUpsert,
      select: () => ({ eq: () => ({ order: mockSelectEq }) }),
      delete: () => ({ match: mockDeleteMatch }),
    }),
  }),
}));

import {
  registerPushSubscription,
  listPushDevices,
  removePushDevice,
} from "./push-actions";

const VALID = {
  endpoint: "https://push.example/abc",
  p256dh: "key",
  auth: "auth",
  userAgent: "Mozilla/5.0",
};

describe("registerPushSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue({ id: "u1" });
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("refuse sans session", async () => {
    getSessionUser.mockResolvedValue(null);

    expect(await registerPushSubscription(VALID)).toEqual({
      success: false,
      error: "Non authentifié",
    });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("enregistre l'abonnement pour l'utilisatrice connectée", async () => {
    expect(await registerPushSubscription(VALID)).toEqual({ success: true });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        endpoint: VALID.endpoint,
        p256dh: "key",
        auth: "auth",
      }),
      { onConflict: "endpoint" }
    );
  });

  it("n'enregistre qu'une ligne pour un même endpoint", async () => {
    await registerPushSubscription(VALID);
    await registerPushSubscription(VALID);

    // Deux appels, mais un upsert sur `endpoint` : c'est la base qui garantit
    // l'unicité, l'action ne fait pas de lecture préalable.
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    for (const call of mockUpsert.mock.calls) {
      expect(call[1]).toEqual({ onConflict: "endpoint" });
    }
  });

  it("refuse un endpoint qui n'est pas une URL", async () => {
    const result = await registerPushSubscription({ ...VALID, endpoint: "abc" });

    expect(result.success).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("refuse un abonnement sans clés de chiffrement", async () => {
    const result = await registerPushSubscription({ ...VALID, p256dh: "" });

    expect(result.success).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe("listPushDevices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue({ id: "u1" });
    mockSelectEq.mockResolvedValue({
      data: [
        {
          endpoint: "https://push.example/abc",
          user_agent: "Mozilla/5.0",
          created_at: "2026-08-10T10:00:00Z",
        },
      ],
      error: null,
    });
  });

  it("renvoie les appareils de l'utilisatrice", async () => {
    const devices = await listPushDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0].endpoint).toBe("https://push.example/abc");
  });

  it("renvoie une liste vide sans session", async () => {
    getSessionUser.mockResolvedValue(null);
    expect(await listPushDevices()).toEqual([]);
  });
});

describe("removePushDevice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue({ id: "u1" });
    mockDeleteMatch.mockResolvedValue({ error: null });
  });

  it("ne supprime que dans ses propres appareils", async () => {
    expect(await removePushDevice("https://push.example/abc")).toEqual({
      success: true,
    });
    // Le filtre porte sur l'endpoint ET sur l'utilisatrice : sans le second,
    // connaitre un endpoint suffirait a desabonner autrui.
    expect(mockDeleteMatch).toHaveBeenCalledWith({
      endpoint: "https://push.example/abc",
      user_id: "u1",
    });
  });

  it("refuse sans session", async () => {
    getSessionUser.mockResolvedValue(null);

    expect(await removePushDevice("https://push.example/abc")).toEqual({
      success: false,
      error: "Non authentifié",
    });
    expect(mockDeleteMatch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 : lancer le test pour le voir échouer**

Run : `pnpm exec vitest run "src/app/(public)/espace-client/profil/push-actions.spec.ts"`
Attendu : ÉCHEC, `Failed to resolve import "./push-actions"`.

- [ ] **Step 3 : écrire les server actions**

Créer `src/app/(public)/espace-client/profil/push-actions.ts` :

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";
import type { PushDevice } from "@/types/database";

/** Un `user_agent` trop long serait de la donnée injectée, pas un navigateur. */
const MAX_USER_AGENT = 300;

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().max(MAX_USER_AGENT).optional(),
});

/**
 * Enregistre l'abonnement de CE navigateur.
 *
 * `onConflict: "endpoint"` : le navigateur peut renvoyer le même endpoint à
 * chaque visite, et un même appareil ne doit jamais produire deux lignes. C'est
 * aussi ce qui rattache l'abonnement à la bonne personne quand deux comptes se
 * succèdent sur le même navigateur.
 */
export const registerPushSubscription = async (input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<ActionResult> => {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Abonnement invalide" };

  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.p256dh,
        auth: parsed.data.auth,
        user_agent: parsed.data.userAgent ?? null,
        failure_count: 0,
      },
      { onConflict: "endpoint" },
    );

  if (error) {
    console.error("registerPushSubscription a échoué :", error);
    return { success: false, error: "Erreur lors de l'enregistrement" };
  }

  revalidatePath("/espace-client/profil");
  return { success: true };
};

/** Les appareils abonnés de l'utilisatrice, le plus récent d'abord. */
export const listPushDevices = async (): Promise<PushDevice[]> => {
  const user = await getSessionUser();
  if (!user) return [];

  const { data, error } = await createAdminClient()
    .from("push_subscriptions")
    .select("endpoint, user_agent, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listPushDevices a échoué :", error);
    return [];
  }

  return (data ?? []) as PushDevice[];
};

/**
 * Désabonne un appareil. Le filtre porte sur l'endpoint **et** sur
 * l'utilisatrice : sans le second, connaître un endpoint suffirait à désabonner
 * autrui.
 *
 * C'est le remède au choix de ne pas supprimer les abonnements à la
 * déconnexion : sur un ordinateur partagé, le retrait se fait depuis n'importe
 * quelle session.
 */
export const removePushDevice = async (
  endpoint: string,
): Promise<ActionResult> => {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .delete()
    .match({ endpoint, user_id: user.id });

  if (error) {
    console.error("removePushDevice a échoué :", error);
    return { success: false, error: "Erreur lors du retrait" };
  }

  revalidatePath("/espace-client/profil");
  return { success: true };
};
```

- [ ] **Step 4 : lancer les tests**

Run : `pnpm exec vitest run "src/app/(public)/espace-client/profil/"`
Attendu : PASS, y compris `actions.spec.ts` et `notification-actions.spec.ts` inchangés.

- [ ] **Step 5 : commit**

```bash
git add "src/app/(public)/espace-client/profil/push-actions.ts" "src/app/(public)/espace-client/profil/push-actions.spec.ts"
git commit -m "feat(push): server actions d'abonnement et de retrait d'appareil"
```

---

## Task 7 : Déclarer le push dans le catalogue

**Files:**
- Modify: `src/lib/notifications/catalog.ts`
- Test: `src/lib/notifications/catalog.spec.ts`

**Interfaces:**
- Consomme : `NotificationChannel` élargi (tâche 2), le garde-fou `pushForbidden` (tâche 2).
- Produit : douze événements déclarent `"push"`. Aucun événement d'une catégorie interdite ne le déclare, et un test le vérifie.

**Événements qui gagnent `"push"`** — ceux dont une notification différée perd sa valeur :

| Événement | Catégorie | Pourquoi |
|---|---|---|
| `booking_reminder` | rendez_vous | Le cas d'usage qui justifie tout le chantier |
| `booking_cancelled` | rendez_vous | Annulation de dernière minute |
| `booking_rescheduled` | rendez_vous | La date a changé, il faut le savoir vite |
| `consultant_new_booking` | rendez_vous | La consultante doit préparer sa journée |
| `consultant_booking_cancelled` | rendez_vous | Un créneau se libère |
| `accompagnement_access` | acces_contenus | Ouverture attendue après un achat |
| `formation_reminder` | acces_contenus | Un atelier commence bientôt |
| `admin_payment_failed` | systeme | Un paiement à rattraper |
| `admin_job_failed` | systeme | Une panne à voir tout de suite |
| `replay_published` | replays | Coupé par défaut, la cliente choisit |
| `module_reminder` | rappels_suivi | Coupé par défaut |
| `broadcast_message` | annonces | Coupé par défaut |

**Événements qui n'en gagnent pas, et pourquoi** : `booking_confirmed` et `formation_registered` suivent immédiatement un geste de l'utilisatrice, qui est encore sur le site ; `admin_purchase`, `admin_refund`, `admin_new_review`, `admin_message`, `admin_digest` et `consultant_message` sont du travail de fond, pas des urgences ; `review_request` et `automation_message` sont des relances commerciales, qui n'ont pas à faire sonner un téléphone ; `payment_received`, `invoice_available`, `blog_post_published` et `weekly_digest` appartiennent aux trois catégories qui interdisent le push.

- [ ] **Step 1 : écrire le test qui échoue**

Ajouter à `src/lib/notifications/catalog.spec.ts` :

```ts
  it("ne déclare jamais le push sur une catégorie qui l'interdit", () => {
    for (const definition of Object.values(NOTIFICATION_CATALOG)) {
      if (!definition.channels.includes("push")) continue;
      expect(
        PREFERENCE_CATEGORIES[definition.preferenceKey].pushForbidden ?? false
      ).toBe(false);
    }
  });

  it("déclare le push exactement sur les événements décidés", () => {
    const pushed = Object.values(NOTIFICATION_CATALOG)
      .filter((d) => d.channels.includes("push"))
      .map((d) => d.key)
      .sort();

    expect(pushed).toEqual([
      "accompagnement_access",
      "admin_job_failed",
      "admin_payment_failed",
      "booking_cancelled",
      "booking_rescheduled",
      "booking_reminder",
      "broadcast_message",
      "consultant_booking_cancelled",
      "consultant_new_booking",
      "formation_reminder",
      "module_reminder",
      "replay_published",
    ].sort());
  });

  it("tout événement qui pousse a un titre et une cible utilisables", () => {
    // Un push sans cible ouvrirait la racine du site : la notification serait
    // vue, et l'utilisatrice ne saurait pas quoi en faire.
    for (const definition of Object.values(NOTIFICATION_CATALOG)) {
      if (!definition.channels.includes("push")) continue;
      expect(definition.href).toBeTypeOf("function");
    }
  });
```

Vérifier que `PREFERENCE_CATEGORIES` est importé en tête de `catalog.spec.ts` ; sinon ajouter :

```ts
import { PREFERENCE_CATEGORIES } from "./preference-categories";
```

- [ ] **Step 2 : lancer le test pour le voir échouer**

Run : `pnpm exec vitest run src/lib/notifications/catalog.spec.ts`
Attendu : ÉCHEC, la liste des événements qui poussent est vide.

- [ ] **Step 3 : déclarer le canal**

Dans `src/lib/notifications/catalog.ts`, remplacer `channels: ["in_app", "email"],` par `channels: ["in_app", "email", "push"],` dans les entrées suivantes : `booking_reminder` (ligne 60), `booking_cancelled` (68), `booking_rescheduled` (86), `accompagnement_access` (122), `formation_reminder` (152), `consultant_new_booking` (167), `consultant_booking_cancelled` (184), `replay_published` (261), `module_reminder` (296), `broadcast_message` (370).

Et remplacer `channels: ["in_app"],` par `channels: ["in_app", "push"],` dans `admin_payment_failed` (ligne 218) et `admin_job_failed` (238).

Les numéros de ligne sont ceux d'avant modification : repérer chaque entrée par son nom, pas par sa ligne.

- [ ] **Step 4 : vérifier que chaque événement qui pousse a bien un `href`**

Run : `pnpm exec vitest run src/lib/notifications/catalog.spec.ts`
Attendu : PASS. Si le troisième test échoue sur `admin_payment_failed` ou `admin_job_failed`, ajouter à ces entrées :

```ts
    href: () => "/admin",
```

- [ ] **Step 5 : lancer la suite complète**

Run : `pnpm test`
Attendu : PASS. Les crons et les travaux périodiques appellent `notify()` sans rien savoir du push ; ils déclenchent désormais un `sendPushToUser` qui, sans abonnement en base, renvoie `0` sans rien envoyer.

- [ ] **Step 6 : commit**

```bash
git add src/lib/notifications/catalog.ts src/lib/notifications/catalog.spec.ts
git commit -m "feat(push): declarer le canal push sur les evenements ou l'immediatete compte"
```

**Fin de l'étape 1.** Le socle est complet et inerte : aucun abonnement n'existe, donc aucun push ne part. C'est un point de déploiement sûr.

---

## Task 8 : Activation, troisième colonne et liste des appareils

**Files:**
- Create: `src/lib/notifications/push/client.ts`
- Create: `src/app/(public)/espace-client/profil/_components/push-activation.tsx`
- Modify: `src/app/(public)/espace-client/profil/_components/notification-preferences.tsx`
- Modify: `src/app/(public)/espace-client/profil/page.tsx`

**Interfaces:**
- Consomme : `registerPushSubscription`, `listPushDevices`, `removePushDevice` (tâche 6) ; `setNotificationPreference` (existant) ; `PREFERENCE_CATEGORIES.pushForbidden` (tâche 2).
- Produit :
  - `isPushSupported(): boolean`, `isIos(): boolean`, `isStandalone(): boolean`
  - `subscribeThisDevice(publicKey: string): Promise<{ endpoint: string; p256dh: string; auth: string; userAgent: string }>`
  - `<PushActivation devices={PushDevice[]} publicKey={string} onSubscribed={() => void} />`
  - `<NotificationPreferences overrides={…} pushEnabled={boolean} />` — la colonne « Sur le téléphone » est grisée quand `pushEnabled` est faux.

Aucun test automatisé n'est possible ici : Vitest tourne en environnement `node`. La vérification est manuelle, décrite au dernier pas.

- [ ] **Step 1 : écrire les helpers navigateur**

Créer `src/lib/notifications/push/client.ts` :

```ts
/**
 * Helpers navigateur du push. Strictement client : aucun import serveur ici,
 * ce module est chargé par un composant `"use client"`.
 */

/** La clé publique VAPID voyage en base64url ; l'API attend des octets. */
export const urlBase64ToUint8Array = (base64: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
};

export const isPushSupported = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const isIos = (): boolean =>
  typeof window !== "undefined" &&
  /iphone|ipad|ipod/i.test(window.navigator.userAgent);

/**
 * Vrai quand le site tourne depuis l'écran d'accueil. C'est la condition
 * qu'iOS impose au push : `standalone` est la propriété propre à Safari,
 * `display-mode` la version standard.
 */
export const isStandalone = (): boolean =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true);

export type DeviceSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
};

/**
 * Enregistre le service worker, demande l'autorisation, s'abonne, et renvoie de
 * quoi enregistrer l'abonnement côté serveur.
 *
 * Lève quand l'autorisation est refusée : **un refus est définitif**, le
 * navigateur ne redemandera plus, et l'appelant doit l'expliquer plutôt que de
 * laisser cliquer en boucle.
 */
export const subscribeThisDevice = async (
  publicKey: string,
): Promise<DeviceSubscription> => {
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Autorisation refusée");
  }

  // Un abonnement existant est réutilisé : re-souscrire avec la même clé
  // renverrait le même endpoint, mais autant éviter l'aller-retour.
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const keys = subscription.toJSON().keys;
  if (!keys?.p256dh || !keys?.auth) {
    throw new Error("Abonnement sans clés de chiffrement");
  }

  return {
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    userAgent: window.navigator.userAgent.slice(0, 300),
  };
};
```

- [ ] **Step 2 : écrire le composant d'activation**

Créer `src/app/(public)/espace-client/profil/_components/push-activation.tsx` :

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  isPushSupported,
  subscribeThisDevice,
} from "@/lib/notifications/push/client";
import { registerPushSubscription, removePushDevice } from "../push-actions";
import type { PushDevice } from "@/types/database";

type Props = {
  devices: PushDevice[];
  publicKey: string;
  /** Rafraîchit la page serveur pour que la colonne push cesse d'être grisée. */
  onSubscribed: () => void;
};

/** Nom lisible d'un appareil, à partir de son `user_agent`. */
const deviceLabel = (userAgent: string | null): string => {
  if (!userAgent) return "Appareil inconnu";
  if (/iphone/i.test(userAgent)) return "iPhone";
  if (/ipad/i.test(userAgent)) return "iPad";
  if (/android/i.test(userAgent)) return "Téléphone Android";
  if (/macintosh/i.test(userAgent)) return "Mac";
  if (/windows/i.test(userAgent)) return "Ordinateur Windows";
  return "Navigateur";
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Seule porte d'abonnement du site. L'autorisation n'est demandée que sur clic
 * délibéré : une demande surgie sans geste préalable se fait refuser
 * massivement, et un refus est définitif côté navigateur.
 */
export const PushActivation = ({ devices, publicKey, onSubscribed }: Props) => {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPermission(isPushSupported() ? Notification.permission : "unsupported");
  }, []);

  const activate = async () => {
    setPending(true);
    setError(null);
    try {
      const subscription = await subscribeThisDevice(publicKey);
      const result = await registerPushSubscription(subscription);
      if (!result.success) {
        setError(result.error ?? "L'activation a échoué.");
        return;
      }
      setPermission(Notification.permission);
      onSubscribed();
    } catch {
      setPermission(
        isPushSupported() ? Notification.permission : "unsupported",
      );
      setError("L'activation a échoué sur cet appareil.");
    } finally {
      setPending(false);
    }
  };

  const remove = async (endpoint: string) => {
    await removePushDevice(endpoint);
    onSubscribed();
  };

  if (permission === "unsupported") {
    return (
      <p className="text-xs text-muted-foreground">
        Ce navigateur ne gère pas les notifications sur l&apos;appareil.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {permission === "denied" ? (
        <p className="text-xs text-muted-foreground">
          Les notifications sont bloquées pour ce site. Le blocage se lève dans
          les réglages de votre navigateur, à la rubrique des notifications.
        </p>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={activate}
          className="border-primary-green/30 text-primary-green hover:border-primary-green hover:bg-transparent"
        >
          {pending ? "Activation..." : "Activer sur cet appareil"}
        </Button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {devices.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {devices.map((device) => (
            <li
              key={device.endpoint}
              className="flex items-center justify-between gap-4 px-3 py-2"
            >
              <div>
                <p className="text-sm">{deviceLabel(device.user_agent)}</p>
                <p className="text-xs text-muted-foreground">
                  Ajouté le {formatDate(device.created_at)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(device.endpoint)}
              >
                Retirer
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

- [ ] **Step 3 : ajouter la troisième colonne à la matrice**

Dans `src/app/(public)/espace-client/profil/_components/notification-preferences.tsx` :

Remplacer la constante `CHANNELS` (lignes 10-13) par :

```tsx
const CHANNELS: { key: NotificationChannel; label: string }[] = [
  { key: "in_app", label: "Sur le site" },
  { key: "email", label: "Par email" },
  { key: "push", label: "Sur le téléphone" },
];
```

Remplacer le type `Props` (ligne 15) par :

```tsx
type Props = {
  overrides: Record<string, boolean>;
  /** Faux tant qu'aucun navigateur n'est abonné : la colonne reste grisée. */
  pushEnabled: boolean;
};
```

Remplacer la signature du composant (ligne 21) par :

```tsx
export const NotificationPreferences = ({ overrides, pushEnabled }: Props) => {
```

Dans la liste des catégories optionnelles, remplacer le bloc `<div className="flex items-center gap-6">` et son contenu (lignes 89-106) par :

```tsx
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                {CHANNELS.map((channel) => {
                  // Une categorie qui interdit le push n'affiche pas la
                  // bascule : la griser laisserait croire qu'un reglage la
                  // rendrait possible.
                  if (channel.key === "push" && cat.pushForbidden) return null;

                  const disabled = channel.key === "push" && !pushEnabled;

                  return (
                    <label
                      key={channel.key}
                      className="flex items-center gap-2"
                      title={
                        disabled
                          ? "Activez les notifications sur cet appareil pour utiliser ce canal"
                          : undefined
                      }
                    >
                      <span
                        className={
                          disabled
                            ? "text-xs text-muted-foreground/50"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {channel.label}
                      </span>
                      <Switch
                        checked={isOn(
                          cat.key,
                          channel.key,
                          cat.defaults[channel.key],
                        )}
                        disabled={disabled}
                        onCheckedChange={(next) =>
                          toggle(cat.key, channel.key, next)
                        }
                      />
                    </label>
                  );
                })}
              </div>
```

- [ ] **Step 4 : refuser une préférence de push interdite côté serveur**

Dans `src/app/(public)/espace-client/profil/notification-actions.ts` :

Remplacer la constante `CHANNELS` (ligne 13) par :

```ts
const CHANNELS: NotificationChannel[] = ["in_app", "email", "push"];
```

et ajouter, juste après le test `if (!CHANNELS.includes(channel))` :

```ts
  // Le garde-fou vaut aussi ici : une server action est appelable directement,
  // et l'interface qui masque la bascule ne protege rien.
  if (channel === "push" && category.pushForbidden) {
    return { success: false, error: "Le push n'est pas disponible ici" };
  }
```

- [ ] **Step 5 : monter le tout dans la page de profil**

Dans `src/app/(public)/espace-client/profil/page.tsx` :

Ajouter les imports :

```tsx
import { revalidatePath } from "next/cache";
import { listPushDevices } from "./push-actions";
import { PushActivation } from "./_components/push-activation";
```

Après `const notificationPreferences = await getNotificationPreferences();`, ajouter :

```tsx
  const pushDevices = await listPushDevices();
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
```

Puis, dans la carte « Mes notifications », remplacer la ligne
`<NotificationPreferences overrides={notificationPreferences} />` par :

```tsx
          <NotificationPreferences
            overrides={notificationPreferences}
            pushEnabled={pushDevices.length > 0}
          />

          {vapidPublicKey && (
            <div className="mt-6 border-t border-border pt-4">
              <p className="mb-1 text-sm font-medium">Sur le téléphone</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Les notifications s&apos;affichent sur l&apos;appareil, même
                quand le site est fermé. À activer sur chaque appareil.
              </p>
              <PushActivation
                devices={pushDevices}
                publicKey={vapidPublicKey}
                onSubscribed={async () => {
                  "use server";
                  revalidatePath("/espace-client/profil");
                }}
              />
            </div>
          )}
```

- [ ] **Step 6 : vérifier la compilation et le lint**

Run : `pnpm exec tsc --noEmit && pnpm lint`
Attendu : aucune erreur. Si ESLint refuse la fonction `"use server"` en ligne comme prop, extraire l'action dans `push-actions.ts` :

```ts
export const refreshProfilePage = async (): Promise<void> => {
  revalidatePath("/espace-client/profil");
};
```

et passer `onSubscribed={refreshProfilePage}`.

- [ ] **Step 7 : vérifier à la main, sur un vrai appareil**

Aucun de ces points ne se teste en Vitest.

1. Engendrer les clés : `pnpm exec web-push generate-vapid-keys`, et les poser dans `.env.local`.
2. Sur Chrome (ordinateur), `/espace-client/profil` : la colonne « Sur le téléphone » est grisée, le bouton « Activer sur cet appareil » est présent.
3. Cliquer : le navigateur demande l'autorisation. Accepter. L'appareil apparaît dans la liste, la colonne cesse d'être grisée.
4. Vérifier en base : `select endpoint, user_agent from push_subscriptions;` renvoie une ligne.
5. Déclencher un push depuis `pnpm dev` :
   ```bash
   curl -s -X POST http://localhost:3000/api/cron -H "Authorization: Bearer $CRON_SECRET"
   ```
   ou, plus sûrement, appeler `notify("broadcast_message", …)` depuis l'écran de diffusion admin après avoir activé le push sur la catégorie « Annonces de l'équipe ». La notification doit s'afficher hors de l'onglet, et le clic doit ouvrir la bonne page.
6. Cliquer « Retirer » : la ligne disparaît, la colonne redevient grisée.
7. Refuser l'autorisation dans un profil neuf : la phrase sur le blocage remplace le bouton.

- [ ] **Step 8 : commit**

```bash
git add src/lib/notifications/push/client.ts "src/app/(public)/espace-client/profil/_components/push-activation.tsx" "src/app/(public)/espace-client/profil/_components/notification-preferences.tsx" "src/app/(public)/espace-client/profil/notification-actions.ts" "src/app/(public)/espace-client/profil/page.tsx"
git commit -m "feat(push): activation par appareil et troisieme colonne de preferences"
```

---

## Task 9 : Encadré d'installation iOS

**Files:**
- Create: `src/app/(public)/espace-client/profil/_components/ios-install-hint.tsx`
- Modify: `src/app/(public)/espace-client/profil/_components/push-activation.tsx`

**Interfaces:**
- Consomme : `isIos()`, `isStandalone()` (tâche 8).
- Produit : `<IosInstallHint />`, qui ne rend rien sauf sur iOS hors écran d'accueil.

**Ce que l'encadré ne fait pas, et pourquoi.** Sur iPhone non installé, le bouton « Activer sur cet appareil » reste affiché et l'abonnement échouera : `PushManager` n'existe pas, donc `isPushSupported()` est faux et le composant affiche déjà « Ce navigateur ne gère pas les notifications sur l'appareil. » L'encadré vient compléter cette phrase par le geste qui la lève. Pas de bannière, pas de fermeture à mémoriser, pas de relance.

- [ ] **Step 1 : écrire le composant**

Créer `src/app/(public)/espace-client/profil/_components/ios-install-hint.tsx` :

```tsx
"use client";

import { useEffect, useState } from "react";
import { isIos, isStandalone } from "@/lib/notifications/push/client";

/**
 * Encadré informatif, affiché seulement quand il sert : sur iPhone ou iPad, et
 * seulement si le site n'est pas déjà lancé depuis l'écran d'accueil.
 *
 * Sur iOS, le push n'existe que pour un site installé. Une part de l'audience
 * reste donc hors d'atteinte : c'est assumé, et cet encadré est le seul rattrapage
 * prévu. Ni bannière, ni popup, ni relance.
 */
export const IosInstallHint = () => {
  const [visible, setVisible] = useState(false);

  // Deux tests côté client, donc après le montage : rendus sur le serveur, ils
  // afficheraient l'encadré à tout le monde.
  useEffect(() => {
    setVisible(isIos() && !isStandalone());
  }, []);

  if (!visible) return null;

  return (
    <div className="rounded-lg border border-accent-honey bg-accent-honey-soft/50 px-3 py-3 text-xs text-primary-green">
      <p className="mb-1 font-medium">
        Sur iPhone, une étape en plus est nécessaire
      </p>
      <p>
        Les notifications ne fonctionnent que si le site est ajouté à
        l&apos;écran d&apos;accueil. Touchez le bouton Partager en bas de
        Safari, puis « Sur l&apos;écran d&apos;accueil ». Ouvrez ensuite le site
        depuis cette icône et revenez ici.
      </p>
    </div>
  );
};
```

- [ ] **Step 2 : le monter dans le composant d'activation**

Dans `src/app/(public)/espace-client/profil/_components/push-activation.tsx`, ajouter l'import :

```tsx
import { IosInstallHint } from "./ios-install-hint";
```

Puis placer `<IosInstallHint />` en première position dans les deux retours du composant : juste avant le `<p>` du cas `unsupported`, ce qui demande d'envelopper ce retour :

```tsx
  if (permission === "unsupported") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Ce navigateur ne gère pas les notifications sur l&apos;appareil.
        </p>
        <IosInstallHint />
      </div>
    );
  }
```

et comme premier enfant du `<div className="space-y-3">` du retour principal :

```tsx
    <div className="space-y-3">
      <IosInstallHint />
      {permission === "denied" ? (
```

- [ ] **Step 3 : vérifier la compilation et le lint**

Run : `pnpm exec tsc --noEmit && pnpm lint`
Attendu : aucune erreur.

- [ ] **Step 4 : vérifier à la main**

1. Sur Chrome ordinateur : l'encadré n'apparaît pas.
2. Dans les outils de développement, émuler un iPhone et recharger : l'encadré apparaît, avec la phrase sur le bouton Partager.
3. Sur un vrai iPhone, Safari, `/espace-client/profil` : l'encadré apparaît.
4. Ajouter le site à l'écran d'accueil, ouvrir depuis l'icône, revenir sur la page : l'encadré a disparu, et le bouton « Activer sur cet appareil » est utilisable.
5. Activer, puis déclencher un push : la notification s'affiche sur le téléphone.

- [ ] **Step 5 : lancer la suite complète**

Run : `pnpm test && pnpm lint && pnpm build`
Attendu : PASS partout.

- [ ] **Step 6 : commit**

```bash
git add "src/app/(public)/espace-client/profil/_components/ios-install-hint.tsx" "src/app/(public)/espace-client/profil/_components/push-activation.tsx"
git commit -m "feat(push): encadre d'installation sur iOS"
```

---

## Après le plan

**Migration à pousser.** `pnpm db:push` applique `00087` au projet Supabase de production. À demander explicitement avant de le lancer.

**Variables d'environnement à poser sur Vercel**, en production et en préproduction : `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Tant qu'elles manquent, le canal se désactive en silence et logue : rien ne casse, rien ne part.

**Ce que le plan laisse dehors, conformément à la spec** : parcours d'installation PWA, synchronisation d'un abonnement entre appareils, invitation à s'abonner ailleurs que dans les préférences, relance de qui a refusé, mode hors ligne, suppression des abonnements à la déconnexion, icônes PNG de marque pour le manifeste.
