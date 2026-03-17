"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const TESTIMONIALS = [
  {
    name: "Margaux",
    context: "Maman de Morgan, 3 mois",
    text: "Ma production de lait a augmenté en une semaine grâce aux conseils personnalisés. Morgan est en allaitement exclusif et j'ai même réussi à stocker du lait. Je me sens enfin en confiance dans mon allaitement.",
  },
  {
    name: "Amina",
    context: "Maman de Lina, 21 mois",
    text: "Sans cet accompagnement, je n'aurais jamais allaité aussi longtemps. Malgré les tempêtes — bébé qui tétait 2h, refus du biberon, grève de la tétée — aujourd'hui ma fille a 21 mois et tète encore. Je suis fière.",
  },
  {
    name: "Nathalie",
    context: "Reprise du travail",
    text: "J'ai su maintenir ma lactation malgré un rythme professionnel intense. Tirer toutes les 3h au travail, c'est une bataille. Mais grâce à l'accompagnement j'ai maintenu le cap.",
  },
  {
    name: "Katia",
    context: "Maman inquiète de sa lactation",
    text: "Avant, j'avais cette éternelle impression de seins vides et ma fille s'énervait au sein. Depuis les conseils reçus, elle ne s'énerve plus et je ressens de nouveau mes seins bien remplis. Je n'y croyais plus.",
  },
  {
    name: "Jennifer",
    context: "Passage à l'allaitement exclusif",
    text: "Toutes ces nuits à tirer mon lait à 2h, 5h, 7h du matin, le triple feeding... ça en valait la peine. Depuis 3 jours nous sommes en allaitement exclusif. Thank you for your support along the journey!",
  },
  {
    name: "Émilie",
    context: "Accompagnée en post-partum",
    text: "Il y a quelques semaines c'était très dur pour moi. Aujourd'hui, cela me tient à cœur de vous dire que sans vous je n'en serais pas là aussi rapidement et aussi joyeusement. Merci pour votre écoute.",
  },
];

export const TestimonialCarousel = () => {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(TESTIMONIALS.length / 3);

  const next = useCallback(
    () => setPage((p) => (p + 1) % totalPages),
    [totalPages]
  );
  const prev = useCallback(
    () => setPage((p) => (p - 1 + totalPages) % totalPages),
    [totalPages]
  );

  // Autoplay — 6s interval
  useEffect(() => {
    const interval = setInterval(next, 6000);
    return () => clearInterval(interval);
  }, [next]);

  const startIdx = page * 3;
  const visible = TESTIMONIALS.slice(startIdx, startIdx + 3);

  return (
    <div className="py-12 lg:py-16">
      {/* Grid of testimonial cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {visible.map((t) => (
          <blockquote
            key={t.name}
            className="flex flex-col bg-white p-7 shadow-sm"
          >
            {/* Stars */}
            <div className="flex gap-0.5" aria-label="5 étoiles sur 5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4 fill-primary-red text-primary-red"
                  aria-hidden
                />
              ))}
            </div>

            {/* Quote */}
            <p className="mt-4 flex-1 font-serif text-base leading-relaxed text-primary-green/90 italic">
              &ldquo;{t.text}&rdquo;
            </p>

            {/* Attribution */}
            <footer className="mt-6 border-t border-primary-green/10 pt-4">
              <p className="font-sans text-sm font-semibold text-primary-green">
                {t.name}
              </p>
              <p className="mt-0.5 font-sans text-xs text-primary-green/50">
                {t.context}
              </p>
            </footer>
          </blockquote>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-10 flex items-center justify-center gap-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={prev}
          className="text-primary-green/60 hover:bg-primary-green/5 hover:text-primary-green"
          aria-label="Témoignages précédents"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-2 transition-all ${
                i === page
                  ? "w-6 bg-primary-red"
                  : "w-2 bg-primary-green/20 hover:bg-primary-green/40"
              }`}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={next}
          className="text-primary-green/60 hover:bg-primary-green/5 hover:text-primary-green"
          aria-label="Témoignages suivants"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
