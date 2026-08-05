# Sondages intégrés aux articles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'admin de créer des sondages, de les insérer dans un article de blog (bloc formulaire et/ou bloc résultats), d'afficher les résultats agrégés en direct, et de proposer une inscription newsletter segmentée après soumission.

**Architecture :** Les sondages vivent en base (`surveys`, `survey_questions`, `survey_responses`) et sont administrés depuis `/admin/sondages`. L'article de blog reste stocké en HTML (`blog_posts.body_html`) ; un nœud Tiptap atomique sérialise un marqueur `<div data-survey-embed …></div>` que la page publique découpe en segments pour monter un composant client à la place — sans quoi aucun widget ne pourrait s'hydrater (`dangerouslySetInnerHTML` ne monte pas de React). Les agrégats sont calculés en SQL (vues) et servis par une route API appelée côté client à chaque visite, donc jamais figés par le cache de la page d'article.

**Tech Stack :** Next.js 16 App Router, React 19, Supabase (Postgres, migrations SQL numérotées), Tiptap/novel, Recharts 3, Zod v4, Vitest (environnement `node`), Brevo (API REST maison dans `src/lib/brevo/client.ts`).

## Global Constraints

- Migrations : un seul fichier par tâche, numérotation continue à partir de `supabase/migrations/00061_`. Commentaires en français, expliquant le *pourquoi* (voir `00058_newsletter.sql` comme modèle de ton).
- Aucune nouvelle dépendance npm dans ce plan. Recharts, Zod, Supabase, Resend sont déjà installés.
- Vitest tourne en environnement `node` sans jsdom ni Testing Library : **tous les tests de ce plan portent sur des fonctions pures** (agrégation, validation, découpage HTML, calcul de résultat). Les composants React ne sont pas testés unitairement ici.
- Accès base : `createAdminClient()` depuis `@/lib/supabase/admin` dans du code `"server-only"`. Aucune policy RLS publique n'est créée — les tables restent en RLS activée sans policy, comme `newsletter_subscribers`, et tout passe par des routes serveur.
- Validation : `zod/v4` (`import { z } from "zod/v4"`), schémas dans `src/validations/`.
- Server Actions d'admin : `"use server"`, garde `requireAdmin()` copiée du modèle de `src/app/(dashboard)/admin/blog/actions.ts`, retour `ActionResult<T>` depuis `@/types`.
- Palette imposée pour les segments du graphique, dans cet ordre : `#1a4040`, `#dcb9a5`, `#c1334d`, `#bf172b`.
- Seuil d'affichage par ligne : **10 réponses minimum**, sinon message « Pas encore assez de données pour cette tranche ».
- Le widget public n'expose que des agrégats — jamais une réponse individuelle, jamais un email.
- Texte de consentement affiché et stocké verbatim au moment de la soumission (preuve RGPD), même logique que `NEWSLETTER_CONSENT_TEXT`.

---

## File Structure

**Créés :**
- `supabase/migrations/00061_sondages.sql` — tables, vues d'agrégat, RLS.
- `supabase/migrations/00062_sondage_reveils_nocturnes.sql` — seed du sondage de Carole.
- `src/config/surveys.ts` — constantes partagées (couleurs, seuil, texte de consentement, source newsletter).
- `src/validations/surveys.ts` — schémas Zod : définition (admin) et soumission (public).
- `src/lib/surveys/types.ts` — types métier partagés client/serveur.
- `src/lib/surveys/aggregate.ts` — **pur** : transforme les lignes d'agrégat en séries de graphique.
- `src/lib/surveys/personal-result.ts` — **pur** : phrase de résultat personnalisé.
- `src/lib/surveys/embeds.ts` — **pur** : découpage du HTML d'article en segments HTML / embeds.
- `src/lib/surveys/queries.ts` — lectures serveur (définition, agrégats).
- `src/lib/surveys/submit.ts` — écriture d'une réponse + branchement newsletter.
- `src/lib/surveys/csv.ts` — **pur** : sérialisation CSV des réponses.
- `src/app/api/surveys/[slug]/route.ts` — GET : définition + agrégats publics.
- `src/app/api/surveys/[slug]/responses/route.ts` — POST : soumission.
- `src/components/surveys/survey-chart.tsx` — histogramme empilé 100 % + compteur.
- `src/components/surveys/survey-form.tsx` — formulaire (matrices, email optionnel, consentement).
- `src/components/surveys/survey-embed.tsx` — client component, fetch + refresh, aiguille form/chart.
- `src/components/editor/survey-embed-node.tsx` — nœud Tiptap + NodeView de sélection.
- `src/components/blog/article-body.tsx` — rendu d'article mêlant HTML et embeds.
- `src/app/(dashboard)/admin/sondages/page.tsx`, `actions.ts`, `_components/survey-form-builder.tsx`, `[id]/page.tsx`, `[id]/reponses/page.tsx`.
- `src/app/api/admin/sondages/route.ts` — liste des sondages pour le sélecteur de l'éditeur.
- `src/app/api/admin/sondages/[id]/export/route.ts` — export CSV.
- Tests : `src/lib/surveys/aggregate.spec.ts`, `personal-result.spec.ts`, `embeds.spec.ts`, `csv.spec.ts`, `src/validations/surveys.spec.ts`.

**Modifiés :**
- `src/components/editor/wysiwyg-editor.tsx` — enregistrer le nœud + entrée du menu slash.
- `src/app/(public)/blog/[slug]/page.tsx:218` — remplacer `dangerouslySetInnerHTML` par `<ArticleBody />`.
- `src/config/newsletter.ts` — ajouter la source `sondage`.
- `src/lib/newsletter/subscribe.ts` — accepter des attributs Brevo supplémentaires (segment).
- `src/types/database.ts` — types des nouvelles tables.

---

### Task 1: Schéma de données des sondages

**Files:**
- Create: `supabase/migrations/00061_sondages.sql`
- Modify: `src/types/database.ts`
- Create: `src/lib/surveys/types.ts`
- Create: `src/config/surveys.ts`

**Interfaces:**
- Consumes: rien.
- Produces: tables `surveys`, `survey_questions`, `survey_responses` ; vues `survey_answer_counts`, `survey_response_counts` ; types `SurveyDefinition`, `SurveyQuestion`, `SurveyChoice`, `SurveyAnswers`, `AnswerCountRow` ; constantes `SURVEY_SEGMENT_COLORS`, `SURVEY_MIN_RESPONSES_PER_ROW`, `SURVEY_CONSENT_TEXT`.

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/00061_sondages.sql` :

```sql
-- Sondages publics integres aux articles de blog.
--
-- Le premier besoin est un sondage precis (les reveils nocturnes), mais la
-- demande est de pouvoir en creer d'autres depuis l'administration sans
-- redeploiement. Les questions vivent donc en base, pas dans un fichier de
-- configuration.
--
-- Les reponses, elles, restent en JSONB : leur forme depend entierement de la
-- definition du sondage, et une table par cellule cochee multiplierait les
-- lignes par neuf sans rien apporter — l'agregat est fait par une vue qui
-- deplie ce JSONB.

CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  intro TEXT,
  -- « draft » : invisible du public. « published » : repond et affiche.
  -- « closed » : le graphique reste visible, le formulaire n'accepte plus rien.
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed')),
  -- Message affiche sur la page de remerciement, sous le resultat personnalise.
  thank_you_message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surveys_slug ON surveys (slug);

CREATE TABLE IF NOT EXISTS survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,

  -- « matrix » : une ligne par item, un choix unique par ligne (question 1).
  -- « single » : une seule ligne implicite, un choix unique (question bonus).
  kind TEXT NOT NULL CHECK (kind IN ('matrix', 'single')),
  label TEXT NOT NULL,

  -- [{ "key": "0-2-mois", "label": "0-2 mois" }, …]. Pour « single », une seule
  -- ligne de cle « _ » est posee a l'ecriture : la forme des reponses reste
  -- ainsi identique pour les deux types, et la vue d'agregat n'a qu'un cas.
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{ "key": "aucun", "label": "pas de reveils" }, …]. L'ordre porte le sens :
  -- il commande la couleur du segment dans le graphique.
  choices JSONB NOT NULL DEFAULT '[]'::jsonb,

  is_required BOOLEAN NOT NULL DEFAULT false,

  -- La question qui identifie le repondant pour la segmentation emailing.
  -- Indispensable : la question matricielle fait repondre le parent sur les
  -- neuf tranches d'age, pas sur celle de son bebe — elle ne dit donc pas a
  -- quel segment il appartient. Une question « single » dediee le dit.
  is_segment BOOLEAN NOT NULL DEFAULT false,

  -- La question portee par le graphique public. Une seule par sondage.
  is_charted BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_questions_survey
  ON survey_questions (survey_id, position);

CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,

  -- { "<question_id>": { "<row_key>": "<choice_key>" } }
  answers JSONB NOT NULL,

  -- Cle de choix de la question marquee `is_segment`, recopiee ici pour eviter
  -- de fouiller le JSONB a chaque export ou filtre d'administration.
  segment_key TEXT,

  email TEXT,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  -- Texte de la case tel qu'affiche au moment de la soumission. Meme raison que
  -- pour la newsletter : une formulation qui evolue ne doit pas rendre les
  -- consentements passes improuvables.
  consent_text TEXT,
  consented_at TIMESTAMPTZ,

  -- Page depuis laquelle le sondage a ete rempli (« /blog/mon-article »), pour
  -- savoir quel article convertit.
  source_path TEXT,

  -- Jamais l'adresse en clair : elle ne sert qu'a reperer un envoi massif.
  ip_hash TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_created
  ON survey_responses (survey_id, created_at DESC);

-- ─── Agregats ───────────────────────────────────────────────
--
-- Calcules en base et non cote client : a plusieurs milliers de reponses,
-- rapatrier les lignes brutes dans le navigateur couterait cher et exposerait
-- des donnees individuelles que le widget public n'a pas a connaitre.

CREATE OR REPLACE VIEW survey_answer_counts AS
SELECT
  r.survey_id,
  q.question_id::uuid AS question_id,
  a.row_key,
  a.choice_key,
  count(*)::bigint AS responses
FROM survey_responses r
CROSS JOIN LATERAL jsonb_each(r.answers) AS q(question_id, row_map)
CROSS JOIN LATERAL jsonb_each_text(q.row_map) AS a(row_key, choice_key)
GROUP BY 1, 2, 3, 4;

CREATE OR REPLACE VIEW survey_response_counts AS
SELECT survey_id, count(*)::bigint AS total_responses
FROM survey_responses
GROUP BY survey_id;

-- Aucune policy : comme pour la newsletter, ces lignes ne sont lues que par le
-- service role via des routes serveur. La cle anon est publique par nature —
-- sans RLS elle lirait le fichier d'adresses email des repondants.
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER surveys_updated_at BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 2: Appliquer la migration en dry-run puis pour de vrai**

Run: `pnpm db:push:dry`
Expected: le fichier `00061_sondages.sql` est listé comme à appliquer, sans erreur de syntaxe.

Run: `pnpm db:push`
Expected: `Finished supabase db push.`

- [ ] **Step 3: Écrire les types métier**

Créer `src/lib/surveys/types.ts` :

