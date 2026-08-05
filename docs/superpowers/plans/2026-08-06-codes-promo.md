# Codes promo multi-services — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à une cliente d'appliquer un code de réduction avant paiement sur les accompagnements, les formations/événements et les rendez-vous, avec ciblage jusqu'à l'item et administration dans le back-office.

**Architecture:** Une table Supabase porte les codes, leurs cibles, leurs déclencheurs et leurs utilisations. Une fonction pure évalue un code contre un contexte d'achat (aucune I/O, entièrement testée). Les trois server actions d'achat réservent le code, envoient à Stripe un montant **déjà remisé**, et le webhook confirme la réservation. Stripe ne connaît aucun coupon.

**Tech Stack:** Next.js 15 App Router (server actions), Supabase (Postgres + RLS, migrations SQL numérotées), Stripe Connect, Zod v4, Vitest, shadcn/ui + Tailwind.

## Global Constraints

- Spec de référence : `docs/superpowers/specs/2026-08-06-codes-promo-design.md`.
- La **consultante supporte la remise** : `platform_fee_cents` est toujours calculé sur le montant remisé.
- Le client n'envoie **jamais** un montant. Il envoie la chaîne du code ; le serveur recalcule tout.
- Un seul code par commande. Pas de cumul.
- Le montant final ne peut jamais être négatif : `discount = min(discount, amountCents)`.
- Migrations : fichiers `supabase/migrations/000NN_*.sql`, numérotation continue. La dernière existante est `00064`. Ne jamais modifier une migration déjà commitée.
- Commentaires de code en français, sans accents dans les fichiers SQL (convention du dépôt), avec accents dans le TypeScript.
- Style du dépôt : `export const fn = async (...) => {}`, jamais `function`. Types dans `src/types/database.ts`. Schémas Zod dans `src/validations/`.
- Tests : `pnpm test` (Vitest, `*.spec.ts` à côté du fichier testé). Lint : `pnpm lint`. Build : `pnpm build`.
- Les codes promo ne s'appliquent qu'au **paiement en ligne**. Une réservation en paiement sur place ignore tout code (pas de flux Stripe, pas d'encaissement à remiser).

## File Structure

**Créés :**

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/00065_promo_codes.sql` | Tables, enums, RLS, colonnes ajoutées à `payments` et `invoices`, remplacement de `create_invoice`. |
| `supabase/migrations/00066_promo_codes_seed.sql` | Les 11 codes initiaux. |
| `src/lib/promo/types.ts` | Types partagés du domaine promo. |
| `src/lib/promo/evaluate.ts` | Fonction pure d'évaluation d'un code. |
| `src/lib/promo/evaluate.spec.ts` | Tests unitaires de l'évaluation. |
| `src/lib/promo/messages.ts` | Traduction des rejets en messages destinés à la cliente. |
| `src/lib/promo/repository.ts` | Accès Supabase : chargement du code, comptage, historique d'achats. |
| `src/lib/promo/reserve.ts` | `resolvePromoForPurchase`, `attachSessionToRedemption`, `confirmRedemption`, `cancelRedemption`. |
| `src/lib/promo/reserve.spec.ts` | Tests de la réservation. |
| `src/app/(public)/promo/actions.ts` | Server action publique `previewPromoCode` (rate-limitée). |
| `src/components/promo/promo-code-field.tsx` | Champ de saisie partagé et récapitulatif de prix. |
| `src/validations/promo-codes.ts` | Schéma Zod du formulaire admin. |
| `src/app/(dashboard)/admin/marketing/codes-promo/page.tsx` | Liste des codes. |
| `src/app/(dashboard)/admin/marketing/codes-promo/actions.ts` | CRUD admin + statistiques. |
| `src/app/(dashboard)/admin/marketing/codes-promo/actions.spec.ts` | Tests du CRUD admin. |
| `src/app/(dashboard)/admin/marketing/codes-promo/_components/promo-code-form.tsx` | Formulaire création/édition. |
| `src/app/(dashboard)/admin/marketing/codes-promo/nouveau/page.tsx` | Page de création. |
| `src/app/(dashboard)/admin/marketing/codes-promo/[id]/page.tsx` | Édition + statistiques. |

**Modifiés :**

| Fichier | Changement |
|---|---|
| `src/types/database.ts` | Types `PromoCode`, `PromoCodeTarget`, `PromoCodeTrigger`, `PromoCodeRedemption` ; trois champs ajoutés à `Payment`. |
| `src/app/(public)/accompagnements/actions.ts` | `purchaseFormation(formationId, promoCode?)`. |
| `src/app/(public)/formations/actions.ts` | `registerForEvent(eventId, promoCode?)`. |
| `src/app/(public)/reserver/actions.ts` | `BookingFormData.promo_code`. |
| `src/lib/stripe/webhooks.ts` | Confirmation de la redemption, report sur `payments`. |
| `src/app/api/webhooks/stripe/route.ts` | Prise en charge de `checkout.session.expired`. |
| `src/lib/invoicing/build-invoice.ts` | Champs remise dans `InvoiceContent`. |
| `src/lib/invoicing/emit.ts` | Lecture des champs remise sur le paiement. |
| `src/lib/invoicing/invoice-view.ts` | Ligne remise dans la vue. |
| `src/lib/invoicing/invoice-pdf.tsx` | Rendu de la ligne remise. |
| `src/app/(public)/accompagnements/_components/purchase-button.tsx` | Intégration du champ. |
| `src/app/(public)/formations/[slug]/register-button.tsx` | Intégration du champ. |
| `src/app/(public)/reserver/_components/step-payment.tsx` | Intégration du champ. |
| `src/app/(public)/reserver/page.tsx` | Remontée du code au `createBooking`. |
| `src/app/(dashboard)/admin/marketing/page.tsx` | Lien vers la nouvelle section. |

---

### Task 1: Schéma de base de données

**Files:**
- Create: `supabase/migrations/00065_promo_codes.sql`
- Modify: `src/types/database.ts`

**Interfaces:**
- Consumes: rien.
- Produces: tables `promo_codes`, `promo_code_targets`, `promo_code_triggers`, `promo_code_redemptions` ; colonnes `payments.promo_code_id`, `payments.discount_cents`, `payments.original_amount_cents` ; colonnes `invoices.promo_code`, `invoices.discount_cents`, `invoices.gross_amount_ttc_cents`. Types TS `PromoCode`, `PromoCodeTarget`, `PromoCodeTrigger`, `PromoCodeRedemption`, `PromoDiscountType`, `PromoTargetType`, `PromoTriggerType`, `PromoRedemptionStatus`.

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/00065_promo_codes.sql` :

```sql
-- Codes promo multi-services.
--
-- La verite vit ici, pas chez Stripe : la plateforme n'a pas de Product Stripe
-- (les sessions utilisent price_data inline), le prix d'un rendez-vous est
-- calcule a la volee, et la commission depend du montant. La remise est donc
-- appliquee avant l'appel a Stripe, qui ne recoit qu'un montant deja remise.

CREATE TYPE promo_discount_type AS ENUM ('percent', 'fixed_cents');

CREATE TYPE promo_target_type AS ENUM (
  'formations_all', 'events_all', 'bookings_all',
  'formation', 'event', 'booking_service'
);

CREATE TYPE promo_trigger_type AS ENUM ('event_purchase', 'formation_purchase');

CREATE TYPE promo_redemption_status AS ENUM ('pending', 'confirmed', 'cancelled');

CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  label TEXT,
  discount_type promo_discount_type NOT NULL,
  discount_value INT NOT NULL,
  scope_all BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  max_redemptions INT,
  max_per_user INT NOT NULL DEFAULT 1,
  min_order_cents INT NOT NULL DEFAULT 0,
  trigger_delay_hours INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT promo_codes_value_positive CHECK (discount_value > 0),
  CONSTRAINT promo_codes_percent_max CHECK (
    discount_type <> 'percent' OR discount_value <= 100
  ),
  CONSTRAINT promo_codes_window_ordered CHECK (
    valid_from IS NULL OR valid_until IS NULL OR valid_from < valid_until
  )
);

-- La saisie est insensible a la casse : l'unicite doit l'etre aussi, sinon
-- « flash24 » et « FLASH24 » cohabitent avec des quotas separes.
CREATE UNIQUE INDEX idx_promo_codes_code ON promo_codes (upper(code));

CREATE TABLE promo_code_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  target_type promo_target_type NOT NULL,
  -- formation.id, event.id ou consultation_type_id selon target_type. Pas de
  -- cle etrangere : la colonne pointe vers trois tables differentes.
  target_id UUID,

  CONSTRAINT promo_targets_id_matches_type CHECK (
    (target_type IN ('formations_all', 'events_all', 'bookings_all')
      AND target_id IS NULL)
    OR (target_type IN ('formation', 'event', 'booking_service')
      AND target_id IS NOT NULL)
  )
);

CREATE INDEX idx_promo_targets_code ON promo_code_targets (promo_code_id);

-- Declencheur : le code n'est valable que dans les trigger_delay_hours qui
-- suivent un achat correspondant. target_id NULL = n'importe quel produit du
-- type. Sert a PREMIERSJOURS (48 h apres l'achat d'un evenement).
CREATE TABLE promo_code_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  trigger_type promo_trigger_type NOT NULL,
  target_id UUID
);

CREATE INDEX idx_promo_triggers_code ON promo_code_triggers (promo_code_id);

CREATE TABLE promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  order_kind payment_type NOT NULL,
  reference_id UUID NOT NULL,

  -- Renseigne juste apres la creation de la session : l'identifiant n'existe
  -- pas encore au moment ou la reservation est posee.
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,

  original_amount_cents INT NOT NULL,
  discount_cents INT NOT NULL,
  final_amount_cents INT NOT NULL,

  status promo_redemption_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_promo_redemptions_code ON promo_code_redemptions (promo_code_id);
CREATE INDEX idx_promo_redemptions_profile
  ON promo_code_redemptions (promo_code_id, profile_id);
CREATE INDEX idx_promo_redemptions_status
  ON promo_code_redemptions (status, created_at);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Aucune politique de lecture publique sur la configuration : exposer le
-- catalogue permettrait de lister les codes actifs depuis la console du
-- navigateur. Tout passe par le service role (server actions).
CREATE POLICY promo_codes_admin ON promo_codes
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY promo_targets_admin ON promo_code_targets
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY promo_triggers_admin ON promo_code_triggers
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY promo_redemptions_admin ON promo_code_redemptions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY promo_redemptions_select_own ON promo_code_redemptions
  FOR SELECT USING (profile_id = auth.uid());

CREATE TRIGGER promo_codes_updated_at
  BEFORE UPDATE ON promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Report sur les paiements et les factures ───────────────────────────

ALTER TABLE payments
  ADD COLUMN promo_code_id UUID REFERENCES promo_codes(id),
  ADD COLUMN discount_cents INT,
  ADD COLUMN original_amount_cents INT;

-- amount_cents reste le montant reellement encaisse : aucune lecture
-- existante ne change de sens.

ALTER TABLE invoices
  ADD COLUMN promo_code TEXT,
  ADD COLUMN discount_cents INT,
  ADD COLUMN gross_amount_ttc_cents INT;

-- create_invoice recopie explicitement chaque colonne : les trois nouvelles
-- doivent y etre ajoutees, sinon la remise n'atteint jamais la facture.
CREATE OR REPLACE FUNCTION create_invoice(p_content JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id UUID := (p_content->>'payment_id')::UUID;
  v_consultant_id UUID := (p_content->>'consultant_id')::UUID;
  v_now TIMESTAMPTZ := now();
  v_year INT := EXTRACT(YEAR FROM v_now);
  v_month INT := EXTRACT(MONTH FROM v_now);
  v_seq INT;
  v_number TEXT;
  v_row invoices;
BEGIN
  SELECT * INTO v_row FROM invoices
  WHERE payment_id = v_payment_id
    AND document_type = 'invoice'
    AND status = 'issued';
  IF FOUND THEN
    RETURN to_jsonb(v_row);
  END IF;

  INSERT INTO invoice_sequences AS s (consultant_id, year, month, last_number)
  VALUES (v_consultant_id, v_year, v_month, 1)
  ON CONFLICT (consultant_id, year, month)
    DO UPDATE SET last_number = s.last_number + 1
  RETURNING s.last_number INTO v_seq;

  v_number := to_char(v_year, 'FM0000') || '-'
           || to_char(v_month, 'FM00') || '-'
           || to_char(v_seq, 'FM0000');

  INSERT INTO invoices (
    payment_id, consultant_id, client_id, type, reference_id,
    number, year, month, sequence, issued_at,
    currency, vat_rate, amount_ttc_cents, amount_ht_cents, amount_vat_cents,
    description, client_name, client_email,
    issuer_legal_name, issuer_address, issuer_siren, issuer_vat_number,
    issuer_legal_form, status, document_type,
    promo_code, discount_cents, gross_amount_ttc_cents
  ) VALUES (
    v_payment_id,
    v_consultant_id,
    (p_content->>'client_id')::UUID,
    (p_content->>'type')::payment_type,
    (p_content->>'reference_id')::UUID,
    v_number, v_year, v_month, v_seq, v_now,
    p_content->>'currency',
    (p_content->>'vat_rate')::NUMERIC,
    (p_content->>'amount_ttc_cents')::INT,
    (p_content->>'amount_ht_cents')::INT,
    (p_content->>'amount_vat_cents')::INT,
    p_content->>'description',
    p_content->>'client_name',
    p_content->>'client_email',
    p_content->>'issuer_legal_name',
    p_content->>'issuer_address',
    p_content->>'issuer_siren',
    p_content->>'issuer_vat_number',
    p_content->>'issuer_legal_form',
    COALESCE(p_content->>'status', 'issued'),
    'invoice',
    p_content->>'promo_code',
    (p_content->>'discount_cents')::INT,
    (p_content->>'gross_amount_ttc_cents')::INT
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;
```

- [ ] **Step 2: Vérifier la migration en dry-run**

Run: `pnpm db:push:dry`
Expected: la migration `00065_promo_codes.sql` apparaît dans la liste des migrations à appliquer, sans erreur de syntaxe.

- [ ] **Step 3: Appliquer la migration**

Run: `pnpm db:push`
Expected: `Finished supabase db push.`

- [ ] **Step 4: Ajouter les types TypeScript**

Dans `src/types/database.ts`, ajouter après le type `Payment` :

```ts
export type PromoDiscountType = "percent" | "fixed_cents";

export type PromoTargetType =
  | "formations_all"
  | "events_all"
  | "bookings_all"
  | "formation"
  | "event"
  | "booking_service";

export type PromoTriggerType = "event_purchase" | "formation_purchase";

export type PromoRedemptionStatus = "pending" | "confirmed" | "cancelled";

export type PromoCode = {
  id: string;
  code: string;
  label: string | null;
  discount_type: PromoDiscountType;
  discount_value: number;
  scope_all: boolean;
  valid_from: string | null;
  valid_until: string | null;
  max_redemptions: number | null;
  max_per_user: number;
  min_order_cents: number;
  trigger_delay_hours: number | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PromoCodeTarget = {
  id: string;
  promo_code_id: string;
  target_type: PromoTargetType;
  target_id: string | null;
};

export type PromoCodeTrigger = {
  id: string;
  promo_code_id: string;
  trigger_type: PromoTriggerType;
  target_id: string | null;
};

export type PromoCodeRedemption = {
  id: string;
  promo_code_id: string;
  profile_id: string;
  order_kind: PaymentType;
  reference_id: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  original_amount_cents: number;
  discount_cents: number;
  final_amount_cents: number;
  status: PromoRedemptionStatus;
  created_at: string;
  confirmed_at: string | null;
};
```

Et compléter le type `Payment` existant, après `metadata` :

```ts
  promo_code_id: string | null;
  discount_cents: number | null;
  original_amount_cents: number | null;
```

- [ ] **Step 5: Vérifier la compilation**

Run: `pnpm lint`
Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/00065_promo_codes.sql src/types/database.ts
git commit -m "feat(promo): schema des codes promo et report sur paiements et factures"
```

---

### Task 2: Évaluation d'un code — fonction pure

**Files:**
- Create: `src/lib/promo/types.ts`, `src/lib/promo/evaluate.ts`, `src/lib/promo/evaluate.spec.ts`, `src/lib/promo/messages.ts`
- Test: `src/lib/promo/evaluate.spec.ts`

**Interfaces:**
- Consumes: les types de la Task 1 (`PromoDiscountType`, `PromoTargetType`, `PromoTriggerType`).
- Produces:
  - `type PromoServiceKind = "formation" | "event" | "booking"`
  - `type PromoCodeWithRules` (code + `targets[]` + `triggers[]`)
  - `type PromoContext`
  - `type PromoEvaluation = { ok: true; discountCents: number; finalCents: number } | { ok: false; reason: PromoRejection; minOrderCents?: number }`
  - `evaluatePromoCode(code: PromoCodeWithRules, ctx: PromoContext): PromoEvaluation`
  - `promoRejectionMessage(result: Extract<PromoEvaluation, { ok: false }>): string`

- [ ] **Step 1: Écrire les types**

Créer `src/lib/promo/types.ts` :

```ts
import type {
  PromoCode,
  PromoDiscountType,
  PromoTargetType,
  PromoTriggerType,
} from "@/types/database";

/** Les trois familles de produits payants de la plateforme. */
export type PromoServiceKind = "formation" | "event" | "booking";

export type PromoCodeWithRules = PromoCode & {
  targets: { target_type: PromoTargetType; target_id: string | null }[];
  triggers: { trigger_type: PromoTriggerType; target_id: string | null }[];
};

/** Achat anterieur susceptible de declencher un code (PREMIERSJOURS). */
export type PromoPurchase = {
  kind: PromoServiceKind;
  itemId: string;
  purchasedAtMs: number;
};

export type PromoContext = {
  serviceKind: PromoServiceKind;
  /** formation.id, event.id ou consultation_type_id. */
  itemId: string;
  amountCents: number;
  nowMs: number;
  /** Utilisations retenues (confirmees + reservations recentes). */
  globalRedemptions: number;
  userRedemptions: number;
  triggeringPurchases: PromoPurchase[];
};

export type PromoRejection =
  | "not_applicable"
  | "min_order"
  | "exhausted"
  | "already_used";

export type PromoEvaluation =
  | { ok: true; discountCents: number; finalCents: number }
  | { ok: false; reason: PromoRejection; minOrderCents?: number };

export type { PromoDiscountType };
```

- [ ] **Step 2: Écrire les tests qui échouent**

Créer `src/lib/promo/evaluate.spec.ts` :

```ts
import { describe, it, expect } from "vitest";
import { evaluatePromoCode } from "./evaluate";
import type { PromoCodeWithRules, PromoContext } from "./types";

const NOW = Date.parse("2026-08-06T12:00:00.000Z");
const HOUR = 3_600_000;

const makeCode = (
  overrides: Partial<PromoCodeWithRules> = {},
): PromoCodeWithRules => ({
  id: "code-1",
  code: "SUPERMAMAN",
  label: null,
  discount_type: "percent",
  discount_value: 15,
  scope_all: true,
  valid_from: null,
  valid_until: null,
  max_redemptions: null,
  max_per_user: 1,
  min_order_cents: 0,
  trigger_delay_hours: null,
  is_active: true,
  created_by: null,
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
  targets: [],
  triggers: [],
  ...overrides,
});

const makeContext = (overrides: Partial<PromoContext> = {}): PromoContext => ({
  serviceKind: "formation",
  itemId: "formation-1",
  amountCents: 10_000,
  nowMs: NOW,
  globalRedemptions: 0,
  userRedemptions: 0,
  triggeringPurchases: [],
  ...overrides,
});

describe("evaluatePromoCode", () => {
  it("applique une remise en pourcentage", () => {
    expect(evaluatePromoCode(makeCode(), makeContext())).toEqual({
      ok: true,
      discountCents: 1500,
      finalCents: 8500,
    });
  });

  it("arrondit la remise en pourcentage au centime", () => {
    const result = evaluatePromoCode(
      makeCode({ discount_value: 15 }),
      makeContext({ amountCents: 3333 }),
    );
    expect(result).toEqual({ ok: true, discountCents: 500, finalCents: 2833 });
  });

  it("applique une remise fixe", () => {
    const result = evaluatePromoCode(
      makeCode({ discount_type: "fixed_cents", discount_value: 3000 }),
      makeContext(),
    );
    expect(result).toEqual({ ok: true, discountCents: 3000, finalCents: 7000 });
  });

  it("ne descend jamais sous zero", () => {
    const result = evaluatePromoCode(
      makeCode({ discount_type: "fixed_cents", discount_value: 3000 }),
      makeContext({ amountCents: 2000 }),
    );
    expect(result).toEqual({ ok: true, discountCents: 2000, finalCents: 0 });
  });

  it("refuse un code desactive", () => {
    const result = evaluatePromoCode(makeCode({ is_active: false }), makeContext());
    expect(result).toEqual({ ok: false, reason: "not_applicable" });
  });

  it("refuse un code avant sa fenetre", () => {
    const result = evaluatePromoCode(
      makeCode({ valid_from: "2026-08-07T00:00:00.000Z" }),
      makeContext(),
    );
    expect(result).toEqual({ ok: false, reason: "not_applicable" });
  });

  it("refuse un code apres sa fenetre", () => {
    const result = evaluatePromoCode(
      makeCode({ valid_until: "2026-08-06T11:00:00.000Z" }),
      makeContext(),
    );
    expect(result).toEqual({ ok: false, reason: "not_applicable" });
  });

  it("accepte un code dans sa fenetre", () => {
    const result = evaluatePromoCode(
      makeCode({
        valid_from: "2026-08-06T00:00:00.000Z",
        valid_until: "2026-08-07T00:00:00.000Z",
      }),
      makeContext(),
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("accepte une cible par famille de service", () => {
    const result = evaluatePromoCode(
      makeCode({
        scope_all: false,
        targets: [{ target_type: "events_all", target_id: null }],
      }),
      makeContext({ serviceKind: "event", itemId: "event-1" }),
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("refuse quand la famille de service ne correspond pas", () => {
    const result = evaluatePromoCode(
      makeCode({
        scope_all: false,
        targets: [{ target_type: "events_all", target_id: null }],
      }),
      makeContext({ serviceKind: "formation" }),
    );
    expect(result).toEqual({ ok: false, reason: "not_applicable" });
  });

  it("accepte une cible sur un item precis", () => {
    const result = evaluatePromoCode(
      makeCode({
        scope_all: false,
        targets: [{ target_type: "formation", target_id: "formation-pack" }],
      }),
      makeContext({ itemId: "formation-pack" }),
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("refuse un autre item que celui cible", () => {
    const result = evaluatePromoCode(
      makeCode({
        scope_all: false,
        targets: [{ target_type: "formation", target_id: "formation-pack" }],
      }),
      makeContext({ itemId: "formation-autre" }),
    );
    expect(result).toEqual({ ok: false, reason: "not_applicable" });
  });

  it("cible un service de rendez-vous par son type de consultation", () => {
    const result = evaluatePromoCode(
      makeCode({
        scope_all: false,
        targets: [{ target_type: "booking_service", target_id: "ct-1" }],
      }),
      makeContext({ serviceKind: "booking", itemId: "ct-1" }),
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("refuse sous le montant minimum", () => {
    const result = evaluatePromoCode(
      makeCode({ min_order_cents: 6000 }),
      makeContext({ amountCents: 5900 }),
    );
    expect(result).toEqual({
      ok: false,
      reason: "min_order",
      minOrderCents: 6000,
    });
  });

  it("accepte exactement au montant minimum", () => {
    const result = evaluatePromoCode(
      makeCode({ min_order_cents: 6000 }),
      makeContext({ amountCents: 6000 }),
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("refuse quand le quota global est atteint", () => {
    const result = evaluatePromoCode(
      makeCode({ max_redemptions: 50 }),
      makeContext({ globalRedemptions: 50 }),
    );
    expect(result).toEqual({ ok: false, reason: "exhausted" });
  });

  it("refuse quand la cliente a deja utilise le code", () => {
    const result = evaluatePromoCode(
      makeCode({ max_per_user: 1 }),
      makeContext({ userRedemptions: 1 }),
    );
    expect(result).toEqual({ ok: false, reason: "already_used" });
  });

  it("refuse un code a declencheur sans achat correspondant", () => {
    const result = evaluatePromoCode(
      makeCode({
        trigger_delay_hours: 48,
        triggers: [{ trigger_type: "event_purchase", target_id: null }],
      }),
      makeContext(),
    );
    expect(result).toEqual({ ok: false, reason: "not_applicable" });
  });

  it("refuse un declencheur hors delai", () => {
    const result = evaluatePromoCode(
      makeCode({
        trigger_delay_hours: 48,
        triggers: [{ trigger_type: "event_purchase", target_id: null }],
      }),
      makeContext({
        triggeringPurchases: [
          { kind: "event", itemId: "event-1", purchasedAtMs: NOW - 49 * HOUR },
        ],
      }),
    );
    expect(result).toEqual({ ok: false, reason: "not_applicable" });
  });

  it("accepte un declencheur dans le delai", () => {
    const result = evaluatePromoCode(
      makeCode({
        discount_type: "fixed_cents",
        discount_value: 2000,
        trigger_delay_hours: 48,
        triggers: [{ trigger_type: "event_purchase", target_id: null }],
      }),
      makeContext({
        triggeringPurchases: [
          { kind: "event", itemId: "event-1", purchasedAtMs: NOW - 47 * HOUR },
        ],
      }),
    );
    expect(result).toEqual({ ok: true, discountCents: 2000, finalCents: 8000 });
  });

  it("refuse un declencheur portant sur un autre produit", () => {
    const result = evaluatePromoCode(
      makeCode({
        trigger_delay_hours: 48,
        triggers: [{ trigger_type: "event_purchase", target_id: "event-cible" }],
      }),
      makeContext({
        triggeringPurchases: [
          { kind: "event", itemId: "event-autre", purchasedAtMs: NOW - HOUR },
        ],
      }),
    );
    expect(result).toEqual({ ok: false, reason: "not_applicable" });
  });
});
```

- [ ] **Step 2b: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm test src/lib/promo/evaluate.spec.ts`
Expected: FAIL — `Failed to resolve import "./evaluate"`.

- [ ] **Step 3: Écrire l'implémentation**

Créer `src/lib/promo/evaluate.ts` :

```ts
/**
 * Evaluation d'un code promo contre un contexte d'achat.
 *
 * Fonction pure, sans acces base : tout le risque metier (fenetres, quotas,
 * ciblage, arrondis) se teste ici sans mock. L'appelant fournit les compteurs
 * et l'historique deja charges.
 */

import type {
  PromoCodeWithRules,
  PromoContext,
  PromoEvaluation,
  PromoServiceKind,
} from "./types";

const ALL_TARGET_BY_KIND: Record<PromoServiceKind, string> = {
  formation: "formations_all",
  event: "events_all",
  booking: "bookings_all",
};

const ITEM_TARGET_BY_KIND: Record<PromoServiceKind, string> = {
  formation: "formation",
  event: "event",
  booking: "booking_service",
};

const matchesTarget = (code: PromoCodeWithRules, ctx: PromoContext): boolean => {
  if (code.scope_all) return true;

  return code.targets.some((target) => {
    if (target.target_type === ALL_TARGET_BY_KIND[ctx.serviceKind]) return true;
    return (
      target.target_type === ITEM_TARGET_BY_KIND[ctx.serviceKind] &&
      target.target_id === ctx.itemId
    );
  });
};

const triggerSatisfied = (
  code: PromoCodeWithRules,
  ctx: PromoContext,
): boolean => {
  if (code.triggers.length === 0) return true;

  // Un declencheur sans delai n'aurait pas de borne : on refuse plutot que de
  // rendre le code eternellement valable pour toute cliente ayant achete un
  // jour.
  const delayHours = code.trigger_delay_hours;
  if (delayHours == null) return false;

  const floor = ctx.nowMs - delayHours * 3_600_000;

  return code.triggers.some((trigger) => {
    const kind: PromoServiceKind =
      trigger.trigger_type === "event_purchase" ? "event" : "formation";

    return ctx.triggeringPurchases.some(
      (purchase) =>
        purchase.kind === kind &&
        (trigger.target_id === null || trigger.target_id === purchase.itemId) &&
        purchase.purchasedAtMs >= floor &&
        purchase.purchasedAtMs <= ctx.nowMs,
    );
  });
};

export const evaluatePromoCode = (
  code: PromoCodeWithRules,
  ctx: PromoContext,
): PromoEvaluation => {
  if (!code.is_active) return { ok: false, reason: "not_applicable" };

  if (code.valid_from && ctx.nowMs < Date.parse(code.valid_from)) {
    return { ok: false, reason: "not_applicable" };
  }

  if (code.valid_until && ctx.nowMs > Date.parse(code.valid_until)) {
    return { ok: false, reason: "not_applicable" };
  }

  if (!matchesTarget(code, ctx)) return { ok: false, reason: "not_applicable" };

  if (ctx.amountCents < code.min_order_cents) {
    return {
      ok: false,
      reason: "min_order",
      minOrderCents: code.min_order_cents,
    };
  }

  if (
    code.max_redemptions !== null &&
    ctx.globalRedemptions >= code.max_redemptions
  ) {
    return { ok: false, reason: "exhausted" };
  }

  if (ctx.userRedemptions >= code.max_per_user) {
    return { ok: false, reason: "already_used" };
  }

  if (!triggerSatisfied(code, ctx)) {
    return { ok: false, reason: "not_applicable" };
  }

  const raw =
    code.discount_type === "percent"
      ? Math.round((ctx.amountCents * code.discount_value) / 100)
      : code.discount_value;

  const discountCents = Math.min(raw, ctx.amountCents);

  return {
    ok: true,
    discountCents,
    finalCents: ctx.amountCents - discountCents,
  };
};
```

- [ ] **Step 4: Lancer les tests**

Run: `pnpm test src/lib/promo/evaluate.spec.ts`
Expected: PASS, 21 tests.

- [ ] **Step 5: Écrire les messages destinés à la cliente**

Créer `src/lib/promo/messages.ts` :

```ts
import type { PromoEvaluation } from "./types";

const formatEuros = (cents: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

/**
 * Un code inexistant, desactive, hors fenetre ou hors cible renvoie le meme
 * message : distinguer les cas renseignerait qui teste des codes au hasard sur
 * l'existence et le perimetre de chacun.
 */
export const promoRejectionMessage = (
  result: Extract<PromoEvaluation, { ok: false }>,
): string => {
  switch (result.reason) {
    case "min_order":
      return `Ce code s'applique à partir de ${formatEuros(
        result.minOrderCents ?? 0,
      )} d'achat.`;
    case "exhausted":
      return "Ce code a atteint son nombre maximum d'utilisations.";
    case "already_used":
      return "Vous avez déjà utilisé ce code.";
    default:
      return "Ce code n'est pas valable pour cet achat.";
  }
};
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/promo/
git commit -m "feat(promo): evaluation pure d'un code promo"
```

---

### Task 3: Chargement et réservation

**Files:**
- Create: `src/lib/promo/repository.ts`, `src/lib/promo/reserve.ts`, `src/lib/promo/reserve.spec.ts`
- Test: `src/lib/promo/reserve.spec.ts`

**Interfaces:**
- Consumes: `evaluatePromoCode`, `PromoContext`, `PromoCodeWithRules`, `PromoServiceKind` (Task 2).
- Produces:
  - `loadPromoCode(supabase, code: string): Promise<PromoCodeWithRules | null>`
  - `countRedemptions(supabase, promoCodeId: string, profileId: string | null): Promise<{ global: number; user: number }>`
  - `loadTriggeringPurchases(supabase, profileId: string, sinceMs: number): Promise<PromoPurchase[]>`
  - `resolvePromoForPurchase(input: ResolvePromoInput): Promise<ResolvedPromo>` où
    `ResolvePromoInput = { code: string; serviceKind: PromoServiceKind; itemId: string; amountCents: number; profileId: string | null; reserve: boolean; orderKind?: PaymentType; referenceId?: string }`
    et `ResolvedPromo = { ok: true; promoCodeId: string; code: string; discountCents: number; finalCents: number; redemptionId: string | null } | { ok: false; error: string }`
  - `attachSessionToRedemption(redemptionId: string, sessionId: string): Promise<void>`
  - `confirmRedemption(redemptionId: string, paymentIntentId: string | null): Promise<void>`
  - `cancelRedemption(redemptionId: string): Promise<void>`
  - `PENDING_TTL_HOURS = 24`

- [ ] **Step 1: Écrire le repository**

Créer `src/lib/promo/repository.ts` :

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PromoCodeWithRules, PromoPurchase } from "./types";

/**
 * Duree au-dela de laquelle une reservation non confirmee cesse de peser sur
 * les quotas. Sans cette borne, trois onglets ouverts epuisent un code a quota
 * limite sans qu'aucun paiement n'aboutisse.
 */
export const PENDING_TTL_HOURS = 24;

export const loadPromoCode = async (
  supabase: SupabaseClient,
  code: string,
): Promise<PromoCodeWithRules | null> => {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const { data } = await supabase
    .from("promo_codes")
    .select(
      "*, promo_code_targets(target_type, target_id), promo_code_triggers(trigger_type, target_id)",
    )
    .ilike("code", normalized)
    .maybeSingle();

  if (!data) return null;

  const row = data as PromoCodeWithRules & {
    promo_code_targets: PromoCodeWithRules["targets"];
    promo_code_triggers: PromoCodeWithRules["triggers"];
  };

  return {
    ...row,
    targets: row.promo_code_targets ?? [],
    triggers: row.promo_code_triggers ?? [],
  };
};

export const countRedemptions = async (
  supabase: SupabaseClient,
  promoCodeId: string,
  profileId: string | null,
): Promise<{ global: number; user: number }> => {
  const cutoff = new Date(
    Date.now() - PENDING_TTL_HOURS * 3_600_000,
  ).toISOString();

  // Les reservations recentes comptent au meme titre que les confirmations :
  // le quota doit tenir pendant la traversee du tunnel Stripe.
  const activeFilter = `status.eq.confirmed,and(status.eq.pending,created_at.gte.${cutoff})`;

  const { count: global } = await supabase
    .from("promo_code_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("promo_code_id", promoCodeId)
    .or(activeFilter);

  if (!profileId) return { global: global ?? 0, user: 0 };

  const { count: user } = await supabase
    .from("promo_code_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("promo_code_id", promoCodeId)
    .eq("profile_id", profileId)
    .or(activeFilter);

  return { global: global ?? 0, user: user ?? 0 };
};

export const loadTriggeringPurchases = async (
  supabase: SupabaseClient,
  profileId: string,
  sinceMs: number,
): Promise<PromoPurchase[]> => {
  const { data } = await supabase
    .from("payments")
    .select("type, reference_id, created_at")
    .eq("client_id", profileId)
    .eq("status", "succeeded")
    .in("type", ["event", "formation"])
    .gte("created_at", new Date(sinceMs).toISOString());

  return (data ?? []).map((row) => ({
    kind: row.type as PromoPurchase["kind"],
    itemId: row.reference_id as string,
    purchasedAtMs: Date.parse(row.created_at as string),
  }));
};
```

- [ ] **Step 2: Écrire les tests de réservation qui échouent**

Créer `src/lib/promo/reserve.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { resolvePromoForPurchase } from "./reserve";

/** Chain Supabase minimal, chainable et thenable. */
const createChain = (result: {
  data?: unknown;
  count?: number;
  error?: unknown;
}) => {
  const chain: Record<string, unknown> = {};
  const passthrough = [
    "select",
    "eq",
    "ilike",
    "in",
    "gte",
    "or",
    "insert",
    "update",
  ];
  for (const method of passthrough) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => result);
  chain.single = vi.fn(async () => result);
  chain.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return chain;
};

const activeCode = {
  id: "code-1",
  code: "SUPERMAMAN",
  label: null,
  discount_type: "percent",
  discount_value: 15,
  scope_all: true,
  valid_from: null,
  valid_until: null,
  max_redemptions: null,
  max_per_user: 1,
  min_order_cents: 0,
  trigger_delay_hours: null,
  is_active: true,
  created_by: null,
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
  promo_code_targets: [],
  promo_code_triggers: [],
};

beforeEach(() => {
  mockFrom.mockReset();
});

describe("resolvePromoForPurchase", () => {
  it("renvoie la remise et cree la reservation", async () => {
    mockFrom
      .mockReturnValueOnce(createChain({ data: activeCode })) // promo_codes
      .mockReturnValueOnce(createChain({ count: 0 })) // compteur global
      .mockReturnValueOnce(createChain({ count: 0 })) // compteur cliente
      .mockReturnValueOnce(createChain({ data: { id: "redemption-1" } })); // insert

    const result = await resolvePromoForPurchase({
      code: "supermaman",
      serviceKind: "formation",
      itemId: "formation-1",
      amountCents: 10_000,
      profileId: "profile-1",
      reserve: true,
      orderKind: "formation",
      referenceId: "formation-1",
    });

    expect(result).toEqual({
      ok: true,
      promoCodeId: "code-1",
      code: "SUPERMAMAN",
      discountCents: 1500,
      finalCents: 8500,
      redemptionId: "redemption-1",
    });
  });

  it("ne cree pas de reservation en mode apercu", async () => {
    mockFrom
      .mockReturnValueOnce(createChain({ data: activeCode }))
      .mockReturnValueOnce(createChain({ count: 0 }))
      .mockReturnValueOnce(createChain({ count: 0 }));

    const result = await resolvePromoForPurchase({
      code: "SUPERMAMAN",
      serviceKind: "formation",
      itemId: "formation-1",
      amountCents: 10_000,
      profileId: "profile-1",
      reserve: false,
    });

    expect(result).toMatchObject({ ok: true, redemptionId: null });
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });

  it("refuse un code inconnu avec le message generique", async () => {
    mockFrom.mockReturnValueOnce(createChain({ data: null }));

    const result = await resolvePromoForPurchase({
      code: "INCONNU",
      serviceKind: "formation",
      itemId: "formation-1",
      amountCents: 10_000,
      profileId: "profile-1",
      reserve: false,
    });

    expect(result).toEqual({
      ok: false,
      error: "Ce code n'est pas valable pour cet achat.",
    });
  });

  it("refuse quand la cliente a deja utilise le code", async () => {
    mockFrom
      .mockReturnValueOnce(createChain({ data: activeCode }))
      .mockReturnValueOnce(createChain({ count: 1 }))
      .mockReturnValueOnce(createChain({ count: 1 }));

    const result = await resolvePromoForPurchase({
      code: "SUPERMAMAN",
      serviceKind: "formation",
      itemId: "formation-1",
      amountCents: 10_000,
      profileId: "profile-1",
      reserve: false,
    });

    expect(result).toEqual({
      ok: false,
      error: "Vous avez déjà utilisé ce code.",
    });
  });
});
```

- [ ] **Step 2b: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm test src/lib/promo/reserve.spec.ts`
Expected: FAIL — `Failed to resolve import "./reserve"`.

- [ ] **Step 3: Écrire l'implémentation**

Créer `src/lib/promo/reserve.ts` :

```ts
/**
 * Pont entre l'evaluation pure et la base : charge le code, ses compteurs et
 * l'historique de la cliente, puis pose — ou non — la reservation.
 *
 * La reservation est creee avant la session Stripe (son identifiant n'existe
 * pas encore) et rattachee ensuite par `attachSessionToRedemption`. Le
 * `redemptionId` voyage dans les metadata Stripe : c'est lui que le webhook
 * confirme.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentType } from "@/types/database";
import { evaluatePromoCode } from "./evaluate";
import { promoRejectionMessage } from "./messages";
import {
  countRedemptions,
  loadPromoCode,
  loadTriggeringPurchases,
} from "./repository";
import type { PromoServiceKind } from "./types";

export { PENDING_TTL_HOURS } from "./repository";

const GENERIC_ERROR = "Ce code n'est pas valable pour cet achat.";

/** Fenetre d'historique chargee pour les declencheurs, en heures. */
const MAX_TRIGGER_WINDOW_HOURS = 24 * 30;

export type ResolvePromoInput = {
  code: string;
  serviceKind: PromoServiceKind;
  itemId: string;
  amountCents: number;
  profileId: string | null;
  /** `true` cote achat, `false` pour un simple apercu. */
  reserve: boolean;
  orderKind?: PaymentType;
  referenceId?: string;
};

export type ResolvedPromo =
  | {
      ok: true;
      promoCodeId: string;
      code: string;
      discountCents: number;
      finalCents: number;
      redemptionId: string | null;
    }
  | { ok: false; error: string };

export const resolvePromoForPurchase = async (
  input: ResolvePromoInput,
): Promise<ResolvedPromo> => {
  const supabase = createAdminClient();

  const code = await loadPromoCode(supabase, input.code);
  if (!code) return { ok: false, error: GENERIC_ERROR };

  const counts = await countRedemptions(supabase, code.id, input.profileId);

  const nowMs = Date.now();
  const triggeringPurchases =
    code.triggers.length > 0 && input.profileId
      ? await loadTriggeringPurchases(
          supabase,
          input.profileId,
          nowMs -
            Math.min(
              code.trigger_delay_hours ?? MAX_TRIGGER_WINDOW_HOURS,
              MAX_TRIGGER_WINDOW_HOURS,
            ) *
              3_600_000,
        )
      : [];

  const evaluation = evaluatePromoCode(code, {
    serviceKind: input.serviceKind,
    itemId: input.itemId,
    amountCents: input.amountCents,
    nowMs,
    globalRedemptions: counts.global,
    userRedemptions: counts.user,
    triggeringPurchases,
  });

  if (!evaluation.ok) {
    return { ok: false, error: promoRejectionMessage(evaluation) };
  }

  if (!input.reserve) {
    return {
      ok: true,
      promoCodeId: code.id,
      code: code.code.toUpperCase(),
      discountCents: evaluation.discountCents,
      finalCents: evaluation.finalCents,
      redemptionId: null,
    };
  }

  if (!input.profileId || !input.orderKind || !input.referenceId) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const { data: redemption } = await supabase
    .from("promo_code_redemptions")
    .insert({
      promo_code_id: code.id,
      profile_id: input.profileId,
      order_kind: input.orderKind,
      reference_id: input.referenceId,
      original_amount_cents: input.amountCents,
      discount_cents: evaluation.discountCents,
      final_amount_cents: evaluation.finalCents,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (!redemption) {
    // Sans trace de la reservation, le quota ne serait jamais decompte : on
    // refuse la remise plutot que de l'offrir sans limite.
    return { ok: false, error: GENERIC_ERROR };
  }

  return {
    ok: true,
    promoCodeId: code.id,
    code: code.code.toUpperCase(),
    discountCents: evaluation.discountCents,
    finalCents: evaluation.finalCents,
    redemptionId: redemption.id as string,
  };
};

export const attachSessionToRedemption = async (
  redemptionId: string,
  sessionId: string,
): Promise<void> => {
  await createAdminClient()
    .from("promo_code_redemptions")
    .update({ stripe_session_id: sessionId })
    .eq("id", redemptionId);
};

/**
 * Idempotente : le filtre sur `pending` fait d'une redelivery Stripe une
 * mise a jour sans effet.
 */
export const confirmRedemption = async (
  redemptionId: string,
  paymentIntentId: string | null,
): Promise<void> => {
  await createAdminClient()
    .from("promo_code_redemptions")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("id", redemptionId)
    .eq("status", "pending");
};

export const cancelRedemption = async (redemptionId: string): Promise<void> => {
  await createAdminClient()
    .from("promo_code_redemptions")
    .update({ status: "cancelled" })
    .eq("id", redemptionId)
    .eq("status", "pending");
};
```

- [ ] **Step 4: Lancer les tests**

Run: `pnpm test src/lib/promo/reserve.spec.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/promo/
git commit -m "feat(promo): chargement, comptage et reservation d'un code"
```

---

### Task 4: Server action publique d'aperçu

**Files:**
- Create: `src/app/(public)/promo/actions.ts`
- Modify: `src/lib/rate-limit.ts`

**Interfaces:**
- Consumes: `resolvePromoForPurchase` (Task 3).
- Produces: `previewPromoCode(input: { code: string; serviceKind: PromoServiceKind; itemId: string; amountCents: number }): Promise<ActionResult<{ code: string; discountCents: number; finalCents: number }>>` ; `PROMO_RATE_LIMIT` dans `rate-limit.ts`.

- [ ] **Step 1: Ajouter la configuration de limitation**

Dans `src/lib/rate-limit.ts`, après le bloc `AUTH_RATE_LIMITS` :

```ts
/**
 * Valider un code est un oracle : sans limite, on enumere le catalogue en
 * quelques minutes. Dix essais par tranche de cinq minutes suffisent a une
 * cliente qui recopie son code de travers.
 */
export const PROMO_RATE_LIMIT = {
  prefix: "promo-preview",
  limit: 10,
  windowSeconds: 300,
} as const satisfies RateLimitConfig;
```

- [ ] **Step 2: Écrire la server action**

Créer `src/app/(public)/promo/actions.ts` :

```ts
"use server";

import { getSessionUser } from "@/lib/auth";
import { PROMO_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { resolvePromoForPurchase } from "@/lib/promo/reserve";
import type { PromoServiceKind } from "@/lib/promo/types";
import type { ActionResult } from "@/types";

/**
 * Apercu d'une remise avant paiement. Aucun effet de bord : la reservation est
 * posee plus tard, par l'action d'achat. Le montant renvoye ici est indicatif —
 * il est recalcule cote serveur au moment de creer la session Stripe.
 */
export const previewPromoCode = async (input: {
  code: string;
  serviceKind: PromoServiceKind;
  itemId: string;
  amountCents: number;
}): Promise<
  ActionResult<{ code: string; discountCents: number; finalCents: number }>
> => {
  const limit = await rateLimit(PROMO_RATE_LIMIT);
  if (!limit.success) {
    return {
      success: false,
      error: "Trop d'essais. Réessayez dans quelques minutes.",
    };
  }

  if (!input.code?.trim()) {
    return { success: false, error: "Saisissez un code." };
  }

  const user = await getSessionUser();

  const resolved = await resolvePromoForPurchase({
    code: input.code,
    serviceKind: input.serviceKind,
    itemId: input.itemId,
    amountCents: input.amountCents,
    profileId: user?.id ?? null,
    reserve: false,
  });

  if (!resolved.ok) return { success: false, error: resolved.error };

  return {
    success: true,
    data: {
      code: resolved.code,
      discountCents: resolved.discountCents,
      finalCents: resolved.finalCents,
    },
  };
};
```

- [ ] **Step 3: Vérifier lint et types**

Run: `pnpm lint`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add src/lib/rate-limit.ts "src/app/(public)/promo/actions.ts"
git commit -m "feat(promo): apercu public d'un code, limite en debit"
```

---

### Task 5: Intégration achat d'accompagnement

**Files:**
- Modify: `src/app/(public)/accompagnements/actions.ts`
- Create: `src/app/(public)/accompagnements/actions.spec.ts`

**Interfaces:**
- Consumes: `resolvePromoForPurchase`, `attachSessionToRedemption` (Task 3).
- Produces: `purchaseFormation(formationId: string, promoCode?: string)` — signature élargie, second argument optionnel.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/app/(public)/accompagnements/actions.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom }),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: async () => ({ id: "client-1", email: "cliente@test.fr" }),
}));

const mockCreateCheckoutSession = vi.fn();
vi.mock("@/lib/stripe/connect", () => ({
  createCheckoutSession: (...args: unknown[]) =>
    mockCreateCheckoutSession(...args),
}));

const mockResolvePromo = vi.fn();
const mockAttachSession = vi.fn();
vi.mock("@/lib/promo/reserve", () => ({
  resolvePromoForPurchase: (...args: unknown[]) => mockResolvePromo(...args),
  attachSessionToRedemption: (...args: unknown[]) => mockAttachSession(...args),
}));

vi.mock("@/lib/invoicing/consultant-billing", () => ({
  consultantCanSell: async () => true,
}));

vi.mock("@/lib/stripe/sale-routing", () => ({
  routeSale: () => ({
    holdOnPlatform: false,
    destinationAccountId: "acct_1",
    commissionRate: 20,
  }),
  isPlatformOwnerConsultant: async () => false,
}));

import { purchaseFormation } from "./actions";

const createChain = (result: { data?: unknown; count?: number }) => {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "in"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => result);
  chain.maybeSingle = vi.fn(async () => result);
  chain.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return chain;
};

const formationRow = {
  id: "formation-1",
  title: "Pack",
  short_description: "desc",
  price_cents: 10_000,
  currency: "eur",
  consultant_id: "consultant-1",
  status: "published",
};

beforeEach(() => {
  mockFrom.mockReset();
  mockResolvePromo.mockReset();
  mockAttachSession.mockReset();
  mockCreateCheckoutSession.mockReset();
  mockCreateCheckoutSession.mockResolvedValue({
    id: "cs_test_1",
    url: "https://stripe.test/session",
  });

  mockFrom
    .mockReturnValueOnce(createChain({ data: null })) // inscription existante
    .mockReturnValueOnce(createChain({ data: formationRow })) // formation
    .mockReturnValueOnce(
      createChain({ data: { stripe_account_id: "acct_1", commission_rate: 20 } }),
    ) // consultante
    .mockReturnValueOnce(createChain({ count: 0 })); // collaboratrices
});

describe("purchaseFormation avec code promo", () => {
  it("envoie a Stripe le montant remise et la commission recalculee", async () => {
    mockResolvePromo.mockResolvedValue({
      ok: true,
      promoCodeId: "code-1",
      code: "SUPERMAMAN",
      discountCents: 1500,
      finalCents: 8500,
      redemptionId: "redemption-1",
    });

    const result = await purchaseFormation("formation-1", "supermaman");

    expect(result.success).toBe(true);
    const args = mockCreateCheckoutSession.mock.calls[0][0];
    expect(args.priceInCents).toBe(8500);
    // 20 % de 8500, et non de 10000 : la consultante supporte la remise.
    expect(args.metadata.platform_fee_cents).toBe("1700");
    expect(args.metadata.promo_code).toBe("SUPERMAMAN");
    expect(args.metadata.promo_redemption_id).toBe("redemption-1");
    expect(args.metadata.discount_cents).toBe("1500");
    expect(args.metadata.original_price_cents).toBe("10000");
    expect(mockAttachSession).toHaveBeenCalledWith("redemption-1", "cs_test_1");
  });

  it("refuse l'achat si le code est invalide", async () => {
    mockResolvePromo.mockResolvedValue({
      ok: false,
      error: "Ce code n'est pas valable pour cet achat.",
    });

    const result = await purchaseFormation("formation-1", "INCONNU");

    expect(result).toEqual({
      success: false,
      error: "Ce code n'est pas valable pour cet achat.",
    });
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it("garde le prix plein sans code", async () => {
    const result = await purchaseFormation("formation-1");

    expect(result.success).toBe(true);
    const args = mockCreateCheckoutSession.mock.calls[0][0];
    expect(args.priceInCents).toBe(10_000);
    expect(args.metadata.promo_code).toBeUndefined();
    expect(mockResolvePromo).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test "src/app/(public)/accompagnements/actions.spec.ts"`
Expected: FAIL — `purchaseFormation` ignore le second argument, `priceInCents` vaut 10000.

- [ ] **Step 3: Modifier l'action**

Dans `src/app/(public)/accompagnements/actions.ts` :

Ajouter les imports :

```ts
import {
  attachSessionToRedemption,
  resolvePromoForPurchase,
} from "@/lib/promo/reserve";
```

Élargir la signature (`purchaseFormation(formationId: string)` devient) :

```ts
export const purchaseFormation = async (
  formationId: string,
  promoCode?: string,
): Promise<ActionResult<{ redirect_url: string }>> => {
```

Après le bloc `consultantCanSell` et avant le `try { const session = ...`, insérer :

```ts
  // La remise est resolue cote serveur, jamais transmise par le client : une
  // server action est un endpoint POST, appelable sans passer par l'interface.
  const promo = promoCode?.trim()
    ? await resolvePromoForPurchase({
        code: promoCode,
        serviceKind: "formation",
        itemId: formation.id,
        amountCents: formation.price_cents,
        profileId: user.id,
        reserve: true,
        orderKind: "formation",
        referenceId: formation.id,
      })
    : null;

  if (promo && !promo.ok) {
    return { success: false, error: promo.error };
  }

  const chargedCents = promo?.ok ? promo.finalCents : formation.price_cents;
```

Remplacer dans l'appel à `createCheckoutSession` :

```ts
      priceInCents: chargedCents,
      metadata: {
        type: "formation",
        reference_id: formation.id,
        client_id: user.id,
        consultant_id: formation.consultant_id,
        platform_fee_cents: Math.round(
          chargedCents * (routing.commissionRate / 100),
        ).toString(),
        ...(promo?.ok
          ? {
              promo_code: promo.code,
              promo_code_id: promo.promoCodeId,
              promo_redemption_id: promo.redemptionId as string,
              discount_cents: promo.discountCents.toString(),
              original_price_cents: formation.price_cents.toString(),
            }
          : {}),
      },
```

Juste après `const session = await createCheckoutSession({...})`, avant le `return` :

```ts
    // Rattache la reservation a la session : c'est le lien qui permet de
    // l'annuler si la cliente abandonne le tunnel.
    if (promo?.ok && promo.redemptionId) {
      await attachSessionToRedemption(promo.redemptionId, session.id);
    }
```

- [ ] **Step 4: Lancer les tests**

Run: `pnpm test "src/app/(public)/accompagnements/actions.spec.ts"`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/accompagnements/actions.ts" "src/app/(public)/accompagnements/actions.spec.ts"
git commit -m "feat(promo): code promo a l'achat d'un accompagnement"
```

---

### Task 6: Intégration inscription à un événement

**Files:**
- Modify: `src/app/(public)/formations/actions.ts`
- Create: `src/app/(public)/formations/actions.spec.ts`

**Interfaces:**
- Consumes: `resolvePromoForPurchase`, `attachSessionToRedemption` (Task 3), `confirmRedemption` (Task 3, pour le cas 0 €).
- Produces: `registerForEvent(eventId: string, promoCode?: string)`.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/app/(public)/formations/actions.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom }),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: async () => ({ id: "client-1", email: "cliente@test.fr" }),
}));

const mockCreateCheckoutSession = vi.fn();
vi.mock("@/lib/stripe/connect", () => ({
  createCheckoutSession: (...args: unknown[]) =>
    mockCreateCheckoutSession(...args),
}));

const mockResolvePromo = vi.fn();
const mockAttachSession = vi.fn();
const mockConfirmRedemption = vi.fn();
vi.mock("@/lib/promo/reserve", () => ({
  resolvePromoForPurchase: (...args: unknown[]) => mockResolvePromo(...args),
  attachSessionToRedemption: (...args: unknown[]) => mockAttachSession(...args),
  confirmRedemption: (...args: unknown[]) => mockConfirmRedemption(...args),
}));

vi.mock("@/lib/invoicing/consultant-billing", () => ({
  consultantCanSell: async () => true,
}));

import { registerForEvent } from "./actions";

const createChain = (result: { data?: unknown; count?: number; error?: unknown }) => {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "in", "upsert"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => result);
  chain.maybeSingle = vi.fn(async () => result);
  chain.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return chain;
};

const eventRow = {
  id: "event-1",
  title: "Webinaire",
  description: "desc",
  price_cents: 5000,
  currency: "eur",
  consultant_id: "consultant-1",
  is_published: true,
  max_participants: null,
  slug: "webinaire",
};

beforeEach(() => {
  mockFrom.mockReset();
  mockResolvePromo.mockReset();
  mockAttachSession.mockReset();
  mockConfirmRedemption.mockReset();
  mockCreateCheckoutSession.mockReset();
  mockCreateCheckoutSession.mockResolvedValue({
    id: "cs_test_2",
    url: "https://stripe.test/session",
  });
});

describe("registerForEvent avec code promo", () => {
  it("applique la remise et recalcule la commission", async () => {
    mockFrom
      .mockReturnValueOnce(createChain({ data: null })) // inscription existante
      .mockReturnValueOnce(createChain({ data: eventRow })) // event
      .mockReturnValueOnce(
        createChain({ data: { stripe_account_id: "acct_1", commission_rate: 20 } }),
      );

    mockResolvePromo.mockResolvedValue({
      ok: true,
      promoCodeId: "code-1",
      code: "ALLAITEMENT15",
      discountCents: 750,
      finalCents: 4250,
      redemptionId: "redemption-2",
    });

    const result = await registerForEvent("event-1", "allaitement15");

    expect(result.success).toBe(true);
    const args = mockCreateCheckoutSession.mock.calls[0][0];
    expect(args.priceInCents).toBe(4250);
    expect(args.metadata.platform_fee_cents).toBe("850");
    expect(args.metadata.promo_redemption_id).toBe("redemption-2");
    expect(mockAttachSession).toHaveBeenCalledWith("redemption-2", "cs_test_2");
  });

  it("inscrit directement et confirme la reservation quand la remise ramene a zero", async () => {
    mockFrom
      .mockReturnValueOnce(createChain({ data: null }))
      .mockReturnValueOnce(createChain({ data: eventRow }))
      .mockReturnValueOnce(
        createChain({ data: { stripe_account_id: "acct_1", commission_rate: 20 } }),
      )
      .mockReturnValueOnce(createChain({ error: null })); // upsert inscription

    mockResolvePromo.mockResolvedValue({
      ok: true,
      promoCodeId: "code-1",
      code: "MILKPOWER",
      discountCents: 5000,
      finalCents: 0,
      redemptionId: "redemption-3",
    });

    const result = await registerForEvent("event-1", "milkpower");

    expect(result.success).toBe(true);
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
    expect(mockConfirmRedemption).toHaveBeenCalledWith("redemption-3", null);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test "src/app/(public)/formations/actions.spec.ts"`
Expected: FAIL — le code promo est ignoré.

- [ ] **Step 3: Modifier l'action**

Dans `src/app/(public)/formations/actions.ts` :

```ts
import {
  attachSessionToRedemption,
  confirmRedemption,
  resolvePromoForPurchase,
} from "@/lib/promo/reserve";
```

Signature :

```ts
export const registerForEvent = async (
  eventId: string,
  promoCode?: string,
): Promise<ActionResult<{ redirect_url?: string }>> => {
```

Après le bloc `consultantCanSell` (donc après le chemin « événement gratuit » existant, qui reste inchangé) :

```ts
  const promo = promoCode?.trim()
    ? await resolvePromoForPurchase({
        code: promoCode,
        serviceKind: "event",
        itemId: event.id,
        amountCents: event.price_cents,
        profileId: user.id,
        reserve: true,
        orderKind: "event",
        referenceId: event.id,
      })
    : null;

  if (promo && !promo.ok) {
    return { success: false, error: promo.error };
  }

  const chargedCents = promo?.ok ? promo.finalCents : event.price_cents;

  // Remise totale : Stripe refuse une session a zero, et il n'y a rien a
  // encaisser. Meme traitement que l'evenement gratuit, plus haut.
  if (chargedCents === 0) {
    const { error } = await supabase.from("event_registrations").upsert(
      {
        client_id: user.id,
        event_id: eventId,
        stripe_payment_intent_id: null,
        status: "registered",
      },
      { onConflict: "event_id,client_id" },
    );

    if (error) {
      console.error("Registration error (remise totale):", error);
      return { success: false, error: "Erreur lors de l'inscription" };
    }

    if (promo?.ok && promo.redemptionId) {
      await confirmRedemption(promo.redemptionId, null);
    }

    return { success: true };
  }
```

Dans l'appel `createCheckoutSession`, remplacer `priceInCents` et `metadata` par :

```ts
      priceInCents: chargedCents,
      metadata: {
        type: "event",
        reference_id: event.id,
        client_id: user.id,
        consultant_id: event.consultant_id,
        platform_fee_cents: Math.round(
          chargedCents * (consultant.commission_rate / 100),
        ).toString(),
        ...(promo?.ok
          ? {
              promo_code: promo.code,
              promo_code_id: promo.promoCodeId,
              promo_redemption_id: promo.redemptionId as string,
              discount_cents: promo.discountCents.toString(),
              original_price_cents: event.price_cents.toString(),
            }
          : {}),
      },
```

Après la création de la session :

```ts
    if (promo?.ok && promo.redemptionId) {
      await attachSessionToRedemption(promo.redemptionId, session.id);
    }
```

- [ ] **Step 4: Lancer les tests**

Run: `pnpm test "src/app/(public)/formations/actions.spec.ts"`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/formations/actions.ts" "src/app/(public)/formations/actions.spec.ts"
git commit -m "feat(promo): code promo a l'inscription a un evenement"
```

---

### Task 7: Intégration réservation de rendez-vous

**Files:**
- Modify: `src/app/(public)/reserver/actions.ts`, `src/app/(public)/reserver/actions.spec.ts`

**Interfaces:**
- Consumes: `resolvePromoForPurchase`, `attachSessionToRedemption` (Task 3).
- Produces: `BookingFormData.promo_code?: string`.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à la fin de `src/app/(public)/reserver/actions.spec.ts`, et compléter le bloc de mocks en tête du fichier avec :

```ts
const mockResolvePromo = vi.fn();
const mockAttachSession = vi.fn();

vi.mock("@/lib/promo/reserve", () => ({
  resolvePromoForPurchase: (...args: unknown[]) => mockResolvePromo(...args),
  attachSessionToRedemption: (...args: unknown[]) => mockAttachSession(...args),
}));
```

Puis le nouveau bloc de tests (adapter `baseFormData` au helper déjà présent dans le fichier — le champ `promo_code` s'ajoute au reste) :

```ts
describe("createBooking avec code promo", () => {
  it("remise le montant envoye a Stripe et recalcule la commission", async () => {
    mockResolvePromo.mockResolvedValue({
      ok: true,
      promoCodeId: "code-1",
      code: "VILLAGE",
      discountCents: 1000,
      finalCents: 4000,
      redemptionId: "redemption-4",
    });

    await createBooking({ ...baseFormData, promo_code: "village" });

    const args = mockCreateCheckoutSession.mock.calls[0][0];
    expect(args.priceInCents).toBe(4000);
    expect(args.metadata.promo_redemption_id).toBe("redemption-4");
    expect(args.metadata.original_price_cents).toBe("5000");
  });

  it("refuse la reservation quand le code est invalide", async () => {
    mockResolvePromo.mockResolvedValue({
      ok: false,
      error: "Ce code n'est pas valable pour cet achat.",
    });

    const result = await createBooking({
      ...baseFormData,
      promo_code: "INCONNU",
    });

    expect(result).toEqual({
      success: false,
      error: "Ce code n'est pas valable pour cet achat.",
    });
  });

  it("ignore le code sur un paiement sur place", async () => {
    await createBooking({
      ...baseFormData,
      payment_method: "on_site",
      location: "cabinet",
      promo_code: "VILLAGE",
    });

    expect(mockResolvePromo).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test "src/app/(public)/reserver/actions.spec.ts"`
Expected: FAIL sur les nouveaux cas — le montant reste 5000.

- [ ] **Step 3: Modifier l'action**

Dans `src/app/(public)/reserver/actions.ts` :

Import :

```ts
import {
  attachSessionToRedemption,
  resolvePromoForPurchase,
} from "@/lib/promo/reserve";
```

Champ ajouté au type `BookingFormData`, après `withdrawal_waiver_accepted` :

```ts
  /**
   * Code promo saisi a l'etape paiement. Ignore hors paiement en ligne : un
   * reglement sur place ne passe pas par la plateforme.
   */
  promo_code?: string;
```

Dans le bloc `if (formData.payment_method === "online") {`, après le contrôle `consultantCanSell` et avant `const bookingId = crypto.randomUUID();`, déplacer d'abord la génération de l'identifiant puis résoudre le code :

```ts
    const bookingId = crypto.randomUUID();

    const promo = formData.promo_code?.trim()
      ? await resolvePromoForPurchase({
          code: formData.promo_code,
          serviceKind: "booking",
          itemId: formData.consultation_type_id,
          amountCents: totalPriceCents,
          profileId: clientId,
          reserve: true,
          orderKind: "booking",
          referenceId: bookingId,
        })
      : null;

    if (promo && !promo.ok) {
      return { success: false, error: promo.error };
    }

    const chargedCents = promo?.ok ? promo.finalCents : totalPriceCents;
```

(supprimer l'ancienne ligne `const bookingId = crypto.randomUUID();` restée plus bas)

Dans l'appel `createCheckoutSession` :

```ts
        priceInCents: chargedCents,
```

et dans `metadata`, remplacer `platform_fee_cents` puis ajouter les champs promo :

```ts
          platform_fee_cents: Math.round(
            chargedCents * (routing.commissionRate / 100),
          ).toString(),
          ...(promo?.ok
            ? {
                promo_code: promo.code,
                promo_code_id: promo.promoCodeId,
                promo_redemption_id: promo.redemptionId as string,
                discount_cents: promo.discountCents.toString(),
                original_price_cents: totalPriceCents.toString(),
              }
            : {}),
```

Après la création de la session :

```ts
      if (promo?.ok && promo.redemptionId) {
        await attachSessionToRedemption(promo.redemptionId, session.id);
      }
```

- [ ] **Step 4: Vérifier le prix enregistré sur la réservation**

Le webhook crée la réservation à partir des metadata. Ouvrir `handleBookingConfirmation` dans `src/lib/stripe/webhooks.ts` et vérifier d'où vient le `price_cents` du booking inséré : il doit valoir le montant **payé** (`session.amount_total`), pas le prix catalogue. S'il est recalculé ou lu depuis une autre metadata, le remplacer par `session.amount_total ?? 0`.

Run: `pnpm test src/lib/stripe/webhooks.spec.ts`
Expected: PASS — aucune régression sur les cas existants.

- [ ] **Step 5: Lancer les tests de réservation**

Run: `pnpm test "src/app/(public)/reserver/actions.spec.ts"`
Expected: PASS, y compris les 3 nouveaux cas.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(public)/reserver/actions.ts" "src/app/(public)/reserver/actions.spec.ts" src/lib/stripe/webhooks.ts
git commit -m "feat(promo): code promo a la reservation d'un rendez-vous"
```

---

### Task 8: Webhook — confirmation, annulation, report sur le paiement

**Files:**
- Modify: `src/lib/stripe/webhooks.ts`, `src/lib/stripe/webhooks.spec.ts`, `src/app/api/webhooks/stripe/route.ts`

**Interfaces:**
- Consumes: `confirmRedemption`, `cancelRedemption` (Task 3) ; metadata `promo_redemption_id`, `promo_code_id`, `discount_cents`, `original_price_cents` (Tasks 5-7).
- Produces: `handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void>`.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter dans `src/lib/stripe/webhooks.spec.ts` (le fichier mocke déjà Supabase et Stripe ; réutiliser ses helpers) :

```ts
vi.mock("@/lib/promo/reserve", () => ({
  confirmRedemption: (...args: unknown[]) => mockConfirmRedemption(...args),
  cancelRedemption: (...args: unknown[]) => mockCancelRedemption(...args),
}));

const mockConfirmRedemption = vi.fn();
const mockCancelRedemption = vi.fn();

describe("codes promo", () => {
  it("confirme la reservation et reporte la remise sur le paiement", async () => {
    await handleCheckoutCompleted({
      id: "cs_test_1",
      amount_total: 8500,
      currency: "eur",
      payment_intent: "pi_1",
      metadata: {
        type: "formation",
        reference_id: "formation-1",
        client_id: "client-1",
        consultant_id: "consultant-1",
        platform_fee_cents: "1700",
        promo_code: "SUPERMAMAN",
        promo_code_id: "code-1",
        promo_redemption_id: "redemption-1",
        discount_cents: "1500",
        original_price_cents: "10000",
      },
    } as unknown as Stripe.Checkout.Session);

    expect(mockConfirmRedemption).toHaveBeenCalledWith("redemption-1", "pi_1");

    const payment = upsertCalls.find((call) => call.table === "payments");
    expect(payment?.data).toMatchObject({
      amount_cents: 8500,
      promo_code_id: "code-1",
      discount_cents: 1500,
      original_amount_cents: 10_000,
    });
  });

  it("annule la reservation quand la session expire", async () => {
    await handleCheckoutExpired({
      id: "cs_test_1",
      metadata: { promo_redemption_id: "redemption-1" },
    } as unknown as Stripe.Checkout.Session);

    expect(mockCancelRedemption).toHaveBeenCalledWith("redemption-1");
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm test src/lib/stripe/webhooks.spec.ts`
Expected: FAIL — `handleCheckoutExpired` n'existe pas.

- [ ] **Step 3: Modifier le handler**

Dans `src/lib/stripe/webhooks.ts` :

```ts
import { cancelRedemption, confirmRedemption } from "@/lib/promo/reserve";
```

Dans `handleCheckoutCompleted`, juste avant l'upsert `payments` :

```ts
  // Confirmee avant l'ecriture du paiement : c'est la remise deja appliquee
  // par Stripe qu'on enterine, pas une remise a decider ici.
  const redemptionId = metadata.promo_redemption_id;
  if (redemptionId && !slotConflict) {
    await confirmRedemption(redemptionId, paymentIntentId ?? null);
  }

  // Creneau vendu deux fois : la vente n'a pas lieu, le code doit rester
  // utilisable.
  if (redemptionId && slotConflict) {
    await cancelRedemption(redemptionId);
  }
```

Et compléter l'objet upserté :

```ts
        status: slotConflict ? "refunded" : "succeeded",
        promo_code_id: metadata.promo_code_id ?? null,
        discount_cents: metadata.discount_cents
          ? parseInt(metadata.discount_cents)
          : null,
        original_amount_cents: metadata.original_price_cents
          ? parseInt(metadata.original_price_cents)
          : null,
```

Ajouter en fin de fichier :

```ts
/**
 * Session abandonnee : la reservation posee avant le paiement doit etre
 * liberee, sinon un code a quota limite s'epuise sur des tunnels jamais
 * termines.
 */
export const handleCheckoutExpired = async (
  session: Stripe.Checkout.Session,
) => {
  const redemptionId = session.metadata?.promo_redemption_id;
  if (redemptionId) await cancelRedemption(redemptionId);
};
```

- [ ] **Step 4: Brancher l'événement**

Dans `src/app/api/webhooks/stripe/route.ts`, ajouter `handleCheckoutExpired` à l'import depuis `@/lib/stripe/webhooks`, puis le case :

```ts
      case "checkout.session.expired":
        await handleCheckoutExpired(
          event.data.object as import("stripe").Stripe.Checkout.Session
        );
        break;
```

- [ ] **Step 5: Lancer les tests**

Run: `pnpm test src/lib/stripe/webhooks.spec.ts`
Expected: PASS.

- [ ] **Step 6: Activer l'événement côté Stripe**

Dans le dashboard Stripe (mode test **et** mode live), ajouter `checkout.session.expired` aux événements écoutés par l'endpoint webhook de la plateforme. Sans cela, les réservations abandonnées ne sont jamais libérées avant l'expiration du TTL de 24 h.

- [ ] **Step 7: Commit**

```bash
git add src/lib/stripe/webhooks.ts src/lib/stripe/webhooks.spec.ts src/app/api/webhooks/stripe/route.ts
git commit -m "feat(promo): confirmation et liberation des reservations au webhook"
```

---

### Task 9: Remise sur la facture

**Files:**
- Modify: `src/lib/invoicing/build-invoice.ts`, `src/lib/invoicing/build-invoice.spec.ts`, `src/lib/invoicing/emit.ts`, `src/lib/invoicing/invoice-view.ts`, `src/lib/invoicing/invoice-view.spec.ts`, `src/lib/invoicing/invoice-pdf.tsx`

**Interfaces:**
- Consumes: colonnes `payments.discount_cents`, `payments.original_amount_cents`, `payments.promo_code_id` (Task 1) ; colonnes `invoices.promo_code`, `invoices.discount_cents`, `invoices.gross_amount_ttc_cents` (Task 1).
- Produces: `BuildInvoiceInput.promoCode?: string | null`, `.discountCents?: number | null`, `.grossTtcCents?: number | null` ; `InvoiceContent.promo_code`, `.discount_cents`, `.gross_amount_ttc_cents` ; `InvoiceView.discount?: { label: string; gross: string; amount: string }`.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/lib/invoicing/build-invoice.spec.ts` :

```ts
  it("reporte la remise dans le contenu de la facture", () => {
    const content = buildInvoiceContent({
      ...baseInput,
      ttcCents: 8500,
      promoCode: "SUPERMAMAN",
      discountCents: 1500,
      grossTtcCents: 10_000,
    });

    expect(content).toMatchObject({
      amount_ttc_cents: 8500,
      promo_code: "SUPERMAMAN",
      discount_cents: 1500,
      gross_amount_ttc_cents: 10_000,
    });
  });

  it("laisse les champs de remise nuls sans code", () => {
    const content = buildInvoiceContent({ ...baseInput, ttcCents: 10_000 });

    expect(content).toMatchObject({
      promo_code: null,
      discount_cents: null,
      gross_amount_ttc_cents: null,
    });
  });
```

Dans `src/lib/invoicing/invoice-view.spec.ts` — `formatMoneyCents` rend 10 000 centimes en `"100,00 €"` et 1500 centimes en `"15,00 €"` :

```ts
  it("expose la ligne de remise quand la facture en porte une", () => {
    const view = buildInvoiceView({
      ...baseRecord,
      amount_ttc_cents: 8500,
      promo_code: "SUPERMAMAN",
      discount_cents: 1500,
      gross_amount_ttc_cents: 10_000,
    });

    expect(view.discount).toEqual({
      label: "Remise SUPERMAMAN",
      gross: "100,00 €",
      amount: "-15,00 €",
    });
  });

  it("n'expose pas de ligne de remise sans code", () => {
    const view = buildInvoiceView(baseRecord);
    expect(view.discount).toBeUndefined();
  });
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm test src/lib/invoicing`
Expected: FAIL — propriétés `promo_code` / `discount` inconnues.

- [ ] **Step 3: Modifier `build-invoice.ts`**

Ajouter à `BuildInvoiceInput` :

```ts
  /** Remise appliquee a la vente, s'il y en a une. */
  promoCode?: string | null;
  discountCents?: number | null;
  /** Montant TTC avant remise. */
  grossTtcCents?: number | null;
```

Ajouter à `InvoiceContent` :

```ts
  promo_code: string | null;
  discount_cents: number | null;
  gross_amount_ttc_cents: number | null;
```

Et dans l'objet retourné par `buildInvoiceContent`, avant `status` :

```ts
    // La TVA se calcule sur le TTC reellement encaisse : la remise n'apparait
    // que comme information, elle ne modifie pas la decomposition.
    promo_code: input.promoCode ?? null,
    discount_cents: input.discountCents ?? null,
    gross_amount_ttc_cents: input.grossTtcCents ?? null,
```

- [ ] **Step 4: Modifier `emit.ts`**

Élargir le `select` du paiement :

```ts
      .select(
        "id, client_id, consultant_id, amount_cents, currency, type, reference_id, status, discount_cents, original_amount_cents, promo_code_id",
      )
```

Charger le libellé du code (nul si le paiement n'en porte pas), après la lecture du client :

```ts
    // Le libelle du code est fige dans la facture : renommer un code plus tard
    // ne doit pas reecrire une facture emise.
    let promoCode: string | null = null;
    if (payment.promo_code_id) {
      const { data: promo } = await supabase
        .from("promo_codes")
        .select("code")
        .eq("id", payment.promo_code_id)
        .maybeSingle();
      promoCode = (promo?.code as string | undefined) ?? null;
    }
```

Et passer les trois champs à `buildInvoiceContent` :

```ts
      promoCode,
      discountCents: payment.discount_cents ?? null,
      grossTtcCents: payment.original_amount_cents ?? null,
```

- [ ] **Step 5: Modifier `invoice-view.ts`**

Ajouter à `InvoiceRecord` :

```ts
  promo_code?: string | null;
  discount_cents?: number | null;
  gross_amount_ttc_cents?: number | null;
```

Ajouter à `InvoiceView` :

```ts
  /** Ligne de remise, absente si la vente s'est faite au prix plein. */
  discount?: { label: string; gross: string; amount: string };
```

Et dans `buildInvoiceView`, ajouter au retour :

```ts
  ...(record.promo_code && record.discount_cents
    ? {
        discount: {
          label: `Remise ${record.promo_code}`,
          gross: formatMoneyCents(
            record.gross_amount_ttc_cents ??
              record.amount_ttc_cents + record.discount_cents,
            record.currency,
          ),
          amount: `-${formatMoneyCents(record.discount_cents, record.currency)}`,
        },
      }
    : {}),
```

- [ ] **Step 6: Modifier le PDF**

Dans `src/lib/invoicing/invoice-pdf.tsx`, dans le bloc des totaux, insérer avant la ligne HT :

```tsx
      {view.discount && (
        <>
          <div className="flex justify-between">
            <span>Sous-total</span>
            <span>{view.discount.gross}</span>
          </div>
          <div className="flex justify-between">
            <span>{view.discount.label}</span>
            <span>{view.discount.amount}</span>
          </div>
        </>
      )}
```

Adapter les classes utilitaires à celles déjà employées dans le fichier pour les lignes de total.

- [ ] **Step 7: Lancer les tests**

Run: `pnpm test src/lib/invoicing`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/invoicing/
git commit -m "feat(promo): ligne de remise sur la facture"
```

---

### Task 10: Champ de saisie côté cliente

**Files:**
- Create: `src/components/promo/promo-code-field.tsx`
- Modify: `src/app/(public)/accompagnements/_components/purchase-button.tsx`, `src/app/(public)/formations/[slug]/register-button.tsx`, `src/app/(public)/reserver/_components/step-payment.tsx`, `src/app/(public)/reserver/page.tsx`

**Interfaces:**
- Consumes: `previewPromoCode` (Task 4) ; `purchaseFormation(id, promoCode?)` (Task 5) ; `registerForEvent(id, promoCode?)` (Task 6) ; `BookingFormData.promo_code` (Task 7).
- Produces: composant `<PromoCodeField serviceKind itemId amountCents currency onApplied />` où `onApplied: (applied: { code: string; discountCents: number; finalCents: number } | null) => void`.

- [ ] **Step 1: Écrire le composant**

Créer `src/components/promo/promo-code-field.tsx` :

```tsx
"use client";

import { useState, useTransition } from "react";
import { Loader2, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { previewPromoCode } from "@/app/(public)/promo/actions";
import type { PromoServiceKind } from "@/lib/promo/types";

export type AppliedPromo = {
  code: string;
  discountCents: number;
  finalCents: number;
};

type PromoCodeFieldProps = {
  serviceKind: PromoServiceKind;
  /** formation.id, event.id ou consultation_type_id. */
  itemId: string;
  amountCents: number;
  currency: string;
  onApplied: (applied: AppliedPromo | null) => void;
};

const formatPrice = (cents: number, currency: string): string =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    cents / 100,
  );

export const PromoCodeField = ({
  serviceKind,
  itemId,
  amountCents,
  currency,
  onApplied,
}: PromoCodeFieldProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const [applied, setApplied] = useState<AppliedPromo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleApply = () => {
    setError(null);
    startTransition(async () => {
      const result = await previewPromoCode({
        code: value,
        serviceKind,
        itemId,
        amountCents,
      });

      if (!result.success || !result.data) {
        setApplied(null);
        onApplied(null);
        setError(result.error ?? "Ce code n'est pas valable pour cet achat.");
        return;
      }

      setApplied(result.data);
      onApplied(result.data);
    });
  };

  const handleRemove = () => {
    setApplied(null);
    setValue("");
    setError(null);
    onApplied(null);
  };

  if (applied) {
    return (
      <div
        data-testid="promo-applied"
        className="space-y-1 rounded-lg border border-primary-green/20 bg-primary-green/5 p-3 text-sm"
      >
        <div className="flex items-center justify-between text-primary-green/70">
          <span>Prix initial</span>
          <span>{formatPrice(amountCents, currency)}</span>
        </div>
        <div className="flex items-center justify-between text-primary-green">
          <span>Remise {applied.code}</span>
          <span>-{formatPrice(applied.discountCents, currency)}</span>
        </div>
        <div className="flex items-center justify-between font-semibold text-primary-green">
          <span>Total</span>
          <span data-testid="promo-total">
            {formatPrice(applied.finalCents, currency)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          data-testid="promo-remove"
          tabIndex={0}
          aria-label="Retirer le code promo"
          className="cursor-pointer inline-flex items-center gap-1 pt-1 text-xs text-primary-green/60 underline"
        >
          <X className="h-3 w-3" />
          Retirer le code
        </button>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        data-testid="promo-open"
        tabIndex={0}
        aria-label="Saisir un code promo"
        className="cursor-pointer inline-flex items-center gap-1 text-sm text-primary-green/70 underline"
      >
        <Tag className="h-3.5 w-3.5" />
        J&apos;ai un code promo
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value.toUpperCase())}
          placeholder="VOTRECODE"
          data-testid="promo-input"
          aria-label="Code promo"
          className="uppercase"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleApply}
          disabled={isPending || !value.trim()}
          data-testid="promo-apply"
          tabIndex={0}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Appliquer"}
        </Button>
      </div>
      {error && (
        <p role="alert" data-testid="promo-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Brancher sur l'achat d'accompagnement**

Dans `src/app/(public)/accompagnements/_components/purchase-button.tsx` :

- ajouter les props `priceCents: number` et `currency: string` au type et à la déstructuration ;
- `import { PromoCodeField, type AppliedPromo } from "@/components/promo/promo-code-field";` ;
- `const [promo, setPromo] = useState<AppliedPromo | null>(null);` ;
- dans `handlePurchase`, appeler `purchaseFormation(formationId, promo?.code)` ;
- insérer au-dessus du `<Button>` du rendu final :

```tsx
      <PromoCodeField
        serviceKind="formation"
        itemId={formationId}
        amountCents={priceCents}
        currency={currency}
        onApplied={setPromo}
      />
```

Puis passer `priceCents` et `currency` depuis les appelants du composant. Les trouver avec :

Run: `grep -rn "<PurchaseButton" src`

- [ ] **Step 3: Brancher sur l'inscription à un événement**

Même traitement dans `src/app/(public)/formations/[slug]/register-button.tsx` : props `priceCents` / `currency` (si absentes), état `promo`, appel `registerForEvent(eventId, promo?.code)`, et le champ rendu au-dessus du bouton avec `serviceKind="event"` et `itemId={eventId}`.

- [ ] **Step 4: Brancher sur la réservation**

Dans `src/app/(public)/reserver/_components/step-payment.tsx` :

- ajouter aux props `consultationTypeId: string` et `onPromoApplied: (promo: AppliedPromo | null) => void` ;
- afficher le champ sous le montant total, uniquement quand `selected === "online"` — un règlement sur place n'est pas remisable :

```tsx
    {selected === "online" && (
      <PromoCodeField
        serviceKind="booking"
        itemId={consultationTypeId}
        amountCents={priceCents}
        currency={currency}
        onApplied={onPromoApplied}
      />
    )}
```

Dans `src/app/(public)/reserver/page.tsx` : stocker le code appliqué dans l'état du tunnel, le remettre à `null` à tout changement de créneau ou de durée (le montant change, la remise doit être recalculée), et le passer à `createBooking` via `promo_code`.

- [ ] **Step 5: Vérifier lint et build**

Run: `pnpm lint && pnpm build`
Expected: succès.

- [ ] **Step 6: Vérifier à la main**

Run: `pnpm dev`
Ouvrir `/accompagnements/pack-mon-allaitement-sur-mesure`, cliquer « J'ai un code promo », saisir un code inexistant → message générique ; le test avec un vrai code se fera après la Task 12 (seed).

- [ ] **Step 7: Commit**

```bash
git add src/components/promo/ "src/app/(public)/accompagnements/_components/purchase-button.tsx" "src/app/(public)/formations/[slug]/register-button.tsx" "src/app/(public)/reserver/"
git commit -m "feat(promo): champ de saisie du code sur les trois tunnels"
```

---

### Task 11: Back-office

**Files:**
- Create: `src/validations/promo-codes.ts`, `src/app/(dashboard)/admin/marketing/codes-promo/page.tsx`, `src/app/(dashboard)/admin/marketing/codes-promo/actions.ts`, `src/app/(dashboard)/admin/marketing/codes-promo/actions.spec.ts`, `src/app/(dashboard)/admin/marketing/codes-promo/_components/promo-code-form.tsx`, `src/app/(dashboard)/admin/marketing/codes-promo/nouveau/page.tsx`, `src/app/(dashboard)/admin/marketing/codes-promo/[id]/page.tsx`
- Modify: `src/app/(dashboard)/admin/marketing/page.tsx`

**Interfaces:**
- Consumes: tables de la Task 1.
- Produces:
  - `promoCodeSchema` / `PromoCodeInput` (Zod v4)
  - `createPromoCode(data: unknown): Promise<ActionResult<{ id: string }>>`
  - `updatePromoCode(id: string, data: unknown): Promise<ActionResult<{ id: string }>>`
  - `togglePromoCode(id: string, isActive: boolean): Promise<ActionResult<null>>`
  - `listPromoCodes(): Promise<PromoCodeListRow[]>` avec `PromoCodeListRow = PromoCode & { redemptions: number; revenue_cents: number; discount_total_cents: number }`
  - `getPromoCodeStats(id: string): Promise<{ redemptions: number; revenueCents: number; discountCents: number; byItem: { label: string; count: number }[] }>`

- [ ] **Step 1: Écrire le schéma de validation**

Créer `src/validations/promo-codes.ts` :

```ts
import { z } from "zod/v4";

const targetSchema = z.object({
  target_type: z.enum([
    "formations_all",
    "events_all",
    "bookings_all",
    "formation",
    "event",
    "booking_service",
  ]),
  target_id: z.string().uuid().nullable(),
});

const triggerSchema = z.object({
  trigger_type: z.enum(["event_purchase", "formation_purchase"]),
  target_id: z.string().uuid().nullable(),
});

export const promoCodeSchema = z
  .object({
    code: z
      .string()
      .min(3, "Le code doit contenir au moins 3 caractères")
      .regex(
        /^[A-Z0-9]+$/,
        "Le code ne peut contenir que des majuscules et des chiffres",
      ),
    label: z.string().optional().nullable(),
    discount_type: z.enum(["percent", "fixed_cents"]),
    discount_value: z.number().int().positive("La remise doit être positive"),
    scope_all: z.boolean().default(true),
    targets: z.array(targetSchema).default([]),
    triggers: z.array(triggerSchema).default([]),
    valid_from: z.string().optional().nullable(),
    valid_until: z.string().optional().nullable(),
    max_redemptions: z.number().int().positive().optional().nullable(),
    max_per_user: z.number().int().positive().default(1),
    min_order_cents: z.number().int().min(0).default(0),
    trigger_delay_hours: z.number().int().positive().optional().nullable(),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => data.discount_type !== "percent" || data.discount_value <= 100,
    {
      message: "Une remise en pourcentage ne peut pas dépasser 100",
      path: ["discount_value"],
    },
  )
  .refine((data) => data.scope_all || data.targets.length > 0, {
    message: "Sélectionnez au moins une cible ou cochez « tout le catalogue »",
    path: ["targets"],
  })
  .refine(
    (data) => data.triggers.length === 0 || data.trigger_delay_hours != null,
    {
      message: "Un déclencheur exige un délai en heures",
      path: ["trigger_delay_hours"],
    },
  )
  .refine(
    (data) =>
      !data.valid_from ||
      !data.valid_until ||
      new Date(data.valid_from) < new Date(data.valid_until),
    {
      message: "La fin de validité doit être après le début",
      path: ["valid_until"],
    },
  );

export type PromoCodeInput = z.infer<typeof promoCodeSchema>;
```

- [ ] **Step 2: Écrire les tests du CRUD qui échouent**

Créer `src/app/(dashboard)/admin/marketing/codes-promo/actions.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const insertCalls: { table: string; data: unknown }[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: async () => ({ id: "admin-1", roles: ["admin"] }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { createPromoCode } from "./actions";

const createChain = (table: string, result: { data?: unknown; error?: unknown }) => {
  const chain: Record<string, unknown> = {};
  chain.insert = vi.fn((data: unknown) => {
    insertCalls.push({ table, data });
    return chain;
  });
  for (const method of ["select", "eq", "update", "delete"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => result);
  chain.maybeSingle = vi.fn(async () => result);
  chain.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return chain;
};

const baseInput = {
  code: "SERENITE",
  discount_type: "percent" as const,
  discount_value: 15,
  scope_all: false,
  targets: [
    { target_type: "formation" as const, target_id: "11111111-1111-1111-1111-111111111111" },
  ],
  triggers: [],
  max_per_user: 1,
  min_order_cents: 0,
  is_active: true,
};

beforeEach(() => {
  mockFrom.mockReset();
  insertCalls.length = 0;
});

describe("createPromoCode", () => {
  it("cree le code et ses cibles", async () => {
    mockFrom
      .mockReturnValueOnce(createChain("promo_codes", { data: { id: "code-1" } }))
      .mockReturnValueOnce(createChain("promo_code_targets", { error: null }));

    const result = await createPromoCode(baseInput);

    expect(result).toEqual({ success: true, data: { id: "code-1" } });
    expect(insertCalls[1]).toEqual({
      table: "promo_code_targets",
      data: [
        {
          promo_code_id: "code-1",
          target_type: "formation",
          target_id: "11111111-1111-1111-1111-111111111111",
        },
      ],
    });
  });

  it("refuse une remise en pourcentage superieure a cent", async () => {
    const result = await createPromoCode({ ...baseInput, discount_value: 150 });

    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("refuse un ciblage vide sans scope_all", async () => {
    const result = await createPromoCode({ ...baseInput, targets: [] });

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2b: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm test "src/app/(dashboard)/admin/marketing/codes-promo/actions.spec.ts"`
Expected: FAIL — module `./actions` introuvable.

- [ ] **Step 3: Écrire les actions**

Créer `src/app/(dashboard)/admin/marketing/codes-promo/actions.ts` :

```ts
"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { promoCodeSchema } from "@/validations/promo-codes";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";
import type { PromoCode } from "@/types/database";

const ROUTE = "/admin/marketing/codes-promo";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

export type PromoCodeListRow = PromoCode & {
  redemptions: number;
  revenue_cents: number;
  discount_total_cents: number;
};

export const createPromoCode = async (
  data: unknown,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const parsed = promoCodeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  const { data: created, error } = await supabase
    .from("promo_codes")
    .insert({
      code: input.code.toUpperCase(),
      label: input.label ?? null,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      scope_all: input.scope_all,
      valid_from: input.valid_from ?? null,
      valid_until: input.valid_until ?? null,
      max_redemptions: input.max_redemptions ?? null,
      max_per_user: input.max_per_user,
      min_order_cents: input.min_order_cents,
      trigger_delay_hours: input.trigger_delay_hours ?? null,
      is_active: input.is_active,
    })
    .select("id")
    .single();

  if (error || !created) {
    // 23505 : l'index unique sur upper(code) a mordu.
    const duplicate =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: string }).code === "23505"
        : false;
    return {
      success: false,
      error: duplicate
        ? "Ce code existe déjà."
        : "La création du code a échoué.",
    };
  }

  const codeId = created.id as string;

  if (!input.scope_all && input.targets.length > 0) {
    await supabase.from("promo_code_targets").insert(
      input.targets.map((target) => ({
        promo_code_id: codeId,
        target_type: target.target_type,
        target_id: target.target_id,
      })),
    );
  }

  if (input.triggers.length > 0) {
    await supabase.from("promo_code_triggers").insert(
      input.triggers.map((trigger) => ({
        promo_code_id: codeId,
        trigger_type: trigger.trigger_type,
        target_id: trigger.target_id,
      })),
    );
  }

  revalidatePath(ROUTE);
  return { success: true, data: { id: codeId } };
};

export const updatePromoCode = async (
  id: string,
  data: unknown,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const parsed = promoCodeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("promo_codes")
    .update({
      code: input.code.toUpperCase(),
      label: input.label ?? null,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      scope_all: input.scope_all,
      valid_from: input.valid_from ?? null,
      valid_until: input.valid_until ?? null,
      max_redemptions: input.max_redemptions ?? null,
      max_per_user: input.max_per_user,
      min_order_cents: input.min_order_cents,
      trigger_delay_hours: input.trigger_delay_hours ?? null,
      is_active: input.is_active,
    })
    .eq("id", id);

  if (error) return { success: false, error: "La mise à jour a échoué." };

  // Cibles et declencheurs sont remplaces en bloc : plus simple qu'un diff, et
  // sans consequence — ces lignes ne portent aucun historique.
  await supabase.from("promo_code_targets").delete().eq("promo_code_id", id);
  await supabase.from("promo_code_triggers").delete().eq("promo_code_id", id);

  if (!input.scope_all && input.targets.length > 0) {
    await supabase.from("promo_code_targets").insert(
      input.targets.map((target) => ({
        promo_code_id: id,
        target_type: target.target_type,
        target_id: target.target_id,
      })),
    );
  }

  if (input.triggers.length > 0) {
    await supabase.from("promo_code_triggers").insert(
      input.triggers.map((trigger) => ({
        promo_code_id: id,
        trigger_type: trigger.trigger_type,
        target_id: trigger.target_id,
      })),
    );
  }

  revalidatePath(ROUTE);
  return { success: true, data: { id } };
};

export const togglePromoCode = async (
  id: string,
  isActive: boolean,
): Promise<ActionResult<null>> => {
  await requireAdmin();
  const { error } = await createAdminClient()
    .from("promo_codes")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { success: false, error: "Le changement d'état a échoué." };

  revalidatePath(ROUTE);
  return { success: true, data: null };
};

export const listPromoCodes = async (): Promise<PromoCodeListRow[]> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: codes } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: redemptions } = await supabase
    .from("promo_code_redemptions")
    .select("promo_code_id, discount_cents, final_amount_cents")
    .eq("status", "confirmed");

  const totals = new Map<
    string,
    { count: number; revenue: number; discount: number }
  >();

  for (const row of redemptions ?? []) {
    const key = row.promo_code_id as string;
    const current = totals.get(key) ?? { count: 0, revenue: 0, discount: 0 };
    current.count += 1;
    current.revenue += (row.final_amount_cents as number) ?? 0;
    current.discount += (row.discount_cents as number) ?? 0;
    totals.set(key, current);
  }

  return (codes ?? []).map((code) => {
    const stats = totals.get(code.id as string);
    return {
      ...(code as PromoCode),
      redemptions: stats?.count ?? 0,
      revenue_cents: stats?.revenue ?? 0,
      discount_total_cents: stats?.discount ?? 0,
    };
  });
};

export const getPromoCodeStats = async (
  id: string,
): Promise<{
  redemptions: number;
  revenueCents: number;
  discountCents: number;
  byItem: { label: string; count: number }[];
}> => {
  await requireAdmin();

  const { data } = await createAdminClient()
    .from("promo_code_redemptions")
    .select("order_kind, reference_id, discount_cents, final_amount_cents")
    .eq("promo_code_id", id)
    .eq("status", "confirmed");

  const rows = data ?? [];
  const byItem = new Map<string, number>();

  for (const row of rows) {
    const key = `${row.order_kind}:${row.reference_id}`;
    byItem.set(key, (byItem.get(key) ?? 0) + 1);
  }

  return {
    redemptions: rows.length,
    revenueCents: rows.reduce(
      (sum, row) => sum + ((row.final_amount_cents as number) ?? 0),
      0,
    ),
    discountCents: rows.reduce(
      (sum, row) => sum + ((row.discount_cents as number) ?? 0),
      0,
    ),
    byItem: [...byItem.entries()].map(([label, count]) => ({ label, count })),
  };
};
```

- [ ] **Step 4: Lancer les tests**

Run: `pnpm test "src/app/(dashboard)/admin/marketing/codes-promo/actions.spec.ts"`
Expected: PASS, 3 tests.

- [ ] **Step 5: Écrire la page liste**

Créer `src/app/(dashboard)/admin/marketing/codes-promo/page.tsx` : composant serveur qui appelle `listPromoCodes()` et rend un `<Table>` (`@/components/ui/table`) avec les colonnes **Code**, **Remise** (`15 %` ou `30,00 €`), **Cible** (« Tout le catalogue » si `scope_all`, sinon le nombre de cibles), **Utilisations** (`redemptions` / `max_redemptions ?? "∞"`), **Fenêtre** (dates formatées `fr-FR`, « — » si nulles), **État** (`<Badge>` Actif/Inactif), et un lien « Modifier » vers `[id]`. Un bouton « Nouveau code » pointe vers `nouveau`. Suivre la mise en page de `src/app/(dashboard)/admin/evenements/page.tsx`.

- [ ] **Step 6: Écrire le formulaire**

Créer `_components/promo-code-form.tsx`, composant client recevant `initial?: PromoCodeListRow & { targets, triggers }`, `formations: { id, title }[]`, `events: { id, title }[]`, `consultationTypes: { id, title }[]`. Il gère :

- code, label, type et valeur de remise (`Input` + `Select`) ;
- `scope_all` en `Switch` ; quand il est à `false`, une section « Cibles » avec un `Select` de type et, pour les types spécifiques, un second `Select` de l'item correspondant, plus un bouton « Ajouter une cible » et la liste des cibles ajoutées ;
- fenêtre de validité (deux `Input type="datetime-local"`), quotas, montant minimum (saisi en euros, converti en centimes à la soumission) ;
- section « Déclencheur » optionnelle : type + item + délai en heures ;
- `is_active` en `Switch` ;
- soumission vers `createPromoCode` ou `updatePromoCode`, affichage de `result.error` dans un `<p role="alert">`, redirection vers la liste en cas de succès.

Les pages `nouveau/page.tsx` et `[id]/page.tsx` sont des composants serveur qui chargent les listes d'items (`formations`, `events`, `consultation_types` publiés) et, pour l'édition, le code avec ses cibles et déclencheurs, puis rendent le formulaire. `[id]/page.tsx` affiche en plus le bloc statistiques issu de `getPromoCodeStats`.

- [ ] **Step 7: Ajouter l'entrée dans la section marketing**

Dans `src/app/(dashboard)/admin/marketing/page.tsx`, ajouter une carte « Codes promo » pointant vers `/admin/marketing/codes-promo`, alignée sur les cartes existantes (campagnes, newsletter, templates).

- [ ] **Step 8: Vérifier lint et build**

Run: `pnpm lint && pnpm build`
Expected: succès.

- [ ] **Step 9: Commit**

```bash
git add src/validations/promo-codes.ts "src/app/(dashboard)/admin/marketing/"
git commit -m "feat(promo): back-office de gestion des codes promo"
```

---

### Task 12: Seed des onze codes

**Files:**
- Create: `supabase/migrations/00066_promo_codes_seed.sql`

**Interfaces:**
- Consumes: tables de la Task 1.
- Produces: les onze codes de production.

- [ ] **Step 1: Écrire la migration de seed**

Créer `supabase/migrations/00066_promo_codes_seed.sql` :

```sql
-- Codes promo initiaux (aout 2026).
--
-- Idempotent : relancable sans creer de doublon, l'index unique porte sur
-- upper(code). Les valeurs restent modifiables depuis le back-office.

INSERT INTO promo_codes
  (code, label, discount_type, discount_value, scope_all,
   min_order_cents, max_per_user, is_active)
VALUES
  ('SUPERMAMAN', NULL, 'percent', 15, true, 0, 1, true),
  ('SAUVEZMESNUITS', NULL, 'percent', 15, true, 0, 1, true),
  ('DECOUVERTE', NULL, 'percent', 15, true, 0, 1, true),
  ('HAPPYMOM', NULL, 'percent', 15, true, 0, 1, true),
  ('CAROLE15', NULL, 'percent', 15, true, 0, 1, true),
  -- Remise fixe : sans plancher de commande, elle viderait la marge d'un
  -- petit produit.
  ('MILKPOWER', NULL, 'fixed_cents', 3000, true, 6000, 1, true),
  ('VILLAGE', 'Reseau partenaire (sage-femme, doula)',
   'percent', 20, true, 0, 1, true),
  -- Offre flash : la fenetre de 24 h se fixe a l'activation, depuis l'admin.
  ('FLASH24', 'Offre flash 24 h — definir la fenetre avant activation',
   'percent', 30, true, 0, 1, false)
ON CONFLICT DO NOTHING;

-- ALLAITEMENT15 : toutes les formations (table events).
INSERT INTO promo_codes
  (code, label, discount_type, discount_value, scope_all, max_per_user, is_active)
VALUES ('ALLAITEMENT15', 'Toutes les formations', 'percent', 15, false, 1, true)
ON CONFLICT DO NOTHING;

INSERT INTO promo_code_targets (promo_code_id, target_type, target_id)
SELECT id, 'events_all', NULL FROM promo_codes WHERE code = 'ALLAITEMENT15'
  AND NOT EXISTS (
    SELECT 1 FROM promo_code_targets t
    WHERE t.promo_code_id = promo_codes.id AND t.target_type = 'events_all'
  );

-- SERENITE : le pack complet. Cible resolue par slug, pour ne pas figer un
-- UUID qui differe entre les environnements.
INSERT INTO promo_codes
  (code, label, discount_type, discount_value, scope_all, max_per_user, is_active)
VALUES ('SERENITE', 'Pack complet', 'percent', 15, false, 1, true)
ON CONFLICT DO NOTHING;

INSERT INTO promo_code_targets (promo_code_id, target_type, target_id)
SELECT c.id, 'formation', f.id
FROM promo_codes c
CROSS JOIN formations f
WHERE c.code = 'SERENITE'
  AND f.slug = 'pack-mon-allaitement-sur-mesure'
  AND NOT EXISTS (
    SELECT 1 FROM promo_code_targets t
    WHERE t.promo_code_id = c.id AND t.target_id = f.id
  );

-- PREMIERSJOURS : -20 EUR pendant les 48 h qui suivent l'achat de n'importe
-- quel evenement.
INSERT INTO promo_codes
  (code, label, discount_type, discount_value, scope_all,
   trigger_delay_hours, max_per_user, is_active)
VALUES ('PREMIERSJOURS', 'Valable 48 h apres l''achat d''un evenement',
        'fixed_cents', 2000, true, 48, 1, true)
ON CONFLICT DO NOTHING;

INSERT INTO promo_code_triggers (promo_code_id, trigger_type, target_id)
SELECT id, 'event_purchase', NULL FROM promo_codes WHERE code = 'PREMIERSJOURS'
  AND NOT EXISTS (
    SELECT 1 FROM promo_code_triggers t
    WHERE t.promo_code_id = promo_codes.id
      AND t.trigger_type = 'event_purchase'
  );
```

- [ ] **Step 2: Appliquer**

Run: `pnpm db:push`
Expected: `Finished supabase db push.`

- [ ] **Step 3: Vérifier le contenu**

Ouvrir `/admin/marketing/codes-promo` : onze codes listés, FLASH24 inactif, ALLAITEMENT15 ciblé sur les formations, SERENITE ciblé sur un item.

Si SERENITE apparaît sans cible, c'est que l'accompagnement `pack-mon-allaitement-sur-mesure` n'existe pas dans cet environnement : le créer, puis rejouer le bloc `INSERT INTO promo_code_targets` de SERENITE.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00066_promo_codes_seed.sql
git commit -m "feat(promo): seed des onze codes initiaux"
```

---

### Task 13: Remboursement et vérification de bout en bout

**Files:**
- Modify: `src/lib/stripe/refund.spec.ts`

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: aucune interface nouvelle.

- [ ] **Step 1: Écrire le test de remboursement**

Ajouter dans `src/lib/stripe/refund.spec.ts` un cas qui vérifie qu'un remboursement total part du montant encaissé et non du prix catalogue :

```ts
  it("rembourse le montant paye apres remise, pas le prix catalogue", async () => {
    // Vente a 100 EUR remisee a 85 EUR : la charge Stripe vaut 8500.
    mockRetrievePaymentIntent.mockResolvedValue({
      id: "pi_1",
      latest_charge: "ch_1",
    });
    mockRetrieveCharge.mockResolvedValue({
      id: "ch_1",
      amount: 8500,
      transfer: null,
      application_fee: null,
    });
    mockCreateRefund.mockResolvedValue({ id: "re_1", amount: 8500 });

    await createRefund("pi_1");

    expect(mockCreateRefund).toHaveBeenCalledWith({ payment_intent: "pi_1" });
  });
```

Adapter les noms des mocks à ceux déjà présents dans le fichier.

- [ ] **Step 2: Lancer la suite complète**

Run: `pnpm test`
Expected: PASS sur l'ensemble.

- [ ] **Step 3: Lint et build**

Run: `pnpm lint && pnpm build`
Expected: succès.

- [ ] **Step 4: Vérification manuelle en Stripe test**

Avec `pnpm dev` et le webhook Stripe en écoute locale :

1. Acheter un accompagnement avec `SUPERMAMAN` → Stripe affiche 85 % du prix ; après paiement, la redemption est `confirmed`, le `payment` porte `discount_cents = 1500`, et la facture reçue montre la ligne « Remise SUPERMAMAN ».
2. Réappliquer `SUPERMAMAN` avec le même compte → « Vous avez déjà utilisé ce code. »
3. Ouvrir un tunnel avec un code puis abandonner → après `checkout.session.expired`, la redemption passe à `cancelled` et le code redevient utilisable.
4. Appliquer `ALLAITEMENT15` sur un accompagnement → message générique de refus ; sur une formation → remise appliquée.
5. Rembourser la vente remisée depuis `/admin/paiements` → le montant remboursé vaut le montant payé.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stripe/refund.spec.ts
git commit -m "test(promo): remboursement sur le montant reellement encaisse"
```

---

## Self-Review

**Couverture de la spec :**

| Exigence | Tâche |
|---|---|
| Schéma (4 tables, enums, RLS) | 1 |
| Colonnes `payments` / `invoices` | 1 |
| Évaluation pure et ordre des règles | 2 |
| Messages génériques | 2 |
| Cycle `pending` → `confirmed` / `cancelled`, TTL 24 h | 3, 8 |
| Quotas comptant les pending récentes | 3 |
| Aperçu rate-limité | 4 |
| Trois tunnels d'achat, commission sur montant remisé | 5, 6, 7 |
| Cas 0 € sans Stripe | 6 |
| Rendez-vous invités via `profile_id` | 7 |
| Webhook, idempotence, expiration | 8 |
| Facture : ligne remise | 9 |
| Champ de saisie partagé sur trois flux | 10 |
| Back-office CRUD + stats | 11 |
| Seed des onze codes | 12 |
| Remboursement sur montant payé | 13 |

**Écart assumé par rapport à la spec :** la spec décrivait `stripe_session_id` comme lien d'idempotence de la redemption. L'identifiant de session n'existant pas avant la création de la session, la réservation est posée d'abord et rattachée ensuite ; l'idempotence repose sur `promo_redemption_id` transmis en metadata et sur le filtre `status = 'pending'` de `confirmRedemption`. La colonne unique reste, renseignée après coup.

**Contrainte ajoutée :** les codes ne s'appliquent qu'au paiement en ligne (un règlement sur place ne passe pas par la plateforme).
