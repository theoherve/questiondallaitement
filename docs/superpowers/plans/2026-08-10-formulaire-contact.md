# Formulaire de contact et gestion admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un visiteur peut envoyer un message via `/contact` ; l'administration le voit dans une nouvelle section `/admin/contact`, en est notifiée in-app, et répond par mailto.

**Architecture:** Nouvelle table `contact_messages` en base, insertion uniquement via le client Supabase admin (service role) depuis une route API publique — pas de policy RLS `anon`, en cohérence avec `newsletter_subscribers`. Un événement `contact_message_received` s'ajoute au catalogue de notifications existant (`src/lib/notifications/`) pour alerter les admins in-app. Côté admin, liste + détail suivent le pattern `server actions + requireAdmin()` déjà utilisé par `admin/sondages` et `admin/marketing/messages`.

**Tech Stack:** Next.js App Router, Supabase (Postgres + service role client), Zod v4, Vitest, date-fns.

## Global Constraints

- Champs formulaire : nom, email (obligatoire), sujet, message — tous requis (spec).
- Formulaire public sans authentification ; si visiteur connecté, `user_id` renseigné (spec).
- Pas d'envoi d'email de réponse depuis l'app : bouton "Répondre" = lien `mailto:` uniquement (spec).
- Pas d'email de notification admin : notification in-app uniquement via `notify()` (spec).
- Statuts : `nouveau` / `lu` / `traite`. Passage à `lu` automatique à l'ouverture du détail ; `traite` manuel (spec).
- Anti-spam : honeypot + rate limit par IP, réutilisant `src/lib/rate-limit.ts` (spec).
- Nouvelle entrée `adminNav` top-level, section `personnes`, href `/admin/contact` (spec).
- Français partout dans l'UI et les messages ; pas de tiret cadratin côté visiteur ([[typographie-textes-du-site]]).

---

### Task 1: Migration — table `contact_messages`

**Files:**
- Create: `supabase/migrations/00088_contact_messages.sql`

**Interfaces:**
- Produces: table `contact_messages(id, name, email, subject, message, status, user_id, created_at, updated_at)`, consommée par toutes les tâches suivantes.

- [ ] **Step 1: Écrire la migration**

```sql
-- Formulaire de contact public — messages des visiteurs a destination de
-- l'administration.
--
-- Meme choix que newsletter_subscribers (00058) : aucune policy RLS pour anon.
-- L'insertion passe par la route API publique, qui utilise le client admin
-- (service role) apres honeypot + rate limit. Une policy anon ouvrirait la
-- table a l'ecriture directe depuis n'importe quel client, en contournant ces
-- deux garde-fous.

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'nouveau'
    CHECK (status IN ('nouveau', 'lu', 'traite')),
  -- Rempli si le visiteur etait connecte au moment de l'envoi. Pas de
  -- contrainte NOT NULL : la majorite des envois viennent de visiteurs
  -- anonymes.
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sert la liste admin (tri par date, filtre par statut).
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
  ON contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status
  ON contact_messages (status);

-- RLS activee sans policy : seul le service role lit/ecrit, exactement comme
-- newsletter_subscribers. Sans elle, la cle anon lirait l'integralite des
-- messages, adresses email comprises.
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Appliquer la migration en local**

Run: `npm run db:push:dry` puis, si le diff est celui attendu, `npm run db:push`
Expected: la commande confirme la création de `contact_messages` sans erreur.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00088_contact_messages.sql
git commit -m "feat(contact): table contact_messages"
```

---

### Task 2: Validation Zod du formulaire

**Files:**
- Create: `src/validations/contact.ts`
- Test: `src/validations/contact.spec.ts`

**Interfaces:**
- Produces: `contactMessageSchema` (Zod), `type ContactMessageInput = z.infer<typeof contactMessageSchema>` — consommés par la route API (Task 4) et le formulaire client (Task 5).

- [ ] **Step 1: Écrire le schéma**

