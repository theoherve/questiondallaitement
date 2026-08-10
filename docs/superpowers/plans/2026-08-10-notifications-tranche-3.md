# Notifications tranche 3, pilotage — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner la main sur les notifications sans passer par le code : les déclencher depuis une automatisation, en diffuser une à un segment choisi, et savoir d'où viennent les inscrites.

**Architecture:** Deux nouveaux événements de catalogue portant un message libre, une action `send_notification` à côté des trois actions d'automatisation existantes, et un écran de diffusion qui n'est qu'un formulaire au-dessus de `resolveAudience()` et `notify()`. Rien de nouveau côté envoi : toute la mécanique vient des tranches 1 et 2.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase, Resend, Zod v4, Vitest.

## Global Constraints

- Ce plan suppose les tranches 1, 2 et marketing fusionnées sur `main` : catalogue, `notify()`, `resolveAudience()`, préférences, désinscription, travaux périodiques.
- `notify()` reste **strictement serveur** et **ne lève jamais**.
- Tout message libre est de catégorie `marketing` : les préférences s'appliquent, et l'email porte son lien de désinscription, que `notify()` construit dès que le destinataire a son jeton.
- **L'écran de diffusion ne remplace pas les campagnes newsletter.** Décision prise : deux écrans distincts et assumés. `sendCampaign` part **chez Brevo** et vise des **listes Brevo** (`recipient_list_ids`), une audience qui vit hors de l'application. Le nouvel écran vise les **profils** de l'application. Les intitulés doivent dire cette différence sans ambiguïté.
- Textes visibles par les visiteurs : **aucun tiret cadratin** (`—`).
- Vitest tourne en `environment: "node"` : aucun test de composant React.
- Commandes : `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm db:push:dry`, `pnpm db:push`.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/00086_acquisition_source.sql` | Colonne de provenance sur `profiles` |
| `src/lib/notifications/broadcast.ts` | `sendUserBroadcast()`, `countAudience()` |
| `src/app/(dashboard)/admin/marketing/messages/page.tsx` | Écran de diffusion |
| `src/app/(dashboard)/admin/marketing/messages/actions.ts` | Server actions de l'écran |
| `src/app/(dashboard)/admin/marketing/messages/_components/broadcast-form.tsx` | Formulaire, choix d'audience et aperçu du nombre |
| `src/lib/auth/acquisition.ts` | `resolveAcquisitionSource()`, lecture de la provenance |

Fichiers modifiés : `preference-categories.ts` (une catégorie), `types.ts` et `catalog.ts` (deux événements), `emails/send.ts` (un sender générique), `automations/types.ts`, `validations/automations.ts`, `automations/engine.ts`, `automation-form-dialog.tsx`, `(auth)/actions.ts`, `inscription/page.tsx`.

---

## Ce que la lecture du code a établi

- **`sendCampaign` ne partage rien avec `notify()`.** Il appelle `brevoCreateCampaign` puis `sendCampaignNow` sur des identifiants de listes Brevo. Aucun code n'est réutilisable, et aucun risque de régression : les deux systèmes ne se croisent pas.
- **Le moteur d'automatisations a déjà sa forme d'extension.** `runAutomations` enchaîne des `executeX(action, ...)` renvoyant `{ success, error }`, puis journalise dans `automation_logs`. Une quatrième action se glisse dans ce moule sans rien changer d'autre.
- **`notification_broadcasts` existe et personne ne la lit.** Créée en tranche 2 pour journaliser les envois ciblés, elle attend un écran. La tâche 6 le lui donne.
- **La provenance ne peut pas être captée sur le chemin Google.** `handleRegister` insère le profil et peut donc porter la provenance ; la connexion Google passe par le callback `signIn` de `src/auth.ts`, qui rattache un profil sans voir la page d'où vient l'utilisatrice. La colonne restera nulle pour ces comptes, et c'est documenté plutôt que contourné.

---

### Task 1: Catégorie « Annonces » et messages libres

**Files:**
- Modify: `src/lib/notifications/preference-categories.ts`, `src/lib/notifications/types.ts`, `src/lib/notifications/catalog.ts`, `src/lib/emails/send.ts`
- Test: `src/lib/notifications/preference-categories.spec.ts`, `src/lib/notifications/catalog.spec.ts`

**Interfaces:**
- Consumes: `NotificationCatalog`, `sendTransactionalEmail`
- Produces: catégorie `annonces`, événements `automation_message` et `broadcast_message`, sender `sendFreeformMessage`

Deux événements plutôt qu'un : ils n'ont ni la même origine ni la même catégorie de préférence. `automation_message` répond à une action de la cliente, il relève du suivi ; `broadcast_message` est une annonce décidée par l'équipe, et mérite sa propre case à décocher.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/lib/notifications/preference-categories.spec.ts` :

```ts
it("expose une catégorie d'annonces, désactivable et active par défaut", () => {
  const annonces = PREFERENCE_CATEGORIES.annonces;
  expect(annonces).toBeDefined();
  expect(annonces.forced).toBe(false);
  expect(annonces.defaults).toEqual({ in_app: true, email: true });
});

it("affiche les annonces dans l'écran client", () => {
  expect(CLIENT_PREFERENCE_CATEGORIES.map((c) => c.key)).toContain("annonces");
});
```

Ajouter l'import de `CLIENT_PREFERENCE_CATEGORIES` en tête du fichier.

Dans `src/lib/notifications/catalog.spec.ts` :

```ts
it("porte les messages libres sur des catégories désactivables", () => {
  expect(NOTIFICATION_CATALOG.automation_message.preferenceKey).toBe(
    "rappels_suivi"
  );
  expect(NOTIFICATION_CATALOG.broadcast_message.preferenceKey).toBe("annonces");
});

it("reprend le titre et le corps fournis à l'appel", () => {
  const def = NOTIFICATION_CATALOG.broadcast_message;
  const data = { title: "Fermeture estivale", body: "Du 1er au 15 août." };
  expect(def.title(data)).toBe("Fermeture estivale");
  expect(def.body?.(data)).toBe("Du 1er au 15 août.");
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm test src/lib/notifications/`
Expected: FAIL, `PREFERENCE_CATEGORIES.annonces` est `undefined`.

- [ ] **Step 3: Ajouter la catégorie**

