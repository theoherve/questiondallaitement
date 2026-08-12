# Traçabilité des notes CRM — Design

## Contexte

Chantier issu de l'analyse initiale des specs concurrentes "Lactéo" (`docs/specs_lacteo/`), identifié dès la clôture de la fiche de consultation (2026-08-12) comme item prioritaire restant du backlog. Voir `docs/specs_lacteo/05_module_prise_de_notes-1.md` §5.4 : *« une note enregistrée n'est jamais supprimable, seulement modifiable, avec historique des versions (qui, quand, quoi a changé) conservé et consultable »*.

Aujourd'hui, `crm_notes` (`supabase/migrations/00007_crm.sql`) supporte création, modification (`UPDATE` sans trace de l'ancien contenu) et suppression définitive (`DELETE`), via `createNote`/`updateNote`/`deleteNote` dans `src/app/(dashboard)/espace-consultante/crm/actions.ts`. Ce chantier aligne ce comportement sur la spec : plus de suppression, et historique des versions consultable à chaque modification.

Périmètre : `crm_notes` uniquement (notes libres CRM). `consultation_notes` (fiche de consultation structurée, livrée le 2026-08-12) a le même trou de traçabilité mais reste hors scope ici — explicitement noté comme chantier séparé dans son propre design doc.

## Décisions de cadrage

- **Suppression retirée.** `deleteNote` et le bouton corbeille dans `notes-editor.tsx` sont supprimés. Une note ne peut plus disparaître, seulement être éditée.
- **Historique en snapshot complet**, pas en diff. Chaque édition sauvegarde le contenu texte *précédent* dans son intégralité, horodaté. Suffisant pour des notes courtes en texte libre ; un diff ligne à ligne n'apporterait rien ici et complexifierait l'affichage sans bénéfice.
- **Capture par trigger DB**, pas dans la server action. Les actions CRM utilisent `createAdminClient()` (service role, contourne RLS) — un trigger `BEFORE UPDATE` garantit que l'historique est capturé quel que soit le chemin de code qui touche la table, cohérent avec la leçon retenue sur `consultation_notes` (mémoire `server-actions-parametre-autorisation-attaquable` : l'enforcement réel ne doit pas reposer sur la discipline de chaque appelant).
- **Affichage inline**, pas de modale : sous chaque note, un lien "Voir l'historique (N modification(s))" déplie la liste des versions précédentes (plus récente en premier), cohérent avec le style actuel de `notes-editor.tsx` (tout inline, pas de modales).
- **Pas de champ "qui"** affiché dans l'historique pour cette V1 : `crm_notes.consultant_id` est fixe par note (une note n'est modifiable que par son auteur, `.eq("consultant_id", user.id)` dans `updateNote`), donc l'auteur d'une édition est toujours le même que le créateur. La colonne `edited_by` est quand même stockée en base (peu coûteux, utile si le contrôle d'auteur unique change un jour), mais pas affichée dans l'UI V1.

## Modèle de données

Nouvelle table `crm_notes_history`, migration suivante dans `supabase/migrations/`.

```sql
CREATE TABLE crm_notes_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES crm_notes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  edited_by UUID NOT NULL REFERENCES consultants(id),
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_notes_history_note ON crm_notes_history(note_id);

CREATE OR REPLACE FUNCTION capture_crm_note_history()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    INSERT INTO crm_notes_history (note_id, content, edited_by, edited_at)
    VALUES (OLD.id, OLD.content, OLD.consultant_id, OLD.updated_at);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crm_notes_capture_history
  BEFORE UPDATE ON crm_notes
  FOR EACH ROW
  EXECUTE FUNCTION capture_crm_note_history();
```

Le trigger tourne `BEFORE UPDATE`, avant que le trigger existant `crm_notes_updated_at` (qui fixe `NEW.updated_at`) ne s'exécute — l'ordre des triggers `BEFORE` du même événement suit l'ordre alphabétique de leur nom en PostgreSQL (`crm_notes_capture_history` < `crm_notes_updated_at`), donc `OLD.updated_at` capturé ici est bien l'horodatage de la version précédente, pas celui de la nouvelle. `edited_by` reprend `OLD.consultant_id` : l'auteur de la version qu'on archive, pas un hypothétique nouvel éditeur (non pertinent ici puisque fixe, mais correct si ça change).

`deleteNote` et sa policy/usage sont retirés ; pas de nouvelle RLS nécessaire sur `crm_notes_history` — les lectures passent par la server action (service role), pas par le client directement.

## Server actions

Dans `src/app/(dashboard)/espace-consultante/crm/actions.ts` :

- `deleteNote` **supprimé**.
- `updateNote(noteId, content)` : inchangé dans sa forme (le trigger fait le travail de capture, pas l'action).
- `getNoteHistory(noteId)` (nouvelle) : vérifie `crm_notes.consultant_id = user.id` (jointure ou double-requête, même garde que les autres actions du module — pas de paramètre de contournement), retourne les versions de `crm_notes_history` pour cette note triées par `edited_at` décroissant.

## UI — CRM (consultante)

`notes-editor.tsx` :

- Bouton corbeille retiré.
- Sous la ligne de date de chaque note, si la note a un historique : lien texte "Voir l'historique (N modification(s))". Au clic, appelle `getNoteHistory(note.id)` et déplie une liste des versions précédentes (contenu + date, plus récente en premier) directement sous la note, dans le même style de carte que le reste du composant.
- Le compteur N vient soit d'un `count` déjà passé au composant (si le chargement de page le fournit), soit calculé au premier clic — à trancher en tâche d'implémentation selon ce qui évite le plus de requêtes inutiles.

## Tests

TDD (Vitest), en cohérence avec le reste du module CRM :

- Trigger / migration : mettre à jour une note deux fois de suite, vérifier 2 lignes dans `crm_notes_history` avec le contenu et l'auteur attendus, dans le bon ordre.
- Une mise à jour qui ne change pas `content` (ex. touche seulement un autre champ, s'il y en avait) ne crée pas de ligne d'historique.
- `getNoteHistory` : rejette un `noteId` n'appartenant pas à la consultante courante (pas de fuite d'historique inter-consultant·e).
- `deleteNote` n'existe plus — test que l'export a bien disparu / plus de route pour supprimer une note.
- Composant `notes-editor.tsx` : plus de bouton de suppression rendu ; le lien "historique" apparaît seulement si des versions existent, et déplie la liste au clic.

## Hors scope (explicitement écarté pour cette V1)

- `consultation_notes` (fiche de consultation structurée) — même trou de traçabilité, chantier séparé.
- Diff ligne à ligne entre versions.
- Affichage de l'auteur de chaque édition dans l'UI (donnée stockée, non affichée).
- Restauration d'une version passée ("revert") — l'historique est consultable en lecture seule uniquement.
- Note strictement privée par praticien·ne (spec 05.5) — hors scope, lié au mode multi-praticien complet non encore actif sur ce périmètre CRM.