```ts
// src/validations/contact.ts
import { z } from "zod/v4";

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, "Merci d'indiquer votre nom"),
  email: z.email("Merci d'indiquer un email valide"),
  subject: z.string().trim().min(1, "Merci d'indiquer un sujet"),
  message: z.string().trim().min(1, "Merci d'indiquer votre message"),

  /**
   * Piege a robots, meme pattern que newsletterSignupSchema
   * (src/validations/newsletter.ts) : champ cache a l'ecran, remplissable par
   * un script. Optionnel — un humain le laisse vide.
   */
  website: z.string().optional(),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
```

- [ ] **Step 2: Écrire les tests**

```ts
// src/validations/contact.spec.ts
import { describe, it, expect } from "vitest";
import { contactMessageSchema } from "./contact";

const valid = {
  name: "Marie Dupont",
  email: "marie@exemple.fr",
  subject: "Question sur l'allaitement mixte",
  message: "Bonjour, j'aimerais des conseils.",
};

describe("contactMessageSchema", () => {
  it("accepte un message valide", () => {
    expect(contactMessageSchema.safeParse(valid).success).toBe(true);
  });

  it("accepte un message valide avec honeypot vide", () => {
    const result = contactMessageSchema.safeParse({ ...valid, website: "" });
    expect(result.success).toBe(true);
  });

  it("refuse un nom vide", () => {
    const result = contactMessageSchema.safeParse({ ...valid, name: "  " });
    expect(result.success).toBe(false);
  });

  it("refuse un email invalide", () => {
    const result = contactMessageSchema.safeParse({ ...valid, email: "pas-un-email" });
    expect(result.success).toBe(false);
  });

  it("refuse un sujet vide", () => {
    const result = contactMessageSchema.safeParse({ ...valid, subject: "" });
    expect(result.success).toBe(false);
  });

  it("refuse un message vide", () => {
    const result = contactMessageSchema.safeParse({ ...valid, message: "" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Lancer les tests**

Run: `npx vitest run src/validations/contact.spec.ts`
Expected: 6 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/validations/contact.ts src/validations/contact.spec.ts
git commit -m "feat(contact): schema de validation du formulaire"
```

---

### Task 3: Catalogue de notification `contact_message_received`

**Files:**
- Modify: `src/lib/notifications/types.ts`
- Modify: `src/lib/notifications/catalog.ts`

**Interfaces:**
- Consumes: `NotificationCatalog`, `NotificationDataMap`, `NotificationDefinition` (déjà définis dans `types.ts`).
- Produces: événement `"contact_message_received"` avec data `{ contactMessageId: string; name: string; subject: string }`, consommé par la lib serveur du formulaire (Task 4) via `notify("contact_message_received", ...)`.

- [ ] **Step 1: Ajouter l'entrée dans `NotificationDataMap`**

Dans `src/lib/notifications/types.ts`, ajouter au type `NotificationDataMap` (juste avant la fermeture `};` du type, par exemple après `admin_message`) :

```ts
  contact_message_received: {
    contactMessageId: string;
    name: string;
    subject: string;
  };
```

- [ ] **Step 2: Ajouter la définition dans le catalogue**

Dans `src/lib/notifications/catalog.ts`, ajouter une entrée après `admin_message` (avant `consultant_message`) :

```ts
  contact_message_received: {
    key: "contact_message_received",
    category: "system",
    preferenceKey: "systeme",
    channels: ["in_app"],
    title: (d) => `Nouveau message de contact : ${d.name}`,
    body: (d) => d.subject,
    href: (d) => `/admin/contact/${d.contactMessageId}`,
  },
```

- [ ] **Step 3: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur liée à `notifications/types.ts` ou `notifications/catalog.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/notifications/types.ts src/lib/notifications/catalog.ts
git commit -m "feat(contact): evenement de notification contact_message_received"
```

---

### Task 4: Lib serveur + route API publique

