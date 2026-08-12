# Traçabilité des notes CRM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `crm_notes` append-only (remove deletion) and give the consultant a way to see the previous content of a note every time it's edited, via a DB-captured version history.

**Architecture:** One new Postgres table `crm_notes_history` plus a `BEFORE UPDATE` trigger on `crm_notes` that archives the old content whenever it changes — capture happens in the database, not in the server action, so it can't be bypassed by any code path (the app's server actions all use `createAdminClient()`, service role, which bypasses RLS). A new read-only server action `getNoteHistory(noteId)` exposes the archived versions to the CRM UI; `deleteNote` and its UI trigger are removed.

**Tech Stack:** Next.js Server Actions, Supabase (Postgres, triggers), Vitest + `@testing-library/react` (jsdom), existing hoisted-mock pattern in `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts`.

## Global Constraints

- Test file naming: `*.spec.ts`/`*.spec.tsx`, colocated next to the file under test.
- All mutations remain Server Actions (`"use server"`), never API routes, never client-side Supabase writes.
- **No exported server action may accept a parameter that represents an authorization check already performed by the caller.** `getNoteHistory(noteId)` re-derives note ownership itself from `noteId` alone (`crm_notes.consultant_id = user.id`), exactly like the rest of `src/app/(dashboard)/espace-consultante/crm/actions.ts`.
- French copy throughout the UI, matching the existing tone of `notes-editor.tsx`.
- Scope is `crm_notes` only. `consultation_notes` (fiche de consultation) is explicitly out of scope (see design doc §"Hors scope").
- No DB-level automated test harness exists in this repo (no local Supabase test DB, no pgTAP) — trigger correctness is verified by applying the migration to the project's Supabase instance and running manual SQL checks, not by Vitest.

---

### Task 1: Migration — `crm_notes_history` table + capture trigger

**Files:**
- Create: `supabase/migrations/00097_crm_notes_history.sql`

**Interfaces:**
- Consumes: existing `crm_notes` table (`supabase/migrations/00007_crm.sql`).
- Produces: table `crm_notes_history(id, note_id, content, edited_by, edited_at)`, trigger `crm_notes_capture_history` — consumed by Task 3 (`getNoteHistory`).

- [ ] **Step 1: Write the migration file**

```sql
-- Historique des versions de crm_notes : une note n'est jamais supprimable,
-- seulement modifiable ; chaque édition archive ici le contenu précédent.
-- Capture faite par trigger (pas dans la server action) pour que
-- l'historique soit garanti quel que soit le chemin de code qui touche
-- crm_notes, y compris via le service role qui contourne RLS.
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

-- Nommage important : les triggers BEFORE UPDATE du même événement
-- s'exécutent dans l'ordre alphabétique de leur nom en PostgreSQL.
-- "crm_notes_capture_history" < "crm_notes_updated_at" (trigger existant,
-- 00007_crm.sql) garantit que OLD.updated_at est bien capturé ici avant
-- d'être réécrit par l'autre trigger.
CREATE TRIGGER crm_notes_capture_history
  BEFORE UPDATE ON crm_notes
  FOR EACH ROW
  EXECUTE FUNCTION capture_crm_note_history();
```

- [ ] **Step 2: Validate and apply the migration**

Run: `pnpm db:push:dry`
Expected: no SQL error reported, `crm_notes_history` and the new trigger appear in the diff.

Then run: `pnpm db:push`
Expected: migration applies cleanly to the project's Supabase instance.

- [ ] **Step 3: Manually verify the trigger in the Supabase SQL editor**

Run this against the live/dev database (adjust the UUIDs to a real `crm_notes` row and its `consultant_id`, or insert a throwaway note first):

```sql
-- Voir l'état avant
SELECT id, content, updated_at FROM crm_notes WHERE id = '<note-id>';

UPDATE crm_notes SET content = 'contenu modifié une première fois' WHERE id = '<note-id>';
UPDATE crm_notes SET content = 'contenu modifié une seconde fois' WHERE id = '<note-id>';

SELECT note_id, content, edited_at FROM crm_notes_history
WHERE note_id = '<note-id>' ORDER BY edited_at ASC;
```

Expected: 2 rows in `crm_notes_history`, the first with the content that existed before the first `UPDATE`, the second with "contenu modifié une première fois" — never the final content (that lives only in `crm_notes.content` itself). Then run an `UPDATE` that doesn't change `content` (e.g. touches nothing, or sets `content` to its current value) and confirm no new row is added.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00097_crm_notes_history.sql
git commit -m "feat(db): archive l'historique des versions de crm_notes"
```

---

### Task 2: Remove `deleteNote` — server action and UI

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/crm/actions.ts:856-872` (remove `deleteNote`)
- Modify: `src/app/(dashboard)/espace-consultante/crm/_components/notes-editor.tsx`

