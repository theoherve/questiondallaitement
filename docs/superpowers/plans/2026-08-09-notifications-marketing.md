# Notifications marketing périodiques — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brancher les quatre derniers événements marketing de la spec — article de blog, relance de module en cours, demande d'avis, résumé hebdomadaire — sur l'infrastructure de notification existante.

**Architecture:** Chaque travail périodique est un module autonome dans `src/lib/notifications/jobs/`, exposant une fonction sans paramètre qui renvoie le nombre d'envois. La route de cron existante les orchestre et ne fait qu'appeler et compter. La fenêtre de déclenchement et la clé de déduplication sont la vraie matière de chaque tâche.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase, Resend, date-fns, Vitest.

## Global Constraints

- Ce plan suppose les tranches 1 et 2 en place : catalogue, `notify()`, `resolveAudience()`, préférences, désinscription par jeton. Voir les deux plans précédents dans `docs/superpowers/plans/`.
- **La planification du cron ne vit pas dans le dépôt.** `vercel.json` vaut `{}` et aucun workflow GitHub ne l'appelle : la fréquence est réglée dans le tableau de bord Vercel. **Tout nouveau travail périodique entre dans `src/app/api/cron/route.ts`**, la seule porte d'entrée déjà planifiée. Créer un nouvel endpoint reviendrait à écrire du code qui ne s'exécuterait jamais.
- **La fréquence réelle du cron est inconnue depuis le dépôt.** Chaque travail se protège donc lui-même : il vérifie sa propre fenêtre et porte une clé de déduplication qui rend un second passage inoffensif. Aucun ne doit supposer « une fois par jour ».
- `notify()` reste **strictement serveur** et **ne lève jamais**. Un travail en échec ne doit pas empêcher les suivants.
- Tout événement de ce plan est de catégorie `marketing` : les préférences s'appliquent, et l'email porte un lien de désinscription (construit automatiquement par `notify()` dès que le destinataire porte son jeton).
- Textes visibles par les visiteurs : **aucun tiret cadratin** (`—`).
- Vitest tourne en `environment: "node"` : aucun test de composant React.
- Commandes : `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm db:push:dry`, `pnpm db:push`.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `src/lib/notifications/jobs/module-reminder.ts` | Relance des accompagnements commencés et laissés en plan |
| `src/lib/notifications/jobs/review-request.ts` | Demande d'avis, deux jours après la consultation |
| `src/lib/notifications/jobs/weekly-digest.ts` | Résumé hebdomadaire des notifications non lues |
| `src/lib/notifications/jobs/index.ts` | Réexports, pour que la route de cron n'importe qu'un chemin |

Fichiers modifiés : `src/lib/notifications/types.ts` et `catalog.ts` (quatre événements), `src/lib/emails/send.ts` (trois senders), `src/lib/notifications/audience.ts` (règle `preference_enabled`), `src/app/api/cron/route.ts` (orchestration), `src/app/(dashboard)/admin/blog/actions.ts` (publication manuelle).

L'article de blog n'a pas de module de travail : il se déclenche à la publication, pas par balayage.

---

## Ce que la lecture du code a établi

- **Aucun `completed_at` sur `bookings`.** La demande d'avis se cale donc sur `ends_at`, la date du rendez-vous, et non sur le moment où la consultante l'a marqué honoré. C'est d'ailleurs plus juste : « deux jours après votre consultation » parle de la consultation.
- **La progression existe** : `accompagnement_progress` (renommée depuis `formation_progress` en `00071`), une ligne par bloc terminé, rattachée à `enrollment_id`.
- **Le lien d'avis Google existe** : `GOOGLE_PROFILE.url` dans `src/data/testimonials.ts`, avec l'identifiant de fiche. La variante d'écriture d'avis s'obtient en remplaçant `local/reviews` par `local/writereview`.
- **Le digest n'a pas besoin de nouvelle source** : il agrège la table `notifications` elle-même.

---

### Task 1: Les quatre événements au catalogue

**Files:**
- Modify: `src/lib/notifications/types.ts`, `src/lib/notifications/catalog.ts`, `src/lib/emails/send.ts`
- Test: `src/lib/notifications/catalog.spec.ts`

**Interfaces:**
- Consumes: `NotificationCatalog`, `sendTransactionalEmail`
- Produces: événements `blog_post_published`, `module_reminder`, `review_request`, `weekly_digest` ; senders `sendBlogPostToClients`, `sendModuleReminder`, `sendReviewRequest`, `sendWeeklyDigest`

- [ ] **Step 1: Ajouter le test qui échoue**

Dans `src/lib/notifications/catalog.spec.ts`, ajouter :

```ts
it("classe les quatre événements marketing dans des catégories désactivables", () => {
  const marketing = [
    "blog_post_published",
    "module_reminder",
    "review_request",
    "weekly_digest",
  ] as const;

  for (const key of marketing) {
    const def = NOTIFICATION_CATALOG[key];
    expect(def).toBeDefined();
    expect(def.category).toBe("marketing");
  }
});

it("déclare un adaptateur email sur chaque événement marketing", () => {
  for (const def of Object.values(NOTIFICATION_CATALOG)) {
    if (def.category !== "marketing") continue;
    expect(def.email).toBeTypeOf("function");
  }
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/lib/notifications/catalog.spec.ts`
Expected: FAIL, `NOTIFICATION_CATALOG.blog_post_published` est `undefined`.

- [ ] **Step 3: Déclarer les données de chaque événement**

Dans `src/lib/notifications/types.ts`, ajouter à `NotificationDataMap` :

```ts
  blog_post_published: {
    post_id: string;
    slug: string;
    title: string;
    unsubscribe_url?: string;
  };
  module_reminder: {
    accompagnement_id: string;
    title: string;
    remaining: number;
    unsubscribe_url?: string;
  };
  review_request: {
    booking_id: string;
    client_name: string;
    review_url: string;
    unsubscribe_url?: string;
  };
  weekly_digest: {
    count: number;
    highlights: string[];
    unsubscribe_url?: string;
  };
```

