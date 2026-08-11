import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { newsletterSignupSchema } from "@/validations/newsletter";
import {
  subscribeToNewsletter,
  trackNewsletterEvent,
} from "@/lib/newsletter/subscribe";
import { rateLimit } from "@/lib/rate-limit";
import { getContactEmail } from "@/lib/settings/seo-defaults/store";

/**
 * Trois inscriptions par adresse IP et par dix minutes. Assez large pour une
 * famille derriere la meme connexion ou un reseau d'entreprise, assez etroit
 * pour qu'un script n'inonde pas la liste Brevo — chaque contact ajoute y est
 * facture.
 */
const NEWSLETTER_RATE_LIMIT = {
  prefix: "newsletter-signup",
  limit: 3,
  windowSeconds: 600,
} as const;

const clientIp = async () => {
  const headersList = await headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    null
  );
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = newsletterSignupSchema.safeParse(body);

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return NextResponse.json({ errors: fieldErrors }, { status: 400 });
  }

  const { website, source, ...input } = parsed.data;

  // Piege a robots : on repond exactement comme pour une inscription reussie.
  // Un rejet visible apprendrait au script quel champ eviter au prochain
  // passage ; ici il repart convaincu d'avoir abouti.
  if (website && website.trim() !== "") {
    return NextResponse.json({ status: "subscribed", firstName: input.first_name });
  }

  // Apres le honeypot : inutile de faire consommer un quota partage a des
  // robots que l'on ecarte gratuitement. Avant tout appel a Brevo, en
  // revanche — c'est la ressource a proteger.
  const limit = await rateLimit(NEWSLETTER_RATE_LIMIT);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 },
    );
  }

  const outcome = await subscribeToNewsletter(
    { ...input, source },
    await clientIp(),
  );

  if (outcome.status === "error") {
    const contactEmail = await getContactEmail();
    return NextResponse.json(
      {
        error:
          `Une erreur est survenue, réessayez ou écrivez-nous à ${contactEmail}`,
      },
      { status: 500 },
    );
  }

  // Seules les inscriptions nouvelles comptent : compter les reinscriptions
  // gonflerait artificiellement le taux de conversion de la page.
  if (outcome.status === "subscribed") {
    await trackNewsletterEvent("signup", source);
  }

  return NextResponse.json(outcome);
}