```ts
export type SurveyStatus = "draft" | "published" | "closed";
export type SurveyQuestionKind = "matrix" | "single";

/** Clé technique stable + libellé affiché. La clé ne change jamais : elle est
 *  stockée dans les réponses déjà collectées. */
export type SurveyChoice = { key: string; label: string };

export type SurveyQuestion = {
  id: string;
  position: number;
  kind: SurveyQuestionKind;
  label: string;
  rows: SurveyChoice[];
  choices: SurveyChoice[];
  is_required: boolean;
  is_segment: boolean;
  is_charted: boolean;
};

export type SurveyDefinition = {
  id: string;
  slug: string;
  title: string;
  intro: string | null;
  status: SurveyStatus;
  thank_you_message: string;
  questions: SurveyQuestion[];
};

/** `{ [questionId]: { [rowKey]: choiceKey } }`. Les questions `single`
 *  utilisent la ligne unique de clé `SINGLE_ROW_KEY`. */
export type SurveyAnswers = Record<string, Record<string, string>>;

export type AnswerCountRow = {
  question_id: string;
  row_key: string;
  choice_key: string;
  responses: number;
};

/** Ce que la route publique renvoie, et tout ce dont le graphique a besoin. */
export type SurveyPublicPayload = {
  survey: SurveyDefinition;
  counts: AnswerCountRow[];
  totalResponses: number;
};
```

- [ ] **Step 4: Écrire les constantes partagées**

Créer `src/config/surveys.ts` :

```ts
/** Clé de ligne des questions à choix unique : elles n'ont qu'une ligne, mais
 *  la porter explicitement garde une seule forme de réponse en base. */
export const SINGLE_ROW_KEY = "_";

/**
 * Palette des segments empilés, dans l'ordre des choix de la question.
 * Progression vert → marron clair → rose moyen → rose soutenu : elle se lit
 * comme une échelle d'intensité sans avoir à lire la légende.
 */
export const SURVEY_SEGMENT_COLORS = [
  "#1a4040",
  "#dcb9a5",
  "#c1334d",
  "#bf172b",
] as const;

/**
 * En dessous de dix réponses, un pourcentage ment : trois parents suffiraient
 * à afficher une barre à 100 %. La tranche affiche alors un message plutôt
 * qu'un chiffre.
 */
export const SURVEY_MIN_RESPONSES_PER_ROW = 10;

/** Recopié tel quel dans chaque réponse : preuve du consentement recueilli. */
export const SURVEY_CONSENT_TEXT =
  "J'accepte de recevoir par email les contenus et offres de Carole Hervé. " +
  "Je peux me désinscrire à tout moment.";

/** Intervalle de rafraîchissement du widget, en millisecondes. Assez lent pour
 *  ne pas marteler la base depuis un article très lu, assez rapide pour que le
 *  graphique paraisse vivant. */
export const SURVEY_REFRESH_INTERVAL_MS = 90_000;
```

- [ ] **Step 5: Déclarer les tables dans les types de base**

Dans `src/types/database.ts`, ajouter à la suite des types existants :

```ts
export type SurveyRow = {
  id: string;
  slug: string;
  title: string;
  intro: string | null;
  status: "draft" | "published" | "closed";
  thank_you_message: string;
  created_at: string;
  updated_at: string;
};

export type SurveyQuestionRow = {
  id: string;
  survey_id: string;
  position: number;
  kind: "matrix" | "single";
  label: string;
  rows: { key: string; label: string }[];
  choices: { key: string; label: string }[];
  is_required: boolean;
  is_segment: boolean;
  is_charted: boolean;
  created_at: string;
};

export type SurveyResponseRow = {
  id: string;
  survey_id: string;
  answers: Record<string, Record<string, string>>;
  segment_key: string | null;
  email: string | null;
  marketing_consent: boolean;
  consent_text: string | null;
  consented_at: string | null;
  source_path: string | null;
  ip_hash: string | null;
  created_at: string;
};
```

- [ ] **Step 6: Vérifier la compilation**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/00061_sondages.sql src/lib/surveys/types.ts src/config/surveys.ts src/types/database.ts
git commit -m "feat(sondages): schema, vues d'agregat et types"
```

---

### Task 2: Agrégation et résultat personnalisé (fonctions pures)

**Files:**
- Create: `src/lib/surveys/aggregate.ts`
- Create: `src/lib/surveys/aggregate.spec.ts`
- Create: `src/lib/surveys/personal-result.ts`
- Create: `src/lib/surveys/personal-result.spec.ts`

**Interfaces:**
- Consumes: `SurveyQuestion`, `AnswerCountRow`, `SurveyAnswers` (Task 1) ; `SURVEY_MIN_RESPONSES_PER_ROW`, `SINGLE_ROW_KEY`.
- Produces:
  - `buildChartRows(question: SurveyQuestion, counts: AnswerCountRow[], minResponses?: number): ChartRow[]` avec `type ChartRow = { rowKey: string; label: string; total: number; hasEnoughData: boolean; percentages: Record<string, number> }`.
  - `computePersonalResult(question: SurveyQuestion, answers: SurveyAnswers, counts: AnswerCountRow[], segmentRowKey: string): PersonalResult | null` avec `type PersonalResult = { rowLabel: string; choiceLabel: string; percentage: number; sampleSize: number }`.

- [ ] **Step 1: Écrire les tests d'agrégation qui échouent**

Créer `src/lib/surveys/aggregate.spec.ts` :

```ts
import { describe, expect, it } from "vitest";
import { buildChartRows } from "./aggregate";
import type { AnswerCountRow, SurveyQuestion } from "./types";

const question: SurveyQuestion = {
  id: "q1",
  position: 0,
  kind: "matrix",
  label: "Combien de réveils ?",
  rows: [
    { key: "0-2", label: "0-2 mois" },
    { key: "2-4", label: "2-4 mois" },
  ],
  choices: [
    { key: "aucun", label: "pas de réveils" },
    { key: "plusieurs", label: "plusieurs réveils / nuit" },
  ],
  is_required: true,
  is_segment: false,
  is_charted: true,
};

const count = (
  row_key: string,
  choice_key: string,
  responses: number,
): AnswerCountRow => ({ question_id: "q1", row_key, choice_key, responses });

describe("buildChartRows", () => {
  it("convertit les comptes en pourcentages par ligne", () => {
    const rows = buildChartRows(
      question,
      [count("0-2", "aucun", 3), count("0-2", "plusieurs", 7)],
      2,
    );

    expect(rows[0]).toMatchObject({
      rowKey: "0-2",
      label: "0-2 mois",
      total: 10,
      hasEnoughData: true,
      percentages: { aucun: 30, plusieurs: 70 },
    });
  });

  it("marque une ligne sous le seuil comme insuffisante", () => {
    const rows = buildChartRows(question, [count("0-2", "aucun", 4)], 10);

    expect(rows[0].hasEnoughData).toBe(false);
    expect(rows[0].total).toBe(4);
  });

  it("rend une ligne vide plutôt que de l'omettre", () => {
    const rows = buildChartRows(question, [count("0-2", "aucun", 10)], 10);

    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      rowKey: "2-4",
      total: 0,
      hasEnoughData: false,
      percentages: { aucun: 0, plusieurs: 0 },
    });
  });

  it("ignore les comptes d'une autre question", () => {
    const rows = buildChartRows(
      question,
      [
        count("0-2", "aucun", 10),
        { question_id: "q2", row_key: "0-2", choice_key: "aucun", responses: 99 },
      ],
      10,
    );

    expect(rows[0].total).toBe(10);
  });

  it("ignore une clé de choix inconnue, retirée de la définition depuis", () => {
    const rows = buildChartRows(
      question,
      [count("0-2", "aucun", 10), count("0-2", "obsolete", 5)],
      10,
    );

    expect(rows[0].total).toBe(10);
    expect(rows[0].percentages).toEqual({ aucun: 100, plusieurs: 0 });
  });

  it("garde une somme de 100 malgré les arrondis", () => {
    const rows = buildChartRows(
      question,
      [count("0-2", "aucun", 1), count("0-2", "plusieurs", 2)],
      1,
    );

    const sum = Object.values(rows[0].percentages).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });
});
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `pnpm exec vitest run src/lib/surveys/aggregate.spec.ts`
Expected: FAIL — `Failed to resolve import "./aggregate"`.

- [ ] **Step 3: Implémenter l'agrégation**

Créer `src/lib/surveys/aggregate.ts` :

```ts
import { SURVEY_MIN_RESPONSES_PER_ROW } from "@/config/surveys";
import type { AnswerCountRow, SurveyQuestion } from "./types";

export type ChartRow = {
  rowKey: string;
  label: string;
  total: number;
  hasEnoughData: boolean;
  /** Pourcentage entier par clé de choix. Somme exactement 100 dès qu'il y a
   *  au moins une réponse. */
  percentages: Record<string, number>;
};

/**
 * Transforme les comptes bruts en pourcentages par ligne.
 *
 * Les lignes viennent de la définition du sondage, pas des données : une
 * tranche d'âge sans aucune réponse doit apparaître vide sur le graphique
 * plutôt que disparaître, sinon l'axe se réordonne à chaque nouvelle réponse.
 */
export const buildChartRows = (
  question: SurveyQuestion,
  counts: AnswerCountRow[],
  minResponses: number = SURVEY_MIN_RESPONSES_PER_ROW,
): ChartRow[] => {
  const choiceKeys = question.choices.map((choice) => choice.key);

  return question.rows.map((row) => {
    // Une clé de choix absente de la définition actuelle est ignorée : elle
    // vient d'une version antérieure du sondage et n'a plus de couleur ni de
    // libellé à afficher.
    const relevant = counts.filter(
      (entry) =>
        entry.question_id === question.id &&
        entry.row_key === row.key &&
        choiceKeys.includes(entry.choice_key),
    );

    const total = relevant.reduce((sum, entry) => sum + entry.responses, 0);
    const percentages = distribute(choiceKeys, relevant, total);

    return {
      rowKey: row.key,
      label: row.label,
      total,
      hasEnoughData: total >= minResponses,
      percentages,
    };
  });
};

/**
 * Répartit 100 points entre les choix.
 *
 * Arrondir chaque part indépendamment donne des totaux à 99 ou 101, et un
 * empilement à 100 % qui ne touche pas le haut du graphique se voit. Le reste
 * est donc donné au choix le plus représenté.
 */
const distribute = (
  choiceKeys: string[],
  counts: AnswerCountRow[],
  total: number,
): Record<string, number> => {
  const percentages: Record<string, number> = {};
  for (const key of choiceKeys) percentages[key] = 0;
  if (total === 0) return percentages;

  for (const entry of counts) {
    percentages[entry.choice_key] = Math.round(
      (entry.responses / total) * 100,
    );
  }

  const sum = Object.values(percentages).reduce((a, b) => a + b, 0);
  if (sum !== 100) {
    const biggest = [...counts].sort((a, b) => b.responses - a.responses)[0];
    if (biggest) percentages[biggest.choice_key] += 100 - sum;
  }

  return percentages;
};
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `pnpm exec vitest run src/lib/surveys/aggregate.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Écrire les tests du résultat personnalisé**

Créer `src/lib/surveys/personal-result.spec.ts` :

