import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Compteur de clics de la page /liens.
 *
 * Appelée en `sendBeacon` au moment du clic, donc en POST sans corps. La
 * réponse n'est jamais lue par le navigateur : le statut suffit, et une erreur
 * ne doit rien casser côté visiteuse puisque la navigation est déjà partie.
 */

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Filtre avant d'atteindre la base : sans lui, chaque identifiant fantaisiste
  // déclencherait une requête et une erreur Postgres de conversion de type.
  if (!UUID_PATTERN.test(id)) {
    return new NextResponse(null, { status: 204 });
  }

  const supabase = createAdminClient();
  await supabase.rpc("increment_bio_link_clicks", { link_id: id });

  return new NextResponse(null, { status: 204 });
}
