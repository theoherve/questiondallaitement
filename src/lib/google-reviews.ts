import { GOOGLE_PROFILE } from "@/data/testimonials";

export type GoogleRating = {
  rating: number;
  reviewCount: number;
  /** false quand la valeur vient du repli statique. */
  isLive: boolean;
};

const FALLBACK: GoogleRating = {
  rating: GOOGLE_PROFILE.ratingFallback,
  reviewCount: GOOGLE_PROFILE.reviewCountFallback,
  isLive: false,
};

/**
 * Note globale et nombre d'avis de la fiche Google. Seuls ces deux champs sont
 * demandés : le texte des avis ne peut pas être mis en cache selon les
 * conditions de l'API Places, la note et le compte n'ont pas cette contrainte.
 *
 * Ne lève jamais. Une fiche Google indisponible ne doit pas faire tomber une
 * page de vente.
 */
export async function getGoogleRating(): Promise<GoogleRating> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!apiKey || !placeId) return FALLBACK;

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?fields=rating,userRatingCount`,
      {
        headers: { "X-Goog-Api-Key": apiKey },
        next: { revalidate: 86400 },
      }
    );
    if (!response.ok) return FALLBACK;

    const data: unknown = await response.json();
    const rating = (data as { rating?: unknown }).rating;
    const count = (data as { userRatingCount?: unknown }).userRatingCount;
    if (typeof rating !== "number" || typeof count !== "number") return FALLBACK;

    return { rating, reviewCount: count, isLive: true };
  } catch {
    return FALLBACK;
  }
}