Dans `src/lib/notifications/preference-categories.ts`, ajouter `"annonces"` à `NotificationPreferenceKey` et, dans `PREFERENCE_CATEGORIES`, juste après `articles` :

```ts
  annonces: {
    key: "annonces",
    label: "Annonces de l'équipe",
    hint: "Informations ponctuelles, fermeture, nouveauté",
    forced: false,
    defaults: { in_app: true, email: true },
  },
```

- [ ] **Step 4: Déclarer les données des deux événements**

Dans `src/lib/notifications/types.ts`, ajouter à `NotificationDataMap` :

```ts
  automation_message: {
    title: string;
    body: string;
    href?: string;
    unsubscribe_url?: string;
  };
  broadcast_message: {
    title: string;
    body: string;
    href?: string;
    unsubscribe_url?: string;
  };
```

- [ ] **Step 5: Écrire le sender générique**

Dans `src/lib/emails/send.ts` :

```ts
/**
 * Message libre, ecrit dans le backoffice ou dans une automatisation. Le corps
 * arrive en texte simple et non en HTML : il est saisi dans un `textarea`, et
 * l'injecter tel quel ouvrirait une porte a du balisage arbitraire dans un
 * email envoye en notre nom.
 */
export const sendFreeformMessage = async (
  clientEmail: string,
  variables: {
    title: string;
    body: string;
    href?: string;
    unsubscribe_url: string;
  },
) => {
  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const paragraphs = escape(variables.body)
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br />")}</p>`)
    .join("");

  const button = variables.href
    ? `<p><a href="${variables.href}" style="display:inline-block;padding:12px 24px;background-color:#2F5D50;color:#fff;text-decoration:none;border-radius:6px;">En savoir plus</a></p>`
    : "";

  await sendTransactionalEmail({
    to: clientEmail,
    subject: variables.title,
    html: `
      <h1>${escape(variables.title)}</h1>
      ${paragraphs}
      ${button}
      <p style="margin-top:32px;font-size:12px;color:#888;">
        <a href="${variables.unsubscribe_url}">Ne plus recevoir ces messages</a>.
      </p>
    `,
  });
};
```

- [ ] **Step 6: Ajouter les deux entrées au catalogue**

Dans `src/lib/notifications/catalog.ts`, importer `sendFreeformMessage` et ajouter :

```ts
  automation_message: {
    key: "automation_message",
    category: "marketing",
    preferenceKey: "rappels_suivi",
    channels: ["in_app", "email"],
    title: (d) => d.title,
    body: (d) => d.body,
    href: (d) => d.href ?? "/espace-client",
    email: (to, d) =>
      sendFreeformMessage(to, {
        title: d.title,
        body: d.body,
        href: d.href ? `${siteUrl()}${d.href}` : undefined,
        unsubscribe_url: d.unsubscribe_url ?? `${siteUrl()}/espace-client/profil`,
      }),
  },
  broadcast_message: {
    key: "broadcast_message",
    category: "marketing",
    preferenceKey: "annonces",
    channels: ["in_app", "email"],
    title: (d) => d.title,
    body: (d) => d.body,
    href: (d) => d.href ?? "/espace-client",
    email: (to, d) =>
      sendFreeformMessage(to, {
        title: d.title,
        body: d.body,
        href: d.href ? `${siteUrl()}${d.href}` : undefined,
        unsubscribe_url: d.unsubscribe_url ?? `${siteUrl()}/espace-client/profil`,
      }),
  },
```

- [ ] **Step 7: Lancer les tests**

Run: `pnpm test src/lib/notifications/ && pnpm lint`
Expected: PASS. L'écran de préférences reprend la nouvelle catégorie sans modification, il itère sur `CLIENT_PREFERENCE_CATEGORIES`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/notifications src/lib/emails/send.ts
git commit -m "feat(notifications): categorie annonces et messages libres"
```

---

### Task 2: Action `send_notification` dans les automatisations

**Files:**
- Modify: `src/lib/automations/types.ts`, `src/validations/automations.ts`, `src/lib/automations/engine.ts`
- Test: `src/lib/automations/engine.spec.ts`

**Interfaces:**
- Consumes: `notify` de `@/lib/notifications`
- Produces: type d'action `send_notification`, `SendNotificationAction`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/automations/engine.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { notify, tableData, insertCalls } = vi.hoisted(() => ({
  notify: vi.fn().mockResolvedValue(undefined),
  tableData: {} as Record<string, unknown[]>,
  insertCalls: [] as { table: string; data: unknown }[],
}));

vi.mock("@/lib/notifications", () => ({ notify }));
vi.mock("@/lib/resend/client", () => ({
  sendTransactionalEmail: vi.fn().mockResolvedValue(undefined),
}));

const makeChain = (table: string) => {
  const rows = tableData[table] ?? [];
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) =>
      resolve({ data: rows, error: null }),
    insert: (data: unknown) => {
      insertCalls.push({ table, data });
      return Promise.resolve({ error: null });
    },
    upsert: () => Promise.resolve({ error: null }),
  };
  return new Proxy(chain, {
    get: (target, prop) =>
      prop in target ? target[prop as string] : () => makeChain(table),
  });
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (t: string) => makeChain(t) }),
}));

import { runAutomations } from "./engine";

const triggerData = {
  client_id: "c1",
  client_email: "a@b.fr",
  client_name: "Camille",
  accompagnement_title: "Reprendre le travail",
};