**Interfaces:**
- Consumes: none.
- Produces: `notes-editor.tsx` with no delete affordance — no interface other tasks depend on.

- [ ] **Step 1: Remove the `deleteNote` server action**

In `src/app/(dashboard)/espace-consultante/crm/actions.ts`, delete the entire `deleteNote` export (currently lines 856-872):

```ts
export const deleteNote = async (noteId: string): Promise<ActionResult> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("crm_notes")
    .delete()
    .eq("id", noteId)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/espace-consultante/crm");
  return { success: true };
};
```

- [ ] **Step 2: Remove the delete button and handler from the component**

In `src/app/(dashboard)/espace-consultante/crm/_components/notes-editor.tsx`:

- Remove `deleteNote` from the `import { createNote, updateNote, deleteNote } from "../actions";` line (becomes `import { createNote, updateNote } from "../actions";`).
- Remove the `Trash2` import from `lucide-react` if it's not used elsewhere in the file (it isn't — check with `grep -n "Trash2" notes-editor.tsx` after removal, should return nothing outside the import line you're deleting).
- Remove the entire `handleDelete` function:

```ts
  const handleDelete = (noteId: string) => {
    startTransition(async () => {
      const result = await deleteNote(noteId);
      if (result.success) {
        toast.success("Note supprimée");
      } else {
        toast.error(result.error);
      }
    });
  };
```

- Remove the delete `<Button>` (the one with `text-destructive` and `Trash2`):

```tsx
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(note.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
```

- [ ] **Step 3: Run the build to confirm nothing else references `deleteNote`**

Run: `grep -rn "deleteNote" src` — expect no matches. Then run: `pnpm build` (this repo has no separate `typecheck` script; `next build` runs the TypeScript check).
Expected: no errors. If any other file imports `deleteNote`, that's new information — stop and report it rather than guessing a fix.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/espace-consultante/crm/actions.ts src/app/\(dashboard\)/espace-consultante/crm/_components/notes-editor.tsx
git commit -m "feat(crm): retire la suppression des notes, jamais supprimables"
```

---

### Task 3: `getNoteHistory` server action + tests

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/crm/actions.ts` (add `getNoteHistory`, right after `updateNote`)
- Modify: `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts` (add mock branches + tests)

**Interfaces:**
- Consumes: `requireConsultant()` (already defined at the top of `actions.ts`), `createAdminClient()` (`@/lib/supabase/admin`).
- Produces: `getNoteHistory(noteId: string): Promise<{ id: string; content: string; edited_at: string }[]>` — consumed by Task 4 (`notes-editor.tsx`).

- [ ] **Step 1: Write the failing tests**

In `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts`, extend the hoisted mocks. In the `vi.hoisted` block that currently defines `mockChildOwnershipSingleData`, `childrenEqCalls`, `consultationNotesEqCalls` (around line 62-64), add:

```ts
    // getNoteHistory : résultat du .single() de vérification de propriété de la note.
    mockNoteOwnershipSingleData: { data: null as { id: string } | null },
    mockNoteHistoryListData: { data: [] as unknown[] },
    noteOwnershipEqCalls: [] as { column: string; value: unknown }[],
```

and destructure these three in the surrounding `const { ... } = vi.hoisted(...)` block, alongside `mockChildOwnershipSingleData`.

In the `createAdminClient` mock's `from(table)` switch, before the final fallback `return { insert: ... }` block (currently starting at line 187), add a `crm_notes` branch and a `crm_notes_history` branch:

```ts
      if (table === "crm_notes") {
        return {
          select: () => ({
            eq: (column: string, value: unknown) => {
              noteOwnershipEqCalls.push({ column, value });
              return {
                eq: (column2: string, value2: unknown) => {
                  noteOwnershipEqCalls.push({ column: column2, value: value2 });
                  return {
                    single: () => Promise.resolve(mockNoteOwnershipSingleData),
                  };
                },
              };
            },
          }),
          insert: (data: unknown) => {
            insertCalls.push({ table, data });
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: "note-1" }, error: null }),
              }),
            };
          },
          update: (data: unknown) => {
            updateCalls.push({ table, data });
            return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) };
          },
        };
      }
      if (table === "crm_notes_history") {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve(mockNoteHistoryListData),
            }),
          }),
        };
      }
```

Add `getNoteHistory` to the `import { ... } from "./actions";` block (around line 202-213).

In `resetMocks()` (around line 216-237), add:

