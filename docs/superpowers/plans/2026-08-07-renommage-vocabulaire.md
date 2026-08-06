# Renommage Événement → Formation → Accompagnement — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aligner base, code, routes et données stockées sur le vocabulaire produit — « formation » pour le pro, « accompagnement » pour les clientes, « événement » nulle part.

**Architecture:** Un échange circulaire `events → formations → accompagnements` appliqué à quatre couches. L'ordre est imposé partout par la circularité : on libère un nom avant de l'occuper. Le code est renommé d'abord (tâches 2–3), en gardant les noms de tables SQL intacts, ce qui laisse l'application fonctionnelle contre la base actuelle. Puis les noms de tables basculent côté code (tâche 4) et côté base (tâche 5) — ces deux-là ne peuvent pas être séparées dans le temps.

**Tech Stack:** Next.js 16.1.6 App Router, TypeScript, Supabase (PostgreSQL, projet distant `chhrhrijtelevozjccqj`), Zod v4, Vitest, Playwright.

## Global Constraints

- **Aucun changement de comportement.** Si une page rend différemment après ce chantier, c'est un bug.
- **Règle de désambiguïsation : la table lue, pas le nom actuel.** `FormationsList` lit `events` → c'est du pro → il garde son nom. `FormationCard` lit `formations` → c'est un accompagnement → il devient `AccompagnementCard`.
- **Jamais de substitution globale en une passe.** Toujours : occupant déplacé d'abord, nouveau nom installé ensuite.
- **Ne pas toucher** : `training_providers`, `newsletter_events`, `trackNewsletterEvent`, le type `NewsletterEvent`, `withdrawal_waivers`, `src/config/formations.ts`, les shims `/espace-client/formations`.
- **Ne pas réécrire les migrations `00001`–`00069`** ni les specs/plans antérieurs à celui-ci. Ce sont des journaux, pas des états.
- **`tsc --noEmit` a 35 erreurs préexistantes** dans `src/middleware.spec.ts`, `src/app/(dashboard)/admin/marketing/actions.spec.ts` et `src/app/(dashboard)/espace-consultante/crm/segments/actions.spec.ts`. Le critère est « aucune erreur nouvelle », jamais « zéro erreur ».
- **Baseline de tests : 558 tests, 65 fichiers.** Le compte doit rester identique — ce chantier n'ajoute ni ne retire de comportement.
- **Tous les déplacements de fichiers passent par `git mv`**, pour que l'historique suive.
- **Ne jamais lancer `pnpm db:push`** sans validation explicite de Théo : il cible la base **de production**.

---

## Structure des fichiers

Trois familles de changements, à ne pas mélanger dans un même commit.

**Renommages de chemins** — 4 collisions (`src/lib/formations`, `src/validations/formations.ts`, `admin/formations`, `tab-formations.tsx`) où l'occupant doit partir avant l'arrivant. Toutes traitées en tâche 2 (départ) puis tâche 3 (arrivée).

**Renommages d'identifiants** — ~70 exports plus leurs usages. Deux passes séparées, jamais simultanées.

**Renommages de chaînes** — noms de tables dans `.from()`, noms de colonnes dans les `select`/`eq`/`insert`, et discriminants d'automatisations. Regroupés en tâche 4 parce qu'ils sont les seuls à devoir basculer en même temps que la base.

---

## Task 1: Corrections préalables

Trois défauts indépendants du renommage, corrigés d'abord pour qu'ils ne se confondent pas avec lui dans la revue. Le deuxième est un vrai bug de production.

**Files:**
- Modify: `src/middleware.ts` (retirer `"/evenements"` de la liste des routes publiques)
- Modify: `src/middleware.spec.ts` (retirer `"/evenements"` du `it.each`)
- Modify: `src/app/(dashboard)/admin/evenements/actions.ts` (4 × `revalidatePath`)
- Delete: `src/app/(dashboard)/espace-client/` (arborescence de dossiers vides)

**Interfaces:**
- Consumes: rien.
- Produces: rien. Aucun symbole exporté ne change.

- [ ] **Step 1: Constater le bug de revalidation**

```bash
grep -n 'revalidatePath("/evenements")' 'src/app/(dashboard)/admin/evenements/actions.ts'
```

Attendu : 4 lignes (67, 132, 156, 186). La route `/evenements` n'existe plus depuis le chantier
précédent — ces appels ne purgent donc rien, et la page publique `/formations` garde son cache
après une édition admin.

- [ ] **Step 2: Corriger les 4 appels**

```bash
sed -i '' 's|revalidatePath("/evenements")|revalidatePath("/formations")|g' \
  'src/app/(dashboard)/admin/evenements/actions.ts'
grep -c 'revalidatePath("/formations")' 'src/app/(dashboard)/admin/evenements/actions.ts'
```

Attendu : au moins 4.

- [ ] **Step 3: Retirer l'entrée morte du middleware**

Dans `src/middleware.ts`, supprimer la ligne `"/evenements",` de la liste des routes publiques.
Dans `src/middleware.spec.ts` ligne 50, retirer `"/evenements"` du tableau :

```ts
it.each(["/", "/formations", "/consultantes", "/blog", "/reserver"])(
```

- [ ] **Step 4: Supprimer les dossiers vides**

```bash
find 'src/app/(dashboard)/espace-client' -type f | wc -l   # doit afficher 0
rm -rf 'src/app/(dashboard)/espace-client'
```

Le `wc -l` est la garde : s'il affiche autre chose que 0, s'arrêter et signaler — le dossier
contient du code, contrairement à ce qu'annonce ce plan.

- [ ] **Step 5: Vérifier**

```bash
pnpm test && pnpm lint
```

Attendu : 558 tests passent (le `it.each` perd un cas mais reste un seul test paramétré — si le
total change, vérifier pourquoi avant de continuer), ESLint sans erreur.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix: revalider /formations au lieu de la route /evenements supprimee

Les 4 revalidatePath de l'admin visaient une route disparue lors du
renommage public. Consequence : le cache de la page publique /formations
n'etait jamais purge apres une edition. Nettoie aussi l'entree morte du
middleware et des dossiers vides.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Passe accompagnements — `Formation*` → `Accompagnement*`

Libère le mot « formation » côté clientes. **Ne touche à aucun nom de table SQL** : après cette
tâche, l'application tourne toujours contre la base actuelle.

