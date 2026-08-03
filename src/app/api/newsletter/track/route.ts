import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { NEWSLETTER_SOURCES } from "@/config/newsletter";
import { trackNewsletterEvent } from "@/lib/newsletter/subscribe";

/**
 * Comptage des visites de la page newsletter.
 *
 * Une route dediee plutot qu'un comptage au rendu serveur : la page est
 * statique et mise en cache, donc le rendu ne repasse pas a chaque visite. Seul
 * `page_view` transite ici — les inscriptions sont comptees par la route
 * d'inscription, ou elles ne peuvent pas etre falsifiees depuis le navigateur.
 */
const trackSchema = z.object({
  source: z.enum(NEWSLETTER_SOURCES),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = trackSchema.safeParse(body);

  // Silencieux a dessein : une mesure d'audience ne renvoie rien d'exploitable
  // et ne doit jamais retenir l'affichage de la page.
  if (!parsed.success) {
    return new NextResponse(null, { status: 204 });
  }

  await trackNewsletterEvent("page_view", parsed.data.source);
  return new NextResponse(null, { status: 204 });
}