- [ ] **Step 4: Écrire les trois senders**

Dans `src/lib/emails/send.ts`, à la suite de `sendReplayPublished`, en HTML en ligne comme lui :

```ts
export const sendBlogPostToClients = async (
  clientEmail: string,
  variables: { title: string; post_url: string; unsubscribe_url: string },
) => {
  await sendTransactionalEmail({
    to: clientEmail,
    subject: `Nouvel article : ${variables.title}`,
    html: `
      <h1>${variables.title}</h1>
      <p>Un nouvel article vient de paraitre sur le blog.</p>
      <p><a href="${variables.post_url}" style="display:inline-block;padding:12px 24px;background-color:#2F5D50;color:#fff;text-decoration:none;border-radius:6px;">Lire l'article</a></p>
      <p style="margin-top:32px;font-size:12px;color:#888;">
        <a href="${variables.unsubscribe_url}">Ne plus recevoir les articles du blog</a>.
      </p>
    `,
  });
};

export const sendModuleReminder = async (
  clientEmail: string,
  variables: {
    title: string;
    remaining: number;
    accompagnement_url: string;
    unsubscribe_url: string;
  },
) => {
  await sendTransactionalEmail({
    to: clientEmail,
    subject: `Vous avez laissé « ${variables.title} » en cours`,
    html: `
      <h1>Reprenez quand vous voulez</h1>
      <p>Il vous reste ${variables.remaining} étape${variables.remaining > 1 ? "s" : ""} dans « ${variables.title} ».</p>
      <p><a href="${variables.accompagnement_url}" style="display:inline-block;padding:12px 24px;background-color:#2F5D50;color:#fff;text-decoration:none;border-radius:6px;">Reprendre</a></p>
      <p style="margin-top:32px;font-size:12px;color:#888;">
        <a href="${variables.unsubscribe_url}">Ne plus recevoir ces rappels</a>.
      </p>
    `,
  });
};

export const sendReviewRequest = async (
  clientEmail: string,
  variables: {
    client_name: string;
    review_url: string;
    unsubscribe_url: string;
  },
) => {
  await sendTransactionalEmail({
    to: clientEmail,
    subject: "Votre consultation, en quelques mots ?",
    html: `
      <p>Bonjour ${variables.client_name},</p>
      <p>J'espère que notre échange vous a été utile. Si vous avez un instant,
      votre retour aide beaucoup les futures mamans à se décider.</p>
      <p><a href="${variables.review_url}" style="display:inline-block;padding:12px 24px;background-color:#2F5D50;color:#fff;text-decoration:none;border-radius:6px;">Laisser un avis</a></p>
      <p style="margin-top:32px;font-size:12px;color:#888;">
        <a href="${variables.unsubscribe_url}">Ne plus recevoir ces demandes</a>.
      </p>
    `,
  });
};

export const sendWeeklyDigest = async (
  clientEmail: string,
  variables: { count: number; highlights: string[]; unsubscribe_url: string },
) => {
  await sendTransactionalEmail({
    to: clientEmail,
    subject: `Votre semaine : ${variables.count} nouveauté${variables.count > 1 ? "s" : ""}`,
    html: `
      <h1>Votre résumé de la semaine</h1>
      <ul>${variables.highlights.map((h) => `<li>${h}</li>`).join("")}</ul>
      <p style="margin-top:32px;font-size:12px;color:#888;">
        <a href="${variables.unsubscribe_url}">Ne plus recevoir ce résumé</a>.
      </p>
    `,
  });
};
```

- [ ] **Step 5: Ajouter les quatre entrées au catalogue**

Dans `src/lib/notifications/catalog.ts`, importer les senders et ajouter :

```ts
  blog_post_published: {
    key: "blog_post_published",
    category: "marketing",
    preferenceKey: "articles",
    channels: ["in_app", "email"],
    title: (d) => `Nouvel article : ${d.title}`,
    href: (d) => `/blog/${d.slug}`,
    actions: (d) => [
      { label: "Lire", href: `/blog/${d.slug}`, variant: "primary" },
    ],
    email: (to, d) =>
      sendBlogPostToClients(to, {
        title: d.title,
        post_url: `${siteUrl()}/blog/${d.slug}`,
        unsubscribe_url: d.unsubscribe_url ?? `${siteUrl()}/espace-client/profil`,
      }),
  },
  module_reminder: {
    key: "module_reminder",
    category: "marketing",
    preferenceKey: "rappels_suivi",
    channels: ["in_app", "email"],
    title: (d) => `Vous avez laissé « ${d.title} » en cours`,
    body: (d) =>
      `Il vous reste ${d.remaining} étape${d.remaining > 1 ? "s" : ""}.`,
    href: (d) => `/espace-client/accompagnements/${d.accompagnement_id}`,
    actions: (d) => [
      {
        label: "Reprendre",
        href: `/espace-client/accompagnements/${d.accompagnement_id}`,
        variant: "primary",
      },
    ],
    email: (to, d) =>
      sendModuleReminder(to, {
        title: d.title,
        remaining: d.remaining,
        accompagnement_url: `${siteUrl()}/espace-client/accompagnements/${d.accompagnement_id}`,
        unsubscribe_url: d.unsubscribe_url ?? `${siteUrl()}/espace-client/profil`,
      }),
  },
  review_request: {
    key: "review_request",
    category: "marketing",
    preferenceKey: "rappels_suivi",
    channels: ["in_app", "email"],
    title: () => "Votre consultation, en quelques mots ?",
    body: () => "Votre retour aide les futures mamans à se décider.",
    href: (d) => d.review_url,
    actions: (d) => [
      { label: "Laisser un avis", href: d.review_url, variant: "primary" },
    ],
    email: (to, d) =>
      sendReviewRequest(to, {
        client_name: d.client_name,
        review_url: d.review_url,
        unsubscribe_url: d.unsubscribe_url ?? `${siteUrl()}/espace-client/profil`,
      }),
  },
  weekly_digest: {
    key: "weekly_digest",
    category: "marketing",
    preferenceKey: "digest",
    // Email seul : un resume in-app des notifications in-app n'aurait aucun
    // sens, il ferait doublon avec la liste qu'il resume.
    channels: ["email"],
    title: (d) => `Votre semaine : ${d.count} nouveauté${d.count > 1 ? "s" : ""}`,
    email: (to, d) =>
      sendWeeklyDigest(to, {
        count: d.count,
        highlights: d.highlights,
        unsubscribe_url: d.unsubscribe_url ?? `${siteUrl()}/espace-client/profil`,
      }),
  },
```

