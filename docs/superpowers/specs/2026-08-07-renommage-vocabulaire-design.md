# Renommage Événement → Formation → Accompagnement

**Date :** 2026-08-07
**Branche :** `refactor/vocabulaire-formations-accompagnements`

## Problème

Le vocabulaire produit et le vocabulaire du code ont divergé.

Ce que dit Carole :

- **Formation** — une session pour les professionnelles de santé, vendue par l'école ou sur le site.
- **Accompagnement** — un parcours en ligne pour les clientes, avec sections, blocs et progression.
- **Événement** — plus rien. Le mot ne fait plus partie du produit.

Ce que dit le code :

- table `events` = les formations pro,
- table `formations` = les accompagnements,
- `/admin/evenements` gère les formations, `/admin/formations` gère les accompagnements.

Le côté public a déjà été aligné lors d'un chantier précédent : `/formations` sert le pro,
`/accompagnements` sert les clientes, `/espace-client/accompagnements` aussi. Le dashboard, la
base et les identifiants du code sont restés en arrière. Chaque lecture demande une traduction
mentale, et cette traduction s'inverse selon la couche.

## Objectif

Un mot, un sens, à toutes les couches. Après ce chantier, « formation » désigne le pro partout —
URL, table, type TypeScript, nom de fichier — et « accompagnement » désigne le parcours cliente
partout. « Événement » ne subsiste que là où il désigne un vrai événement technique.

Aucun changement de comportement. Si une page rend différemment après ce chantier, c'est un bug.

## Principe directeur : c'est un échange, pas une substitution

`events` devient `formations`, et `formations` devient `accompagnements`. Le nom `formations` est
donc à la fois libéré et réoccupé. Cette circularité gouverne toutes les décisions qui suivent :

- **En SQL** — il faut libérer avant d'occuper, donc renommer `formations` d'abord.
- **En code** — un `sed` global écraserait. Il faut un nom pivot intermédiaire.
- **En URL** — `/admin/formations` est réutilisée pour une autre ressource, donc aucune
  redirection n'est possible depuis cette adresse : elle doit rester disponible pour son nouveau
  sens.
- **En vues de compatibilité** — impossibles pour la paire échangée. Une vue `formations`
  pointant vers `accompagnements` ne peut pas coexister avec la nouvelle table `formations`.

C'est cette dernière conséquence qui impose une bascule directe plutôt qu'une transition en
douceur.

## Périmètre

### Tables renommées

```
-- Étape 1 : libérer le nom « formations »
formations                  -> accompagnements
formation_enrollments       -> accompagnement_enrollments
formation_sections          -> accompagnement_sections
formation_blocks            -> accompagnement_blocks
formation_progress          -> accompagnement_progress
formation_bookmarks         -> accompagnement_bookmarks
formation_collaborators     -> accompagnement_collaborators

-- Étape 2 : occuper le nom libéré
events                      -> formations
event_registrations         -> formation_registrations
recurring_event_definitions -> recurring_formation_definitions
```

### Colonnes renommées

```
accompagnement_sections.formation_id      -> accompagnement_id
accompagnement_enrollments.formation_id   -> accompagnement_id
accompagnement_collaborators.formation_id -> accompagnement_id
formation_registrations.event_id          -> formation_id
scheduled_workflow_actions.anchor_event_id -> anchor_formation_id
```

`formation_id` n'existe que sur ces trois tables satellites. `accompagnement_blocks` se rattache
par `section_id`, `accompagnement_progress` et `accompagnement_bookmarks` par
`enrollment_id` + `block_id` : aucune de ces colonnes ne porte le vocabulaire, aucune ne bouge.

`anchor_event_id` appartient à `scheduled_workflow_actions` (et non aux définitions récurrentes).
Il porte l'index unique partiel `idx_swa_no_duplicate`, qui référence la colonne par numéro
d'attribut et suit donc le renommage sans intervention.

### Ce qui ne bouge pas

- `training_providers` — désigne bien les organismes de formation, déjà correct.
- `newsletter_events` — ouvertures et clics d'emails. Un vrai événement technique, sans rapport
  avec le vocabulaire produit.
- `withdrawal_waivers`, `bookings`, `payments`, et tout le reste du schéma.
- Les migrations `00001` à `00069`. Elles décrivent l'histoire, pas l'état courant. Les réécrire
  falsifierait le journal et casserait tout environnement reconstruit depuis zéro.