```ts
import { describe, expect, it } from "vitest";
import { computePersonalResult } from "./personal-result";
import type { AnswerCountRow, SurveyQuestion } from "./types";

const question: SurveyQuestion = {
  id: "q1",
  position: 0,
  kind: "matrix",
  label: "Combien de réveils ?",
  rows: [
    { key: "0-2", label: "0-2 mois" },
    { key: "6-9", label: "6-9 mois" },
  ],
  choices: [
    { key: "aucun", label: "pas de réveils" },
    { key: "plusieurs", label: "plusieurs réveils / nuit" },
  ],
  is_required: true,
  is_segment: false,
  is_charted: true,
};

const counts: AnswerCountRow[] = [
  { question_id: "q1", row_key: "6-9", choice_key: "aucun", responses: 57 },
  { question_id: "q1", row_key: "6-9", choice_key: "plusieurs", responses: 43 },
];

describe("computePersonalResult", () => {
  it("situe la réponse du parent dans sa tranche", () => {
    const result = computePersonalResult(
      question,
      { q1: { "0-2": "aucun", "6-9": "plusieurs" } },
      counts,
      "6-9",
    );

    expect(result).toEqual({
      rowLabel: "6-9 mois",
      choiceLabel: "plusieurs réveils / nuit",
      percentage: 43,
      sampleSize: 100,
    });
  });

  it("renvoie null si le parent n'a pas répondu pour sa tranche", () => {
    expect(
      computePersonalResult(question, { q1: { "0-2": "aucun" } }, counts, "6-9"),
    ).toBeNull();
  });

  it("renvoie null quand la tranche n'a pas assez de réponses", () => {
    expect(
      computePersonalResult(
        question,
        { q1: { "0-2": "aucun" } },
        [{ question_id: "q1", row_key: "0-2", choice_key: "aucun", responses: 2 }],
        "0-2",
      ),
    ).toBeNull();
  });
});
```

- [ ] **Step 6: Lancer les tests pour les voir échouer**

Run: `pnpm exec vitest run src/lib/surveys/personal-result.spec.ts`
Expected: FAIL — `Failed to resolve import "./personal-result"`.

- [ ] **Step 7: Implémenter le résultat personnalisé**

Créer `src/lib/surveys/personal-result.ts` :

```ts
import { buildChartRows } from "./aggregate";
import type { AnswerCountRow, SurveyAnswers, SurveyQuestion } from "./types";

export type PersonalResult = {
  rowLabel: string;
  choiceLabel: string;
  percentage: number;
  sampleSize: number;
};

/**
 * Situe la réponse du parent parmi les autres familles de la même tranche.
 *
 * Renvoie `null` plutôt qu'une phrase approximative dans deux cas : le parent
 * n'a rien répondu pour sa tranche, ou la tranche compte trop peu de réponses.
 * Annoncer « 100 % des familles comme vous » sur trois répondants décrédibilise
 * tout le sondage.
 */
export const computePersonalResult = (
  question: SurveyQuestion,
  answers: SurveyAnswers,
  counts: AnswerCountRow[],
  segmentRowKey: string,
): PersonalResult | null => {
  const choiceKey = answers[question.id]?.[segmentRowKey];
  if (!choiceKey) return null;

  const row = buildChartRows(question, counts).find(
    (candidate) => candidate.rowKey === segmentRowKey,
  );
  if (!row || !row.hasEnoughData) return null;

  const choice = question.choices.find((entry) => entry.key === choiceKey);
  if (!choice) return null;

  return {
    rowLabel: row.label,
    choiceLabel: choice.label,
    percentage: row.percentages[choiceKey] ?? 0,
    sampleSize: row.total,
  };
};
```

- [ ] **Step 8: Vérifier que tout passe**

Run: `pnpm exec vitest run src/lib/surveys`
Expected: PASS (9 tests).

- [ ] **Step 9: Commit**

```bash
git add src/lib/surveys/aggregate.ts src/lib/surveys/aggregate.spec.ts src/lib/surveys/personal-result.ts src/lib/surveys/personal-result.spec.ts
git commit -m "feat(sondages): agregation en pourcentages et resultat personnalise"
```

---

### Task 3: Validation de soumission et lectures serveur

**Files:**
- Create: `src/validations/surveys.ts`
- Create: `src/validations/surveys.spec.ts`
- Create: `src/lib/surveys/queries.ts`

**Interfaces:**
- Consumes: types de Task 1, `SINGLE_ROW_KEY`.
- Produces:
  - `surveySubmissionSchema` (Zod) et `type SurveySubmissionInput = { answers: SurveyAnswers; email?: string; first_name?: string; consent?: boolean; source_path?: string; website?: string }`.
  - `validateAnswersAgainstDefinition(survey: SurveyDefinition, answers: SurveyAnswers): string | null` — message d'erreur en français, ou `null`.
  - `getSurveyBySlug(slug: string): Promise<SurveyDefinition | null>`
  - `getSurveyPayload(slug: string): Promise<SurveyPublicPayload | null>`
  - `getSurveyCounts(surveyId: string): Promise<{ counts: AnswerCountRow[]; totalResponses: number }>`

- [ ] **Step 1: Écrire les tests de validation**

Créer `src/validations/surveys.spec.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  surveySubmissionSchema,
  validateAnswersAgainstDefinition,
} from "./surveys";
import type { SurveyDefinition } from "@/lib/surveys/types";

const survey: SurveyDefinition = {
  id: "s1",
  slug: "reveils",
  title: "Réveils",
  intro: null,
  status: "published",
  thank_you_message: "",
  questions: [
    {
      id: "q1",
      position: 0,
      kind: "matrix",
      label: "Réveils",
      rows: [{ key: "0-2", label: "0-2 mois" }],
      choices: [{ key: "aucun", label: "pas de réveils" }],
      is_required: true,
      is_segment: false,
      is_charted: true,
    },
    {
      id: "q2",
      position: 1,
      kind: "single",
      label: "Sujet",
      rows: [{ key: "_", label: "" }],
      choices: [{ key: "siestes", label: "Les siestes courtes" }],
      is_required: false,
      is_segment: false,
      is_charted: false,
    },
  ],
};

describe("surveySubmissionSchema", () => {
  it("accepte une soumission sans email", () => {
    const parsed = surveySubmissionSchema.safeParse({
      answers: { q1: { "0-2": "aucun" } },
    });
    expect(parsed.success).toBe(true);
  });

  it("exige prénom et consentement dès qu'un email est fourni", () => {
    const parsed = surveySubmissionSchema.safeParse({
      answers: { q1: { "0-2": "aucun" } },
      email: "parent@example.com",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepte un email accompagné du prénom et du consentement", () => {
    const parsed = surveySubmissionSchema.safeParse({
      answers: { q1: { "0-2": "aucun" } },
      email: "parent@example.com",
      first_name: "Marie",
      consent: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("refuse une réponse vide", () => {
    expect(surveySubmissionSchema.safeParse({ answers: {} }).success).toBe(false);
  });
});

describe("validateAnswersAgainstDefinition", () => {
  it("accepte des réponses conformes", () => {
    expect(
      validateAnswersAgainstDefinition(survey, { q1: { "0-2": "aucun" } }),
    ).toBeNull();
  });

  it("refuse une question inconnue", () => {
    expect(
      validateAnswersAgainstDefinition(survey, { qX: { "0-2": "aucun" } }),
    ).toMatch(/inconnue/i);
  });

  it("refuse un choix qui n'existe pas", () => {
    expect(
      validateAnswersAgainstDefinition(survey, { q1: { "0-2": "inconnu" } }),
    ).toMatch(/choix/i);
  });

  it("refuse une question obligatoire incomplète", () => {
    expect(validateAnswersAgainstDefinition(survey, { q2: { _: "siestes" } })).toMatch(
      /Réveils/,
    );
  });
});
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `pnpm exec vitest run src/validations/surveys.spec.ts`
Expected: FAIL — `Failed to resolve import "./surveys"`.

- [ ] **Step 3: Implémenter les schémas**

Créer `src/validations/surveys.ts` :

```ts
import { z } from "zod/v4";
import type { SurveyAnswers, SurveyDefinition } from "@/lib/surveys/types";

/**
 * Forme d'une soumission publique.
 *
 * L'email est facultatif — c'est le principe : on ne bloque pas la
 * participation derrière une adresse. Mais dès qu'il est renseigné, le prénom
 * et le consentement le deviennent : sans eux, l'inscription newsletter serait
 * soit impersonnelle, soit non prouvable.
 */
export const surveySubmissionSchema = z
  .object({
    answers: z
      .record(z.string(), z.record(z.string(), z.string()))
      .refine((value) => Object.keys(value).length > 0, {
        error: "Merci de répondre au sondage avant de l'envoyer",
      }),
    email: z.email("Merci d'indiquer un email valide").optional(),
    first_name: z.string().trim().optional(),
    consent: z.boolean().optional(),
    source_path: z.string().optional(),

    /** Piège à robots, invisible à l'écran. Voir `newsletterSignupSchema`. */
    website: z.string().optional(),
  })
  .refine((value) => !value.email || (value.first_name?.length ?? 0) > 0, {
    error: "Merci d'indiquer votre prénom",
    path: ["first_name"],
  })
  .refine((value) => !value.email || value.consent === true, {
    error: "Merci de cocher la case pour recevoir votre résultat par email",
    path: ["consent"],
  });

export type SurveySubmissionInput = z.infer<typeof surveySubmissionSchema>;

/**
 * Confronte les réponses reçues à la définition du sondage.
 *
 * Zod ne peut pas le faire : les clés valides dépendent d'une définition lue en
 * base. Sans ce contrôle, un script pourrait injecter des clés arbitraires qui
 * pollueraient durablement l'agrégat — les vues comptent ce qu'elles trouvent.
 */
export const validateAnswersAgainstDefinition = (
  survey: SurveyDefinition,
  answers: SurveyAnswers,
): string | null => {
  for (const [questionId, rowMap] of Object.entries(answers)) {
    const question = survey.questions.find((entry) => entry.id === questionId);
    if (!question) return "Question inconnue dans cette réponse";

    for (const [rowKey, choiceKey] of Object.entries(rowMap)) {
      if (!question.rows.some((row) => row.key === rowKey)) {
        return `Ligne inconnue pour « ${question.label} »`;
      }
      if (!question.choices.some((choice) => choice.key === choiceKey)) {
        return `Choix invalide pour « ${question.label} »`;
      }
    }
  }

  for (const question of survey.questions) {
    if (!question.is_required) continue;
    const given = answers[question.id] ?? {};
    const missing = question.rows.some((row) => !given[row.key]);
    if (missing) return `Merci de compléter « ${question.label} »`;
  }

  return null;
};
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `pnpm exec vitest run src/validations/surveys.spec.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Implémenter les lectures serveur**

Créer `src/lib/surveys/queries.ts` :

```ts
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AnswerCountRow,
  SurveyDefinition,
  SurveyPublicPayload,
} from "./types";

/**
 * Lit la définition d'un sondage publiable.
 *
 * Un brouillon n'est jamais servi publiquement : le lien pourrait circuler
 * avant relecture, et les réponses collectées sur une version non figée
 * fausseraient l'agrégat.
 */
export const getSurveyBySlug = async (
  slug: string,
): Promise<SurveyDefinition | null> => {
  const { data, error } = await createAdminClient()
    .from("surveys")
    .select(
      "id, slug, title, intro, status, thank_you_message, survey_questions(*)",
    )
    .eq("slug", slug)
    .in("status", ["published", "closed"])
    .maybeSingle();

  if (error || !data) return null;

  const questions = (data.survey_questions ?? []) as SurveyDefinition["questions"][number][];

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    intro: data.intro,
    status: data.status,
    thank_you_message: data.thank_you_message,
    questions: [...questions].sort((a, b) => a.position - b.position),
  };
};

export const getSurveyCounts = async (
  surveyId: string,
): Promise<{ counts: AnswerCountRow[]; totalResponses: number }> => {
  const supabase = createAdminClient();

  const [{ data: counts }, { data: totals }] = await Promise.all([
    supabase
      .from("survey_answer_counts")
      .select("question_id, row_key, choice_key, responses")
      .eq("survey_id", surveyId),
    supabase
      .from("survey_response_counts")
      .select("total_responses")
      .eq("survey_id", surveyId)
      .maybeSingle(),
  ]);

  return {
    counts: (counts ?? []) as AnswerCountRow[],
    totalResponses: totals?.total_responses ?? 0,
  };
};