**Attention au test des liens internes** ajouté en tranche 1 : il vérifie que tout `href` commence par `/`. `review_request` pointe vers Google, donc vers une URL absolue. Adapter ce test :

```ts
// dans le test « ne construit que des liens internes ou absolus connus »
      const href = def.href?.(sample as never);
      // `review_request` pointe vers la fiche Google : c'est le seul lien
      // sortant du catalogue, et il est voulu.
      if (href && def.key !== "review_request") {
        expect(href.startsWith("/")).toBe(true);
      }
```

et ajouter `review_url: "https://search.google.com/local/writereview?placeid=x"` à l'objet `sample` du test.

- [ ] **Step 6: Lancer les tests**

Run: `pnpm test src/lib/notifications/ && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/notifications src/lib/emails/send.ts
git commit -m "feat(notifications): catalogue des quatre evenements marketing"
```

---

### Task 2: Article de blog publié

**Files:**
- Modify: `src/app/api/cron/route.ts`, `src/app/(dashboard)/admin/blog/actions.ts`
- Test: `src/app/api/cron/route.spec.ts`

**Interfaces:**
- Consumes: `notify`, `resolveAudience`
- Produces: `blog_post_published` émis depuis les deux chemins de publication

Deux chemins mènent à une publication : le cron qui bascule les articles programmés, et l'action d'administration qui publie à la main. Les deux doivent notifier, et la clé de déduplication garantit qu'un article publié puis modifié ne renotifie pas.

- [ ] **Step 1: Écrire le test qui échoue**

Dans `src/app/api/cron/route.spec.ts`, ajouter :

```ts
it("notifie la publication d'un article programmé", async () => {
  tableData.blog_posts = [{ id: "post-1", slug: "sommeil", title: "Le sommeil" }];

  await GET(authorized());

  const call = notify.mock.calls.find((c) => c[0] === "blog_post_published");
  expect(call).toBeDefined();
  expect(call![2]).toMatchObject({ post_id: "post-1", slug: "sommeil" });
  expect(call![3]).toMatchObject({ dedupeId: "post-1" });
});

it("ne notifie aucun article quand rien n'est programmé", async () => {
  await GET(authorized());

  expect(
    notify.mock.calls.find((c) => c[0] === "blog_post_published")
  ).toBeUndefined();
});
```

Compléter le mock de `@/lib/notifications` du fichier avec `resolveAudience` :

```ts
const { notify, getRoleRecipients, resolveAudience } = vi.hoisted(() => ({
  notify: vi.fn().mockResolvedValue(undefined),
  getRoleRecipients: vi.fn().mockResolvedValue([]),
  resolveAudience: vi.fn().mockResolvedValue([{ userId: "c1", email: "c1@b.fr" }]),
}));

vi.mock("@/lib/notifications", () => ({ notify, getRoleRecipients, resolveAudience }));
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/app/api/cron/route.spec.ts`
Expected: FAIL, aucun appel `blog_post_published`.

- [ ] **Step 3: Ajouter la règle d'audience « toutes les clientes »**

Le blog est le seul contenu à audience ouverte : il ne s'adresse pas aux ayants droit d'un accompagnement mais à toute personne ayant un compte et n'ayant pas coupé la catégorie. Dans `src/lib/notifications/audience.ts`, ajouter au type :

```ts
  /** Toutes les clientes ayant un compte. Le filtrage se fait ensuite par les préférences. */
  | { kind: "all_clients" }
```

et dans le corps, à côté de `accompagnement_holders` :

```ts
  } else if (rule.kind === "all_clients") {
    const stats = await loadClientStats();
    resolved = stats.map((c) => ({
      userId: c.id,
      email: c.email,
      unsubscribeToken: c.unsubscribe_token,
    }));
```

- [ ] **Step 4: Émettre depuis le cron**

Dans `src/app/api/cron/route.ts`, dans le bloc de publication des articles programmés, après le `revalidatePath` de chaque article et avant la notification aux administratrices :

```ts
      const recipients = await resolveAudience("blog_post_published", {
        kind: "all_clients",
      });

      for (const post of publishedDetails ?? []) {
        await notify(
          "blog_post_published",
          recipients,
          { post_id: post.id, slug: post.slug, title: post.title },
          { dedupeId: post.id },
        );
      }
```

`publishedDetails` ne sélectionne aujourd'hui que `title` : élargir sa requête à `id, slug, title`.

- [ ] **Step 5: Émettre depuis la publication manuelle**

Dans `src/app/(dashboard)/admin/blog/actions.ts`, au point où le statut passe à `published` (ligne ~233, la transition depuis un autre statut), ajouter le même appel. Ne notifier **que** lors de la transition vers `published`, jamais lors d'une modification d'un article déjà publié : le `dedupeId` protège l'in-app, mais pas l'email, qui partirait à chaque enregistrement.

