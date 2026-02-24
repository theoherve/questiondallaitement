-- Fix infinite recursion: formation_collaborators policies query formations,
-- and formations_select_collab queries formation_collaborators.
-- Use a SECURITY DEFINER function so reading formations inside
-- formation_collaborators policies does not re-trigger formations RLS.

CREATE OR REPLACE FUNCTION public.get_formation_ids_owned_by(owner_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM formations WHERE consultant_id = owner_id;
$$;

-- Recreate formation_collaborators policies using the function instead of inline SELECT on formations

DROP POLICY IF EXISTS formation_collab_select ON formation_collaborators;
CREATE POLICY formation_collab_select ON formation_collaborators
  FOR SELECT USING (
    consultant_id = auth.uid()
    OR formation_id IN (SELECT get_formation_ids_owned_by(auth.uid()))
    OR is_admin()
  );

DROP POLICY IF EXISTS formation_collab_insert ON formation_collaborators;
CREATE POLICY formation_collab_insert ON formation_collaborators
  FOR INSERT WITH CHECK (
    formation_id IN (SELECT get_formation_ids_owned_by(auth.uid()))
    OR is_admin()
  );

DROP POLICY IF EXISTS formation_collab_delete ON formation_collaborators;
CREATE POLICY formation_collab_delete ON formation_collaborators
  FOR DELETE USING (
    formation_id IN (SELECT get_formation_ids_owned_by(auth.uid()))
    OR is_admin()
  );