**Files:**
- Create: `src/lib/contact/submit.ts`
- Create: `src/lib/contact/submit.spec.ts`
- Create: `src/app/api/contact/route.ts`

**Interfaces:**
- Consumes: `contactMessageSchema` (Task 2), `notify` + `getRoleRecipients` (`src/lib/notifications/notify.ts`, `src/lib/notifications/recipients.ts`), `rateLimit` (`src/lib/rate-limit.ts`), `getSessionUser` (`src/lib/auth`), `createAdminClient` (`src/lib/supabase/admin`).
- Produces: `submitContactMessage(input: Omit<ContactMessageInput, "website">, userId: string | null): Promise<ContactSubmitOutcome>` où `type ContactSubmitOutcome = { status: "sent" } | { status: "error" }`. Consommé par la route API (ce fichier) et testé isolément.
- Produces: route `POST /api/contact`, consommée par le formulaire client (Task 5).

- [ ] **Step 1: Écrire le test de la lib serveur**

```ts
// src/lib/contact/submit.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { insertMock, fromMock, notify, getRoleRecipients } = vi.hoisted(() => {
  const insertMock = vi.fn();
  return {
    insertMock,
    fromMock: vi.fn(() => ({ insert: insertMock })),
    notify: vi.fn().mockResolvedValue(undefined),
    getRoleRecipients: vi.fn().mockResolvedValue([{ userId: "admin-1", email: "a@b.fr" }]),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));
vi.mock("@/lib/notifications", () => ({ notify, getRoleRecipients }));

import { submitContactMessage } from "./submit";

const input = {
  name: "Marie Dupont",
  email: "marie@exemple.fr",
  subject: "Question sur l'allaitement mixte",
  message: "Bonjour, j'aimerais des conseils.",
};

describe("submitContactMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRoleRecipients.mockResolvedValue([{ userId: "admin-1", email: "a@b.fr" }]);
    insertMock.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "msg-1" }, error: null }),
      }),
    });
  });

  it("enregistre le message et notifie les admins", async () => {
    const outcome = await submitContactMessage(input, null);

    expect(outcome).toEqual({ status: "sent" });
    expect(fromMock).toHaveBeenCalledWith("contact_messages");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ ...input, user_id: null }),
    );
    expect(notify).toHaveBeenCalledWith(
      "contact_message_received",
      [{ userId: "admin-1", email: "a@b.fr" }],
      { contactMessageId: "msg-1", name: input.name, subject: input.subject },
      { dedupeId: "msg-1" },
    );
  });

  it("rattache le user_id quand le visiteur est connecte", async () => {
    await submitContactMessage(input, "user-42");

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-42" }),
    );
  });

  it("renvoie une erreur si l'insertion echoue, sans notifier", async () => {
    insertMock.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: { message: "boom" } }),
      }),
    });

    const outcome = await submitContactMessage(input, null);

    expect(outcome).toEqual({ status: "error" });
    expect(notify).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Vérifier que le test échoue**

Run: `npx vitest run src/lib/contact/submit.spec.ts`
Expected: FAIL — `Cannot find module './submit'`.

- [ ] **Step 3: Écrire la lib serveur**

```ts
// src/lib/contact/submit.ts
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { notify, getRoleRecipients } from "@/lib/notifications";
import type { ContactMessageInput } from "@/validations/contact";

export type ContactSubmitOutcome = { status: "sent" } | { status: "error" };

/**
 * Enregistre un message de contact puis notifie les admins in-app.
 *
 * L'ecriture d'abord, la notification ensuite : un echec de notify() (voir
 * son propre contrat, il ne leve jamais) ne doit jamais faire perdre le
 * message deja enregistre.
 */