```ts
  mockNoteOwnershipSingleData.data = null;
  mockNoteHistoryListData.data = [];
  noteOwnershipEqCalls.length = 0;
```

Then add a new `describe` block at the end of the file:

```ts
describe("getNoteHistory", () => {
  beforeEach(resetMocks);

  it("retourne l'historique d'une note appartenant à la consultante", async () => {
    asConsultant();
    mockNoteOwnershipSingleData.data = { id: "note-1" };
    mockNoteHistoryListData.data = [
      { id: "h-2", content: "deuxième version", edited_at: "2026-08-10T10:00:00.000Z" },
      { id: "h-1", content: "première version", edited_at: "2026-08-09T10:00:00.000Z" },
    ];

    const result = await getNoteHistory("note-1");

    expect(result).toEqual([
      { id: "h-2", content: "deuxième version", edited_at: "2026-08-10T10:00:00.000Z" },
      { id: "h-1", content: "première version", edited_at: "2026-08-09T10:00:00.000Z" },
    ]);
    expect(noteOwnershipEqCalls).toEqual([
      { column: "id", value: "note-1" },
      { column: "consultant_id", value: "consultant-1" },
    ]);
  });

  it("ne renvoie rien si la note n'appartient pas à la consultante courante", async () => {
    asConsultant();
    mockNoteOwnershipSingleData.data = null;
    mockNoteHistoryListData.data = [
      { id: "h-1", content: "fuite potentielle", edited_at: "2026-08-09T10:00:00.000Z" },
    ];

    const result = await getNoteHistory("note-not-mine");

    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/app/\(dashboard\)/espace-consultante/crm/actions.spec.ts`
Expected: FAIL — `getNoteHistory` is not exported from `./actions`.

- [ ] **Step 3: Implement `getNoteHistory`**

In `src/app/(dashboard)/espace-consultante/crm/actions.ts`, right after the `updateNote` export, add:

```ts
export const getNoteHistory = async (
  noteId: string,
): Promise<{ id: string; content: string; edited_at: string }[]> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { data: note } = await supabase
    .from("crm_notes")
    .select("id")
    .eq("id", noteId)
    .eq("consultant_id", user.id)
    .single();

  if (!note) {
    return [];
  }

  const { data } = await supabase
    .from("crm_notes_history")
    .select("id, content, edited_at")
    .eq("note_id", noteId)
    .order("edited_at", { ascending: false });

  return data ?? [];
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/app/\(dashboard\)/espace-consultante/crm/actions.spec.ts`
Expected: PASS, including the pre-existing tests in this file (nothing else should break).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/espace-consultante/crm/actions.ts src/app/\(dashboard\)/espace-consultante/crm/actions.spec.ts
git commit -m "feat(crm): ajoute getNoteHistory pour consulter les versions d'une note"
```

---

### Task 4: UI — inline history expander in `notes-editor.tsx`

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/crm/_components/notes-editor.tsx`
- Create: `src/app/(dashboard)/espace-consultante/crm/_components/notes-editor.spec.tsx`

**Interfaces:**
- Consumes: `getNoteHistory(noteId: string): Promise<{ id: string; content: string; edited_at: string }[]>` (Task 3).
- Produces: none — leaf UI component.

- [ ] **Step 1: Write the failing component test**

Create `src/app/(dashboard)/espace-consultante/crm/_components/notes-editor.spec.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotesEditor } from "./notes-editor";

const { mockGetNoteHistory } = vi.hoisted(() => ({
  mockGetNoteHistory: vi.fn(),
}));

vi.mock("../actions", () => ({
  createNote: vi.fn(),
  updateNote: vi.fn(),
  getNoteHistory: mockGetNoteHistory,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const notes = [
  {
    id: "note-1",
    content: "Contenu actuel",
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "note-2",
    content: "Jamais modifiée",
    created_at: "2026-08-05T10:00:00.000Z",
    updated_at: "2026-08-05T10:00:00.000Z",
  },
];

describe("NotesEditor", () => {
  beforeEach(() => {
    mockGetNoteHistory.mockReset();
  });

  it("n'affiche pas de bouton de suppression", () => {
    render(<NotesEditor clientId="client-1" notes={notes} />);

    expect(
      screen.queryByRole("button", { name: /supprimer/i }),
    ).not.toBeInTheDocument();
  });

  it("affiche le lien historique seulement pour une note modifiée", () => {
    render(<NotesEditor clientId="client-1" notes={notes} />);

    expect(screen.getByText(/voir l'historique/i)).toBeInTheDocument();
    // Une seule note (note-1) a updated_at !== created_at.
    expect(screen.getAllByText(/voir l'historique/i)).toHaveLength(1);
  });

  it("charge et affiche les versions précédentes au clic", async () => {
    mockGetNoteHistory.mockResolvedValue([
      { id: "h-1", content: "Ancien contenu", edited_at: "2026-08-05T10:00:00.000Z" },
    ]);
    render(<NotesEditor clientId="client-1" notes={notes} />);

    fireEvent.click(screen.getByText(/voir l'historique/i));

    await waitFor(() => {
      expect(screen.getByText("Ancien contenu")).toBeInTheDocument();
    });
    expect(mockGetNoteHistory).toHaveBeenCalledWith("note-1");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/app/\(dashboard\)/espace-consultante/crm/_components/notes-editor.spec.tsx`