**Files:**
- Move: `src/app/(dashboard)/admin/formations/` → `src/app/(dashboard)/admin/accompagnements/`
- Move: `src/app/(dashboard)/espace-consultante/formations/` → `src/app/(dashboard)/espace-consultante/accompagnements/`
- Move: `src/lib/formations/authorization.ts` + `authorization.spec.ts` → `src/lib/accompagnements/`
- Move: `src/validations/formations.ts` → `src/validations/accompagnements.ts`
- Move: `src/components/formations/formation-card.tsx` → `src/components/accompagnements/accompagnement-card.tsx`
- Move: `src/app/(dashboard)/admin/utilisateurs/[id]/_components/tab-formations.tsx` → `tab-accompagnements.tsx`
- Move: `src/app/(dashboard)/admin/utilisateurs/_components/enroll-to-formation-modal.tsx` → `enroll-to-accompagnement-modal.tsx`
- Move: `src/app/(public)/espace-client/accompagnements/[id]/_components/formation-reader.tsx` → `accompagnement-reader.tsx`
- Move: `src/app/(public)/espace-client/accompagnements/[id]/_components/formation-onboarding.tsx` → `accompagnement-onboarding.tsx`
- Move: `admin/accompagnements/_components/formation-editor.tsx` → `accompagnement-editor.tsx`
- Move: `admin/accompagnements/_components/formation-create-form.tsx` → `accompagnement-create-form.tsx`
- Move: `admin/accompagnements/_components/formation-status-toggle.tsx` → `accompagnement-status-toggle.tsx`
- Move: `admin/accompagnements/_components/duplicate-formation-button.tsx` → `duplicate-accompagnement-button.tsx`
- Modify: `src/config/navigation.ts` (entrées de menu du dashboard)

**Interfaces:**
- Consumes: rien de la tâche 1.
- Produces, pour les tâches suivantes — types : `Accompagnement`, `AccompagnementBlock`, `AccompagnementCollaborator`, `AccompagnementCollaboratorInput`, `AccompagnementCollaboratorRow`, `AccompagnementEnrollment`, `AccompagnementInput`, `AccompagnementProgress`, `AccompagnementResource`, `AccompagnementSection`, `AccompagnementStatus`, `AccompagnementWithSections`, `AvailableAccompagnement`, `AccompagnementEnrolledTriggerConfig`, `AccompagnementPurchasedConfig`.
  Composants : `AccompagnementCard`, `AccompagnementEditor`, `AccompagnementOnboarding`, `AccompagnementReader`, `AccompagnementStatusToggle`, `AdminAccompagnementCreateForm`, `DuplicateAccompagnementButton`, `EnrollToAccompagnementModal`, `TabAccompagnements`.
  Fonctions : `canEditAccompagnement`, `createAccompagnement`, `deleteAccompagnement`, `duplicateAccompagnement`, `getAccompagnementCollaborators`, `getAccompagnements`, `hasAccompagnementEnrollment`, `listAvailableAccompagnementsForClient`, `purchaseAccompagnement`, `sendAccompagnementAccess`, `splitAccompagnementRevenue`, `unenrollFromAccompagnement`, `updateAccompagnement`, `updateAccompagnementStatus`, `accompagnementSchema`, `accompagnementCollaboratorSchema`.
  **Ne changent pas** : `FormationsList`, `FORMATION_SCHOOL_PRICE_LABEL`, `FORMATION_SCHOOL_PRICE_HINT` (tous du pro).

- [ ] **Step 1: Déplacer les fichiers**

```bash
git mv 'src/app/(dashboard)/admin/formations' 'src/app/(dashboard)/admin/accompagnements'
git mv 'src/app/(dashboard)/espace-consultante/formations' 'src/app/(dashboard)/espace-consultante/accompagnements'
git mv src/lib/formations/authorization.ts src/lib/accompagnements/authorization.ts
git mv src/lib/formations/authorization.spec.ts src/lib/accompagnements/authorization.spec.ts
rmdir src/lib/formations
git mv src/validations/formations.ts src/validations/accompagnements.ts
mkdir -p src/components/accompagnements
git mv src/components/formations/formation-card.tsx src/components/accompagnements/accompagnement-card.tsx
rmdir src/components/formations 2>/dev/null || ls src/components/formations
```

Le dernier `rmdir` échoue si `src/components/formations/` contient encore autre chose ; le `ls`
affiche alors quoi. Vérifier avant de forcer.

- [ ] **Step 2: Déplacer les composants restants**

```bash
cd 'src/app/(dashboard)/admin/accompagnements/_components'
git mv formation-editor.tsx accompagnement-editor.tsx
git mv formation-create-form.tsx accompagnement-create-form.tsx
git mv formation-status-toggle.tsx accompagnement-status-toggle.tsx
git mv duplicate-formation-button.tsx duplicate-accompagnement-button.tsx
cd -
git mv 'src/app/(dashboard)/admin/utilisateurs/[id]/_components/tab-formations.tsx' \
       'src/app/(dashboard)/admin/utilisateurs/[id]/_components/tab-accompagnements.tsx'
git mv 'src/app/(dashboard)/admin/utilisateurs/_components/enroll-to-formation-modal.tsx' \
       'src/app/(dashboard)/admin/utilisateurs/_components/enroll-to-accompagnement-modal.tsx'
cd 'src/app/(public)/espace-client/accompagnements/[id]/_components'
git mv formation-reader.tsx accompagnement-reader.tsx
git mv formation-onboarding.tsx accompagnement-onboarding.tsx
cd -
```

- [ ] **Step 3: Renommer les identifiants du domaine accompagnements**

Renommer, dans tout `src/` : `Formation` → `Accompagnement`, `formation` → `accompagnement`,
`formations` → `accompagnements` — **uniquement sur les symboles listés dans le bloc Interfaces
ci-dessus**, plus les chemins d'import qui les désignent.

