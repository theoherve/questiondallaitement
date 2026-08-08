import { Star } from "lucide-react";
import { GOOGLE_PROFILE } from "@/data/testimonials";
import { getGoogleRating } from "@/lib/google-reviews";

export async function GoogleRatingBadge({
  className = "",
}: {
  className?: string;
}) {
  const { rating, reviewCount } = await getGoogleRating();
  if (reviewCount === 0) return null;

  const formattedRating = rating.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <a
      href={GOOGLE_PROFILE.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full border border-primary-green/10 bg-white px-4 py-2 font-sans text-sm text-primary-green shadow-sm transition-colors hover:border-primary-green/25 ${className}`}
    >
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className="h-3.5 w-3.5 fill-primary-red text-primary-red"
          />
        ))}
      </span>
      <span className="font-semibold">{formattedRating}</span>
      <span className="text-primary-green/60">
        sur {reviewCount} avis Google
      </span>
    </a>
  );
}