- [ ] **Step 6: Lancer les tests**

Run: `pnpm test src/app/api/cron/ "src/app/(dashboard)/admin/blog/" && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/notifications/audience.ts src/app/api/cron "src/app/(dashboard)/admin/blog"
git commit -m "feat(notifications): annonce des articles de blog aux clientes"
```

---

### Task 3: Relance des accompagnements en cours

**Files:**
- Create: `src/lib/notifications/jobs/module-reminder.ts`
- Test: `src/lib/notifications/jobs/module-reminder.spec.ts`

**Interfaces:**
- Consumes: `createAdminClient`, `notify`
- Produces: `runModuleReminders(): Promise<number>`

**Règle de déclenchement** : une inscription commencée (au moins un bloc terminé), non terminée (au moins un bloc restant), dont la dernière progression date de **sept jours ou plus**. **Déduplication par inscription et par mois calendaire** : relancer chaque semaine quelqu'un qui a arrêté serait du harcèlement, une fois par mois est une relance.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/notifications/jobs/module-reminder.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { notify, tableData } = vi.hoisted(() => ({
  notify: vi.fn().mockResolvedValue(undefined),
  tableData: {} as Record<string, unknown[]>,
}));

vi.mock("@/lib/notifications/notify", () => ({ notify }));

const makeChain = (table: string) => {
  const rows = tableData[table] ?? [];
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) =>
      resolve({ data: rows, error: null }),
  };
  return new Proxy(chain, {
    get: (target, prop) =>
      prop in target ? target[prop as string] : () => makeChain(table),
  });
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (t: string) => makeChain(t) }),
}));

import { runModuleReminders } from "./module-reminder";

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86400000).toISOString();