export const submitContactMessage = async (
  input: Omit<ContactMessageInput, "website">,
  userId: string | null,
): Promise<ContactSubmitOutcome> => {
  const supabase = createAdminClient();

  const { data: contactMessage, error } = await supabase
    .from("contact_messages")
    .insert({
      name: input.name,
      email: input.email,
      subject: input.subject,
      message: input.message,
      user_id: userId,
    })
    .select("id")
    .single();

  if (error || !contactMessage) {
    console.error("[contact] enregistrement impossible", error);
    return { status: "error" };
  }

  const admins = await getRoleRecipients("admin");
  await notify(
    "contact_message_received",
    admins,
    {
      contactMessageId: contactMessage.id,
      name: input.name,
      subject: input.subject,
    },
    { dedupeId: contactMessage.id },
  );

  return { status: "sent" };
};
```

- [ ] **Step 4: Lancer les tests**

Run: `npx vitest run src/lib/contact/submit.spec.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Écrire la route API**

```ts
// src/app/api/contact/route.ts
import { NextResponse } from "next/server";
import { contactMessageSchema } from "@/validations/contact";
import { submitContactMessage } from "@/lib/contact/submit";
import { rateLimit } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth";
import { siteConfig } from "@/config/site";

/**
 * Cinq envois par IP et par dix minutes : assez large pour une personne qui
 * corrige une erreur de saisie, assez etroit pour dissuader un script.
 */
const CONTACT_RATE_LIMIT = {
  prefix: "contact-message",
  limit: 5,
  windowSeconds: 600,
} as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = contactMessageSchema.safeParse(body);

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return NextResponse.json({ errors: fieldErrors }, { status: 400 });
  }

  const { website, ...input } = parsed.data;

  // Piege a robots : reponse identique a un envoi reussi, meme logique que
  // /api/newsletter (src/app/api/newsletter/route.ts).
  if (website && website.trim() !== "") {
    return NextResponse.json({ status: "sent" });
  }

  const limit = await rateLimit(CONTACT_RATE_LIMIT);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 },
    );
  }

  const user = await getSessionUser();
  const outcome = await submitContactMessage(input, user?.id ?? null);

  if (outcome.status === "error") {
    return NextResponse.json(
      {
        error: `Une erreur est survenue, réessayez ou écrivez-nous à ${siteConfig.contactEmail}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(outcome);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/contact/submit.ts src/lib/contact/submit.spec.ts src/app/api/contact/route.ts
git commit -m "feat(contact): lib serveur et route API de soumission"
```

---

### Task 5: Page publique `/contact`

**Files:**
- Create: `src/app/(public)/contact/page.tsx`
- Create: `src/app/(public)/contact/_components/contact-form.tsx`
- Modify: `src/config/navigation.ts` (ajout à `publicNav`)

**Interfaces:**
- Consumes: `contactMessageSchema` (Task 2), route `POST /api/contact` (Task 4).
- Produces: page publique accessible à `/contact`, ajoutée à `publicNav` — aucune tâche suivante n'en dépend.

- [ ] **Step 1: Écrire le composant de formulaire client**

```tsx
// src/app/(public)/contact/_components/contact-form.tsx
"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contactMessageSchema } from "@/validations/contact";
import { siteConfig } from "@/config/site";

type FieldErrors = Partial<
  Record<"name" | "email" | "subject" | "message" | "form", string>
>;