export const getSurveyPayload = async (
  slug: string,
): Promise<SurveyPublicPayload | null> => {
  const survey = await getSurveyBySlug(slug);
  if (!survey) return null;

  const { counts, totalResponses } = await getSurveyCounts(survey.id);
  return { survey, counts, totalResponses };
};
```

- [ ] **Step 6: Vérifier la compilation**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add src/validations/surveys.ts src/validations/surveys.spec.ts src/lib/surveys/queries.ts
git commit -m "feat(sondages): validation des soumissions et lectures serveur"
```

---

### Task 4: Soumission d'une réponse et branchement newsletter segmenté

**Files:**
- Modify: `src/config/newsletter.ts`
- Modify: `src/lib/newsletter/subscribe.ts`
- Create: `src/lib/surveys/submit.ts`
- Create: `src/app/api/surveys/[slug]/route.ts`
- Create: `src/app/api/surveys/[slug]/responses/route.ts`

**Interfaces:**
- Consumes: `surveySubmissionSchema`, `validateAnswersAgainstDefinition`, `getSurveyBySlug`, `getSurveyCounts`, `computePersonalResult`, `subscribeToNewsletter`, `rateLimit`.
- Produces:
  - `submitSurveyResponse(slug, input, meta): Promise<SubmitOutcome>` avec `type SubmitOutcome = { status: "ok"; personalResult: PersonalResult | null; totalResponses: number } | { status: "invalid"; error: string } | { status: "closed" } | { status: "error" }`.
  - `GET /api/surveys/[slug]` → `SurveyPublicPayload`.
  - `POST /api/surveys/[slug]/responses` → `{ personalResult, totalResponses }`.
  - `subscribeToNewsletter(input, consentIp, extraAttributes?)` — troisième paramètre ajouté.

- [ ] **Step 1: Ajouter la source newsletter**

Dans `src/config/newsletter.ts`, ajouter `"sondage"` au tableau `NEWSLETTER_SOURCES`.

Run: `grep -n "NEWSLETTER_SOURCES" -A 6 src/config/newsletter.ts`
Expected: la constante contient bien `"sondage"`.

- [ ] **Step 2: Étendre `subscribeToNewsletter` avec des attributs Brevo**

Dans `src/lib/newsletter/subscribe.ts` :

```ts
export const subscribeToNewsletter = async (
  input: Omit<NewsletterSignupInput, "website" | "consent">,
  consentIp: string | null,
  /**
   * Attributs Brevo supplémentaires. Le sondage y passe la tranche d'âge du
   * bébé : c'est elle qui déclenche la bonne séquence email, et la calculer
   * plus tard imposerait de rejouer les réponses.
   */
  extraAttributes: Record<string, string> = {},
): Promise<NewsletterSignupOutcome> => {
```

Puis propager jusqu'à `pushToBrevo` : ajouter `extraAttributes` à sa signature, et dans l'appel `createContact` remplacer les attributs par :

```ts
  const { ok, status } = await createContact(
    email,
    { PRENOM: firstName, SOURCE: source, ...extraAttributes },
    [list],
  );
```

Mettre à jour l'appel existant `await pushToBrevo({ id: subscriber.id, email, firstName, source: input.source });` en y ajoutant `extraAttributes`.

- [ ] **Step 3: Vérifier que la newsletter existante n'est pas cassée**

Run: `pnpm exec vitest run src/validations/newsletter.spec.ts src/lib/newsletter`
Expected: PASS, aucun test en échec (le paramètre est optionnel).

- [ ] **Step 4: Implémenter la soumission**

Créer `src/lib/surveys/submit.ts` :

```ts
import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { subscribeToNewsletter } from "@/lib/newsletter/subscribe";
import { SURVEY_CONSENT_TEXT } from "@/config/surveys";
import {
  validateAnswersAgainstDefinition,
  type SurveySubmissionInput,
} from "@/validations/surveys";
import { getSurveyBySlug, getSurveyCounts } from "./queries";
import { computePersonalResult, type PersonalResult } from "./personal-result";
import type { SurveyAnswers } from "./types";

export type SubmitOutcome =
  | { status: "ok"; personalResult: PersonalResult | null; totalResponses: number }
  | { status: "invalid"; error: string }
  | { status: "closed" }
  | { status: "error" };

/**
 * L'adresse n'est jamais conservée en clair : elle ne sert qu'à repérer un
 * envoi massif depuis une même source, ce qu'une empreinte permet aussi bien.
 */
const hashIp = (ip: string | null): string | null =>
  ip ? createHash("sha256").update(ip).digest("hex").slice(0, 32) : null;

export const submitSurveyResponse = async (
  slug: string,
  input: Omit<SurveySubmissionInput, "website">,
  meta: { ip: string | null },
): Promise<SubmitOutcome> => {
  const survey = await getSurveyBySlug(slug);
  if (!survey) return { status: "invalid", error: "Sondage introuvable" };
  if (survey.status === "closed") return { status: "closed" };

  const answers = input.answers as SurveyAnswers;
  const invalid = validateAnswersAgainstDefinition(survey, answers);
  if (invalid) return { status: "invalid", error: invalid };

  const segmentQuestion = survey.questions.find((entry) => entry.is_segment);
  const segmentKey = segmentQuestion
    ? (Object.values(answers[segmentQuestion.id] ?? {})[0] ?? null)
    : null;

  const email = input.email?.trim().toLowerCase() ?? null;

  const { error } = await createAdminClient().from("survey_responses").insert({
    survey_id: survey.id,
    answers,
    segment_key: segmentKey,
    email,
    marketing_consent: Boolean(email && input.consent),
    consent_text: email ? SURVEY_CONSENT_TEXT : null,
    consented_at: email ? new Date().toISOString() : null,
    source_path: input.source_path ?? null,
    ip_hash: hashIp(meta.ip),
  });

  if (error) {
    // Sans l'email ni l'IP : les journaux ne sont pas un endroit où stocker des
    // données personnelles.
    console.error("[sondage] enregistrement impossible", error);
    return { status: "error" };
  }

  // Après l'insertion, jamais avant : une panne Brevo ne doit pas faire perdre
  // une réponse déjà donnée. Et l'agrégat est relu ensuite pour que le résultat
  // personnalisé inclue la réponse qui vient d'être envoyée.
  if (email && input.consent && input.first_name) {
    await subscribeToNewsletter(
      { email, first_name: input.first_name, source: "sondage" },
      null,
      segmentKey ? { TRANCHE_AGE: segmentKey } : {},
    );
  }

  const { counts, totalResponses } = await getSurveyCounts(survey.id);
  const chartQuestion = survey.questions.find((entry) => entry.is_charted);

  const personalResult =
    chartQuestion && segmentKey
      ? computePersonalResult(chartQuestion, answers, counts, segmentKey)
      : null;

  return { status: "ok", personalResult, totalResponses };
};
```

- [ ] **Step 5: Créer la route de lecture publique**

Créer `src/app/api/surveys/[slug]/route.ts` :

```ts
import { NextResponse } from "next/server";
import { getSurveyPayload } from "@/lib/surveys/queries";

/**
 * Jamais mise en cache.
 *
 * C'est tout l'intérêt du widget : il est embarqué dans des articles rendus
 * statiquement, et c'est cet appel — fait par le navigateur à chaque visite —
 * qui empêche le graphique de rester figé sur les chiffres du jour de
 * publication.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const payload = await getSurveyPayload(slug);

  if (!payload) {
    return NextResponse.json({ error: "Sondage introuvable" }, { status: 404 });
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
```

- [ ] **Step 6: Créer la route de soumission**

Créer `src/app/api/surveys/[slug]/responses/route.ts` :

```ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { surveySubmissionSchema } from "@/validations/surveys";
import { submitSurveyResponse } from "@/lib/surveys/submit";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Dix réponses par IP et par dix minutes. Plus large que la newsletter : le
 * sondage est fait pour être rempli, y compris par plusieurs parents derrière
 * la même connexion, et une réponse coûte une ligne, pas un contact facturé.
 */
const SURVEY_RATE_LIMIT = {
  prefix: "survey-response",
  limit: 10,
  windowSeconds: 600,
} as const;

const clientIp = async () => {
  const headersList = await headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    null
  );
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  const parsed = surveySubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Réponse invalide" },
      { status: 400 },
    );
  }

  const { website, ...input } = parsed.data;

  // Piège à robots : on répond comme pour un succès. Un rejet explicite
  // apprendrait au script quel champ éviter au passage suivant.
  if (website && website.trim() !== "") {
    return NextResponse.json({ personalResult: null, totalResponses: 0 });
  }

  const limit = await rateLimit(SURVEY_RATE_LIMIT);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 },
    );
  }

  const outcome = await submitSurveyResponse(slug, input, {
    ip: await clientIp(),
  });

  if (outcome.status === "invalid") {
    return NextResponse.json({ error: outcome.error }, { status: 400 });
  }
  if (outcome.status === "closed") {
    return NextResponse.json(
      { error: "Ce sondage est clôturé." },
      { status: 409 },
    );
  }
  if (outcome.status === "error") {
    return NextResponse.json(
      { error: "Une erreur est survenue, réessayez dans un instant." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    personalResult: outcome.personalResult,
    totalResponses: outcome.totalResponses,
  });
}
```

- [ ] **Step 7: Vérifier compilation et suite de tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: compilation propre, tous les tests au vert.

- [ ] **Step 8: Commit**

```bash
git add src/config/newsletter.ts src/lib/newsletter/subscribe.ts src/lib/surveys/submit.ts "src/app/api/surveys"
git commit -m "feat(sondages): soumission, anti-spam et inscription newsletter segmentee"
```

---

### Task 5: Graphique et formulaire publics

**Files:**
- Create: `src/components/surveys/survey-chart.tsx`
- Create: `src/components/surveys/survey-form.tsx`
- Create: `src/components/surveys/survey-embed.tsx`

**Interfaces:**
- Consumes: `SurveyPublicPayload`, `buildChartRows`, `SURVEY_SEGMENT_COLORS`, `SURVEY_REFRESH_INTERVAL_MS`, routes de Task 4.
- Produces: `<SurveyChart payload mode="standalone" highlightRowKey? />`, `<SurveyForm payload onSubmitted />`, `<SurveyEmbed slug mode="form" | "chart" />`.

- [ ] **Step 1: Écrire le graphique**

Créer `src/components/surveys/survey-chart.tsx` :