Expected: FAIL — `getNoteHistory` is not imported/used yet in `notes-editor.tsx`, and no "voir l'historique" text exists.

- [ ] **Step 3: Implement the history expander**

In `src/app/(dashboard)/espace-consultante/crm/_components/notes-editor.tsx`:

Update the import line to bring in `getNoteHistory`:

```ts
import { createNote, updateNote, getNoteHistory } from "../actions";
```

Add a `HistoryEntry` type and per-note history state near the top of the component (after the existing `useState` calls):

```ts
type HistoryEntry = { id: string; content: string; edited_at: string };
```

```ts
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);
  const [historyByNote, setHistoryByNote] = useState<
    Record<string, HistoryEntry[]>
  >({});
  const [historyLoading, setHistoryLoading] = useState(false);

  const toggleHistory = (noteId: string) => {
    if (openHistoryId === noteId) {
      setOpenHistoryId(null);
      return;
    }
    setOpenHistoryId(noteId);
    if (!historyByNote[noteId]) {
      setHistoryLoading(true);
      getNoteHistory(noteId)
        .then((entries) => {
          setHistoryByNote((prev) => ({ ...prev, [noteId]: entries }));
        })
        .finally(() => setHistoryLoading(false));
    }
  };
```

In the note display block (the `<>...</>` branch rendered when `editingId !== note.id`), after the existing date/actions `<div>` (the one containing `{format(...)}` and the edit button), add the history link and its expanded list:

```tsx
                {note.updated_at !== note.created_at && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline"
                      onClick={() => toggleHistory(note.id)}
                    >
                      Voir l'historique
                    </button>
                    {openHistoryId === note.id && (
                      <div className="mt-2 space-y-2 border-l-2 pl-3">
                        {historyLoading && !historyByNote[note.id] ? (
                          <p className="text-xs text-muted-foreground">
                            Chargement…
                          </p>
                        ) : (
                          (historyByNote[note.id] ?? []).map((entry) => (
                            <div key={entry.id}>
                              <p className="text-xs text-muted-foreground">
                                {format(
                                  new Date(entry.edited_at),
                                  "d MMM yyyy 'à' HH:mm",
                                  { locale: fr },
                                )}
                              </p>
                              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                {entry.content}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/app/\(dashboard\)/espace-consultante/crm/_components/notes-editor.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full test suite to confirm no regression**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/espace-consultante/crm/_components/notes-editor.tsx src/app/\(dashboard\)/espace-consultante/crm/_components/notes-editor.spec.tsx
git commit -m "feat(crm): affiche l'historique des versions d'une note en ligne"
```

---

### Task 5: Final branch review

**Files:** none (review-only task).

- [ ] **Step 1: Re-read the full diff against the design doc**

Run: `git diff main --stat` and `git log main..HEAD --oneline` to list every changed file and commit on this branch.

Check against `docs/superpowers/specs/2026-08-12-tracabilite-notes-crm-design.md`:
- `deleteNote` is gone from both `actions.ts` and `notes-editor.tsx`, with no other file still importing it (`grep -rn "deleteNote" src` should return nothing).
- `getNoteHistory` re-derives ownership from `noteId` alone — no parameter representing an already-performed check.
- The trigger captures history regardless of caller (DB-level, not app-level) — re-read `supabase/migrations/00097_crm_notes_history.sql` and confirm the trigger fires on the underlying table itself, not conditionally on which server action ran.
- `notes-editor.tsx` shows the history link only when `updated_at !== note.created_at`, matching the existing "(modifiée)" convention already in the file.

- [ ] **Step 2: Run the full test suite one more time**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 3: Manual smoke check (documented, not automated)**

In the CRM contact page (`/espace-consultante/crm/[clientId]`), create a note, edit it twice, confirm "Voir l'historique (…)" — actually just "Voir l'historique" per the copy above — appears and expanding it shows the two prior versions in the right order (most recent first). Confirm there is no delete button anywhere on a note.