export const ContactForm = () => {
  const fieldId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;

    const payload = { name, email, subject, message, website };

    // Meme schema que la route : un message d'erreur ne peut pas diverger
    // entre ce que le navigateur annonce et ce que le serveur accepte.
    const parsed = contactMessageSchema.safeParse(payload);
    if (!parsed.success) {
      const { fieldErrors } = parsed.error.flatten();
      setErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        subject: fieldErrors.subject?.[0],
        message: fieldErrors.message?.[0],
      });
      return;
    }

    setErrors({});
    setPending(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setErrors({
          form:
            data?.error ??
            `Une erreur est survenue, réessayez ou écrivez-nous à ${siteConfig.contactEmail}`,
        });
        return;
      }

      setSent(true);
    } catch {
      setErrors({
        form: "Connexion impossible. Vérifiez votre réseau et réessayez.",
      });
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <div
        role="status"
        className="border border-accent-peach bg-accent-peach-soft p-8 text-center"
      >
        <p className="font-serif text-2xl font-bold text-primary-green">
          Merci, votre message a bien été envoyé.
        </p>
        <p className="mt-3 text-primary-green/70">
          Nous vous répondrons directement à l&apos;adresse indiquée.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-left">
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-name`}>Nom</Label>
        <Input
          id={`${fieldId}-name`}
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${fieldId}-name-error` : undefined}
        />
        <FieldError id={`${fieldId}-name-error`} message={errors.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-email`}>Email</Label>
        <Input
          id={`${fieldId}-email`}
          name="email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? `${fieldId}-email-error` : undefined}
        />
        <FieldError id={`${fieldId}-email-error`} message={errors.email} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-subject`}>Sujet</Label>
        <Input
          id={`${fieldId}-subject`}
          name="subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={errors.subject ? `${fieldId}-subject-error` : undefined}
        />
        <FieldError id={`${fieldId}-subject-error`} message={errors.subject} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-message`}>Message</Label>
        <Textarea
          id={`${fieldId}-message`}
          name="message"
          rows={6}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? `${fieldId}-message-error` : undefined}
        />
        <FieldError id={`${fieldId}-message-error`} message={errors.message} />
      </div>

      {/* Piege a robots, meme pattern que NewsletterSignupForm
          (src/app/(public)/newsletter/_components/newsletter-signup-form.tsx). */}
      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <Label htmlFor={`${fieldId}-website`}>Site web</Label>
        <Input
          id={`${fieldId}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <Button type="submit" size="lg" disabled={pending} className="h-14 w-full">
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Envoi en cours…
          </>
        ) : (
          "Envoyer le message"
        )}
      </Button>

      <FieldError id={`${fieldId}-form-error`} message={errors.form} />
    </form>
  );
};

const FieldError = ({ id, message }: { id: string; message?: string }) => (
  <p
    id={id}
    role={message ? "alert" : undefined}
    aria-live="polite"
    className="min-h-0 text-sm font-medium text-primary-red-light empty:hidden"
  >
    {message}
  </p>
);
```

- [ ] **Step 2: Écrire la page**

```tsx
// src/app/(public)/contact/page.tsx
import type { Metadata } from "next";
import { ContactForm } from "./_components/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Une question ? Écrivez-nous, nous vous répondons rapidement.",
  alternates: { canonical: "/contact" },
};

const ContactPage = () => {
  return (
    <section className="section-padding">
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <h1 className="font-serif text-4xl font-bold text-primary-green">
            Contactez-nous
          </h1>
          <p className="mt-4 text-primary-green/70">
            Une question, une demande particulière ? Écrivez-nous, nous vous
            répondons rapidement.
          </p>
        </div>
        <div className="mt-10">
          <ContactForm />
        </div>
      </div>
    </section>
  );
};

export default ContactPage;
```

- [ ] **Step 3: Ajouter la page à `publicNav`**

Dans `src/config/navigation.ts`, ajouter à la fin du tableau `publicNav` :

```ts
  { title: "Contact", href: "/contact" },
```

- [ ] **Step 4: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur sur les fichiers créés.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/contact" src/config/navigation.ts
git commit -m "feat(contact): page publique de contact"
```

---

### Task 6: Actions admin (liste, détail, statuts)

**Files:**
- Create: `src/app/(dashboard)/admin/contact/actions.ts`
- Create: `src/app/(dashboard)/admin/contact/actions.spec.ts`