```tsx
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildChartRows } from "@/lib/surveys/aggregate";
import { SURVEY_SEGMENT_COLORS } from "@/config/surveys";
import type { SurveyPublicPayload } from "@/lib/surveys/types";

type Props = {
  payload: SurveyPublicPayload;
  /** Barre à mettre en évidence : la tranche du parent qui vient de répondre. */
  highlightRowKey?: string | null;
};

export const SurveyChart = ({ payload, highlightRowKey }: Props) => {
  const question = payload.survey.questions.find((entry) => entry.is_charted);
  if (!question) return null;

  const rows = buildChartRows(question, payload.counts);
  const data = rows.map((row) => ({
    label: row.label,
    rowKey: row.rowKey,
    hasEnoughData: row.hasEnoughData,
    // Une tranche sous le seuil est laissée vide : afficher son pourcentage
    // reviendrait à publier un chiffre que les données ne soutiennent pas.
    ...(row.hasEnoughData ? row.percentages : {}),
  }));

  const today = new Date().toLocaleDateString("fr-FR");

  return (
    <figure className="not-prose my-8 rounded-xl border border-primary-green/10 bg-background-beige-dark/40 p-4 sm:p-6">
      <figcaption className="mb-4">
        <h3 className="font-serif text-lg text-primary-green">
          {payload.survey.title}
        </h3>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {question.choices.map((choice, index) => (
            <li
              key={choice.key}
              className="flex items-center gap-2 text-sm text-primary-green/80"
            >
              <span
                aria-hidden
                className="inline-block h-3 w-3 rounded-sm"
                style={{
                  backgroundColor:
                    SURVEY_SEGMENT_COLORS[index % SURVEY_SEGMENT_COLORS.length],
                }}
              />
              {choice.label}
            </li>
          ))}
        </ul>
      </figcaption>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              interval={0}
              tick={{ fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis domain={[0, 100]} unit=" %" tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number) => `${value} %`}
              labelFormatter={(label: string) => label}
            />
            {question.choices.map((choice, index) => (
              <Bar
                key={choice.key}
                dataKey={choice.key}
                name={choice.label}
                stackId="a"
                fill={
                  SURVEY_SEGMENT_COLORS[index % SURVEY_SEGMENT_COLORS.length]
                }
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.rowKey}
                    // La tranche du répondant ressort par l'opacité plutôt que
                    // par une couleur : la palette code déjà l'intensité des
                    // réveils, la détourner rendrait la légende fausse.
                    fillOpacity={
                      !highlightRowKey || entry.rowKey === highlightRowKey
                        ? 1
                        : 0.35
                    }
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-sm text-primary-green/70">
        {payload.totalResponses.toLocaleString("fr-FR")} répondant
        {payload.totalResponses > 1 ? "s" : ""} au {today}
      </p>

      {data.some((entry) => !entry.hasEnoughData) && (
        <p className="mt-1 text-xs text-primary-green/60">
          Les tranches sans barre n&apos;ont pas encore assez de données.
        </p>
      )}
    </figure>
  );
};
```

- [ ] **Step 2: Écrire le formulaire**

Créer `src/components/surveys/survey-form.tsx` :

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SINGLE_ROW_KEY, SURVEY_CONSENT_TEXT } from "@/config/surveys";
import type { PersonalResult } from "@/lib/surveys/personal-result";
import type { SurveyAnswers, SurveyPublicPayload } from "@/lib/surveys/types";

type Props = {
  payload: SurveyPublicPayload;
  onSubmitted: (result: {
    personalResult: PersonalResult | null;
    answers: SurveyAnswers;
  }) => void;
};

