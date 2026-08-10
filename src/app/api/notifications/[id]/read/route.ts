import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PATCH /api/notifications/:id/read — marque une notification comme lue.
 *
 * Le filtre sur `user_id` est la garantie d'isolation : le client admin passe
 * outre RLS, c'est donc ici que se joue le cloisonnement entre comptes.
 */
export const PATCH = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
};