**Interfaces:**
- Consumes: `getSessionUser` (`@/lib/auth`), `createAdminClient` (`@/lib/supabase/admin`), `ActionResult` (`@/types`).
- Produces:
  - `type ContactMessageRow = { id: string; name: string; email: string; subject: string; message: string; status: "nouveau" | "lu" | "traite"; created_at: string }`
  - `listContactMessages(statusFilter?: "nouveau" | "lu" | "traite"): Promise<ContactMessageRow[]>`
  - `getContactMessageForAdmin(id: string): Promise<ContactMessageRow | null>` — marque automatiquement `nouveau → lu`
  - `markContactMessageTreated(id: string): Promise<ActionResult>`
  Consommés par les pages liste et détail (Task 7).

- [ ] **Step 1: Écrire les tests**

```ts
// src/app/(dashboard)/admin/contact/actions.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSessionUser, selectMock, eqMock, orderMock, maybeSingleMock, updateMock, fromMock } =
  vi.hoisted(() => {
    const maybeSingleMock = vi.fn();
    const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const orderMock = vi.fn();
    const selectMock = vi.fn(() => ({ eq: eqMock, order: orderMock }));
    const updateMock = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    return {
      mockGetSessionUser: vi.fn(),
      selectMock,
      eqMock,
      orderMock,
      maybeSingleMock,
      updateMock,
      fromMock: vi.fn(() => ({ select: selectMock, update: updateMock })),
    };
  });

vi.mock("@/lib/auth", () => ({ getSessionUser: mockGetSessionUser }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

import {
  listContactMessages,
  getContactMessageForAdmin,
  markContactMessageTreated,
} from "./actions";

const row = {
  id: "msg-1",
  name: "Marie Dupont",
  email: "marie@exemple.fr",
  subject: "Question",
  message: "Bonjour",
  status: "nouveau",
  created_at: "2026-08-10T10:00:00.000Z",
};

describe("admin/contact actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({
      id: "admin-1",
      email: "a@b.fr",
      roles: ["admin"],
    });
    orderMock.mockResolvedValue({ data: [row] });
    maybeSingleMock.mockResolvedValue({ data: row });
  });

  it("refuse un compte non administrateur sur listContactMessages", async () => {
    mockGetSessionUser.mockResolvedValue({ id: "c1", email: "c@b.fr", roles: ["client"] });

    await expect(listContactMessages()).rejects.toThrow("NEXT_REDIRECT");
  });

  it("liste les messages", async () => {
    const result = await listContactMessages();

    expect(fromMock).toHaveBeenCalledWith("contact_messages");
    expect(result).toEqual([row]);
  });

  it("passe un message nouveau en lu a l'ouverture du detail", async () => {
    maybeSingleMock.mockResolvedValue({ data: { ...row, status: "nouveau" } });

    await getContactMessageForAdmin("msg-1");

    expect(updateMock).toHaveBeenCalledWith({ status: "lu", updated_at: expect.any(String) });
  });

  it("ne re-ecrit pas le statut d'un message deja lu ou traite", async () => {
    maybeSingleMock.mockResolvedValue({ data: { ...row, status: "traite" } });

    await getContactMessageForAdmin("msg-1");

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("renvoie null si le message n'existe pas", async () => {
    maybeSingleMock.mockResolvedValue({ data: null });

    expect(await getContactMessageForAdmin("absent")).toBeNull();
  });

  it("marque un message comme traite", async () => {
    const result = await markContactMessageTreated("msg-1");

    expect(result).toEqual({ success: true });
    expect(updateMock).toHaveBeenCalledWith({ status: "traite", updated_at: expect.any(String) });
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npx vitest run "src/app/(dashboard)/admin/contact/actions.spec.ts"`
Expected: FAIL — `Cannot find module './actions'`.

- [ ] **Step 3: Écrire les actions**

