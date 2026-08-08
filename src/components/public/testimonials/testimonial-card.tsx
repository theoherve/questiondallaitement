import { Star } from "lucide-react";
import type { Testimonial } from "@/data/testimonials";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <blockquote className="flex h-full flex-col rounded-lg border border-primary-green/10 bg-white p-7 shadow-sm">
      <div
        className="flex gap-0.5"
        aria-label={`${testimonial.rating} étoiles sur 5`}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={
              i < testimonial.rating
                ? "h-4 w-4 fill-primary-red text-primary-red"
                : "h-4 w-4 text-primary-green/20"
            }
            aria-hidden
          />
        ))}
      </div>

      <p className="mt-4 flex-1 font-serif text-base leading-relaxed text-primary-green/90 italic">
        « {testimonial.quote} »
      </p>

      <footer className="mt-6 border-t border-primary-green/10 pt-4">
        <p className="font-sans text-sm font-semibold text-primary-green">
          {testimonial.author}
        </p>
        <p className="mt-0.5 font-sans text-xs text-primary-green/50">
          {testimonial.detail}
        </p>

        {testimonial.source === "google" && (
          <a
            href={testimonial.reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 font-sans text-xs text-primary-green/60 underline-offset-2 hover:text-primary-green hover:underline"
          >
            <GoogleGlyph />
            Avis Google
          </a>
        )}
      </footer>
    </blockquote>
  );
}

/** Le « G » de Google, aux couleurs de la marque. */
function GoogleGlyph() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#4285F4"
        d="M45 24c0-1.6-.1-2.7-.4-3.9H24v7.1h12c-.2 1.9-1.5 4.7-4.4 6.6l6.7 5.2C42.2 35.5 45 30.3 45 24z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.3 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4l-7.1-5.6C2.9 17 2 20.4 2 24s.9 7 2.4 10l7.1-5.6z"
      />
      <path
        fill="#EA4335"
        d="M24 10.4c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.2 29.9 2 24 2 15.4 2 8 6.7 4.4 14l7.1 5.6c1.8-5.3 6.7-9.2 12.5-9.2z"
      />
    </svg>
  );
}
