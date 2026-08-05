import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { surveySubmissionSchema } from "@/validations/surveys";
import { submitSurveyResponse } from "@/lib/surveys/submit";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Dix réponses par IP et par dix minutes. Plus large que la newsletter : le
 * sondage est fait pour être rempli, y compris par plusieurs parents derrière
 * la même connexion, et une réponse coûte une ligne, pas un contact facturé.
 */
const SURVEY_RATE_LIMIT = {
  prefix: "survey-response",
  limit: 10,
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  const parsed = surveySubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Réponse invalide" },
      { status: 400 },
    );
  }

  const { website, ...input } = parsed.data;

  // Piège à robots : on répond comme pour un succès. Un rejet explicite
  // apprendrait au script quel champ éviter au passage suivant.
  if (website && website.trim() !== "") {
    return NextResponse.json({ personalResult: null, totalResponses: 0 });
  }

  const limit = await rateLimit(SURVEY_RATE_LIMIT);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 },
    );
  }

  const outcome = await submitSurveyResponse(slug, input, {
    ip: await clientIp(),
  });

  if (outcome.status === "invalid") {
    return NextResponse.json({ error: outcome.error }, { status: 400 });
  }
  if (outcome.status === "closed") {
    return NextResponse.json(
      { error: "Ce sondage est clôturé." },
      { status: 409 },
    );
  }
  if (outcome.status === "error") {
    return NextResponse.json(
      { error: "Une erreur est survenue, réessayez dans un instant." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    personalResult: outcome.personalResult,
    totalResponses: outcome.totalResponses,
  });
}