```ts
// src/app/(dashboard)/admin/contact/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

export type ContactMessageStatus = "nouveau" | "lu" | "traite";

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  created_at: string;
};

export const listContactMessages = async (
  statusFilter?: ContactMessageStatus,
): Promise<ContactMessageRow[]> => {
  await requireAdmin();

  let query = createAdminClient()
    .from("contact_messages")
    .select("id, name, email, subject, message, status, created_at")
    .order("created_at", { ascending: false });

  if (statusFilter) query = query.eq("status", statusFilter);

  const { data } = await query;
  return (data ?? []) as ContactMessageRow[];
};

/**
 * Charge un message et le marque `lu` s'il etait `nouveau`. Le passage en lu
 * fait partie de l'ouverture du detail, pas d'une action separee : c'est la
 * regle produit (voir spec).
 */
export const getContactMessageForAdmin = async (
  id: string,
): Promise<ContactMessageRow | null> => {
  await requireAdmin();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("contact_messages")
    .select("id, name, email, subject, message, status, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  if (data.status === "nouveau") {
    await supabase
      .from("contact_messages")
      .update({ status: "lu", updated_at: new Date().toISOString() })
      .eq("id", id);
    return { ...data, status: "lu" } as ContactMessageRow;
  }

  return data as ContactMessageRow;
};

export const markContactMessageTreated = async (
  id: string,
): Promise<ActionResult> => {
  await requireAdmin();

  const { error } = await createAdminClient()
    .from("contact_messages")
    .update({ status: "traite", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: "Mise à jour impossible" };

  revalidatePath("/admin/contact");
  revalidatePath(`/admin/contact/${id}`);
  return { success: true };
};
```

- [ ] **Step 4: Lancer les tests**

Run: `npx vitest run "src/app/(dashboard)/admin/contact/actions.spec.ts"`
Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/admin/contact/actions.ts" "src/app/(dashboard)/admin/contact/actions.spec.ts"
git commit -m "feat(contact): actions admin liste/detail/statuts"
```

---

### Task 7: Pages admin (liste, détail) et navigation

**Files:**
- Create: `src/app/(dashboard)/admin/contact/page.tsx`
- Create: `src/app/(dashboard)/admin/contact/[id]/page.tsx`
- Create: `src/app/(dashboard)/admin/contact/_components/mark-treated-button.tsx`
- Create: `src/app/(dashboard)/admin/contact/_components/status-filter.tsx`
- Modify: `src/config/navigation.ts` (ajout à `adminNav`)

**Interfaces:**
- Consumes: `listContactMessages`, `getContactMessageForAdmin`, `markContactMessageTreated`, `ContactMessageRow`, `ContactMessageStatus` (Task 6).
- Produces: pages `/admin/contact` et `/admin/contact/[id]` — dernière tâche de la fonctionnalité, rien n'en dépend.

- [ ] **Step 1: Écrire le filtre de statut (client component, query param)**

```tsx
// src/app/(dashboard)/admin/contact/_components/status-filter.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OPTIONS = [
  { value: "all", label: "Tous les statuts" },
  { value: "nouveau", label: "Nouveau" },
  { value: "lu", label: "Lu" },
  { value: "traite", label: "Traité" },
] as const;

export const StatusFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("statut") ?? "all";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") params.delete("statut");
    else params.set("statut", value);
    router.push(`/admin/contact?${params.toString()}`);
  };

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

- [ ] **Step 2: Écrire la liste admin**

