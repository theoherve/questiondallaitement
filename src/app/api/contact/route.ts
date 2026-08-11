import { NextResponse } from "next/server";
import { contactMessageSchema } from "@/validations/contact";
import { submitContactMessage } from "@/lib/contact/submit";
import { rateLimit } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth";
import { getContactEmail } from "@/lib/settings/seo-defaults/store";

/**
 * Cinq envois par IP et par dix minutes : assez large pour une personne qui
 * corrige une erreur de saisie, assez etroit pour dissuader un script.
 */
const CONTACT_RATE_LIMIT = {
  prefix: "contact-message",
  limit: 5,
  windowSeconds: 600,
} as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = contactMessageSchema.safeParse(body);

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return NextResponse.json({ errors: fieldErrors }, { status: 400 });
  }

  const { website, ...input } = parsed.data;

  // Piege a robots : reponse identique a un envoi reussi, meme logique que
  // /api/newsletter (src/app/api/newsletter/route.ts).
  if (website && website.trim() !== "") {
    return NextResponse.json({ status: "sent" });
  }

  const limit = await rateLimit(CONTACT_RATE_LIMIT);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 },
    );
  }

  const user = await getSessionUser();
  const outcome = await submitContactMessage(input, user?.id ?? null);

  if (outcome.status === "error") {
    const contactEmail = await getContactEmail();
    return NextResponse.json(
      {
        error: `Une erreur est survenue, réessayez ou écrivez-nous à ${contactEmail}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(outcome);
}
