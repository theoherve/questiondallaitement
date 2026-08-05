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
