import { NextResponse } from "next/server";
import { getSurveyPayload } from "@/lib/surveys/queries";

/**
 * Jamais mise en cache.
 *
 * C'est tout l'intérêt du widget : il est embarqué dans des articles rendus
 * statiquement, et c'est cet appel — fait par le navigateur à chaque visite —
 * qui empêche le graphique de rester figé sur les chiffres du jour de
 * publication.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const payload = await getSurveyPayload(slug);

  if (!payload) {
    return NextResponse.json({ error: "Sondage introuvable" }, { status: 404 });
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