Se laisser guider par `tsc`, pas par un `sed` global : les imports cassés par l'étape 1 pointent
exactement les fichiers à traiter.

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "Cannot find module|has no exported member" | head -40
```

**Ne pas renommer**, même si le mot apparaît : `FormationsList`, `src/config/formations.ts` et ses
deux constantes, `src/app/(public)/formations/**`, `src/app/(public)/espace-client/formations/**`
(shims), `src/lib/events/**`, `src/validations/events.ts`, tout ce qui lit la table `events`.

- [ ] **Step 4: Renommer les chaînes de table dans les tests concernés**

Aucune. Les noms de tables SQL restent `formations`, `formation_sections`, etc. jusqu'à la tâche 4.
Un test qui assert `.from("formations")` reste vrai.

- [ ] **Step 5: Mettre à jour la navigation**

Dans `src/config/navigation.ts`, remplacer les `href` `/admin/formations` →
`/admin/accompagnements` et `/espace-consultante/formations` →
`/espace-consultante/accompagnements`. Adapter les libellés visibles en « Accompagnements ».

Ne pas toucher au `href` `/accompagnements` public, déjà correct.

- [ ] **Step 6: Vérifier**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -vE "middleware\.spec|marketing/actions\.spec|crm/segments/actions\.spec" | grep "error TS"
pnpm test
pnpm lint
```

Attendu : première commande silencieuse, 558 tests, ESLint propre.

- [ ] **Step 7: Vérifier qu'aucun résidu ne subsiste dans le domaine accompagnements**

```bash
grep -rn "Formation" 'src/app/(dashboard)/admin/accompagnements' \
  'src/app/(dashboard)/espace-consultante/accompagnements' \
  src/lib/accompagnements src/validations/accompagnements.ts \
  src/components/accompagnements
```

Attendu : aucune sortie.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(accompagnements): renommer Formation* en Accompagnement*

Libere le mot « formation » pour les sessions professionnelles. Aucun nom
de table SQL ne bouge a ce stade : l'application tourne toujours contre la
base actuelle.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Passe formations pro — `Event*` → `Formation*`

Occupe le nom libéré par la tâche 2. **Ne touche toujours à aucun nom de table SQL.**

**Files:**
- Move: `src/app/(dashboard)/admin/evenements/` → `src/app/(dashboard)/admin/formations/`
- Move: `src/app/(dashboard)/espace-consultante/evenements/` → `src/app/(dashboard)/espace-consultante/formations/`
- Move: `src/lib/events/` → `src/lib/formations/`
- Move: `src/validations/events.ts` → `src/validations/formations.ts`
- Move: `src/config/event-highlights.ts` → `src/config/formation-highlights.ts`
- Move: `src/config/event-highlights.spec.ts` → `src/config/formation-highlights.spec.ts`
- Move: `admin/formations/_components/event-form.tsx` → `formation-form.tsx`
- Move: `admin/formations/_components/event-content-fields.tsx` → `formation-content-fields.tsx`
- Move: `admin/formations/_components/event-highlights-field.tsx` → `formation-highlights-field.tsx`
- Move: `src/app/(public)/formations/[slug]/_components/event-detail.tsx` → `formation-detail.tsx`
- Move: `src/app/(dashboard)/admin/utilisateurs/[id]/_components/tab-evenements.tsx` → `tab-formations.tsx`
- Move: `admin/automations/recurrents/_components/recurring-event-form-dialog.tsx` → `recurring-formation-form-dialog.tsx`
- Move: `src/lib/admin-workflows/generate-events.ts` → `generate-formations.ts`
- Modify: `src/config/navigation.ts`

**Interfaces:**
- Consumes: tous les symboles `Accompagnement*` produits par la tâche 2 — les fichiers touchés ici en importent (`admin/utilisateurs`, `automations`).
- Produces — types : `Formation` (ex-`Event`), `FormationData`, `FormationType`, `FormationInput`, `FormationRegistration`, `FormationContentField`, `FormationContentFieldsProps`, `FormationDetailProps`, `FormationDetailConsultant`, `FormationHighlightsFieldProps`, `RecurringFormationDefinition`, `RecurringFormationDefinitionInput`, `RecurringFormationTriggerConfig`, `FormationRegisteredConfig`, `DelayAfterFormationConfig`.
  Composants : `FormationForm`, `FormationContentFields`, `FormationHighlightsField`, `FormationDetail`, `RecurringFormationFormDialog`, `TabFormations`.
  Fonctions : `createFormation`, `updateFormation`, `deleteFormation`, `toggleFormationPublish`, `registerForFormation`, `getFormationRegistrationsCount`, `hasFormationRegistration`, `generateRecurringFormations`, `scheduleWorkflowActionsForUpcomingFormations`, `formationSchema`, `recurringFormationDefinitionSchema`, `filterFormationHighlightKeys`, `resolveFormationHighlights`.
  Constantes : `FORMATION_HIGHLIGHTS`, `FORMATION_HIGHLIGHT_KEYS`.

  **Collision d'identifiants à arbitrer** : `createFormation`, `updateFormation`, `deleteFormation`, `formationSchema` et `FormationInput` existaient déjà côté accompagnements. La tâche 2 les a renommés en `createAccompagnement`, etc. Les noms sont donc libres. Vérifier ce point avant de commencer : si `tsc` signale un doublon, c'est que la tâche 2 est incomplète.

- [ ] **Step 1: Vérifier que la tâche 2 a bien libéré les noms**

```bash
grep -rn "export const createFormation\|export const formationSchema\|export type FormationInput" src
```

Attendu : aucune sortie. S'il y en a, revenir à la tâche 2 avant d'aller plus loin.

- [ ] **Step 2: Déplacer les fichiers**

```bash
git mv 'src/app/(dashboard)/admin/evenements' 'src/app/(dashboard)/admin/formations'
git mv 'src/app/(dashboard)/espace-consultante/evenements' 'src/app/(dashboard)/espace-consultante/formations'
git mv src/lib/events src/lib/formations
git mv src/validations/events.ts src/validations/formations.ts
git mv src/config/event-highlights.ts src/config/formation-highlights.ts
git mv src/config/event-highlights.spec.ts src/config/formation-highlights.spec.ts
git mv src/lib/admin-workflows/generate-events.ts src/lib/admin-workflows/generate-formations.ts
cd 'src/app/(dashboard)/admin/formations/_components'
git mv event-form.tsx formation-form.tsx
git mv event-content-fields.tsx formation-content-fields.tsx
git mv event-highlights-field.tsx formation-highlights-field.tsx
cd -
git mv 'src/app/(public)/formations/[slug]/_components/event-detail.tsx' \
       'src/app/(public)/formations/[slug]/_components/formation-detail.tsx'
git mv 'src/app/(dashboard)/admin/utilisateurs/[id]/_components/tab-evenements.tsx' \
       'src/app/(dashboard)/admin/utilisateurs/[id]/_components/tab-formations.tsx'
git mv 'src/app/(dashboard)/admin/automations/recurrents/_components/recurring-event-form-dialog.tsx' \
       'src/app/(dashboard)/admin/automations/recurrents/_components/recurring-formation-form-dialog.tsx'
```

- [ ] **Step 3: Renommer les identifiants du domaine pro**

`Event` → `Formation`, `event` → `formation`, `events` → `formations` sur les symboles du bloc
Interfaces et leurs usages. Se laisser guider par `tsc` :

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "Cannot find module|has no exported member" | head -40
```

**Ne pas renommer** : `trackNewsletterEvent`, le type `NewsletterEvent`, la table
`newsletter_events`, ni aucun `event` de React (`onClick={(event) => …}`, `event.preventDefault()`,
`addEventListener`). Ces derniers sont nombreux — c'est la raison pour laquelle un `sed` global est
proscrit.

- [ ] **Step 4: Renommer les clés du catalogue de repères ?**

Non. `EVENT_HIGHLIGHTS` devient `FORMATION_HIGHLIGHTS`, mais ses **clés** (`"elearning"`,
`"webinar"`, `"zoom"`, `"certificate"`, `"evidence"`, `"ibclc"`) sont stockées en base dans
`events.highlights` et ne contiennent pas le mot « event ». Elles ne bougent pas.

- [ ] **Step 5: Mettre à jour la navigation**

Dans `src/config/navigation.ts` : `/admin/evenements` → `/admin/formations`,
`/espace-consultante/evenements` → `/espace-consultante/formations`. Libellés visibles en
« Formations ».

- [ ] **Step 6: Vérifier**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -vE "middleware\.spec|marketing/actions\.spec|crm/segments/actions\.spec" | grep "error TS"
pnpm test
pnpm lint
pnpm build
```

Attendu : première commande silencieuse, 558 tests, ESLint propre, build réussi. Le `build` est
indispensable ici : c'est lui qui valide que les routes App Router résolvent après déplacement.

- [ ] **Step 7: Vérifier l'absence de résidus**

```bash
grep -rn "evenement\|Evenement\|événement\|Événement" src
```

Attendu : aucune sortie.

```bash
grep -rn "\bEvent\b\|\bevents\b" src --include='*.ts' --include='*.tsx' | grep -v newsletter_event | grep -v NewsletterEvent
```

Attendu : uniquement des `.from("events")` et des références de colonnes SQL — traitées en tâche 4.
Toute autre occurrence est un oubli.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(formations): renommer Event* en Formation*

Occupe le nom libere par la passe accompagnements. Les noms de tables SQL
restent inchanges : l'application tourne toujours contre la base actuelle.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Noms de tables, de colonnes et discriminants côté code

Point de non-retour local : à la fin de cette tâche, le code ne fonctionne plus contre la base
actuelle. Il doit être déployé en même temps que la tâche 5.

**Files:**
- Modify: les 50 fichiers appelant `.from()` sur les tables concernées
- Modify: `src/types/database.ts` (noms de champs `formation_id` / `event_id`)
- Modify: `src/lib/automations/types.ts`, `src/lib/automations/engine.ts`, `src/validations/automations.ts`
- Modify: `src/lib/admin-workflows/types.ts`, `scheduler.ts`, `labels.ts`, `src/validations/admin-workflows.ts`
- Modify: `src/lib/stripe/webhooks.ts`, `src/app/api/cron/route.ts`
- Modify: `admin/automations/_components/workflow-form.tsx`, `admin/automations/labels/_components/label-form-dialog.tsx`, `espace-consultante/automations/_components/automation-form-dialog.tsx`

**Interfaces:**
- Consumes: les types renommés des tâches 2 et 3.
- Produces: les chaînes exactes que la migration de la tâche 5 doit créer. Toute divergence entre les deux tâches casse silencieusement à l'exécution — c'est le couplage le plus serré du chantier.

- [ ] **Step 1: Renommer les tables satellites des accompagnements**

Sept substitutions, sans ambiguïté possible (aucun de ces noms n'est un préfixe d'un autre) :

```bash
grep -rl 'formation_enrollments\|formation_sections\|formation_blocks\|formation_progress\|formation_bookmarks\|formation_collaborators' src scripts supabase/seed.sql e2e \
| xargs sed -i '' \
  -e 's/formation_enrollments/accompagnement_enrollments/g' \
  -e 's/formation_sections/accompagnement_sections/g' \
  -e 's/formation_blocks/accompagnement_blocks/g' \
  -e 's/formation_progress/accompagnement_progress/g' \
  -e 's/formation_bookmarks/accompagnement_bookmarks/g' \
  -e 's/formation_collaborators/accompagnement_collaborators/g'
```

- [ ] **Step 2: Renommer la colonne `formation_id`**

Elle n'existe que sur `accompagnement_sections`, `accompagnement_enrollments` et
`accompagnement_collaborators` — toutes du domaine accompagnements. Aucune table du pro ne porte ce
nom à ce stade, donc la substitution est sûre :

```bash
grep -rl '\bformation_id\b' src scripts supabase/seed.sql e2e \
| xargs sed -i '' 's/\bformation_id\b/accompagnement_id/g'
```

- [ ] **Step 3: Renommer la table `formations`**

```bash
grep -rl '"formations"' src scripts supabase/seed.sql e2e \
| xargs sed -i '' 's/"formations"/"accompagnements"/g'
```

Le guillemet dans le motif restreint aux chaînes (`.from("formations")`) et évite d'atteindre les
chemins de route `/formations`, qui doivent rester.

- [ ] **Step 4: Occuper les noms libérés côté pro**

```bash
grep -rl '"events"\|"event_registrations"\|"recurring_event_definitions"' src scripts supabase/seed.sql e2e \
| xargs sed -i '' \
  -e 's/"events"/"formations"/g' \
  -e 's/"event_registrations"/"formation_registrations"/g' \
  -e 's/"recurring_event_definitions"/"recurring_formation_definitions"/g'

grep -rl '\bevent_id\b\|\banchor_event_id\b' src scripts supabase/seed.sql e2e \
| xargs sed -i '' -e 's/\banchor_event_id\b/anchor_formation_id/g' -e 's/\bevent_id\b/formation_id/g'
```

L'ordre compte dans le second `sed` : `anchor_event_id` d'abord, sinon `event_id` le mutile en
`anchor_formation_id` par accident de sous-chaîne — en réalité `\b` l'en empêche, mais l'ordre
retire le doute.

- [ ] **Step 5: Renommer les discriminants d'automatisations**

```bash
grep -rl '"delay_after_event"\|"event_registered"\|"recurring_event"\|"formation_enrolled"\|"formation_purchased"' src \
| xargs sed -i '' \
  -e 's/"formation_enrolled"/"accompagnement_enrolled"/g' \
  -e 's/"formation_purchased"/"accompagnement_purchased"/g' \
  -e 's/"event_registered"/"formation_registered"/g' \
  -e 's/"delay_after_event"/"delay_after_formation"/g' \
  -e 's/"recurring_event"/"recurring_formation"/g'
```

Les deux premières lignes doivent précéder les trois autres : c'est le même échange circulaire, à
l'échelle des chaînes.

Vérifier ensuite qu'aucune de ces valeurs n'apparaît ailleurs sous une autre forme (concaténation,
template) :

```bash
grep -rn "delay_after\|_registered\|recurring_\|_enrolled\|_purchased" src --include='*.ts' --include='*.tsx' | grep -v accompagnement | grep -v formation_registered | grep -v recurring_formation
```

Attendu : rien qui désigne un déclencheur d'automatisation.

- [ ] **Step 5 bis: Renommer les clés de configuration stockées en JSONB**

Trois colonnes JSONB portent des identifiants de cibles. Les `sed` précédents ne les ont **pas**
touchées : `\bformation_id\b` ne matche pas `formation_ids`, le `s` final empêchant la limite de
mot.

| Colonne | Clés concernées |
|---|---|
| `automations.trigger_config` | `formation_ids` → `accompagnement_ids`, puis `event_ids` → `formation_ids` |
| `admin_workflows.trigger_config` | `formation_ids` → `accompagnement_ids` |
| `labels.auto_assign_rule` | `formation_ids` → `accompagnement_ids` |

Côté code, ce sont les propriétés de `FormationPurchasedConfig`, `EventRegisteredConfig`,
`DelayAfterEventConfig` ([src/lib/automations/types.ts](../../../src/lib/automations/types.ts)),
`FormationEnrolledTriggerConfig` et `AutoAssignRule`
([src/lib/admin-workflows/types.ts](../../../src/lib/admin-workflows/types.ts)).

```bash
grep -rl '\bformation_ids\b\|\bevent_ids\b' src \
| xargs sed -i '' -e 's/\bformation_ids\b/accompagnement_ids/g'
grep -rl '\bevent_ids\b' src \
| xargs sed -i '' -e 's/\bevent_ids\b/formation_ids/g'
```

Deux commandes séparées, jamais un seul `sed` à deux `-e` : dans une même passe, `event_ids`
deviendrait `formation_ids` puis serait immédiatement réécrit en `accompagnement_ids` par la règle
précédente. C'est exactement le piège de l'échange circulaire.

`TriggerData` ([src/lib/automations/types.ts](../../../src/lib/automations/types.ts) l. 62–78) porte
aussi `formation_id`, `event_id`, `event_title`, `event_starts_at`, mais **n'est jamais persisté** :
c'est un objet de passage construit à l'exécution. Ses champs suivent le renommage de code sans
migration correspondante.

- [ ] **Step 6: Vérifier**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -vE "middleware\.spec|marketing/actions\.spec|crm/segments/actions\.spec" | grep "error TS"
pnpm test
pnpm lint
pnpm build
```

Attendu : silencieux, 558 tests, propre, build réussi. Les tests unitaires mockent Supabase : ils
valident que le code appelle les **nouveaux** noms de tables, sans avoir besoin de la base.

- [ ] **Step 7: Contrôle final de non-régression**

```bash
grep -rn '"events"\|"event_registrations"\|"recurring_event_definitions"\|"formation_enrollments"\|"formation_sections"\|"formation_blocks"\|"formation_progress"\|"formation_bookmarks"\|"formation_collaborators"' src scripts supabase/seed.sql e2e
```

Attendu : aucune sortie.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(db): basculer les noms de tables et colonnes cote code

events -> formations, formations -> accompagnements, et les satellites.
Renomme aussi les discriminants d'automatisations, qui subissent le meme
echange de sens.

ATTENTION : a partir de ce commit, le code exige la migration 00070. Il ne
fonctionne plus contre la base actuelle.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Migration SQL `00070`

**Files:**
- Create: `supabase/migrations/00070_renommage_vocabulaire.sql`

**Interfaces:**
- Consumes: les noms exacts produits par la tâche 4. Relire le commit de la tâche 4 avant d'écrire : chaque `.from("…")` du code doit avoir sa table ici.
- Produces: le schéma cible. Aucun symbole TypeScript.

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/00070_renommage_vocabulaire.sql` :

```sql
-- Renommage du vocabulaire : evenement -> formation -> accompagnement.
--
-- Echange circulaire : le nom « formations » est a la fois libere par les
-- accompagnements et occupe par l'ex-« events ». L'ordre des deux blocs est
-- donc impose, il ne peut pas etre inverse.
--
-- SAUVEGARDE OBLIGATOIRE avant application. Le bloc 4 modifie des lignes
-- metier, il ne se defait pas par un renommage inverse :
--   pg_dump "$DATABASE_URL" --data-only \
--     -t formations -t formation_enrollments -t formation_sections \
--     -t formation_blocks -t formation_progress -t formation_bookmarks \
--     -t formation_collaborators -t events -t event_registrations \
--     -t recurring_event_definitions -t automations -t admin_workflows \
--     -t admin_workflow_steps -t scheduled_workflow_actions -t labels \
--     > backups/pre-00070.sql

BEGIN;

-- ─── Bloc 1a : liberer le nom « formations » ────────────────────────────

ALTER TABLE formations              RENAME TO accompagnements;
ALTER TABLE formation_enrollments   RENAME TO accompagnement_enrollments;
ALTER TABLE formation_sections      RENAME TO accompagnement_sections;
ALTER TABLE formation_blocks        RENAME TO accompagnement_blocks;
ALTER TABLE formation_progress      RENAME TO accompagnement_progress;
ALTER TABLE formation_bookmarks     RENAME TO accompagnement_bookmarks;
ALTER TABLE formation_collaborators RENAME TO accompagnement_collaborators;

ALTER TABLE accompagnement_sections      RENAME COLUMN formation_id TO accompagnement_id;
ALTER TABLE accompagnement_enrollments   RENAME COLUMN formation_id TO accompagnement_id;
ALTER TABLE accompagnement_collaborators RENAME COLUMN formation_id TO accompagnement_id;

-- ─── Bloc 1b : occuper le nom libere ────────────────────────────────────

ALTER TABLE events                      RENAME TO formations;
ALTER TABLE event_registrations         RENAME TO formation_registrations;
ALTER TABLE recurring_event_definitions RENAME TO recurring_formation_definitions;

ALTER TABLE formation_registrations    RENAME COLUMN event_id        TO formation_id;
ALTER TABLE scheduled_workflow_actions RENAME COLUMN anchor_event_id TO anchor_formation_id;

-- Les contraintes FK, index, sequences et defauts referencent ces objets par
-- OID : ils suivent le renommage sans intervention. Idem pour l'index unique
-- partiel idx_swa_no_duplicate, qui designe anchor_event_id par numero
-- d'attribut.

-- ─── Bloc 2 : noms de policies ──────────────────────────────────────────
--
-- Les 43 policies survivent telles quelles : leurs expressions USING et
-- WITH CHECK sont stockees en arbre analyse (pg_node_tree) avec des
-- references par OID. Seuls leurs noms deviennent trompeurs.

ALTER POLICY events_select_published    ON formations RENAME TO formations_select_published;
ALTER POLICY events_select_own          ON formations RENAME TO formations_select_own;
ALTER POLICY events_select_admin        ON formations RENAME TO formations_select_admin;
ALTER POLICY events_insert_consultant   ON formations RENAME TO formations_insert_consultant;
ALTER POLICY events_update_own          ON formations RENAME TO formations_update_own;
ALTER POLICY events_update_admin        ON formations RENAME TO formations_update_admin;

ALTER POLICY event_reg_select_client     ON formation_registrations RENAME TO formation_reg_select_client;
ALTER POLICY event_reg_select_consultant ON formation_registrations RENAME TO formation_reg_select_consultant;
ALTER POLICY event_reg_select_admin      ON formation_registrations RENAME TO formation_reg_select_admin;
ALTER POLICY event_reg_insert_client     ON formation_registrations RENAME TO formation_reg_insert_client;

ALTER POLICY recurring_event_defs_select ON recurring_formation_definitions RENAME TO recurring_formation_defs_select;
ALTER POLICY recurring_event_defs_insert ON recurring_formation_definitions RENAME TO recurring_formation_defs_insert;
ALTER POLICY recurring_event_defs_update ON recurring_formation_definitions RENAME TO recurring_formation_defs_update;
ALTER POLICY recurring_event_defs_delete ON recurring_formation_definitions RENAME TO recurring_formation_defs_delete;

ALTER POLICY formations_select_published  ON accompagnements RENAME TO accompagnements_select_published;
ALTER POLICY formations_select_own        ON accompagnements RENAME TO accompagnements_select_own;
ALTER POLICY formations_select_collab     ON accompagnements RENAME TO accompagnements_select_collab;
ALTER POLICY formations_select_admin      ON accompagnements RENAME TO accompagnements_select_admin;
ALTER POLICY formations_insert_consultant ON accompagnements RENAME TO accompagnements_insert_consultant;
ALTER POLICY formations_update_own        ON accompagnements RENAME TO accompagnements_update_own;
ALTER POLICY formations_update_collab     ON accompagnements RENAME TO accompagnements_update_collab;
ALTER POLICY formations_update_admin      ON accompagnements RENAME TO accompagnements_update_admin;
ALTER POLICY formations_delete_own        ON accompagnements RENAME TO accompagnements_delete_own;

ALTER POLICY formation_collab_select ON accompagnement_collaborators RENAME TO accompagnement_collab_select;
ALTER POLICY formation_collab_insert ON accompagnement_collaborators RENAME TO accompagnement_collab_insert;
ALTER POLICY formation_collab_delete ON accompagnement_collaborators RENAME TO accompagnement_collab_delete;

-- ─── Bloc 3 : corps de fonctions ────────────────────────────────────────
--
-- Seul endroit ou le renommage ne se propage pas : pg_proc.prosrc stocke du
-- texte, jamais reanalyse.

-- get_formation_ids_owned_by lit « formations ». Apres le bloc 1b, ce nom
-- designe les formations pro : les policies de accompagnement_collaborators
-- autoriseraient les mauvaises lignes. Faille d'autorisation silencieuse.
ALTER FUNCTION public.get_formation_ids_owned_by(uuid)
  RENAME TO get_accompagnement_ids_owned_by;

CREATE OR REPLACE FUNCTION public.get_accompagnement_ids_owned_by(owner_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM accompagnements WHERE consultant_id = owner_id;
$$;

COMMIT;
```

Le bloc 4 est ajouté à l'étape suivante — il demande de lire le corps exact de
`calculate_client_score`, qu'on ne peut pas recopier de mémoire.

- [ ] **Step 2: Recréer `calculate_client_score`**

Lire le corps actuel :

```bash
sed -n '57,160p' supabase/migrations/00037_crm_advanced.sql
```

Le recopier intégralement dans `00070`, **avant le `COMMIT;`**, en appliquant exactement quatre
substitutions et rien d'autre :

| Avant | Après |
|---|---|
| `FROM formation_enrollments` | `FROM accompagnement_enrollments` |
| `FROM event_registrations` | `FROM formation_registrations` |
| `LEFT JOIN formation_enrollments fe` | `LEFT JOIN accompagnement_enrollments fe` |
| `LEFT JOIN event_registrations er` | `LEFT JOIN formation_registrations er` |

Renommer aussi les variables locales `v_formations_count` → `v_accompagnements_count` et
`v_events_count` → `v_formations_count`, **en une passe attentive** : ce sont deux variables du même
`DECLARE`, l'échange circulaire s'y applique aussi. Une erreur ici fausse silencieusement le score
client sans lever d'exception.

Ne modifier **aucune** valeur numérique de la formule de score.

- [ ] **Step 3: Ajouter le bloc 4 — discriminants**

Avant le `COMMIT;` :

```sql
-- ─── Bloc 4 : discriminants stockes ─────────────────────────────────────
--
-- Les automatisations stockent leur declencheur en clair. Ces valeurs
-- subissent le meme echange de sens que les tables.
--
-- ROLLBACK de ce bloc (a executer manuellement, dans cet ordre inverse) :
--   UPDATE automations SET trigger_type = 'formation_enrolled'  WHERE trigger_type = 'accompagnement_enrolled';
--   UPDATE automations SET trigger_type = 'formation_purchased' WHERE trigger_type = 'accompagnement_purchased';
--   UPDATE automations SET trigger_type = 'event_registered'    WHERE trigger_type = 'formation_registered';
--   ... idem sur admin_workflows, admin_workflow_steps, scheduled_workflow_actions.

-- Les cinq discriminants sont tous des valeurs de `trigger_type`, reparties
-- sur deux tables. `admin_workflow_steps.action_type` n'en porte aucun
-- (send_email, add_label, webhook) et n'est pas touche.

UPDATE automations SET trigger_type = 'accompagnement_purchased' WHERE trigger_type = 'formation_purchased';
UPDATE automations SET trigger_type = 'formation_registered'     WHERE trigger_type = 'event_registered';
UPDATE automations SET trigger_type = 'delay_after_formation'    WHERE trigger_type = 'delay_after_event';

UPDATE admin_workflows SET trigger_type = 'accompagnement_enrolled' WHERE trigger_type = 'formation_enrolled';
UPDATE admin_workflows SET trigger_type = 'recurring_formation'     WHERE trigger_type = 'recurring_event';

-- Cles de configuration stockees en JSONB. Meme echange circulaire :
-- formation_ids doit liberer la place avant qu'event_ids ne l'occupe.

UPDATE automations
SET trigger_config = (trigger_config - 'formation_ids')
                     || jsonb_build_object('accompagnement_ids', trigger_config -> 'formation_ids')
WHERE trigger_config ? 'formation_ids';

UPDATE automations
SET trigger_config = (trigger_config - 'event_ids')
                     || jsonb_build_object('formation_ids', trigger_config -> 'event_ids')
WHERE trigger_config ? 'event_ids';

UPDATE admin_workflows
SET trigger_config = (trigger_config - 'formation_ids')
                     || jsonb_build_object('accompagnement_ids', trigger_config -> 'formation_ids')
WHERE trigger_config ? 'formation_ids';

UPDATE labels
SET auto_assign_rule = (auto_assign_rule - 'formation_ids')
                       || jsonb_build_object('accompagnement_ids', auto_assign_rule -> 'formation_ids')
WHERE auto_assign_rule ? 'formation_ids';

UPDATE labels
SET auto_assign_rule = jsonb_set(auto_assign_rule, '{trigger}', '"accompagnement_enrolled"')
WHERE auto_assign_rule ->> 'trigger' = 'formation_enrolled';
```

Aucune contrainte `CHECK` ne restreint `trigger_type` sur ces deux tables — vérifié au cadrage — donc
les `UPDATE` passent sans avoir à lever puis rétablir de contrainte.

L'ordre à l'intérieur du bloc JSONB est aussi contraignant que celui des tables : sur
`automations.trigger_config`, `formation_ids` doit devenir `accompagnement_ids` **avant** que
`event_ids` ne devienne `formation_ids`, sinon la seconde requête réécrit ce que la première
vient de produire.

- [ ] **Step 4: Contrôler la cohérence code ↔ migration**

```bash
grep -rhoE '\.from\("[a-z_]+"\)' src | sort -u > /tmp/tables-code.txt
cat /tmp/tables-code.txt
```

Chaque table du domaine renommé qui apparaît ici doit exister après `00070`. Vérification croisée
manuelle, table par table — c'est le contrôle qui rattrape une faute de frappe entre les tâches 4
et 5, que ni `tsc` ni les tests unitaires ne peuvent voir.

- [ ] **Step 5: Valider la syntaxe SQL sans appliquer**

```bash
pnpm db:push:dry
```

Le `--dry-run` n'écrit rien. Il liste les migrations en attente et signale les erreurs de syntaxe.
Attendu : `00070_renommage_vocabulaire.sql` listée, aucune erreur.

**Ne pas lancer `pnpm db:push`.** Cette commande cible la base de production et n'appartient qu'à la
tâche 6, après validation de Théo.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/00070_renommage_vocabulaire.sql
git commit -m "feat(db): migration 00070, renommage du vocabulaire

Echange circulaire events -> formations -> accompagnements sur 12 tables,
5 colonnes, 26 noms de policies, 2 corps de fonctions, les discriminants
d'automatisations et 3 colonnes JSONB de configuration.

Sauvegarde pg_dump obligatoire avant application : le bloc des
discriminants modifie des lignes metier et ne se defait pas par un
renommage inverse.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Scripts, seed, e2e et documentation

**Files:**
- Modify: `supabase/seed.sql`
- Modify: `scripts/e2e/seed-test-data.mjs`, `scripts/e2e/cleanup-test-data.mjs`, `scripts/e2e/lib/fixtures.mjs`, `scripts/e2e/run-n1.mjs`
- Move: `e2e/formation-purchase.spec.ts` → `e2e/accompagnement-purchase.spec.ts` (il teste `purchaseAccompagnement`, pas les formations pro), puis modifier
- Modify: `scripts/generate-formations-pro-seed.mjs`, `scripts/import-planning-2027.mjs`, `scripts/import-wix-events.mjs`, `scripts/import-wix-contacts.mjs`, `scripts/fetch-wix-events.mjs`, `scripts/audit-formation-blocks.mjs`, `scripts/migrate-ricos-dry-run.mjs`, `scripts/migrate-ricos-execute.mjs`, `scripts/apply-copywriting-accompagnements.mjs`, `scripts/apply-copywriting-blog.mjs`, `scripts/data/copywriting-accompagnements.mjs`, `scripts/data/copywriting-blog.mjs`, `scripts/_dump-copywriting-backup.mjs`
- Modify: `docs/PLATFORM_ARCHITECTURE.md`, `docs/TASKLIST.md`

**Interfaces:**
- Consumes: les noms de tables de la tâche 5.
- Produces: rien.

- [ ] **Step 1: Vérifier ce que les tâches précédentes ont déjà couvert**

Les `sed` des étapes 1 à 4 de la tâche 4 incluaient déjà `scripts`, `supabase/seed.sql` et `e2e`.
Contrôler :

```bash
grep -rn '"events"\|"formations"\|formation_enrollments\|event_registrations\|\bevent_id\b\|\bformation_id\b' \
  scripts supabase/seed.sql e2e | grep -v accompagnement | grep -v newsletter_event
```

Attendu : ne subsistent que des `"formations"` et `formation_id` désignant bien le pro, plus les
identifiants de fichiers. Traiter à la main ce qui reste.

- [ ] **Step 2: Corriger les noms SQL non entre guillemets**

`supabase/seed.sql` écrit du SQL, pas des appels `.from("…")` : les tables y apparaissent sans
guillemets, et les `sed` de la tâche 4 les ont manquées.

```bash
grep -nE '\b(events|event_registrations|recurring_event_definitions|formations|formation_enrollments|formation_sections|formation_blocks|formation_progress|formation_bookmarks|formation_collaborators)\b' supabase/seed.sql
```

Appliquer l'échange à la main, dans l'ordre habituel : les accompagnements d'abord, le pro ensuite.

- [ ] **Step 3: Vérifier le seed contre une base fraîche**

```bash
pnpm db:seed
```

Cette commande lit `POSTGRES_URL_NON_POOLING` depuis `.env.development.local`. **Confirmer avec
Théo que cette variable pointe bien vers une base de développement et non vers la production avant
de l'exécuter.** En cas de doute, sauter cette étape et le signaler plutôt que de deviner.

- [ ] **Step 4: Mettre à jour les documents vivants**

Dans `docs/PLATFORM_ARCHITECTURE.md` et `docs/TASKLIST.md`, remplacer les références aux tables et
aux routes. Ces deux fichiers décrivent l'état courant du système, ils doivent donc suivre.

**Ne pas toucher** aux fichiers de `docs/superpowers/specs/` et `docs/superpowers/plans/` antérieurs
à ce chantier : ce sont des journaux datés, au même titre que les migrations.

- [ ] **Step 5: Vérifier**

```bash
pnpm test && pnpm lint && pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: aligner seed, scripts e2e et docs sur le nouveau vocabulaire

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: Vérification finale et bascule

Cette tâche n'écrit pas de code. Elle ne s'exécute qu'avec Théo présent, hors heures de trafic.

**Files:** aucun.

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: le système en production.

- [ ] **Step 1: Contrôle de non-régression complet**

```bash
grep -rn "evenement\|Evenement\|événement\|Événement" src scripts docs/PLATFORM_ARCHITECTURE.md docs/TASKLIST.md
```

Attendu : aucune sortie.

```bash
grep -rn "\bevents\b\|\bevent_id\b\|formation_enrollments\|formation_sections\|formation_blocks" src scripts supabase/seed.sql e2e | grep -v newsletter_events
```

Attendu : aucune sortie.

- [ ] **Step 2: Suite complète**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -vE "middleware\.spec|marketing/actions\.spec|crm/segments/actions\.spec" | grep "error TS"
pnpm test
pnpm lint
pnpm build
```

Attendu : première commande silencieuse, **558 tests / 65 fichiers**, ESLint propre, build réussi.
Un compte de tests différent de 558 signale un fichier de test perdu lors d'un `git mv` — chercher
avant de continuer.

- [ ] **Step 3: Prévenir Carole**

Lui signaler avant la bascule : un favori sur `/admin/formations` menait aux accompagnements, il
mènera désormais aux formations pro. La page s'ouvrira normalement, avec le mauvais contenu. Les
accompagnements sont désormais sur `/admin/accompagnements`. C'est le seul endroit où le chantier
peut désorienter sans afficher d'erreur.

- [ ] **Step 4: Sauvegarder**

```bash
mkdir -p backups
pg_dump "$DATABASE_URL" --data-only \
  -t formations -t formation_enrollments -t formation_sections \
  -t formation_blocks -t formation_progress -t formation_bookmarks \
  -t formation_collaborators -t events -t event_registrations \
  -t recurring_event_definitions -t automations -t admin_workflows \
  -t admin_workflow_steps -t scheduled_workflow_actions -t labels \
  > backups/pre-00070.sql
wc -l backups/pre-00070.sql
```

Le `wc -l` est la garde : un fichier quasi vide signale un `pg_dump` qui a échoué silencieusement.
Ne pas poursuivre sans une sauvegarde de taille plausible.

- [ ] **Step 5: Pousser et déployer**

```bash
git push -u origin refactor/vocabulaire-formations-accompagnements
```

Ouvrir la PR, la faire relire, fusionner. Attendre la **fin** du déploiement Vercel — pas seulement
son démarrage.

- [ ] **Step 6: Appliquer la migration**

```bash
pnpm db:push
```

Cible la base de production `chhrhrijtelevozjccqj`. À lancer immédiatement après la fin du
déploiement : entre les deux, les pages lisant ces tables renvoient une erreur.

- [ ] **Step 7: Vérifier en production**

Dans l'ordre, sur le site déployé :

1. `/formations` — la liste publique s'affiche, les cartes pointent vers les fiches.
2. `/formations/<slug>` — une fiche s'ouvre, les repères et le bouton d'inscription sont là.
3. `/admin/formations` — la liste admin des formations pro.
4. `/admin/accompagnements` — la liste admin des accompagnements.
5. `/espace-client/accompagnements` — l'espace cliente, avec la progression d'un parcours en cours.
6. Éditer une formation depuis l'admin, puis recharger `/formations` : la modification doit
   apparaître. C'est le test du bug de revalidation corrigé en tâche 1.
7. Ouvrir une automatisation dans `/admin/automations` : son déclencheur doit s'afficher
   correctement, pas comme un type inconnu. C'est le test du bloc 4.

- [ ] **Step 8: Mettre la mémoire à jour**

Le fichier `vocabulaire-formations-accompagnements.md` de la mémoire décrit l'ancien mappage
(« Formations = pro (table `events`) »). Le réécrire pour qu'il décrive le nouvel état, sans quoi
il induira en erreur à la prochaine session.