describe("runAutomations et l'action send_notification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls.length = 0;
    for (const k of Object.keys(tableData)) delete tableData[k];

    tableData.automations = [
      {
        id: "auto-1",
        consultant_id: "cons-1",
        name: "Bienvenue",
        trigger_type: "accompagnement_purchased",
        trigger_config: {},
        actions: [
          {
            type: "send_notification",
            title: "Bienvenue {{client_name}}",
            body: "Votre accompagnement {{accompagnement_title}} vous attend.",
          },
        ],
      },
    ];
  });

  it("notifie la cliente avec les variables remplacées", async () => {
    await runAutomations("accompagnement_purchased", "cons-1", triggerData);

    expect(notify).toHaveBeenCalledWith(
      "automation_message",
      [expect.objectContaining({ userId: "c1", email: "a@b.fr" })],
      {
        title: "Bienvenue Camille",
        body: "Votre accompagnement Reprendre le travail vous attend.",
        href: undefined,
      },
      expect.objectContaining({ dedupeId: expect.stringContaining("auto-1") })
    );
  });

  it("journalise le succès de l'action", async () => {
    await runAutomations("accompagnement_purchased", "cons-1", triggerData);

    const log = insertCalls.find((c) => c.table === "automation_logs");
    expect(log).toBeDefined();
    expect((log!.data as { status: string }).status).toBe("success");
  });

  it("échoue proprement sans identifiant de cliente", async () => {
    await runAutomations("accompagnement_purchased", "cons-1", {
      client_email: "a@b.fr",
    } as never);

    expect(notify).not.toHaveBeenCalled();
    const log = insertCalls.find((c) => c.table === "automation_logs");
    expect((log!.data as { status: string }).status).toBe("partial");
  });

  it("déduplique par automatisation et par cliente", async () => {
    await runAutomations("accompagnement_purchased", "cons-1", triggerData);

    const options = notify.mock.calls[0][3] as { dedupeId: string };
    expect(options.dedupeId).toBe("auto-1:c1");
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/lib/automations/engine.spec.ts`
Expected: FAIL, l'action est inconnue et le journal indique `partial`.

- [ ] **Step 3: Déclarer le type d'action**

Dans `src/lib/automations/types.ts`, ajouter `"send_notification"` à `AUTOMATION_ACTION_TYPES`, puis :

```ts
export type SendNotificationAction = {
  type: "send_notification";
  title: string;
  body: string;
  /** Lien interne facultatif, vers l'espace client. */
  href?: string;
};
```

et l'ajouter à l'union `AutomationAction`.

- [ ] **Step 4: Étendre la validation**

Dans `src/validations/automations.ts` :

```ts
const sendNotificationActionSchema = z.object({
  type: z.literal("send_notification"),
  title: z.string().min(1, "Titre requis").max(120, "Titre trop long"),
  body: z.string().min(1, "Message requis").max(2000, "Message trop long"),
  // Lien interne seulement : une automatisation ne doit pas pouvoir envoyer
  // les clientes vers un domaine tiers.
  href: z
    .string()
    .startsWith("/", "Le lien doit être interne")
    .optional()
    .or(z.literal("")),
});
```

et l'ajouter à `automationActionSchema`.

- [ ] **Step 5: Écrire l'exécuteur**

Dans `src/lib/automations/engine.ts`, à côté des trois autres :

```ts
const executeSendNotification = async (
  action: { title: string; body: string; href?: string },
  automationId: string,
  data: TriggerData,
): Promise<{ success: boolean; error?: string }> => {
  const clientId = data.client_id;
  if (!clientId) return { success: false, error: "No client_id" };

  try {
    // Deduplication par automatisation et par cliente : une automatisation ne
    // doit dire sa phrase qu'une fois a la meme personne, meme si son
    // declencheur se represente.
    await notify(
      "automation_message",
      [{ userId: clientId, email: data.client_email }],
      {
        title: renderVariables(action.title, data),
        body: renderVariables(action.body, data),
        href: action.href || undefined,
      },
      { dedupeId: `${automationId}:${clientId}` },
    );
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};
```

et le brancher dans la chaîne de `runAutomations`, avant le `else` final :

```ts
      } else if (action.type === "send_notification") {
        result = await executeSendNotification(
          {
            title: action.title as string,
            body: action.body as string,
            href: action.href as string | undefined,
          },
          automation.id,
          triggerData,
        );
```

Ajouter l'import `import { notify } from "@/lib/notifications";`.

- [ ] **Step 6: Lancer les tests**

Run: `pnpm test src/lib/automations/ && pnpm lint`
Expected: PASS, quatre tests.

- [ ] **Step 7: Exposer l'action dans le formulaire**

Dans `src/app/(dashboard)/espace-consultante/automations/_components/automation-form-dialog.tsx` :

1. Élargir la signature de `addAction` à `"send_email" | "add_crm_tag" | "webhook" | "send_notification"` et ajouter la branche :

```tsx
    } else if (type === "send_notification") {
      setActions([...actions, { type, title: "", body: "", href: "" }]);
```

2. Ajouter le libellé dans le sélecteur de type d'action existant, à côté de `add_crm_tag`, avec le texte « Notifier la cliente ».

3. Ajouter le bloc de saisie, sur le modèle de celui de `add_crm_tag` :

```tsx
{a.type === "send_notification" && (
  <div className="space-y-2">
    <Input
      placeholder="Titre"
      value={(a.title as string) ?? ""}
      onChange={(e) => updateAction(i, "title", e.target.value)}
      maxLength={120}
    />
    <Textarea
      placeholder="Message. Variables disponibles : {{client_name}}, {{accompagnement_title}}, {{formation_title}}"
      value={(a.body as string) ?? ""}
      onChange={(e) => updateAction(i, "body", e.target.value)}
      rows={4}
      maxLength={2000}
    />
    <Input
      placeholder="Lien interne facultatif, par exemple /espace-client/accompagnements"
      value={(a.href as string) ?? ""}
      onChange={(e) => updateAction(i, "href", e.target.value)}
    />
  </div>
)}
```

4. Ajouter le bouton d'ajout à côté des trois existants, libellé « Notifier ».

- [ ] **Step 8: Vérifier**

Run: `pnpm lint && pnpm build`
Expected: aucune erreur.

Vérification manuelle : créer une automatisation « accompagnement acheté » avec une action de notification portant `{{client_name}}`, la sauvegarder, rouvrir la fiche et constater que les champs sont rechargés.

- [ ] **Step 9: Commit**

```bash
git add src/lib/automations src/validations/automations.ts "src/app/(dashboard)/espace-consultante/automations"
git commit -m "feat(automations): action de notification, avec variables et lien interne"
```

---

### Task 3: Diffusion à un segment

**Files:**
- Create: `src/lib/notifications/broadcast.ts`
- Test: `src/lib/notifications/broadcast.spec.ts`

**Interfaces:**
- Consumes: `resolveAudience`, `notify`
- Produces: `type BroadcastAudience`, `countAudience(audience): Promise<number>`, `sendUserBroadcast(input): Promise<{ sent: number }>`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/notifications/broadcast.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { notify, resolveAudience } = vi.hoisted(() => ({
  notify: vi.fn().mockResolvedValue(undefined),
  resolveAudience: vi.fn(),
}));

vi.mock("./notify", () => ({ notify }));
vi.mock("./audience", () => ({ resolveAudience }));

import { sendUserBroadcast, countAudience } from "./broadcast";

const recipients = [
  { userId: "c1", email: "c1@b.fr" },
  { userId: "c2", email: "c2@b.fr" },
];

describe("sendUserBroadcast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAudience.mockResolvedValue(recipients);
  });

  it("envoie le message à toute l'audience résolue", async () => {
    const result = await sendUserBroadcast({
      title: "Fermeture estivale",
      body: "Du 1er au 15 août.",
      audience: { kind: "all_clients" },
    });

    expect(result.sent).toBe(2);
    expect(notify).toHaveBeenCalledWith(
      "broadcast_message",
      recipients,
      expect.objectContaining({ title: "Fermeture estivale" }),
      expect.objectContaining({ dedupeId: expect.any(String) })
    );
  });

  it("traduit un segment en règle d'audience", async () => {
    await sendUserBroadcast({
      title: "T",
      body: "B",
      audience: { kind: "segment", segmentId: "seg-1" },
    });

    expect(resolveAudience).toHaveBeenCalledWith("broadcast_message", {
      kind: "segment",
      segmentId: "seg-1",
    });
  });

  it("n'envoie rien quand l'audience est vide", async () => {
    resolveAudience.mockResolvedValue([]);

    const result = await sendUserBroadcast({
      title: "T",
      body: "B",
      audience: { kind: "all_clients" },
    });

    expect(result.sent).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("donne à chaque envoi une clé de déduplication distincte", async () => {
    await sendUserBroadcast({
      title: "T",
      body: "B",
      audience: { kind: "all_clients" },
    });
    await sendUserBroadcast({
      title: "T",
      body: "B",
      audience: { kind: "all_clients" },
    });

    const first = (notify.mock.calls[0][3] as { dedupeId: string }).dedupeId;
    const second = (notify.mock.calls[1][3] as { dedupeId: string }).dedupeId;
    // Deux annonces successives au meme libelle restent deux annonces : la cle
    // ne doit pas faire taire la seconde.
    expect(first).not.toBe(second);
  });
});

describe("countAudience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAudience.mockResolvedValue(recipients);
  });

  it("compte sans rien envoyer", async () => {
    expect(await countAudience({ kind: "all_clients" })).toBe(2);
    expect(notify).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/lib/notifications/broadcast.spec.ts`
Expected: FAIL, module absent.

- [ ] **Step 3: Écrire le module**

Créer `src/lib/notifications/broadcast.ts` :

```ts
import { randomUUID } from "crypto";
import { notify } from "./notify";
import { resolveAudience } from "./audience";
import type { AudienceRule } from "./audience";

/** Audiences proposées dans l'écran de diffusion. */
export type BroadcastAudience =
  | { kind: "all_clients" }
  | { kind: "accompagnement_holders" }
  | { kind: "segment"; segmentId: string };

export type BroadcastInput = {
  title: string;
  body: string;
  href?: string;
  audience: BroadcastAudience;
};

/**
 * Nombre de destinataires d'une audience, sans rien envoyer.
 *
 * Sert l'aperçu de l'écran : voir « 128 personnes » avant de cliquer change la
 * nature du geste.
 */
export const countAudience = async (
  audience: BroadcastAudience,
): Promise<number> => {
  const recipients = await resolveAudience(
    "broadcast_message",
    audience as AudienceRule,
  );
  return recipients.length;
};

/**
 * Diffuse un message libre aux utilisatrices de l'application.
 *
 * Sans rapport avec les campagnes newsletter de `admin/marketing`, qui partent
 * chez Brevo vers des listes Brevo. Ici, l'audience est faite de profils, les
 * préférences s'appliquent et l'email porte son lien de désinscription.
 */
export const sendUserBroadcast = async (
  input: BroadcastInput,
): Promise<{ sent: number }> => {
  const recipients = await resolveAudience(
    "broadcast_message",
    input.audience as AudienceRule,
  );

  if (recipients.length === 0) return { sent: 0 };

  // Cle propre a cet envoi : deux annonces au meme libelle sont deux annonces,
  // et la seconde ne doit pas etre avalee par la deduplication.
  const dedupeId = randomUUID();

  await notify(
    "broadcast_message",
    recipients,
    { title: input.title, body: input.body, href: input.href },
    { dedupeId },
  );

  return { sent: recipients.length };
};
```

- [ ] **Step 4: Lancer les tests**

Run: `pnpm test src/lib/notifications/broadcast.spec.ts && pnpm lint`
Expected: PASS, cinq tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications/broadcast.ts src/lib/notifications/broadcast.spec.ts
git commit -m "feat(notifications): diffusion d'un message libre a un segment"
```

---

### Task 4: Écran de diffusion

**Files:**
- Create: `src/app/(dashboard)/admin/marketing/messages/actions.ts`
- Create: `src/app/(dashboard)/admin/marketing/messages/page.tsx`
- Create: `src/app/(dashboard)/admin/marketing/messages/_components/broadcast-form.tsx`
- Test: `src/app/(dashboard)/admin/marketing/messages/actions.spec.ts`
- Modify: `src/app/(dashboard)/admin/marketing/page.tsx`

**Interfaces:**
- Consumes: `sendUserBroadcast`, `countAudience`, `getSegments`
- Produces: `previewBroadcast(audience)`, `submitBroadcast(input)`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/app/(dashboard)/admin/marketing/messages/actions.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSessionUser, sendUserBroadcast, countAudience } = vi.hoisted(
  () => ({
    mockGetSessionUser: vi.fn(),
    sendUserBroadcast: vi.fn().mockResolvedValue({ sent: 3 }),
    countAudience: vi.fn().mockResolvedValue(3),
  })
);

vi.mock("@/lib/auth", () => ({ getSessionUser: mockGetSessionUser }));
vi.mock("@/lib/notifications/broadcast", () => ({
  sendUserBroadcast,
  countAudience,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

import { submitBroadcast, previewBroadcast } from "./actions";

const input = {
  title: "Fermeture estivale",
  body: "Du 1er au 15 août.",
  audience: { kind: "all_clients" as const },
};

describe("submitBroadcast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendUserBroadcast.mockResolvedValue({ sent: 3 });
    mockGetSessionUser.mockResolvedValue({
      id: "admin-1",
      email: "a@b.fr",
      roles: ["admin"],
    });
  });

  it("refuse un compte non administrateur", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: "c1",
      email: "c@b.fr",
      roles: ["client"],
    });

    await expect(submitBroadcast(input)).rejects.toThrow("NEXT_REDIRECT");
    expect(sendUserBroadcast).not.toHaveBeenCalled();
  });

  it("diffuse et rend le nombre d'envois", async () => {
    const result = await submitBroadcast(input);

    expect(result).toEqual({ success: true, data: { sent: 3 } });
    expect(sendUserBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Fermeture estivale" })
    );
  });

  it("refuse un titre vide", async () => {
    const result = await submitBroadcast({ ...input, title: "  " });

    expect(result.success).toBe(false);
    expect(sendUserBroadcast).not.toHaveBeenCalled();
  });

  it("refuse un message vide", async () => {
    const result = await submitBroadcast({ ...input, body: "" });

    expect(result.success).toBe(false);
    expect(sendUserBroadcast).not.toHaveBeenCalled();
  });

  it("refuse un lien externe", async () => {
    const result = await submitBroadcast({
      ...input,
      href: "https://exemple.fr",
    });

    expect(result.success).toBe(false);
    expect(sendUserBroadcast).not.toHaveBeenCalled();
  });
});

describe("previewBroadcast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    countAudience.mockResolvedValue(3);
    mockGetSessionUser.mockResolvedValue({
      id: "admin-1",
      email: "a@b.fr",
      roles: ["admin"],
    });
  });

  it("compte sans diffuser", async () => {
    expect(await previewBroadcast({ kind: "all_clients" })).toBe(3);
    expect(sendUserBroadcast).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test "src/app/(dashboard)/admin/marketing/messages/actions.spec.ts"`
Expected: FAIL, module absent.

- [ ] **Step 3: Écrire les server actions**

Créer `src/app/(dashboard)/admin/marketing/messages/actions.ts` :

```ts
"use server";

import { getSessionUser } from "@/lib/auth";
import { sendUserBroadcast, countAudience } from "@/lib/notifications/broadcast";
import type { BroadcastAudience, BroadcastInput } from "@/lib/notifications/broadcast";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

export const previewBroadcast = async (
  audience: BroadcastAudience,
): Promise<number> => {
  await requireAdmin();
  return countAudience(audience);
};

export const submitBroadcast = async (
  input: BroadcastInput,
): Promise<ActionResult<{ sent: number }>> => {
  await requireAdmin();

  const title = input.title.trim();
  const body = input.body.trim();

  if (!title) return { success: false, error: "Le titre est requis" };
  if (!body) return { success: false, error: "Le message est requis" };

  // Lien interne seulement : une annonce ne doit pas pouvoir envoyer les
  // clientes vers un domaine tiers depuis un email signe de notre nom.
  if (input.href && !input.href.startsWith("/")) {
    return { success: false, error: "Le lien doit être interne" };
  }

  const { sent } = await sendUserBroadcast({ ...input, title, body });

  revalidatePath("/admin/marketing/messages");
  return { success: true, data: { sent } };
};
```

- [ ] **Step 4: Écrire le formulaire**

Créer `src/app/(dashboard)/admin/marketing/messages/_components/broadcast-form.tsx` :

```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { previewBroadcast, submitBroadcast } from "../actions";
import type { BroadcastAudience } from "@/lib/notifications/broadcast";

type Props = { segments: { id: string; name: string }[] };

export const BroadcastForm = ({ segments }: Props) => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");
  const [audienceKey, setAudienceKey] = useState("all_clients");
  const [count, setCount] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const audience = (): BroadcastAudience =>
    audienceKey === "all_clients"
      ? { kind: "all_clients" }
      : audienceKey === "accompagnement_holders"
        ? { kind: "accompagnement_holders" }
        : { kind: "segment", segmentId: audienceKey };

  const preview = () => {
    startTransition(async () => {
      setCount(await previewBroadcast(audience()));
    });
  };

  const send = () => {
    if (count === null) {
      toast.error("Comptez d'abord les destinataires");
      return;
    }
    if (!confirm(`Envoyer ce message à ${count} personne(s) ?`)) return;

    startTransition(async () => {
      const result = await submitBroadcast({
        title,
        body,
        href: href || undefined,
        audience: audience(),
      });
      if (result.success) {
        toast.success(`Message envoyé à ${result.data?.sent} personne(s)`);
        setTitle("");
        setBody("");
        setHref("");
        setCount(null);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        Ce message part aux <strong>utilisatrices ayant un compte</strong>, dans
        leur espace et par email. Pour écrire aux abonnées de la newsletter,
        utilisez les campagnes.
      </div>

      <Input
        placeholder="Titre"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
      />
      <Textarea
        placeholder="Votre message"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        maxLength={2000}
      />
      <Input
        placeholder="Lien interne facultatif, par exemple /replay-lives"
        value={href}
        onChange={(e) => setHref(e.target.value)}
      />

      <Select
        value={audienceKey}
        onValueChange={(v) => {
          setAudienceKey(v);
          // Le compte affiche ne vaut plus rien des que l'audience change :
          // l'effacer evite d'envoyer en croyant viser autre chose.
          setCount(null);
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all_clients">Toutes les utilisatrices</SelectItem>
          <SelectItem value="accompagnement_holders">
            Ayants droit d&apos;un accompagnement
          </SelectItem>
          {segments.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              Segment : {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={preview} disabled={isPending}>
          Compter les destinataires
        </Button>
        {count !== null && (
          <span className="text-sm text-muted-foreground">
            {count} personne{count > 1 ? "s" : ""}
          </span>
        )}
        <Button
          onClick={send}
          disabled={isPending || !title.trim() || !body.trim()}
        >
          Envoyer
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Les personnes ayant désactivé les annonces ne recevront rien, le compte
        ci-dessus ne tient pas compte de leurs préférences.
      </p>
    </div>
  );
};
```

- [ ] **Step 5: Écrire la page**

Créer `src/app/(dashboard)/admin/marketing/messages/page.tsx` :

```tsx
import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { BroadcastForm } from "./_components/broadcast-form";

export const metadata: Metadata = { title: "Messages aux utilisatrices" };

const MessagesPage = async () => {
  const supabase = createAdminClient();
  const { data: segments } = await supabase
    .from("crm_segments")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Messages aux utilisatrices
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">
            Écrire un message
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BroadcastForm segments={segments ?? []} />
        </CardContent>
      </Card>
    </div>
  );
};

export default MessagesPage;
```

- [ ] **Step 6: Ajouter l'entrée dans le backoffice marketing**

Dans `src/app/(dashboard)/admin/marketing/page.tsx`, ajouter une carte vers `/admin/marketing/messages` à côté des campagnes, avec un intitulé qui tranche : **« Messages aux utilisatrices »**, et en sous-titre « Dans leur espace et par email. Pour la newsletter, voir Campagnes. » Renommer la carte des campagnes en **« Campagnes newsletter »** si elle s'appelle simplement « Campagnes ».

- [ ] **Step 7: Vérifier**

Run: `pnpm test "src/app/(dashboard)/admin/marketing/" && pnpm lint && pnpm build`
Expected: PASS, build vert.

Vérification manuelle : compter une audience, changer de segment et constater que le compte s'efface, puis envoyer à un segment ne contenant qu'un compte de test.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(dashboard)/admin/marketing"
git commit -m "feat(marketing): ecran de diffusion aux utilisatrices"
```

---

### Task 5: Provenance des inscriptions

**Files:**
- Create: `supabase/migrations/00086_acquisition_source.sql`
- Create: `src/lib/auth/acquisition.ts`
- Test: `src/lib/auth/acquisition.spec.ts`
- Modify: `src/app/(auth)/actions.ts`, `src/app/(auth)/inscription/page.tsx`, `src/types/database.ts`

**Interfaces:**
- Consumes: rien
- Produces: colonne `profiles.acquisition_source`, `resolveAcquisitionSource(raw): string | null`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/auth/acquisition.spec.ts` :

```ts
import { describe, it, expect } from "vitest";
import { resolveAcquisitionSource } from "./acquisition";

describe("resolveAcquisitionSource", () => {
  it("retient une source connue", () => {
    expect(resolveAcquisitionSource("instagram")).toBe("instagram");
    expect(resolveAcquisitionSource("liens")).toBe("liens");
  });

  it("normalise la casse et les espaces", () => {
    expect(resolveAcquisitionSource("  Instagram  ")).toBe("instagram");
  });

  it("renvoie null sans valeur", () => {
    expect(resolveAcquisitionSource(null)).toBeNull();
    expect(resolveAcquisitionSource("")).toBeNull();
    expect(resolveAcquisitionSource(undefined)).toBeNull();
  });

  it("tronque une valeur trop longue plutôt que de la rejeter", () => {
    const long = "a".repeat(200);
    expect(resolveAcquisitionSource(long)?.length).toBe(64);
  });

  it("refuse une valeur qui n'est pas un mot simple", () => {
    // Le champ vient d'une URL : il est saisissable par n'importe qui, et se
    // retrouve affiche dans le backoffice.
    expect(resolveAcquisitionSource("<script>alert(1)</script>")).toBeNull();
    expect(resolveAcquisitionSource("a b")).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/lib/auth/acquisition.spec.ts`
Expected: FAIL, module absent.

- [ ] **Step 3: Écrire le module**

Créer `src/lib/auth/acquisition.ts` :

```ts
const MAX_LENGTH = 64;

/** Lettres, chiffres, tiret et souligne. Rien d'autre. */
const SAFE = /^[a-z0-9_-]+$/;

/**
 * Nettoie la provenance lue dans l'URL d'inscription.
 *
 * La valeur vient d'un paramètre de requête : n'importe qui peut en forger une,
 * et elle finit affichée dans le backoffice. On n'accepte donc qu'un mot
 * simple, et on refuse tout le reste plutôt que d'échapper à l'affichage.
 */
export const resolveAcquisitionSource = (
  raw: string | null | undefined,
): string | null => {
  if (!raw) return null;

  const value = raw.trim().toLowerCase().slice(0, MAX_LENGTH);
  if (!value) return null;
  if (!SAFE.test(value)) return null;

  return value;
};
```

- [ ] **Step 4: Écrire la migration**

Créer `supabase/migrations/00086_acquisition_source.sql` :

```sql
-- Provenance d'une inscription.
--
-- Complete les libelles CRM poses a la main : ceux-ci portent le jugement
-- humain, celle-ci enregistre un fait au moment ou il se produit. Sans elle,
-- « les inscrites venues d'Instagram » se reconstitue de memoire.
--
-- Nullable, et elle le restera pour beaucoup de comptes : la valeur n'existe
-- que si l'inscription portait un parametre de provenance, et le chemin
-- « connexion avec Google » ne peut pas la transmettre.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_acquisition_source
  ON profiles(acquisition_source) WHERE acquisition_source IS NOT NULL;
```

- [ ] **Step 5: Vérifier et appliquer la migration**

Run: `pnpm db:push:dry`
Expected: `00086_acquisition_source.sql` apparaît, sans erreur.

Run: `pnpm db:push`
Expected: migration appliquée.

- [ ] **Step 6: Capter la provenance à l'inscription**

Dans `src/app/(auth)/inscription/page.tsx`, lire le paramètre et le poser en champ caché du formulaire :

```tsx
const { ref } = await searchParams;

// dans le formulaire :
<input type="hidden" name="acquisition_source" value={ref ?? ""} />
```

Adapter la signature de la page pour recevoir `searchParams` si elle ne le fait pas déjà, sur le modèle de `src/app/(public)/notifications/desinscription/page.tsx`.

Dans `src/app/(auth)/actions.ts`, dans `handleRegister`, ajouter la valeur à l'insertion du profil :

```ts
import { resolveAcquisitionSource } from "@/lib/auth/acquisition";

// dans `raw` :
    acquisition_source: formData.get("acquisition_source") as string | null,

// a l'insertion dans `profiles`, ajouter :
      acquisition_source: resolveAcquisitionSource(raw.acquisition_source),
```

`registerSchema` n'a pas besoin de connaître le champ : il n'est ni requis ni affiché, et `resolveAcquisitionSource` fait déjà le filtrage.

- [ ] **Step 7: Ajouter le type**

Dans `src/types/database.ts`, ajouter `acquisition_source: string | null;` au type `Profile`.

- [ ] **Step 8: Vérifier**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: tout passe.

Vérification manuelle : s'inscrire depuis `/inscription?ref=instagram`, puis vérifier en base que `acquisition_source` vaut `instagram`. Recommencer depuis `/inscription?ref=<script>` et vérifier que la colonne reste nulle.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/00086_acquisition_source.sql src/lib/auth/acquisition.ts src/lib/auth/acquisition.spec.ts "src/app/(auth)" src/types/database.ts
git commit -m "feat(auth): provenance des inscriptions, captee depuis l'url"
```

---

### Task 6: Journal des diffusions

**Files:**
- Create: `src/app/(dashboard)/admin/marketing/messages/_components/broadcast-log.tsx`
- Modify: `src/app/(dashboard)/admin/marketing/messages/page.tsx`

**Interfaces:**
- Consumes: table `notification_broadcasts`
- Produces: `<BroadcastLog rows={...} />`

La table est alimentée depuis la tranche 2 et personne ne la lit. Un envoi ciblé qui a touché trois fois plus de monde que prévu doit se voir.

- [ ] **Step 1: Écrire le composant**

Créer `src/app/(dashboard)/admin/marketing/messages/_components/broadcast-log.tsx` :

```tsx
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { NotificationBroadcast } from "@/types/database";

const RULE_LABELS: Record<string, string> = {
  all_clients: "Toutes les utilisatrices",
  accompagnement_holders: "Ayants droit d'un accompagnement",
  segment: "Segment",
  role: "Équipe",
  recipient: "Une personne",
  preference_enabled: "Abonnées à la catégorie",
};

export const BroadcastLog = ({ rows }: { rows: NotificationBroadcast[] }) => {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun envoi ciblé pour le moment.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => {
        const kind = (row.rule as { kind?: string }).kind ?? "";
        return (
          <li key={row.id} className="flex items-center justify-between py-2.5">
            <div>
              <p className="text-sm font-medium">{row.event}</p>
              <p className="text-xs text-muted-foreground">
                {RULE_LABELS[kind] ?? kind}
                {" · "}
                {formatDistanceToNow(new Date(row.created_at), {
                  addSuffix: true,
                  locale: fr,
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{row.recipient_count}</p>
              {row.truncated && (
                <p className="text-xs text-primary-red">liste plafonnée</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
```

- [ ] **Step 2: Charger le journal dans la page**

Dans `src/app/(dashboard)/admin/marketing/messages/page.tsx`, charger les vingt derniers envois et ajouter une carte sous le formulaire :

```tsx
  const { data: broadcasts } = await supabase
    .from("notification_broadcasts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

// dans le JSX, apres la carte du formulaire :
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">
            Derniers envois ciblés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BroadcastLog rows={(broadcasts ?? []) as NotificationBroadcast[]} />
        </CardContent>
      </Card>
```

Ajouter les imports de `BroadcastLog` et du type `NotificationBroadcast`.

- [ ] **Step 3: Vérifier**

Run: `pnpm lint && pnpm build`
Expected: aucune erreur.

Vérification manuelle : après un envoi, recharger la page et constater la ligne, son audience et son effectif.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/admin/marketing/messages"
git commit -m "feat(marketing): journal des envois cibles"
```

---

### Task 7: Récapitulatif quotidien pour l'administration

**Files:**
- Create: `src/lib/notifications/jobs/admin-digest.ts`
- Test: `src/lib/notifications/jobs/admin-digest.spec.ts`
- Modify: `src/lib/notifications/jobs/index.ts`, `src/app/api/cron/route.ts`, `src/lib/notifications/types.ts`, `src/lib/notifications/catalog.ts`, `src/lib/emails/send.ts`

**Interfaces:**
- Consumes: `notify`, `getRoleRecipients`
- Produces: `runAdminDigest(now?: Date): Promise<number>`, événement `admin_digest`, sender `sendAdminDigest`

Le pendant interne du résumé hebdomadaire. Par email uniquement : l'administration voit déjà chaque événement dans sa cloche, un récapitulatif in-app ferait doublon avec la liste qu'il résume. Le cron tournant toutes les heures, le travail se garde à une exécution par jour.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/notifications/jobs/admin-digest.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { notify, getRoleRecipients, tableData } = vi.hoisted(() => ({
  notify: vi.fn().mockResolvedValue(undefined),
  getRoleRecipients: vi.fn(),
  tableData: {} as Record<string, unknown[]>,
}));

vi.mock("@/lib/notifications/notify", () => ({ notify }));
vi.mock("@/lib/notifications/recipients", () => ({ getRoleRecipients }));

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

import { runAdminDigest } from "./admin-digest";

const MORNING = new Date("2026-08-10T07:30:00Z");

describe("runAdminDigest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(tableData)) delete tableData[k];
    getRoleRecipients.mockResolvedValue([
      { userId: "admin-1", email: "a@b.fr" },
    ]);
    tableData.notifications = [
      { title: "Nouvel achat", category: "system" },
      { title: "Remboursement effectué", category: "system" },
    ];
  });

  it("envoie le récapitulatif à l'administration", async () => {
    const sent = await runAdminDigest(MORNING);

    expect(sent).toBe(1);
    expect(notify).toHaveBeenCalledWith(
      "admin_digest",
      [expect.objectContaining({ userId: "admin-1" })],
      expect.objectContaining({
        count: 2,
        highlights: ["Nouvel achat", "Remboursement effectué"],
      }),
      expect.objectContaining({ dedupeId: "2026-08-10" })
    );
  });

  it("n'envoie rien quand la journée a été vide", async () => {
    tableData.notifications = [];

    expect(await runAdminDigest(MORNING)).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("n'envoie rien sans administratrice", async () => {
    getRoleRecipients.mockResolvedValue([]);

    expect(await runAdminDigest(MORNING)).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("déduplique par jour, pour un cron horaire", async () => {
    await runAdminDigest(MORNING);
    const first = (notify.mock.calls[0][3] as { dedupeId: string }).dedupeId;
    expect(first).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("limite le nombre de titres repris", async () => {
    tableData.notifications = Array.from({ length: 30 }, (_, i) => ({
      title: `Evenement ${i}`,
      category: "system",
    }));

    await runAdminDigest(MORNING);

    const data = notify.mock.calls[0][2] as {
      count: number;
      highlights: string[];
    };
    expect(data.count).toBe(30);
    expect(data.highlights.length).toBeLessThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test src/lib/notifications/jobs/admin-digest.spec.ts`
Expected: FAIL, module absent.

- [ ] **Step 3: Déclarer l'événement**

Dans `src/lib/notifications/types.ts`, ajouter à `NotificationDataMap` :

```ts
  admin_digest: { count: number; highlights: string[] };
```

Dans `src/lib/emails/send.ts` :

```ts
/** Recapitulatif interne. Pas de lien de desinscription : categorie systeme. */
export const sendAdminDigest = async (
  adminEmail: string,
  variables: { count: number; highlights: string[]; date: string },
) => {
  await sendTransactionalEmail({
    to: adminEmail,
    subject: `Récapitulatif du ${variables.date} : ${variables.count} événement${variables.count > 1 ? "s" : ""}`,
    html: `
      <h1>Récapitulatif du ${variables.date}</h1>
      <ul>${variables.highlights.map((h) => `<li>${h}</li>`).join("")}</ul>
    `,
  });
};
```

Dans `src/lib/notifications/catalog.ts` :

```ts
  admin_digest: {
    key: "admin_digest",
    category: "system",
    preferenceKey: "systeme",
    // Email seul : l'administration voit deja chaque evenement dans sa cloche.
    channels: ["email"],
    title: (d) => `Récapitulatif : ${d.count} événement${d.count > 1 ? "s" : ""}`,
    email: (to, d) =>
      sendAdminDigest(to, {
        count: d.count,
        highlights: d.highlights,
        date: new Date().toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
        }),
      }),
  },
```

- [ ] **Step 4: Écrire le travail**

Créer `src/lib/notifications/jobs/admin-digest.ts` :

```ts
import { subDays } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/notify";
import { getRoleRecipients } from "@/lib/notifications/recipients";

/** Nombre de titres repris. Plus large que le résumé client : c'est un outil de travail. */
const MAX_HIGHLIGHTS = 10;

/**
 * Récapitulatif quotidien des alertes internes des vingt-quatre dernières
 * heures.
 *
 * Le cron tourne toutes les heures : la clé de déduplication par jour fait que
 * seul le premier passage de la journée envoie quelque chose.
 */
export const runAdminDigest = async (
  now: Date = new Date(),
): Promise<number> => {
  const recipients = await getRoleRecipients("admin");
  if (recipients.length === 0) return 0;

  const { data: rows } = await createAdminClient()
    .from("notifications")
    .select("title, category")
    .eq("category", "system")
    .gte("created_at", subDays(now, 1).toISOString())
    .order("created_at", { ascending: false });

  const titles = (rows ?? []).map((r) => r.title as string);

  // Journee vide : ne pas ecrire pour dire qu'il ne s'est rien passe.
  if (titles.length === 0) return 0;

  await notify(
    "admin_digest",
    recipients,
    { count: titles.length, highlights: titles.slice(0, MAX_HIGHLIGHTS) },
    { dedupeId: now.toISOString().slice(0, 10) },
  );

  return 1;
};
```

- [ ] **Step 5: Brancher dans le cron**

Dans `src/lib/notifications/jobs/index.ts`, ajouter :

```ts
export { runAdminDigest } from "./admin-digest";
```

Dans `src/app/api/cron/route.ts`, ajouter une entrée au tableau de travaux existant :

```ts
    ["admin_digests_sent", runAdminDigest, "Recapitulatif administration"],
```

et compléter l'import depuis `@/lib/notifications/jobs`.

- [ ] **Step 6: Lancer les tests**

Run: `pnpm test src/lib/notifications/ src/app/api/cron/ && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/notifications src/lib/emails/send.ts src/app/api/cron
git commit -m "feat(notifications): recapitulatif quotidien pour l'administration"
```

---

### Task 8: Vérification d'ensemble

**Files:** aucun fichier modifié sauf correctifs

- [ ] **Step 1: Suite complète**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: tout passe.

- [ ] **Step 2: Vérifier que les deux écrans se distinguent**

Run: `grep -rn "newsletter\|utilisatrices" "src/app/(dashboard)/admin/marketing/page.tsx"`
Expected: les deux cartes portent des intitulés qui disent où va le message. Si les deux s'appellent « Campagnes », le travail de la tâche 4 n'est pas fini.

- [ ] **Step 3: Vérifier la chaîne complète, à la main**

1. Depuis un compte de test, décocher « Annonces de l'équipe » par email dans le profil.
2. Diffuser un message à « Toutes les utilisatrices » : la notification apparaît dans l'espace, aucun email n'arrive sur ce compte, un autre compte reçoit les deux.
3. Vérifier la ligne dans le journal des envois.
4. Créer une automatisation « accompagnement acheté » avec une action de notification portant `{{client_name}}`, déclencher un achat de test, vérifier le rendu de la variable.
5. S'inscrire depuis `/inscription?ref=instagram` et vérifier la colonne en base.
6. Appeler le cron deux fois de suite : le récapitulatif d'administration ne doit partir qu'une fois.

- [ ] **Step 4: Commit des correctifs éventuels**

```bash
git add -A
git commit -m "fix(notifications): correctifs de la verification d'ensemble"
```

---

## Ce que ce plan ne fait pas

- **Il ne fusionne pas les deux systèmes d'envoi.** Décision assumée : les campagnes newsletter restent chez Brevo, l'écran de diffusion vise les profils. Si l'usage montre que le doublon gêne, passer d'un système à l'autre restera possible ; l'inverse serait une régression.
- **La provenance reste nulle sur le chemin Google.** Le callback `signIn` de `src/auth.ts` rattache un profil sans voir la page d'origine. Capter la provenance là demanderait de la faire transiter par l'état OAuth, ce qui n'en vaut pas le coût pour l'instant.
- **Le compte affiché avant envoi ignore les préférences.** `resolveAudience` résout l'audience, les préférences ne s'appliquent qu'au moment de l'envoi, destinataire par destinataire. Le nombre annoncé est donc un majorant, ce que l'écran dit explicitement. Le rendre exact demanderait de lire les préférences de toute l'audience pour un affichage.
- **Aucune vue de la provenance dans le backoffice.** La colonne est renseignée et indexée, et la condition de segment `has_tag` couvre déjà le ciblage par libellé manuel. Ajouter `acquisition_source` aux conditions de segment est un geste de quelques lignes, à faire quand des valeurs existeront en base.
- **Web Push** : phase 2, toujours pas planifié.
- **`admin_new_review` et `admin_payment_failed`** restent sans émetteur, faute de source dans l'application.
