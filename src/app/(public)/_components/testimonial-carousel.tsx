"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Margaux",
    context: "Maman de Morgan, 3 mois",
    text: "Ma production de lait a augmenté en une semaine grâce aux conseils personnalisés. Morgan est en allaitement exclusif et j'ai même réussi à stocker du lait. Je me sens enfin en confiance dans mon allaitement.",
    stars: 5,
  },
  {
    name: "Amina",
    context: "Maman de Lina, 21 mois",
    text: "Sans cet accompagnement, je n'aurais jamais allaité aussi longtemps. Malgré les tempêtes — bébé qui tétait 2h, refus du biberon, grève de la tétée — aujourd'hui ma fille a 21 mois et tète encore. Je suis fière.",
    stars: 5,
  },
  {
    name: "Nathalie",
    context: "Reprise du travail",
    text: "J'ai su maintenir ma lactation malgré un rythme professionnel intense. Tirer toutes les 3h au travail, c'est une bataille. Mais je ne veux pas arrêter et grâce à l'accompagnement j'ai maintenu le cap. Vraiment fière de ce que je fais.",
    stars: 5,
  },
  {
    name: "Katia",
    context: "Maman inquiète de sa lactation",
    text: "Avant, j'avais cette éternelle impression de seins vides et ma fille s'énervait au sein. Depuis les conseils reçus, elle ne s'énerve plus et je ressens de nouveau mes seins bien remplis. Je n'y croyais plus.",
    stars: 5,
  },
  {
    name: "Jennifer",
    context: "Maman de Noah, passage à l'allaitement exclusif",
    text: "Toutes ces nuits à tirer mon lait à 2h, 5h, 7h du matin, le triple feeding... ça en valait la peine. Depuis 3 jours nous sommes en allaitement exclusif. Thank you for your support along the journey!",
    stars: 5,
  },
  {
    name: "Émilie",
    context: "Maman accompagnée en post-partum",
    text: "Il y a quelques semaines c'était très dur pour moi. Aujourd'hui, cela me tient à coeur de vous dire que sans vous je n'en serais pas là aussi rapidement et aussi joyeusement. Merci pour votre écoute et votre réactivité.",
    stars: 5,
  },
];

export const TestimonialCarousel = () => {
  const [page, setPage] = useState(0);

  const itemsPerPage =
    typeof window !== "undefined" && window.innerWidth >= 1024 ? 3 : typeof window !== "undefined" && window.innerWidth >= 640 ? 2 : 1;

  const totalPages = Math.ceil(TESTIMONIALS.length / itemsPerPage);
  const startIdx = page * itemsPerPage;
  const visible = TESTIMONIALS.slice(startIdx, startIdx + itemsPerPage);

  const handlePrev = () => setPage((p) => Math.max(0, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  return (
    <div className="mt-12">
      {/* Desktop: show all 6 in a grid; Mobile: paginate */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <TestimonialCard key={t.name} testimonial={t} />
        ))}
      </div>

      <div className="lg:hidden">
        <div className="grid gap-6 sm:grid-cols-2">
          {visible.map((t) => (
            <TestimonialCard key={t.name} testimonial={t} />
          ))}
        </div>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            disabled={page === 0}
            className="text-background-beige hover:bg-background-beige/10"
            aria-label="Précédent"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-2 rounded-full transition-all ${
                  i === page
                    ? "w-6 bg-primary-red"
                    : "w-2 bg-background-beige/30"
                }`}
                aria-label={`Page ${i + 1}`}
                tabIndex={0}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            disabled={page === totalPages - 1}
            className="text-background-beige hover:bg-background-beige/10"
            aria-label="Suivant"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

type TestimonialCardProps = {
  testimonial: {
    name: string;
    context: string;
    text: string;
    stars: number;
  };
};

const TestimonialCard = ({ testimonial }: TestimonialCardProps) => (
  <Card className="border-0 bg-primary-green-light">
    <CardContent className="pt-6">
      <div className="flex gap-0.5">
        {Array.from({ length: testimonial.stars }).map((_, i) => (
          <Star
            key={i}
            className="h-4 w-4 fill-primary-red text-primary-red"
          />
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-background-beige/90 italic">
        &ldquo;{testimonial.text}&rdquo;
      </p>
      <div className="mt-4 border-t border-background-beige/10 pt-4">
        <p className="font-serif font-semibold text-background-beige">
          {testimonial.name}
        </p>
        <p className="text-xs text-background-beige/60">
          {testimonial.context}
        </p>
      </div>
    </CardContent>
  </Card>
);
