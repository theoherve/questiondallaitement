-- crm_notes_history n'a aucune policy RLS : lecture uniquement via
-- getNoteHistory (service role), jamais d'accès PostgREST direct.
ALTER TABLE crm_notes_history ENABLE ROW LEVEL SECURITY;

-- Une note n'est jamais supprimable (voir retrait de deleteNote) :
-- l'invariant doit tenir au niveau base, pas seulement applicatif.
DROP POLICY IF EXISTS crm_notes_delete_own ON crm_notes;
REVOKE DELETE ON crm_notes FROM anon, authenticated;