```tsx
// src/app/(dashboard)/admin/contact/page.tsx
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listContactMessages } from "./actions";
import { StatusFilter } from "./_components/status-filter";
import type { ContactMessageStatus } from "./actions";

const STATUS_LABELS: Record<ContactMessageStatus, string> = {
  nouveau: "Nouveau",
  lu: "Lu",
  traite: "Traité",
};

const STATUS_VARIANTS: Record<ContactMessageStatus, "default" | "outline" | "secondary"> = {
  nouveau: "default",
  lu: "secondary",
  traite: "outline",
};

const isStatus = (value: string | undefined): value is ContactMessageStatus =>
  value === "nouveau" || value === "lu" || value === "traite";

export default async function AdminContactPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;
  const statusFilter = isStatus(statut) ? statut : undefined;
  const messages = await listContactMessages(statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-primary-green">Contact</h1>
          <p className="text-sm text-primary-green/60">
            Messages envoyés depuis le formulaire de contact du site.
          </p>
        </div>
        <StatusFilter />
      </div>

      {messages.length === 0 ? (
        <p className="text-primary-green/70">Aucun message pour le moment.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Sujet</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(message.created_at), "d MMM yyyy HH:mm", {
                      locale: fr,
                    })}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/contact/${message.id}`}
                      className="font-medium text-primary-green hover:underline"
                    >
                      {message.name}
                    </Link>
                  </TableCell>
                  <TableCell>{message.email}</TableCell>
                  <TableCell className="max-w-64 truncate">{message.subject}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[message.status]}>
                      {STATUS_LABELS[message.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Écrire le bouton "Marquer comme traité"**

```tsx
// src/app/(dashboard)/admin/contact/_components/mark-treated-button.tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markContactMessageTreated } from "../actions";

export const MarkTreatedButton = ({ id }: { id: string }) => {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done) {
    return <p className="text-sm text-primary-green/70">Marqué comme traité.</p>;
  }

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await markContactMessageTreated(id);
          if (result.success) setDone(true);
        })
      }
    >
      Marquer comme traité
    </Button>
  );
};
```

- [ ] **Step 4: Écrire le détail admin**

```tsx
// src/app/(dashboard)/admin/contact/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getContactMessageForAdmin } from "../actions";
import { MarkTreatedButton } from "../_components/mark-treated-button";

export default async function AdminContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const message = await getContactMessageForAdmin(id);
  if (!message) notFound();

  const mailtoHref = `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`;

  return (
    <div className="max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/contact">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-primary-green">{message.subject}</h1>
          <p className="mt-1 text-sm text-primary-green/60">
            {message.name} · {message.email} ·{" "}
            {format(new Date(message.created_at), "d MMM yyyy HH:mm", { locale: fr })}
          </p>
        </div>
        <Badge>{message.status === "traite" ? "Traité" : message.status === "lu" ? "Lu" : "Nouveau"}</Badge>
      </div>

      <p className="whitespace-pre-wrap rounded-lg border p-4 text-primary-green/90">
        {message.message}
      </p>

      <div className="flex gap-3">
        <Button asChild>
          <a href={mailtoHref}>Répondre</a>
        </Button>
        {message.status !== "traite" && <MarkTreatedButton id={message.id} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Ajouter l'entrée à `adminNav`**

Dans `src/config/navigation.ts`, ajouter dans la section « Personnes » (après l'entrée « Consultantes », avant le commentaire `// Offre`) :

```ts
  {
    title: "Contact",
    href: "/admin/contact",
    iconKey: "Mail",
    section: "personnes",
  },
```

- [ ] **Step 6: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 7: Lancer toute la suite de tests du projet**

Run: `npx vitest run`
Expected: tous les tests PASS, y compris ceux ajoutés dans ce plan.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(dashboard)/admin/contact" src/config/navigation.ts
git commit -m "feat(contact): pages admin liste et detail"
```

---

## Vérification manuelle finale

- [ ] Lancer `npm run dev`, ouvrir `/contact`, envoyer un message valide → confirmation affichée.
- [ ] Remplir le champ honeypot via les devtools et soumettre → réponse "envoyé" sans ligne créée en base.
- [ ] Se connecter en admin, ouvrir `/admin/contact` → le message apparaît avec statut "Nouveau", cloche de notification affiche l'alerte.
- [ ] Ouvrir le détail → statut passe à "Lu" automatiquement, bouton "Répondre" ouvre le client mail avec le bon destinataire et sujet.
- [ ] Cliquer "Marquer comme traité" → statut passe à "Traité", persiste après rechargement.
- [ ] Filtrer par statut dans la liste → seuls les messages du statut choisi s'affichent.