- `src/config/formations.ts` — porte déjà sur le pro (« Voir avec l'école »), correctement nommé.
- Les shims `/espace-client/formations` et `/espace-client/formations/[id]`, qui redirigent vers
  `accompagnements`. Ils visent les clientes, pas le dashboard.

## Architecture de la migration

Une migration `00070`, une transaction, quatre blocs dans cet ordre.

### Bloc 1 — tables et colonnes

`ALTER TABLE ... RENAME TO` et `ALTER TABLE ... RENAME COLUMN`. Postgres propage automatiquement
vers les contraintes de clé étrangère, les index, les séquences et les valeurs par défaut : ces
objets référencent la table par OID, pas par nom.

Les *noms* de contraintes et d'index conservent en revanche leur ancien préfixe
(`formation_sections_pkey` sur une table devenue `accompagnement_sections`). Purement cosmétique,
mais renommé aussi pour qu'un `\d` reste lisible.

### Bloc 2 — noms de policies

Les 43 policies RLS des tables concernées **survivent au renommage sans intervention**. Postgres
stocke leurs expressions `USING` et `WITH CHECK` sous forme d'arbre analysé (`pg_node_tree`) dont
les références aux tables sont des OID. Une table renommée reste la même table.

Seuls leurs noms deviennent trompeurs : `events_select_admin` sur une table `formations`,
`formation_collab_insert` sur `accompagnement_collaborators`. Traités par
`ALTER POLICY ... RENAME TO`.

### Bloc 3 — corps de fonctions

C'est le seul endroit où le renommage ne se propage pas. Les corps de fonctions sont stockés en
**texte** dans `pg_proc.prosrc`, jamais réanalysés lors d'un `RENAME`.

Deux fonctions sont concernées, et deux seulement :

1. **`public.get_formation_ids_owned_by(uuid)`** — `LANGUAGE sql`, contient
   `SELECT id FROM formations`. Après le renommage, cette requête viserait les formations pro au
   lieu des accompagnements : les policies de `accompagnement_collaborators` autoriseraient donc
   les mauvaises lignes. **Faille d'autorisation silencieuse si oubliée.**
   Renommée en `get_accompagnement_ids_owned_by` et recréée avec le bon corps. Les policies qui
   l'appellent la référencent par OID et suivent le renommage.

2. **`calculate_client_score(uuid, uuid)`** — `LANGUAGE plpgsql`, lit `formation_enrollments` et
   `event_registrations`. Après le renommage ces tables n'existent plus sous ces noms : la
   fonction lève une erreur à l'exécution. Recréée avec les nouveaux noms, et ses variables
   locales `v_formations_count` / `v_events_count` renommées pour rester justes.

Les autres fonctions du schéma (`is_admin`, `is_consultant`, `get_user_role`, `handle_new_user`,
`create_invoice`, `correct_invoice`, `check_rate_limit`, `update_updated_at`,
`update_replay_lives_updated_at`) ne citent aucune des tables concernées.

### Bloc 4 — discriminants stockés en données

Les automatisations stockent leur type de déclencheur sous forme de chaîne. Ces valeurs subissent
le même échange de sens que les tables :

```
event_registered     -> formation_registered
delay_after_event    -> delay_after_formation
recurring_event      -> recurring_formation
formation_enrolled   -> accompagnement_enrolled
formation_purchased  -> accompagnement_purchased
```

Tables porteuses : `automations`, `admin_workflows`, `admin_workflow_steps`,
`scheduled_workflow_actions`.

**C'est ce bloc qui rend la migration non triviale à annuler.** Les blocs 1 à 3 se défont par des
renommages inverses ; celui-ci modifie des lignes métier. Les `UPDATE` inverses sont écrits en
commentaire dans le fichier de migration, et un `pg_dump` des tables concernées est exigé avant
application.

Ne pas traiter ce bloc laisserait `formation_enrolled` désigner les accompagnements alors que la
table `formations` désignerait le pro — exactement l'inversion que ce chantier démonte.

## Architecture du code

### Fichiers et dossiers échangés

```
src/lib/events/                              -> src/lib/formations/
src/lib/formations/                          -> src/lib/accompagnements/
src/validations/events.ts                    -> src/validations/formations.ts
src/validations/formations.ts                -> src/validations/accompagnements.ts
src/components/formations/formation-card.tsx -> src/components/accompagnements/accompagnement-card.tsx
src/config/event-highlights.ts               -> src/config/formation-highlights.ts
src/config/event-highlights.spec.ts          -> src/config/formation-highlights.spec.ts
```

Les collisions (`src/lib/formations`, `src/validations/formations.ts`) imposent de déplacer
l'occupant avant d'installer le nouveau. Chaque déplacement passe par `git mv` pour que
l'historique suive.

Quatrième collision, dans les onglets de la fiche utilisateur — même règle, l'occupant part
d'abord :

```
admin/utilisateurs/[id]/_components/tab-formations.tsx  -> tab-accompagnements.tsx
admin/utilisateurs/[id]/_components/tab-evenements.tsx  -> tab-formations.tsx
```

Fichiers renommés sans collision :

```
admin/evenements/_components/event-form.tsx             -> formation-form.tsx
admin/evenements/_components/event-content-fields.tsx   -> formation-content-fields.tsx
admin/evenements/_components/event-highlights-field.tsx -> formation-highlights-field.tsx
(public)/formations/[slug]/_components/event-detail.tsx -> formation-detail.tsx
admin/utilisateurs/_components/enroll-to-formation-modal.tsx -> enroll-to-accompagnement-modal.tsx
admin/automations/recurrents/_components/recurring-event-form-dialog.tsx
                                                        -> recurring-formation-form-dialog.tsx
lib/admin-workflows/generate-events.ts                  -> generate-formations.ts
espace-client/accompagnements/[id]/_components/formation-reader.tsx     -> accompagnement-reader.tsx
espace-client/accompagnements/[id]/_components/formation-onboarding.tsx -> accompagnement-onboarding.tsx
admin/formations/_components/formation-editor.tsx       -> accompagnement-editor.tsx
admin/formations/_components/formation-create-form.tsx  -> accompagnement-create-form.tsx
admin/formations/_components/formation-status-toggle.tsx -> accompagnement-status-toggle.tsx
admin/formations/_components/duplicate-formation-button.tsx -> duplicate-accompagnement-button.tsx
```

### Identifiants

Environ 70 identifiants exportés, plus leurs usages. `Event*` → `Formation*` et `Formation*` →
`Accompagnement*`. La règle de désambiguïsation est la table lue, pas le nom actuel :
`FormationsList` lit `events`, il désigne donc bien le pro et **reste** `FormationsList` ;
`FormationCard` lit `formations`, il devient `AccompagnementCard`.

Cas particuliers à ne pas renommer : `trackNewsletterEvent` et le type `NewsletterEvent`
concernent les événements d'emailing.

### Ordre d'exécution

Le renommage se fait en deux passes séparées par un pivot, jamais en une seule substitution :

1. `Formation*` → `Accompagnement*` et `formation` → `accompagnement` (sur le périmètre
   accompagnements uniquement),
2. puis `Event*` → `Formation*` et `event` → `formation`.

Faire l'inverse, ou les deux en même temps, fusionne les deux ensembles.

## Routes

```
admin/evenements              -> admin/formations
admin/formations              -> admin/accompagnements
espace-consultante/evenements -> espace-consultante/formations
espace-consultante/formations -> espace-consultante/accompagnements
```

Aucune redirection. Les anciennes URLs renvoient 404. Le dashboard ne concerne que Carole et les
consultantes, pour qui un 404 se corrige d'un clic dans le menu — et depuis `/admin/formations`,
une redirection est de toute façon impossible puisque l'adresse est réutilisée.

**À signaler à Carole avant la bascule :** un favori sur l'ancienne page accompagnements
(`/admin/formations`) mènera désormais aux formations pro. La page s'ouvrira normalement, avec le
mauvais contenu. C'est le seul point où le chantier peut désorienter sans erreur visible.

## Corrections incluses

Trois défauts découverts pendant le cadrage, tous dans le périmètre direct du renommage :

1. **[middleware.ts:8](../../../src/middleware.ts#L8)** déclare `/evenements` route publique. Cette
   route n'existe plus depuis le chantier précédent. Entrée morte, supprimée.
2. **[admin/evenements/actions.ts](../../../src/app/\(dashboard\)/admin/evenements/actions.ts)** appelle
   quatre fois `revalidatePath("/evenements")`. La route n'existant pas, **le cache de la page
   publique `/formations` n'est jamais invalidé après une édition admin** : une modification de
   formation n'apparaît pas en ligne tant qu'un autre événement ne purge pas le cache. Corrigé en
   `/formations`.
3. **Dossiers vides** `src/app/(dashboard)/espace-client/` et son sous-arbre `formations/`,
   reliquats d'un déplacement antérieur. Supprimés.

## Tests

Aucun nouveau test de comportement : le chantier ne change aucun comportement, et les 558 tests
existants sont le filet. Ils doivent tous passer après renommage de leurs identifiants et de leurs
chemins d'import.

Trois vérifications spécifiques au renommage, en revanche :

1. **`tsc --noEmit`** est le vrai test du renommage de code. Un import oublié ou un identifiant
   mal renommé y apparaît. Attention : 35 erreurs préexistantes dans `src/middleware.spec.ts`,
   `admin/marketing/actions.spec.ts` et `espace-consultante/crm/segments/actions.spec.ts` ; le
   critère est « pas d'erreur nouvelle », pas « zéro erreur ».
2. **`grep` de non-régression** sur `evenement`, `Événement`, `\bevents\b`, `event_id`,
   `formation_enrollments` : ne doivent subsister que `newsletter_events` et les migrations
   historiques.
3. **`pnpm build`**, qui valide que les routes App Router résolvent après déplacement.

## Bascule

Ordre imposé, hors heures de trafic :

1. `pg_dump` des douze tables concernées **et** des quatre tables porteuses de discriminants.
   Sans cette sauvegarde, le bloc 4 n'est pas récupérable.
2. `git push`, puis attendre la fin du déploiement Vercel.
3. `pnpm db:push` — cible le projet Supabase distant `chhrhrijtelevozjccqj`.
4. Vérifier : `/formations` publique, `/admin/formations`, `/admin/accompagnements`,
   `/espace-client/accompagnements`, et une automatisation déclenchée sur inscription.

Entre les étapes 2 et 3, les pages lisant ces tables renvoient une erreur. Le reste du site — blog,
réservations, profils, factures — n'est pas concerné.