export const SurveyForm = ({ payload, onSubmitted }: Props) => {
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = (questionId: string, rowKey: string, choiceKey: string) =>
    setAnswers((current) => ({
      ...current,
      [questionId]: { ...(current[questionId] ?? {}), [rowKey]: choiceKey },
    }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch(
      `/api/surveys/${payload.survey.slug}/responses`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          email: email.trim() || undefined,
          first_name: firstName.trim() || undefined,
          consent: consent || undefined,
          source_path: window.location.pathname,
          website,
        }),
      },
    ).catch(() => null);

    setPending(false);

    if (!response || !response.ok) {
      const message = await response?.json().catch(() => null);
      setError(message?.error ?? "L'envoi a échoué, réessayez dans un instant.");
      return;
    }

    const data = await response.json();
    onSubmitted({ personalResult: data.personalResult ?? null, answers });
  };

  return (
    <form onSubmit={submit} className="not-prose space-y-8">
      {payload.survey.intro && (
        <p className="text-primary-green/80">{payload.survey.intro}</p>
      )}

      {payload.survey.questions.map((question) => (
        <fieldset key={question.id} className="space-y-3">
          <legend className="font-serif text-lg text-primary-green">
            {question.label}
          </legend>

          {question.kind === "single" ? (
            <div className="space-y-2">
              {question.choices.map((choice) => (
                <label
                  key={choice.key}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-primary-green/15 px-3 py-2"
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={choice.key}
                    checked={
                      answers[question.id]?.[SINGLE_ROW_KEY] === choice.key
                    }
                    onChange={() =>
                      choose(question.id, SINGLE_ROW_KEY, choice.key)
                    }
                  />
                  <span>{choice.label}</span>
                </label>
              ))}
            </div>
          ) : (
            // Une carte par ligne, y compris sur grand écran : une matrice
            // 9 × 4 en tableau devient illisible dans la colonne étroite d'un
            // article, et scroller horizontalement fait abandonner.
            <div className="space-y-3">
              {question.rows.map((row) => (
                <div
                  key={row.key}
                  className="rounded-lg border border-primary-green/15 p-3"
                >
                  <p className="mb-2 font-medium text-primary-green">
                    {row.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {question.choices.map((choice) => {
                      const selected =
                        answers[question.id]?.[row.key] === choice.key;
                      return (
                        <button
                          key={choice.key}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => choose(question.id, row.key, choice.key)}
                          className={`rounded-full border px-3 py-1 text-sm transition ${
                            selected
                              ? "border-primary-red bg-primary-red text-white"
                              : "border-primary-green/20 text-primary-green/80 hover:border-primary-red/40"
                          }`}
                        >
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </fieldset>
      ))}

      <div className="space-y-3 rounded-lg bg-background-beige-dark/50 p-4">
        <p className="text-sm text-primary-green/80">
          Envie de savoir où se situe votre bébé par rapport aux autres familles
          de son âge&nbsp;? Laissez votre prénom et votre email — c&apos;est
          facultatif.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="survey-first-name">Prénom</Label>
            <Input
              id="survey-first-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div>
            <Label htmlFor="survey-email">Email</Label>
            <Input
              id="survey-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
        </div>

        {email.trim() !== "" && (
          <label className="flex items-start gap-2 text-sm text-primary-green/80">
            <Checkbox
              checked={consent}
              onCheckedChange={(value) => setConsent(value === true)}
            />
            <span>{SURVEY_CONSENT_TEXT}</span>
          </label>
        )}
      </div>

      {/* Piège à robots : hors flux et masqué aux lecteurs d'écran. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
      />

      {error && <p className="text-sm text-primary-red">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer mes réponses"}
      </Button>
    </form>
  );
};
```

- [ ] **Step 3: Écrire l'embed**

Créer `src/components/surveys/survey-embed.tsx` :

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { SURVEY_REFRESH_INTERVAL_MS } from "@/config/surveys";
import type { PersonalResult } from "@/lib/surveys/personal-result";
import type { SurveyAnswers, SurveyPublicPayload } from "@/lib/surveys/types";
import { SurveyChart } from "./survey-chart";
import { SurveyForm } from "./survey-form";

type Props = { slug: string; mode: "form" | "chart" };

/**
 * Point d'entrée des sondages embarqués dans un article.
 *
 * Tout se charge après l'hydratation, jamais au build : un article est rendu
 * statiquement et resterait sinon figé sur les chiffres du jour de sa
 * publication. Le rafraîchissement périodique entretient l'effet « en direct »
 * pour un lecteur qui laisse l'onglet ouvert.
 */
export const SurveyEmbed = ({ slug, mode }: Props) => {
  const [payload, setPayload] = useState<SurveyPublicPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [submitted, setSubmitted] = useState<{
    personalResult: PersonalResult | null;
    answers: SurveyAnswers;
  } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/surveys/${slug}`, {
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      setFailed(true);
      return;
    }
    setPayload(await response.json());
  }, [slug]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), SURVEY_REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Un sondage indisponible ne doit rien casser dans la lecture de l'article :
  // on n'affiche rien plutôt qu'un bloc d'erreur au milieu du texte.
  if (failed) return null;

  if (!payload) {
    return (
      <div className="not-prose my-8 h-64 animate-pulse rounded-xl bg-background-beige-dark/60" />
    );
  }

  if (mode === "chart") return <SurveyChart payload={payload} />;

  if (!submitted) {
    return payload.survey.status === "closed" ? (
      <SurveyChart payload={payload} />
    ) : (
      <SurveyForm
        payload={payload}
        onSubmitted={(result) => {
          setSubmitted(result);
          void load();
        }}
      />
    );
  }

  const segmentQuestion = payload.survey.questions.find((q) => q.is_segment);
  const highlight = segmentQuestion
    ? (Object.values(submitted.answers[segmentQuestion.id] ?? {})[0] ?? null)
    : null;

  return (
    <div className="not-prose my-8 space-y-4">
      <div className="rounded-xl border border-primary-green/15 bg-background-beige-dark/40 p-6">
        <h3 className="font-serif text-xl text-primary-green">Merci&nbsp;!</h3>
        <p className="mt-1 text-primary-green/80">
          J&apos;ai bien reçu vos réponses.
        </p>

        {submitted.personalResult && (
          <p className="mt-3 text-primary-green">
            Vous avez répondu «&nbsp;{submitted.personalResult.choiceLabel}
            &nbsp;» pour la tranche {submitted.personalResult.rowLabel}.
            C&apos;est le cas de {submitted.personalResult.percentage}&nbsp;% des
            familles ayant répondu pour cette tranche.
          </p>
        )}

        {payload.survey.thank_you_message && (
          <p className="mt-3 whitespace-pre-line text-primary-green/80">
            {payload.survey.thank_you_message}
          </p>
        )}
      </div>

      <SurveyChart payload={payload} highlightRowKey={highlight} />
    </div>
  );
};
```

- [ ] **Step 4: Vérifier que les composants UI importés existent**

Run: `ls src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/label.tsx src/components/ui/checkbox.tsx`
Expected: les quatre fichiers existent. Si `checkbox.tsx` manque, l'ajouter avec `pnpm dlx shadcn@latest add checkbox`.

- [ ] **Step 5: Vérifier la compilation**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add src/components/surveys
git commit -m "feat(sondages): graphique empile, formulaire et embed client"
```

---

### Task 6: Insertion dans un article et rendu côté public

**Files:**
- Create: `src/lib/surveys/embeds.ts`
- Create: `src/lib/surveys/embeds.spec.ts`
- Create: `src/components/blog/article-body.tsx`
- Create: `src/components/editor/survey-embed-node.tsx`
- Create: `src/app/api/admin/sondages/route.ts`
- Modify: `src/components/editor/wysiwyg-editor.tsx`
- Modify: `src/app/(public)/blog/[slug]/page.tsx`

**Interfaces:**
- Consumes: `SurveyEmbed` (Task 5).
- Produces:
  - `splitSurveyEmbeds(html: string): ArticleSegment[]` avec `type ArticleSegment = { type: "html"; html: string } | { type: "embed"; slug: string; mode: "form" | "chart" }`.
  - `<ArticleBody html={string} className={string} />`
  - Nœud Tiptap `surveyEmbed` (export `SurveyEmbedNode`) sérialisant `<div data-survey-embed data-survey-slug="…" data-survey-mode="…"></div>`.
  - `GET /api/admin/sondages` → `{ surveys: { id, slug, title, status }[] }`.

- [ ] **Step 1: Écrire les tests de découpage**

Créer `src/lib/surveys/embeds.spec.ts` :

```ts
import { describe, expect, it } from "vitest";
import { splitSurveyEmbeds } from "./embeds";

describe("splitSurveyEmbeds", () => {
  it("renvoie un seul segment HTML quand il n'y a pas d'embed", () => {
    expect(splitSurveyEmbeds("<p>Bonjour</p>")).toEqual([
      { type: "html", html: "<p>Bonjour</p>" },
    ]);
  });

  it("extrait un embed entouré de texte", () => {
    const html =
      '<p>Avant</p><div data-survey-embed="" data-survey-slug="reveils" data-survey-mode="chart"></div><p>Après</p>';

    expect(splitSurveyEmbeds(html)).toEqual([
      { type: "html", html: "<p>Avant</p>" },
      { type: "embed", slug: "reveils", mode: "chart" },
      { type: "html", html: "<p>Après</p>" },
    ]);
  });

  it("accepte les attributs dans un ordre quelconque", () => {
    const html =
      '<div data-survey-mode="form" data-survey-slug="reveils" data-survey-embed=""></div>';

    expect(splitSurveyEmbeds(html)).toEqual([
      { type: "embed", slug: "reveils", mode: "form" },
    ]);
  });

  it("retombe sur le mode formulaire si l'attribut est absent ou inconnu", () => {
    const html =
      '<div data-survey-embed="" data-survey-slug="reveils" data-survey-mode="bidon"></div>';

    expect(splitSurveyEmbeds(html)).toEqual([
      { type: "embed", slug: "reveils", mode: "form" },
    ]);
  });

  it("ignore un marqueur sans slug plutôt que de rendre un embed cassé", () => {
    const html = '<div data-survey-embed=""></div><p>Suite</p>';

    expect(splitSurveyEmbeds(html)).toEqual([{ type: "html", html: "<p>Suite</p>" }]);
  });

  it("gère plusieurs embeds à la suite", () => {
    const html =
      '<div data-survey-embed="" data-survey-slug="a" data-survey-mode="form"></div>' +
      '<div data-survey-embed="" data-survey-slug="b" data-survey-mode="chart"></div>';

    expect(splitSurveyEmbeds(html)).toEqual([
      { type: "embed", slug: "a", mode: "form" },
      { type: "embed", slug: "b", mode: "chart" },
    ]);
  });
});
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `pnpm exec vitest run src/lib/surveys/embeds.spec.ts`
Expected: FAIL — `Failed to resolve import "./embeds"`.

- [ ] **Step 3: Implémenter le découpage**

Créer `src/lib/surveys/embeds.ts` :

```ts
export type ArticleSegment =
  | { type: "html"; html: string }
  | { type: "embed"; slug: string; mode: "form" | "chart" };

/**
 * Le nœud Tiptap est atomique et sans contenu : il se sérialise toujours comme
 * une balise `div` vide et auto-suffisante. Une expression régulière suffit
 * donc, sans avoir à parser tout le document — et elle tourne côté serveur,
 * dans un composant serveur, sans dépendance supplémentaire.
 */
const EMBED_PATTERN = /<div\b[^>]*\bdata-survey-embed\b[^>]*><\/div>/gi;

const attribute = (tag: string, name: string): string | null =>
  tag.match(new RegExp(`${name}="([^"]*)"`, "i"))?.[1] ?? null;

/**
 * Découpe le HTML d'un article en morceaux inertes et en emplacements de
 * sondage.
 *
 * Nécessaire parce que le corps d'article est stocké en HTML et rendu par
 * `dangerouslySetInnerHTML`, qui ne monte aucun composant React : sans ce
 * découpage, un sondage inséré dans un article resterait une `div` vide.
 */
export const splitSurveyEmbeds = (html: string): ArticleSegment[] => {
  const segments: ArticleSegment[] = [];
  let cursor = 0;

  for (const match of html.matchAll(EMBED_PATTERN)) {
    const index = match.index ?? 0;
    const before = html.slice(cursor, index);
    if (before.trim() !== "") segments.push({ type: "html", html: before });
    cursor = index + match[0].length;

    const slug = attribute(match[0], "data-survey-slug");
    // Un marqueur sans slug ne désigne aucun sondage : le rendre afficherait un
    // squelette de chargement perpétuel au milieu de l'article.
    if (!slug) continue;

    const rawMode = attribute(match[0], "data-survey-mode");
    segments.push({
      type: "embed",
      slug,
      mode: rawMode === "chart" ? "chart" : "form",
    });
  }

  const rest = html.slice(cursor);
  if (rest.trim() !== "") segments.push({ type: "html", html: rest });

  return segments;
};
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `pnpm exec vitest run src/lib/surveys/embeds.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Écrire le rendu d'article**

Créer `src/components/blog/article-body.tsx` :

```tsx
import { Fragment } from "react";
import { splitSurveyEmbeds } from "@/lib/surveys/embeds";
import { SurveyEmbed } from "@/components/surveys/survey-embed";

type Props = { html: string; className?: string };

/**
 * Rend le corps d'un article en mêlant HTML figé et sondages vivants.
 *
 * Le HTML reste rendu tel quel — il vient de l'éditeur, il est déjà nettoyé à
 * l'écriture. Seuls les emplacements de sondage deviennent des composants
 * clients, qui vont chercher leurs chiffres à chaque visite.
 */
export const ArticleBody = ({ html, className }: Props) => {
  const segments = splitSurveyEmbeds(html);

  return (
    <div className={className}>
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {segment.type === "html" ? (
            <div dangerouslySetInnerHTML={{ __html: segment.html }} />
          ) : (
            <SurveyEmbed slug={segment.slug} mode={segment.mode} />
          )}
        </Fragment>
      ))}
    </div>
  );
};
```

- [ ] **Step 6: Brancher le rendu sur la page d'article**

Dans `src/app/(public)/blog/[slug]/page.tsx`, remplacer le bloc `{/* Content */}` (lignes 215-219) par :

```tsx
      {/* Content */}
      <ArticleBody
        html={post.body_html}
        className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-primary-green prose-p:text-primary-green/80 prose-a:text-primary-red prose-a:no-underline hover:prose-a:underline prose-blockquote:border-primary-red/30 prose-blockquote:text-primary-green/70"
      />
```

et ajouter en haut du fichier : `import { ArticleBody } from "@/components/blog/article-body";`

- [ ] **Step 7: Créer la route de liste pour le sélecteur**

Créer `src/app/api/admin/sondages/route.ts` :

```ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Sert le sélecteur de sondage de l'éditeur d'article. Réservé à l'admin :
 *  la liste contient des brouillons non publiés. */
export async function GET() {
  const user = await getSessionUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { data } = await createAdminClient()
    .from("surveys")
    .select("id, slug, title, status")
    .order("created_at", { ascending: false });

  return NextResponse.json({ surveys: data ?? [] });
}
```

- [ ] **Step 8: Écrire le nœud Tiptap**

Créer `src/components/editor/survey-embed-node.tsx` :

```tsx
"use client";

import { useEffect, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { BarChart3 } from "lucide-react";

type SurveyOption = { id: string; slug: string; title: string; status: string };

/**
 * Vue d'édition du bloc sondage.
 *
 * Le nœud ne stocke qu'un slug et un mode : la définition du sondage reste en
 * base. Un article publié suit donc les modifications du sondage, et le même
 * sondage peut être embarqué dans plusieurs articles sans duplication.
 */
const SurveyEmbedView = ({ node, updateAttributes }: NodeViewProps) => {
  const [surveys, setSurveys] = useState<SurveyOption[]>([]);
  const slug = node.attrs.slug as string;
  const mode = node.attrs.mode as "form" | "chart";

  useEffect(() => {
    fetch("/api/admin/sondages")
      .then((response) => (response.ok ? response.json() : { surveys: [] }))
      .then((data) => setSurveys(data.surveys ?? []))
      .catch(() => setSurveys([]));
  }, []);

  return (
    <NodeViewWrapper className="not-prose my-4">
      <div className="rounded-lg border-2 border-dashed border-primary-red/30 bg-primary-red/5 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary-red-dark">
          <BarChart3 className="h-4 w-4" />
          Sondage
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className="rounded border border-primary-green/20 px-2 py-1 text-sm"
            value={slug}
            onChange={(event) => updateAttributes({ slug: event.target.value })}
          >
            <option value="">— Choisir un sondage —</option>
            {surveys.map((survey) => (
              <option key={survey.id} value={survey.slug}>
                {survey.title}
                {survey.status !== "published" ? ` (${survey.status})` : ""}
              </option>
            ))}
          </select>

          <select
            className="rounded border border-primary-green/20 px-2 py-1 text-sm"
            value={mode}
            onChange={(event) => updateAttributes({ mode: event.target.value })}
          >
            <option value="form">Formulaire + résultat</option>
            <option value="chart">Graphique seul</option>
          </select>
        </div>

        {!slug && (
          <p className="mt-2 text-xs text-primary-red">
            Aucun sondage sélectionné : ce bloc ne s&apos;affichera pas dans
            l&apos;article.
          </p>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const SurveyEmbedNode = Node.create({
  name: "surveyEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      slug: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-survey-slug") ?? "",
        renderHTML: (attrs) => ({ "data-survey-slug": attrs.slug as string }),
      },
      mode: {
        default: "form",
        parseHTML: (el) => el.getAttribute("data-survey-mode") ?? "form",
        renderHTML: (attrs) => ({ "data-survey-mode": attrs.mode as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-survey-embed]" }];
  },

  // Balise vide et auto-suffisante : c'est ce qui permet à `splitSurveyEmbeds`
  // de la retrouver par expression régulière côté rendu.
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-survey-embed": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SurveyEmbedView);
  },
});
```

- [ ] **Step 9: Enregistrer le nœud et l'entrée du menu slash**

Dans `src/components/editor/wysiwyg-editor.tsx` :

1. Ajouter l'import : `import { SurveyEmbedNode } from "./survey-embed-node";` et `BarChart3` à l'import `lucide-react` existant.
2. Ajouter `SurveyEmbedNode,` au tableau `extensions`, juste après `CtaButton,`.
3. Ajouter à `slashCommandItems`, à la suite des entrées existantes :

```tsx
  {
    title: "Sondage",
    description: "Insérer un sondage ou son graphique de résultats",
    icon: <BarChart3 className="h-4 w-4" />,
    searchTerms: ["sondage", "quiz", "survey", "graphique", "resultats"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "surveyEmbed",
          attrs: { slug: "", mode: "form" },
        })
        .run();
    },
  },
```

- [ ] **Step 10: Vérifier compilation, lint et tests**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test`
Expected: tout au vert.

- [ ] **Step 11: Commit**

```bash
git add src/lib/surveys/embeds.ts src/lib/surveys/embeds.spec.ts src/components/blog/article-body.tsx src/components/editor/survey-embed-node.tsx src/components/editor/wysiwyg-editor.tsx "src/app/(public)/blog/[slug]/page.tsx" "src/app/api/admin/sondages/route.ts"
git commit -m "feat(sondages): bloc sondage dans l'editeur et rendu vivant dans l'article"
```

---

### Task 7: Administration des sondages

**Files:**
- Create: `src/app/(dashboard)/admin/sondages/actions.ts`
- Create: `src/app/(dashboard)/admin/sondages/page.tsx`
- Create: `src/app/(dashboard)/admin/sondages/[id]/page.tsx`
- Create: `src/app/(dashboard)/admin/sondages/_components/survey-builder.tsx`
- Modify: `src/validations/surveys.ts`

**Interfaces:**
- Consumes: `requireAdmin` (copié du modèle blog), `ActionResult`, types de Task 1.
- Produces:
  - `surveyDefinitionSchema` (Zod, admin).
  - `listSurveys()`, `getSurveyForAdmin(id)`, `saveSurvey(input): Promise<ActionResult<{ id: string }>>`, `deleteSurvey(id)`.
  - Pages `/admin/sondages` et `/admin/sondages/[id]`.

- [ ] **Step 1: Ajouter le schéma de définition**

À la fin de `src/validations/surveys.ts` :

```ts
const choiceSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .regex(
      /^[a-z0-9-]+$/,
      "Les clés ne contiennent que des minuscules, chiffres et tirets",
    ),
  label: z.string().trim().min(1, "Chaque option a besoin d'un libellé"),
});

/**
 * Définition d'un sondage côté administration.
 *
 * Les clés sont validées strictement : elles sont recopiées dans chaque réponse
 * enregistrée. Une clé renommée après coup couperait le sondage en deux jeux de
 * données qui ne s'additionnent plus.
 */
export const surveyDefinitionSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Le slug ne contient que minuscules, chiffres, tirets"),
  title: z.string().trim().min(1, "Le titre est obligatoire"),
  intro: z.string().trim().optional(),
  status: z.enum(["draft", "published", "closed"]),
  thank_you_message: z.string().trim().default(""),
  questions: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        kind: z.enum(["matrix", "single"]),
        label: z.string().trim().min(1, "Chaque question a besoin d'un intitulé"),
        rows: z.array(choiceSchema),
        choices: z.array(choiceSchema).min(2, "Au moins deux options par question"),
        is_required: z.boolean(),
        is_segment: z.boolean(),
        is_charted: z.boolean(),
      }),
    )
    .min(1, "Un sondage a besoin d'au moins une question")
    .refine(
      (questions) => questions.filter((q) => q.is_charted).length <= 1,
      { error: "Une seule question peut alimenter le graphique" },
    )
    .refine(
      (questions) => questions.filter((q) => q.is_segment).length <= 1,
      { error: "Une seule question peut servir de segment marketing" },
    ),
});

export type SurveyDefinitionInput = z.infer<typeof surveyDefinitionSchema>;
```

- [ ] **Step 2: Vérifier que les tests existants passent toujours**

Run: `pnpm exec vitest run src/validations/surveys.spec.ts`
Expected: PASS (8 tests).

- [ ] **Step 3: Écrire les Server Actions**

Créer `src/app/(dashboard)/admin/sondages/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SINGLE_ROW_KEY } from "@/config/surveys";
import { surveyDefinitionSchema } from "@/validations/surveys";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

export const listSurveys = async () => {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("surveys")
    .select("id, slug, title, status, created_at")
    .order("created_at", { ascending: false });

  return data ?? [];
};

export const getSurveyForAdmin = async (id: string) => {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("surveys")
    .select("*, survey_questions(*)")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  return {
    ...data,
    survey_questions: [...(data.survey_questions ?? [])].sort(
      (a, b) => a.position - b.position,
    ),
  };
};

/**
 * Enregistre un sondage et ses questions.
 *
 * Les questions sont réécrites en bloc — supprimées puis réinsérées — mais en
 * conservant les `id` déjà présents : ce sont eux qui indexent les réponses
 * déjà collectées. Les perdre orphelinerait tout l'historique.
 */
export const saveSurvey = async (
  input: unknown,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const parsed = surveyDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { questions, ...survey } = parsed.data;
  const supabase = createAdminClient();

  const { data: saved, error } = await supabase
    .from("surveys")
    .upsert(
      {
        ...(survey.id ? { id: survey.id } : {}),
        slug: survey.slug,
        title: survey.title,
        intro: survey.intro ?? null,
        status: survey.status,
        thank_you_message: survey.thank_you_message,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id")
    .single();

  if (error || !saved) {
    console.error("[sondage] enregistrement impossible", error);
    return { success: false, error: "Enregistrement impossible" };
  }

  const keptIds = questions.map((question) => question.id).filter(Boolean);
  let deletion = supabase
    .from("survey_questions")
    .delete()
    .eq("survey_id", saved.id);
  if (keptIds.length > 0) {
    deletion = deletion.not("id", "in", `(${keptIds.join(",")})`);
  }
  await deletion;

  const { error: questionsError } = await supabase
    .from("survey_questions")
    .upsert(
      questions.map((question, position) => ({
        ...(question.id ? { id: question.id } : {}),
        survey_id: saved.id,
        position,
        kind: question.kind,
        label: question.label,
        // Une question à choix unique n'a pas de lignes à l'écran, mais en
        // porte une en base : les réponses gardent ainsi une forme unique.
        rows:
          question.kind === "single"
            ? [{ key: SINGLE_ROW_KEY, label: "" }]
            : question.rows,
        choices: question.choices,
        is_required: question.is_required,
        is_segment: question.is_segment,
        is_charted: question.is_charted,
      })),
      { onConflict: "id" },
    );

  if (questionsError) {
    console.error("[sondage] questions non enregistrees", questionsError);
    return { success: false, error: "Questions non enregistrées" };
  }

  revalidatePath("/admin/sondages");
  return { success: true, data: { id: saved.id } };
};

/**
 * Supprime un sondage — et ses réponses avec lui, par cascade.
 *
 * Refusé dès qu'une réponse existe : « clôturer » couvre le besoin courant
 * (arrêter la collecte) sans détruire des données que personne ne pourra
 * reconstituer.
 */
export const deleteSurvey = async (id: string): Promise<ActionResult<null>> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { count } = await supabase
    .from("survey_responses")
    .select("id", { count: "exact", head: true })
    .eq("survey_id", id);

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: `Ce sondage a ${count} réponses. Clôturez-le plutôt que de le supprimer.`,
    };
  }

  const { error } = await supabase.from("surveys").delete().eq("id", id);
  if (error) return { success: false, error: "Suppression impossible" };

  revalidatePath("/admin/sondages");
  return { success: true, data: null };
};
```

- [ ] **Step 4: Écrire la page de liste**

Créer `src/app/(dashboard)/admin/sondages/page.tsx` :

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listSurveys } from "./actions";

export default async function AdminSurveysPage() {
  const surveys = await listSurveys();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-primary-green">Sondages</h1>
        <Button asChild>
          <Link href="/admin/sondages/nouveau">Nouveau sondage</Link>
        </Button>
      </div>

      {surveys.length === 0 ? (
        <p className="text-primary-green/70">Aucun sondage pour le moment.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {surveys.map((survey) => (
            <li
              key={survey.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div>
                <Link
                  href={`/admin/sondages/${survey.id}`}
                  className="font-medium text-primary-green hover:underline"
                >
                  {survey.title}
                </Link>
                <p className="text-sm text-primary-green/60">/{survey.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">{survey.status}</Badge>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/sondages/${survey.id}/reponses`}>
                    Réponses
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Écrire le constructeur de sondage**

Créer `src/app/(dashboard)/admin/sondages/_components/survey-builder.tsx` : composant client `"use client"` avec un état `SurveyDefinitionInput`, qui rend :

- champs `slug`, `title`, `intro`, `status` (select des trois valeurs), `thank_you_message` (textarea) ;
- une liste de questions, chacune avec : `label`, `kind` (select `matrix`/`single`), cases `is_required`, `is_segment`, `is_charted`, un éditeur de `rows` (masqué si `kind === "single"`) et un éditeur de `choices`, chaque entrée ayant `key` et `label` avec bouton de suppression ;
- boutons « Ajouter une question », « Ajouter une ligne », « Ajouter une option », « Enregistrer » ;
- la clé est proposée automatiquement à partir du libellé (`slugify`) mais reste modifiable **uniquement tant que la question est nouvelle** — afficher le champ clé en lecture seule si `question.id` existe, avec la mention « clé figée : des réponses y sont rattachées ».

À la soumission : `const result = await saveSurvey(state)` ; en cas de `result.success === false`, afficher `result.error` via `toast.error` (`sonner`, déjà utilisé partout) ; sinon `toast.success("Sondage enregistré")` puis `router.push("/admin/sondages")`.

Réutiliser `slugify` en le copiant depuis `src/app/(dashboard)/admin/blog/actions.ts` vers un helper local du composant :

```ts
const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
```

- [ ] **Step 6: Écrire les pages d'édition**

Créer `src/app/(dashboard)/admin/sondages/[id]/page.tsx` :

```tsx
import { notFound } from "next/navigation";
import { getSurveyForAdmin } from "../actions";
import { SurveyBuilder } from "../_components/survey-builder";

export default async function EditSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // « nouveau » n'est pas un identifiant : la même page sert la création, ce
  // qui évite de dupliquer le constructeur dans deux routes.
  if (id === "nouveau") return <SurveyBuilder survey={null} />;

  const survey = await getSurveyForAdmin(id);
  if (!survey) notFound();

  return <SurveyBuilder survey={survey} />;
}
```

- [ ] **Step 7: Ajouter l'entrée de navigation admin**

Run: `grep -n "blog" src/config/navigation.ts | head`
Puis ajouter une entrée « Sondages » (`href: "/admin/sondages"`, icône `BarChart3`) au même groupe que « Blog », en suivant la forme exacte des entrées voisines.

- [ ] **Step 8: Vérifier**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: aucune erreur.

Run: `pnpm dev` puis ouvrir `http://localhost:3000/admin/sondages/nouveau`, créer un sondage de test à deux questions, l'enregistrer, vérifier qu'il apparaît dans la liste.

- [ ] **Step 9: Commit**

```bash
git add "src/app/(dashboard)/admin/sondages" src/validations/surveys.ts src/config/navigation.ts
git commit -m "feat(sondages): administration - creation et edition des sondages"
```

---

### Task 8: Consultation des réponses et export CSV

**Files:**
- Create: `src/lib/surveys/csv.ts`
- Create: `src/lib/surveys/csv.spec.ts`
- Create: `src/app/(dashboard)/admin/sondages/[id]/reponses/page.tsx`
- Create: `src/app/api/admin/sondages/[id]/export/route.ts`

**Interfaces:**
- Consumes: `SurveyDefinition`, `SurveyResponseRow`, `getSurveyForAdmin`.
- Produces: `toSurveyCsv(survey: SurveyDefinition, responses: SurveyResponseRow[]): string` ; page de consultation ; route d'export.

- [ ] **Step 1: Écrire les tests CSV**

Créer `src/lib/surveys/csv.spec.ts` :

```ts
import { describe, expect, it } from "vitest";
import { toSurveyCsv } from "./csv";
import type { SurveyDefinition } from "./types";
import type { SurveyResponseRow } from "@/types/database";

const survey: SurveyDefinition = {
  id: "s1",
  slug: "reveils",
  title: "Réveils",
  intro: null,
  status: "published",
  thank_you_message: "",
  questions: [
    {
      id: "q1",
      position: 0,
      kind: "matrix",
      label: "Réveils",
      rows: [{ key: "0-2", label: "0-2 mois" }],
      choices: [{ key: "aucun", label: "pas de réveils" }],
      is_required: true,
      is_segment: false,
      is_charted: true,
    },
  ],
};

const response = (overrides: Partial<SurveyResponseRow> = {}): SurveyResponseRow => ({
  id: "r1",
  survey_id: "s1",
  answers: { q1: { "0-2": "aucun" } },
  segment_key: "6-9",
  email: "parent@example.com",
  marketing_consent: true,
  consent_text: "…",
  consented_at: "2026-08-04T10:00:00Z",
  source_path: "/blog/article",
  ip_hash: null,
  created_at: "2026-08-04T10:00:00Z",
  ...overrides,
});

describe("toSurveyCsv", () => {
  it("produit une colonne par ligne de question", () => {
    const [header] = toSurveyCsv(survey, [response()]).split("\n");
    expect(header).toContain("Réveils — 0-2 mois");
  });

  it("écrit les libellés, pas les clés techniques", () => {
    expect(toSurveyCsv(survey, [response()])).toContain("pas de réveils");
  });

  it("échappe les valeurs contenant un point-virgule ou un guillemet", () => {
    const csv = toSurveyCsv(survey, [
      response({ source_path: '/blog/a;b"c' }),
    ]);
    expect(csv).toContain('"/blog/a;b""c"');
  });

  it("laisse la cellule vide quand la ligne n'a pas été renseignée", () => {
    const csv = toSurveyCsv(survey, [response({ answers: {} })]);
    expect(csv.split("\n")[1]).toContain(";;");
  });
});
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `pnpm exec vitest run src/lib/surveys/csv.spec.ts`
Expected: FAIL — `Failed to resolve import "./csv"`.

- [ ] **Step 3: Implémenter la sérialisation CSV**

Créer `src/lib/surveys/csv.ts` :

```ts
import type { SurveyResponseRow } from "@/types/database";
import type { SurveyDefinition } from "./types";

/**
 * Séparateur point-virgule : Excel en configuration française lit une virgule
 * comme un séparateur décimal et empile tout dans une seule colonne.
 */
const SEPARATOR = ";";

const escape = (value: string): string =>
  /[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/**
 * Sérialise les réponses en une ligne par répondant.
 *
 * Les clés techniques sont traduites en libellés : le fichier part chez une
 * personne qui lit un tableur, pas chez un développeur.
 */
export const toSurveyCsv = (
  survey: SurveyDefinition,
  responses: SurveyResponseRow[],
): string => {
  const columns = survey.questions.flatMap((question) =>
    question.rows.map((row) => ({
      questionId: question.id,
      rowKey: row.key,
      header: row.label ? `${question.label} — ${row.label}` : question.label,
      labels: new Map(question.choices.map((c) => [c.key, c.label])),
    })),
  );

  const header = [
    "Date",
    "Email",
    "Consentement",
    "Segment",
    "Page",
    ...columns.map((column) => column.header),
  ];

  const lines = responses.map((response) => {
    const cells = [
      new Date(response.created_at).toLocaleString("fr-FR"),
      response.email ?? "",
      response.marketing_consent ? "oui" : "non",
      response.segment_key ?? "",
      response.source_path ?? "",
      ...columns.map((column) => {
        const choiceKey = response.answers?.[column.questionId]?.[column.rowKey];
        return choiceKey ? (column.labels.get(choiceKey) ?? choiceKey) : "";
      }),
    ];

    return cells.map(escape).join(SEPARATOR);
  });

  return [header.map(escape).join(SEPARATOR), ...lines].join("\n");
};
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `pnpm exec vitest run src/lib/surveys/csv.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Écrire la route d'export**

Créer `src/app/api/admin/sondages/[id]/export/route.ts` :

```ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { toSurveyCsv } from "@/lib/surveys/csv";
import type { SurveyDefinition } from "@/lib/surveys/types";
import type { SurveyResponseRow } from "@/types/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: survey } = await supabase
    .from("surveys")
    .select("*, survey_questions(*)")
    .eq("id", id)
    .maybeSingle();

  if (!survey) {
    return NextResponse.json({ error: "Sondage introuvable" }, { status: 404 });
  }

  const { data: responses } = await supabase
    .from("survey_responses")
    .select("*")
    .eq("survey_id", id)
    .order("created_at", { ascending: false });

  const definition: SurveyDefinition = {
    ...survey,
    questions: [...(survey.survey_questions ?? [])].sort(
      (a, b) => a.position - b.position,
    ),
  };

  const csv = toSurveyCsv(definition, (responses ?? []) as SurveyResponseRow[]);

  // BOM UTF-8 : sans lui, Excel affiche « rÃ©veils » à l'ouverture du fichier.
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sondage-${survey.slug}.csv"`,
    },
  });
}
```

- [ ] **Step 6: Écrire la page de consultation**

Créer `src/app/(dashboard)/admin/sondages/[id]/reponses/page.tsx` : composant serveur qui

1. appelle `getSurveyForAdmin(id)` (404 via `notFound()` si absent) ;
2. lit les 200 dernières réponses via `createAdminClient()` ;
3. affiche le nombre total de réponses, le nombre d'emails collectés avec consentement, et un tableau (`src/components/ui/table`) : date, email, segment, page source, puis une colonne par ligne de question, libellés traduits comme dans `toSurveyCsv` ;
4. affiche `<SurveyChart payload={…} />` au-dessus du tableau, en construisant le payload avec `getSurveyCounts(id)` ;
5. propose un lien `<Button asChild><a href={`/api/admin/sondages/${id}/export`}>Exporter en CSV</a></Button>`.

- [ ] **Step 7: Vérifier**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test`
Expected: tout au vert.

- [ ] **Step 8: Commit**

```bash
git add src/lib/surveys/csv.ts src/lib/surveys/csv.spec.ts "src/app/(dashboard)/admin/sondages/[id]/reponses" "src/app/api/admin/sondages"
git commit -m "feat(sondages): consultation des reponses et export CSV"
```

---

### Task 9: Sondage « réveils nocturnes » et recette de bout en bout

**Files:**
- Create: `supabase/migrations/00062_sondage_reveils_nocturnes.sql`

**Interfaces:**
- Consumes: schéma de Task 1.
- Produces: le sondage `reveils-nocturnes-bebe` en base, prêt à être embarqué.

- [ ] **Step 1: Écrire le seed**

Créer `supabase/migrations/00062_sondage_reveils_nocturnes.sql` :

```sql
-- Le sondage de Carole, repris du formulaire Jotform qu'il remplace.
--
-- Pose en migration plutot qu'a la main : l'environnement de developpement, les
-- previews et la production doivent partir de la meme definition, et les cles
-- de choix — recopiees dans chaque reponse — ne doivent pas differer d'un
-- environnement a l'autre.
--
-- Une troisieme question est ajoutee par rapport a Jotform : l'age du bebe du
-- repondant. La question matricielle fait repondre sur les neuf tranches, elle
-- ne dit donc pas a quel segment la famille appartient — sans cette question,
-- ni la segmentation Brevo ni le resultat personnalise ne sont calculables.

INSERT INTO surveys (slug, title, intro, status, thank_you_message)
VALUES (
  'reveils-nocturnes-bebe',
  'Mon bébé est-il le seul à se réveiller la nuit ?',
  'Merci de participer à ce petit sondage entre parents ! L''objectif est de montrer la réalité des réveils nocturnes des bébés selon leur tranche d''âge ✨',
  'draft',
  'N''hésitez pas à revenir remplir ce sondage dans quelques mois, quand votre bébé aura grandi.'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO survey_questions
  (survey_id, position, kind, label, rows, choices, is_required, is_segment, is_charted)
SELECT
  s.id, 0, 'single',
  'Quel âge a votre bébé ?',
  '[{"key": "_", "label": ""}]'::jsonb,
  '[
    {"key": "0-2-mois",   "label": "0-2 mois"},
    {"key": "2-4-mois",   "label": "2-4 mois"},
    {"key": "4-6-mois",   "label": "4-6 mois"},
    {"key": "6-9-mois",   "label": "6-9 mois"},
    {"key": "9-12-mois",  "label": "9-12 mois"},
    {"key": "12-18-mois", "label": "12-18 mois"},
    {"key": "18-24-mois", "label": "18-24 mois"},
    {"key": "2-3-ans",    "label": "2-3 ans"},
    {"key": "3-4-ans",    "label": "3-4 ans"}
  ]'::jsonb,
  true, true, false
FROM surveys s WHERE s.slug = 'reveils-nocturnes-bebe'
ON CONFLICT DO NOTHING;

INSERT INTO survey_questions
  (survey_id, position, kind, label, rows, choices, is_required, is_segment, is_charted)
SELECT
  s.id, 1, 'matrix',
  'Combien de réveils nocturnes observez-vous en moyenne selon l''âge de votre bébé ?',
  '[
    {"key": "0-2-mois",   "label": "0-2 mois"},
    {"key": "2-4-mois",   "label": "2-4 mois"},
    {"key": "4-6-mois",   "label": "4-6 mois"},
    {"key": "6-9-mois",   "label": "6-9 mois"},
    {"key": "9-12-mois",  "label": "9-12 mois"},
    {"key": "12-18-mois", "label": "12-18 mois"},
    {"key": "18-24-mois", "label": "18-24 mois"},
    {"key": "2-3-ans",    "label": "2-3 ans"},
    {"key": "3-4-ans",    "label": "3-4 ans"}
  ]'::jsonb,
  -- L'ordre commande la couleur : vert, marron clair, rose moyen, rose soutenu.
  '[
    {"key": "aucun",     "label": "pas de réveils"},
    {"key": "quelques",  "label": "quelques réveils"},
    {"key": "un-a-deux", "label": "1 à 2 réveils / nuit"},
    {"key": "plusieurs", "label": "plusieurs réveils / nuit"}
  ]'::jsonb,
  false, false, true
FROM surveys s WHERE s.slug = 'reveils-nocturnes-bebe'
ON CONFLICT DO NOTHING;

INSERT INTO survey_questions
  (survey_id, position, kind, label, rows, choices, is_required, is_segment, is_charted)
SELECT
  s.id, 2, 'single',
  'Question bonus : quel est le sujet qui vous importe le plus sur le sommeil de votre bébé allaité ?',
  '[{"key": "_", "label": ""}]'::jsonb,
  '[
    {"key": "reveils-nocturnes",   "label": "Les réveils nocturnes"},
    {"key": "siestes-courtes",     "label": "Les siestes courtes"},
    {"key": "endormissement-sein", "label": "L''endormissement au sein"},
    {"key": "mauvaises-habitudes", "label": "La peur des mauvaises habitudes"},
    {"key": "attachement",         "label": "L''attachement"},
    {"key": "organisation",        "label": "L''organisation du sommeil (cododo ou non)"},
    {"key": "tenir-le-jour",       "label": "Tenir le coup la journée"},
    {"key": "peur-accident",       "label": "La peur d''un accident"},
    {"key": "lactation",           "label": "Le maintien ou la baisse de la lactation"},
    {"key": "exterieur",           "label": "L''adaptabilité à l''extérieur"}
  ]'::jsonb,
  false, false, false
FROM surveys s WHERE s.slug = 'reveils-nocturnes-bebe'
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Appliquer**

Run: `pnpm db:push:dry && pnpm db:push`
Expected: migration appliquée sans erreur.

- [ ] **Step 3: Recette manuelle**

Run: `pnpm dev`

Vérifier, dans l'ordre :
1. `/admin/sondages` liste « Mon bébé est-il le seul à se réveiller la nuit ? » en statut `draft`.
2. Passer le statut à `published` et enregistrer.
3. Dans `/admin/blog`, créer un article de test, taper `/` puis « Sondage », choisir le sondage en mode « Formulaire + résultat », publier l'article.
4. Ouvrir l'article public : le formulaire s'affiche, les neuf tranches sont en cartes empilées, pas en tableau scrollable.
5. Répondre **sans** email → page de remerciement, graphique affiché, aucune barre visible tant qu'une tranche n'atteint pas 10 réponses.
6. Répondre **avec** email + prénom + consentement → vérifier la ligne dans `newsletter_subscribers` (`source = 'sondage'`) et l'attribut `TRANCHE_AGE` côté Brevo si `BREVO_LIST_ID_NEWSLETTER` est configuré.
7. Ajouter un second bloc en mode « Graphique seul » dans un autre article : les chiffres sont identiques et se mettent à jour au bout de 90 s sans rechargement.
8. `/admin/sondages/<id>/reponses` : les réponses apparaissent, l'export CSV s'ouvre correctement dans un tableur.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00062_sondage_reveils_nocturnes.sql
git commit -m "feat(sondages): definition du sondage reveils nocturnes"
```

---

## Points volontairement hors périmètre

- **Notification email à Carole à chaque soumission** — écartée à l'arbitrage. Resend est déjà branché (`src/lib/resend/`) : une fonction appelée depuis `submitSurveyResponse`, après l'insertion, suffira le jour venu.
- **Retrait du formulaire Jotform** — décision de Carole, hors code.
- **Éditeur d'article : blocs déplaçables et bibliothèque de blocs** — traités dans le plan `2026-08-04-editeur-article-blocs.md`.
