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