describe("runModuleReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(tableData)) delete tableData[k];

    // Les blocs ne sont pas rattachés à l'accompagnement mais à ses sections :
    // le compte total passe donc par la même imbrication que l'espace client.
    tableData.accompagnement_enrollments = [
      {
        id: "enr-1",
        client_id: "c1",
        accompagnement_id: "acc-1",
        accompagnements: {
          id: "acc-1",
          title: "Reprendre le travail",
          accompagnement_sections: [
            { accompagnement_blocks: [{ id: "b1" }, { id: "b2" }] },
            { accompagnement_blocks: [{ id: "b3" }] },
          ],
        },
        profiles: { email: "a@b.fr", notification_unsubscribe_token: "tok-1" },
      },
    ];
    tableData.accompagnement_progress = [
      { enrollment_id: "enr-1", block_id: "b1", completed: true, completed_at: daysAgo(10) },
    ];
  });

  it("relance une inscription commencée et laissée en plan", async () => {
    const sent = await runModuleReminders();

    expect(sent).toBe(1);
    expect(notify).toHaveBeenCalledWith(
      "module_reminder",
      [
        expect.objectContaining({
          userId: "c1",
          email: "a@b.fr",
          unsubscribeToken: "tok-1",
        }),
      ],
      expect.objectContaining({ accompagnement_id: "acc-1", remaining: 2 }),
      expect.objectContaining({ dedupeId: expect.stringMatching(/^enr-1:\d{4}-\d{2}$/) })
    );
  });

  it("ne relance pas une progression récente", async () => {
    tableData.accompagnement_progress = [
      { enrollment_id: "enr-1", block_id: "b1", completed: true, completed_at: daysAgo(2) },
    ];

    expect(await runModuleReminders()).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("ne relance pas une inscription jamais commencée", async () => {
    tableData.accompagnement_progress = [];

    expect(await runModuleReminders()).toBe(0);
  });

  it("ne relance pas un accompagnement terminé", async () => {
    tableData.accompagnement_progress = [
      { enrollment_id: "enr-1", block_id: "b1", completed: true, completed_at: daysAgo(10) },
      { enrollment_id: "enr-1", block_id: "b2", completed: true, completed_at: daysAgo(10) },
      { enrollment_id: "enr-1", block_id: "b3", completed: true, completed_at: daysAgo(10) },
    ];

    expect(await runModuleReminders()).toBe(0);
  });

  it("déduplique par inscription et par mois", async () => {
    await runModuleReminders();

    const dedupeId = notify.mock.calls[0][3].dedupeId as string;
    const [, month] = dedupeId.split(":");
    expect(month).toMatch(/^\d{4}-\d{2}$/);
  });

  it("ne lève pas quand une inscription est incomplète", async () => {
    tableData.accompagnement_enrollments = [
      { id: "enr-2", client_id: "c2", accompagnement_id: "acc-2", accompagnements: null, profiles: null },
    ];

    await expect(runModuleReminders()).resolves.toBe(0);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/lib/notifications/jobs/module-reminder.spec.ts`
Expected: FAIL, module absent.

- [ ] **Step 3: Écrire le module**

Créer `src/lib/notifications/jobs/module-reminder.ts` :

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/notify";

/** Silence minimal avant de considérer qu'un accompagnement est en plan. */
const IDLE_DAYS = 7;

/**
 * Relance les accompagnements commencés puis laissés de côté.
 *
 * Déduplication par inscription et par mois calendaire : relancer chaque
 * semaine quelqu'un qui a arrêté serait du harcèlement, une fois par mois est
 * une relance. La clé absorbe donc aussi bien un cron horaire qu'un cron
 * quotidien, sans qu'on ait besoin de connaître sa fréquence.
 */
export const runModuleReminders = async (): Promise<number> => {
  const supabase = createAdminClient();

  // Les blocs pendent des sections, pas de l'accompagnement : d'ou
  // l'imbrication, reprise telle quelle de `src/app/(public)/espace-client/page.tsx`.
  const { data: enrollments } = await supabase
    .from("accompagnement_enrollments")
    .select(
      "id, client_id, accompagnement_id, accompagnements(id, title, accompagnement_sections(accompagnement_blocks(id))), profiles!accompagnement_enrollments_client_id_fkey(email, notification_unsubscribe_token)",
    );

  if (!enrollments || enrollments.length === 0) return 0;

  const { data: progress } = await supabase
    .from("accompagnement_progress")
    .select("enrollment_id, block_id, completed, completed_at");

  const month = new Date().toISOString().slice(0, 7);
  const idleBefore = Date.now() - IDLE_DAYS * 86400000;
  let sent = 0;

  for (const enrollment of enrollments) {
    const accompagnement = enrollment.accompagnements as unknown as {
      id: string;
      title: string;
      accompagnement_sections: { accompagnement_blocks: { id: string }[] }[];
    } | null;
    const profile = enrollment.profiles as unknown as {
      email: string | null;
      notification_unsubscribe_token: string | null;
    } | null;

    // Donnees incompletes : on passe, sans faire echouer le reste du balayage.
    if (!accompagnement || !profile?.email) continue;

    const done = (progress ?? []).filter(
      (p) => p.enrollment_id === enrollment.id && p.completed,
    );
    if (done.length === 0) continue;

    const totalBlocks = (accompagnement.accompagnement_sections ?? []).reduce(
      (acc, section) => acc + (section.accompagnement_blocks?.length ?? 0),
      0,
    );
    const remaining = totalBlocks - done.length;
    if (remaining <= 0) continue;

    const lastAt = Math.max(
      ...done.map((p) => new Date(p.completed_at as string).getTime()),
    );
    if (lastAt > idleBefore) continue;

    await notify(
      "module_reminder",
      [
        {
          userId: enrollment.client_id,
          email: profile.email,
          unsubscribeToken: profile.notification_unsubscribe_token,
        },
      ],
      {
        accompagnement_id: accompagnement.id,
        title: accompagnement.title,
        remaining,
      },
      { dedupeId: `${enrollment.id}:${month}` },
    );
    sent++;
  }

  return sent;
};
```

Les noms de tables employés ici (`accompagnement_enrollments`, `accompagnement_progress`, `accompagnement_sections`, `accompagnement_blocks`) sont ceux d'après le renommage `00071`. Un nom erroné ne se verrait **ni à la compilation ni dans les tests**, qui simulent la base : la seule preuve est une exécution réelle, d'où l'étape de vérification manuelle de la tâche 7.

- [ ] **Step 4: Lancer les tests**

Run: `pnpm test src/lib/notifications/jobs/module-reminder.spec.ts`
Expected: PASS, six tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications/jobs
git commit -m "feat(notifications): relance des accompagnements laisses en cours"
```

---

### Task 4: Demande d'avis

**Files:**
- Create: `src/lib/notifications/jobs/review-request.ts`
- Test: `src/lib/notifications/jobs/review-request.spec.ts`

**Interfaces:**
- Consumes: `createAdminClient`, `notify`, `GOOGLE_PROFILE` de `@/data/testimonials`
- Produces: `runReviewRequests(): Promise<number>`

**Règle de déclenchement** : consultations au statut `completed` dont `ends_at` tombe dans la journée d'il y a deux jours. **Déduplication par réservation**, définitivement : on ne demande un avis qu'une fois.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/notifications/jobs/review-request.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { notify, tableData, capturedFilters } = vi.hoisted(() => ({
  notify: vi.fn().mockResolvedValue(undefined),
  tableData: {} as Record<string, unknown[]>,
  capturedFilters: [] as { method: string; args: unknown[] }[],
}));

vi.mock("@/lib/notifications/notify", () => ({ notify }));

const makeChain = (table: string) => {
  const rows = tableData[table] ?? [];
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) =>
      resolve({ data: rows, error: null }),
  };
  return new Proxy(chain, {
    get: (target, prop) => {
      if (prop in target) return target[prop as string];
      return (...args: unknown[]) => {
        capturedFilters.push({ method: String(prop), args });
        return makeChain(table);
      };
    },
  });
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (t: string) => makeChain(t) }),
}));

import { runReviewRequests } from "./review-request";

describe("runReviewRequests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedFilters.length = 0;
    for (const k of Object.keys(tableData)) delete tableData[k];

    tableData.bookings = [
      {
        id: "book-1",
        client_id: "c1",
        profiles: {
          first_name: "Camille",
          email: "a@b.fr",
          notification_unsubscribe_token: "tok-1",
        },
      },
    ];
  });

  it("demande un avis pour une consultation honorée", async () => {
    const sent = await runReviewRequests();

    expect(sent).toBe(1);
    expect(notify).toHaveBeenCalledWith(
      "review_request",
      [
        expect.objectContaining({
          userId: "c1",
          email: "a@b.fr",
          unsubscribeToken: "tok-1",
        }),
      ],
      expect.objectContaining({
        booking_id: "book-1",
        client_name: "Camille",
      }),
      { dedupeId: "book-1" }
    );
  });

  it("pointe vers le formulaire d'avis Google, pas vers la liste", async () => {
    await runReviewRequests();

    const data = notify.mock.calls[0][2] as { review_url: string };
    expect(data.review_url).toContain("writereview");
    expect(data.review_url).toContain("placeid=");
  });

  it("ne retient que les consultations honorées", async () => {
    await runReviewRequests();

    const statusFilter = capturedFilters.find(
      (f) => f.method === "eq" && f.args[0] === "status"
    );
    expect(statusFilter?.args[1]).toBe("completed");
  });

  it("borne la recherche sur la journée d'il y a deux jours", async () => {
    await runReviewRequests();

    const gte = capturedFilters.find(
      (f) => f.method === "gte" && f.args[0] === "ends_at"
    );
    const lte = capturedFilters.find(
      (f) => f.method === "lte" && f.args[0] === "ends_at"
    );
    expect(gte).toBeDefined();
    expect(lte).toBeDefined();

    const spanMs =
      new Date(lte!.args[1] as string).getTime() -
      new Date(gte!.args[1] as string).getTime();
    // Une journee, a la milliseconde de fin pres.
    expect(spanMs).toBeGreaterThan(86_000_000);
    expect(spanMs).toBeLessThan(86_500_000);
  });

  it("ignore une réservation sans adresse email", async () => {
    tableData.bookings = [
      { id: "book-2", client_id: "c2", profiles: { first_name: "X", email: null } },
    ];

    expect(await runReviewRequests()).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("renvoie 0 sans consultation à traiter", async () => {
    tableData.bookings = [];

    expect(await runReviewRequests()).toBe(0);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/lib/notifications/jobs/review-request.spec.ts`
Expected: FAIL, module absent.

- [ ] **Step 3: Écrire le module**

Créer `src/lib/notifications/jobs/review-request.ts` :

```ts
import { addDays, endOfDay, startOfDay } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/notify";
import { GOOGLE_PROFILE } from "@/data/testimonials";

/** Délai après la consultation. Assez pour avoir un avis, assez tôt pour s'en souvenir. */
const DAYS_AFTER = 2;

/**
 * URL d'écriture d'avis, dérivée de la fiche existante. La constante partagée
 * pointe vers la **lecture** des avis : la variante d'écriture ouvre
 * directement le formulaire, ce qui évite une étape à la cliente.
 */
const REVIEW_URL = GOOGLE_PROFILE.url.replace(
  "local/reviews",
  "local/writereview",
);

/**
 * Demande un avis deux jours après la consultation.
 *
 * `bookings` n'a pas de `completed_at` : la fenêtre porte donc sur `ends_at`,
 * la date du rendez-vous. C'est de toute façon ce dont parle le message.
 *
 * Déduplication définitive par réservation : on ne demande un avis qu'une fois.
 */
export const runReviewRequests = async (): Promise<number> => {
  const supabase = createAdminClient();
  const target = addDays(new Date(), -DAYS_AFTER);

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, client_id, profiles!bookings_client_id_fkey(first_name, email, notification_unsubscribe_token)",
    )
    .eq("status", "completed")
    .gte("ends_at", startOfDay(target).toISOString())
    .lte("ends_at", endOfDay(target).toISOString());

  let sent = 0;

  for (const booking of bookings ?? []) {
    const profile = booking.profiles as unknown as {
      first_name: string | null;
      email: string | null;
      notification_unsubscribe_token: string | null;
    } | null;

    if (!profile?.email) continue;

    await notify(
      "review_request",
      [
        {
          userId: booking.client_id,
          email: profile.email,
          unsubscribeToken: profile.notification_unsubscribe_token,
        },
      ],
      {
        booking_id: booking.id,
        client_name: profile.first_name ?? "",
        review_url: REVIEW_URL,
      },
      { dedupeId: booking.id },
    );
    sent++;
  }

  return sent;
};
```

- [ ] **Step 4: Lancer les tests**

Run: `pnpm test src/lib/notifications/jobs/review-request.spec.ts`
Expected: PASS, six tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications/jobs/review-request.ts src/lib/notifications/jobs/review-request.spec.ts
git commit -m "feat(notifications): demande d'avis deux jours apres la consultation"
```

---

### Task 5: Résumé hebdomadaire

**Files:**
- Create: `src/lib/notifications/jobs/weekly-digest.ts`
- Create: `src/lib/notifications/jobs/index.ts`
- Test: `src/lib/notifications/jobs/weekly-digest.spec.ts`
- Modify: `src/lib/notifications/audience.ts`

**Interfaces:**
- Consumes: `createAdminClient`, `notify`, `resolveAudience`
- Produces: `runWeeklyDigest(now?: Date): Promise<number>`, règle d'audience `{ kind: "preference_enabled"; categoryKey }`

**Règle de déclenchement** : le digest étant en opt-in, son audience est exactement l'ensemble des personnes ayant **activé** la préférence, ce qu'aucune règle existante ne sait exprimer. D'où une quatrième règle d'audience. Le travail ne s'exécute **que le lundi**, et se déduplique par utilisatrice et par semaine ISO.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/notifications/jobs/weekly-digest.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { notify, resolveAudience, tableData } = vi.hoisted(() => ({
  notify: vi.fn().mockResolvedValue(undefined),
  resolveAudience: vi.fn(),
  tableData: {} as Record<string, unknown[]>,
}));

vi.mock("@/lib/notifications/notify", () => ({ notify }));
vi.mock("@/lib/notifications/audience", () => ({ resolveAudience }));

const makeChain = (table: string) => {
  const rows = tableData[table] ?? [];
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) =>
      resolve({ data: rows, error: null }),
  };
  return new Proxy(chain, {
    get: (target, prop) =>
      prop in target ? target[prop as string] : () => makeChain(table),
  });
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (t: string) => makeChain(t) }),
}));

import { runWeeklyDigest } from "./weekly-digest";

const MONDAY = new Date("2026-08-10T09:00:00Z");
const WEDNESDAY = new Date("2026-08-12T09:00:00Z");

describe("runWeeklyDigest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(tableData)) delete tableData[k];
    resolveAudience.mockResolvedValue([
      { userId: "u1", email: "a@b.fr", unsubscribeToken: "tok-1" },
    ]);
    tableData.notifications = [
      { user_id: "u1", title: "Nouveau replay" },
      { user_id: "u1", title: "Nouvel article" },
    ];
  });

  it("n'envoie rien un jour qui n'est pas lundi", async () => {
    expect(await runWeeklyDigest(WEDNESDAY)).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("envoie le résumé le lundi", async () => {
    const sent = await runWeeklyDigest(MONDAY);

    expect(sent).toBe(1);
    expect(notify).toHaveBeenCalledWith(
      "weekly_digest",
      [expect.objectContaining({ userId: "u1" })],
      expect.objectContaining({
        count: 2,
        highlights: ["Nouveau replay", "Nouvel article"],
      }),
      expect.objectContaining({ dedupeId: expect.stringContaining("u1:") })
    );
  });

  it("ne cible que les personnes ayant activé le digest", async () => {
    await runWeeklyDigest(MONDAY);

    expect(resolveAudience).toHaveBeenCalledWith("weekly_digest", {
      kind: "preference_enabled",
      categoryKey: "digest",
    });
  });

  it("n'écrit à personne dont la semaine a été vide", async () => {
    tableData.notifications = [];

    expect(await runWeeklyDigest(MONDAY)).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("déduplique par utilisatrice et par semaine", async () => {
    await runWeeklyDigest(MONDAY);

    const dedupeId = notify.mock.calls[0][3].dedupeId as string;
    expect(dedupeId).toMatch(/^u1:\d{4}-W\d{2}$/);
  });

  it("limite le nombre de titres repris dans le résumé", async () => {
    tableData.notifications = Array.from({ length: 12 }, (_, i) => ({
      user_id: "u1",
      title: `Notification ${i}`,
    }));

    await runWeeklyDigest(MONDAY);

    const data = notify.mock.calls[0][2] as { count: number; highlights: string[] };
    expect(data.count).toBe(12);
    expect(data.highlights.length).toBeLessThanOrEqual(5);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/lib/notifications/jobs/weekly-digest.spec.ts`
Expected: FAIL, module absent.

- [ ] **Step 3: Ajouter la règle d'audience**

Dans `src/lib/notifications/audience.ts`, ajouter au type :

```ts
  /**
   * Les personnes ayant explicitement **activé** une catégorie. Utile pour une
   * catégorie en opt-in comme le digest, où l'absence de préférence vaut
   * refus : aucune autre règle ne sait exprimer cette audience.
   */
  | { kind: "preference_enabled"; categoryKey: string }
```

et dans le corps :

```ts
  } else if (rule.kind === "preference_enabled") {
    const client = createAdminClient();
    const { data: rows } = await client
      .from("notification_preferences")
      .select("user_id")
      .eq("category_key", rule.categoryKey)
      .eq("enabled", true);

    const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
    if (userIds.length === 0) {
      resolved = [];
    } else {
      const { data: profiles } = await client
        .from("profiles")
        .select("id, email, notification_unsubscribe_token")
        .in("id", userIds)
        .is("deleted_at", null);

      resolved = (profiles ?? []).map((p) => ({
        userId: p.id,
        email: p.email,
        unsubscribeToken: p.notification_unsubscribe_token,
      }));
    }
```

- [ ] **Step 4: Écrire le module**

Créer `src/lib/notifications/jobs/weekly-digest.ts` :

```ts
import { subDays } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/notify";
import { resolveAudience } from "@/lib/notifications/audience";

/** Nombre de titres repris dans le corps. Au-delà, ce n'est plus un résumé. */
const MAX_HIGHLIGHTS = 5;

/** Numéro de semaine ISO, pour une clé de déduplication stable. */
const isoWeek = (date: Date): string => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

/**
 * Résumé hebdomadaire des notifications non lues de la semaine écoulée.
 *
 * Ne s'exécute que le lundi : la fréquence du cron n'est pas connue depuis le
 * dépôt (elle est réglée dans le tableau de bord Vercel), le travail vérifie
 * donc lui-même sa fenêtre. La clé de déduplication par semaine ISO absorbe
 * plusieurs passages le même lundi.
 *
 * `now` est injectable pour les tests : sans cela, il faudrait attendre un
 * lundi pour vérifier quoi que ce soit.
 */
export const runWeeklyDigest = async (now: Date = new Date()): Promise<number> => {
  if (now.getDay() !== 1) return 0;

  const recipients = await resolveAudience("weekly_digest", {
    kind: "preference_enabled",
    categoryKey: "digest",
  });

  if (recipients.length === 0) return 0;

  const supabase = createAdminClient();
  const since = subDays(now, 7).toISOString();
  const week = isoWeek(now);
  let sent = 0;

  for (const recipient of recipients) {
    const { data: rows } = await supabase
      .from("notifications")
      .select("title")
      .eq("user_id", recipient.userId)
      .is("read_at", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    const titles = (rows ?? []).map((r) => r.title as string);

    // Semaine vide : ne pas ecrire pour dire qu'il n'y a rien a dire.
    if (titles.length === 0) continue;

    await notify(
      "weekly_digest",
      [recipient],
      {
        count: titles.length,
        highlights: titles.slice(0, MAX_HIGHLIGHTS),
      },
      { dedupeId: `${recipient.userId}:${week}` },
    );
    sent++;
  }

  return sent;
};
```

- [ ] **Step 5: Écrire l'index des travaux**

Créer `src/lib/notifications/jobs/index.ts` :

```ts
export { runModuleReminders } from "./module-reminder";
export { runReviewRequests } from "./review-request";
export { runWeeklyDigest } from "./weekly-digest";
```

- [ ] **Step 6: Lancer les tests**

Run: `pnpm test src/lib/notifications/ && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/notifications
git commit -m "feat(notifications): resume hebdomadaire, en opt-in et le lundi"
```

---

### Task 6: Orchestration par le cron

**Files:**
- Modify: `src/app/api/cron/route.ts`
- Test: `src/app/api/cron/route.spec.ts`

**Interfaces:**
- Consumes: `runModuleReminders`, `runReviewRequests`, `runWeeklyDigest` de `@/lib/notifications/jobs`
- Produces: trois entrées supplémentaires dans le rapport JSON du cron

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/app/api/cron/route.spec.ts`, ajouter le mock des travaux, en `vi.hoisted` :

```ts
const { runModuleReminders, runReviewRequests, runWeeklyDigest } = vi.hoisted(
  () => ({
    runModuleReminders: vi.fn().mockResolvedValue(2),
    runReviewRequests: vi.fn().mockResolvedValue(1),
    runWeeklyDigest: vi.fn().mockResolvedValue(0),
  })
);

vi.mock("@/lib/notifications/jobs", () => ({
  runModuleReminders,
  runReviewRequests,
  runWeeklyDigest,
}));
```

puis :

```ts
it("exécute les trois travaux de notification et rend leur compte", async () => {
  const res = await GET(authorized());
  const json = await res.json();

  expect(runModuleReminders).toHaveBeenCalled();
  expect(runReviewRequests).toHaveBeenCalled();
  expect(runWeeklyDigest).toHaveBeenCalled();
  expect(json.results).toMatchObject({
    module_reminders_sent: 2,
    review_requests_sent: 1,
    weekly_digests_sent: 0,
  });
});

it("poursuit les travaux suivants quand l'un échoue", async () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  runModuleReminders.mockRejectedValueOnce(new Error("Supabase timeout"));

  const res = await GET(authorized());
  const json = await res.json();

  expect(json.results.module_reminders_sent).toBe(-1);
  expect(runReviewRequests).toHaveBeenCalled();
  expect(
    notify.mock.calls.find((c) => c[0] === "admin_job_failed")
  ).toBeDefined();
  consoleSpy.mockRestore();
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm test src/app/api/cron/route.spec.ts`
Expected: FAIL, `runModuleReminders` n'est jamais appelé.

- [ ] **Step 3: Brancher les travaux**

Dans `src/app/api/cron/route.ts`, avant le nettoyage des journaux d'automatisation :

```ts
  // ─── Notifications periodiques ─────────────────────────────
  // Chaque travail verifie lui-meme sa fenetre : la frequence du cron est
  // reglee dans le tableau de bord Vercel, elle n'est pas lisible ici.
  for (const [key, run, label] of [
    ["module_reminders_sent", runModuleReminders, "Relances d'accompagnement"],
    ["review_requests_sent", runReviewRequests, "Demandes d'avis"],
    ["weekly_digests_sent", runWeeklyDigest, "Resume hebdomadaire"],
  ] as const) {
    try {
      results[key] = await run();
    } catch (err) {
      console.error(`Failed to run ${key}:`, err);
      results[key] = -1;
      await notifyJobFailure(label, err);
    }
  }
```

Ajouter l'import `import { runModuleReminders, runReviewRequests, runWeeklyDigest } from "@/lib/notifications/jobs";`.

- [ ] **Step 4: Lancer les tests**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: PASS, build vert.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron
git commit -m "feat(notifications): orchestration des travaux periodiques par le cron"
```

---

### Task 7: Vérification d'ensemble

**Files:** aucun fichier modifié sauf correctifs

- [ ] **Step 1: Suite complète**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: tout passe.

- [ ] **Step 2: Vérifier que tout événement marketing est désactivable**

Run: `pnpm test src/lib/notifications/catalog.spec.ts`
Expected: PASS. Le test « ne rattache un événement marketing qu'à une catégorie non imposée », écrit en tranche 2, couvre les quatre nouveaux.

- [ ] **Step 3: Vérifier qu'aucun travail ne s'exécute hors de sa fenêtre**

Run: `grep -n "dedupeId" src/lib/notifications/jobs/*.ts`
Expected: chacun des trois modules porte une clé. Sans clé, un cron horaire enverrait le même message vingt-quatre fois par jour.

- [ ] **Step 4: Vérifier la fréquence réelle du cron**

Ouvrir le tableau de bord Vercel, projet `question-d-allaitement`, section Cron Jobs, et noter la fréquence de `/api/cron`.
Expected: au moins une exécution quotidienne. **Si le cron tourne moins souvent qu'une fois par jour, la demande d'avis ne partira jamais** : sa fenêtre est d'une seule journée. Dans ce cas, élargir `DAYS_AFTER` en fourchette (par exemple, entre deux et quatre jours) plutôt que de compter sur une exécution quotidienne.

- [ ] **Step 5: Vérifier le parcours à la main**

1. Activer le résumé hebdomadaire dans son profil, vérifier qu'une ligne apparaît bien dans `notification_preferences` avec `enabled = true`.
2. Publier un article de blog, vérifier la notification et l'email, et vérifier qu'un second enregistrement ne renotifie pas.
3. Sur une base de test, marquer une consultation honorée avec `ends_at` deux jours en arrière, appeler le cron, vérifier la demande d'avis et le lien qui ouvre bien le formulaire Google.
4. Vérifier qu'un second appel du cron dans la foulée n'envoie rien de nouveau.

- [ ] **Step 6: Commit des correctifs éventuels**

```bash
git add -A
git commit -m "fix(notifications): correctifs de la verification d'ensemble"
```

---

## Ce que ce plan ne fait pas

- **Aucune migration.** Les quatre événements s'appuient sur des tables existantes, et `notifications` porte déjà tout ce qu'il faut.
- **La planification du cron reste hors dépôt.** Ce plan ne peut pas la changer, seulement s'y adapter. Rapatrier les `crons` dans un `vercel.json` versionné serait une bonne chose, mais c'est un autre chantier.
- **Tranche 3** : action `send_notification` dans le moteur d'automations, composer de diffusion ciblée depuis le backoffice, `profiles.acquisition_source`, digest quotidien pour l'administration.
- **Web Push** : phase 2.
- **`admin_new_review` et `admin_payment_failed`** restent sans émetteur, faute de source. La demande d'avis de ce plan envoie vers Google : les avis ne reviennent pas dans l'application, il n'y a donc toujours rien à notifier côté backoffice.
