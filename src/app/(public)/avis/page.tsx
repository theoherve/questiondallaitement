import type { Metadata } from "next";
import Link from "next/link";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { GoogleRatingBadge } from "@/components/public/testimonials/google-rating-badge";
import { TestimonialGrid } from "@/components/public/testimonials/testimonial-grid";
import { PACK_SLUG } from "@/config/accompagnements";
import type { TestimonialTopic } from "@/data/testimonials";
import { getAllTestimonials } from "@/lib/testimonials";

export const metadata: Metadata = {
  title: "Avis",
  description:
    "Les retours des mamans accompagnées par Carole Hervé, consultante en lactation IBCLC, et les avis publiés sur sa fiche Google.",
};

const FILTERS: { label: string; topic?: TestimonialTopic }[] = [
  { label: "Tous les avis" },
  { label: "Se préparer", topic: "je-me-prepare-a-allaiter" },
  { label: "Prématurité", topic: "de-la-couveuse-au-sein" },
  { label: "Premiers jours", topic: "mon-allaitement-des-premiers-jours" },
  { label: "Au fil des mois", topic: "mon-allaitement-au-fil-des-mois" },
  {
    label: "Reprise du travail",
    topic: "je-reprends-une-activite-professionnelle",
  },
  { label: "Diversification", topic: "la-diversification-de-mon-bebe-allaite" },
  { label: "Sevrage", topic: "je-souhaite-sevrer-mon-bebe" },
  { label: "Sommeil", topic: "mon-bebe-ne-fait-pas-ses-nuits" },
  { label: "Urgences", topic: "les-urgences-de-l-allaitement" },
  { label: "Le pack", topic: PACK_SLUG },
];

export default async function AvisPage({
  searchParams,
}: {
  searchParams: Promise<{ sujet?: string }>;
}) {
  const { sujet } = await searchParams;
  // Un sujet inconnu dans l'URL est ignoré plutôt que traité en 404 : la page
  // reste utile, seul le filtre retombe sur « tous les avis ».
  const active = FILTERS.find((f) => f.topic === sujet)?.topic;
  const testimonials = getAllTestimonials({ topic: active });

  return (
    <div className="section-padding">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center">
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
              Avis
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold text-primary-green lg:text-5xl">
              Ce qu&apos;elles en disent
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-primary-green/60">
              Les retours des mamans accompagnées, et les avis publiés sur la
              fiche Google du cabinet.
            </p>
            <div className="mt-6 flex justify-center">
              <GoogleRatingBadge />
            </div>
          </div>
        </ScrollReveal>

        <nav
          className="mt-10 flex flex-wrap justify-center gap-2"
          aria-label="Filtrer les avis par sujet"
        >
          {FILTERS.map((filter) => {
            const isActive = filter.topic === active;
            return (
              <Link
                key={filter.label}
                href={filter.topic ? `/avis?sujet=${filter.topic}` : "/avis"}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-full border px-4 py-1.5 font-sans text-sm transition-colors ${
                  isActive
                    ? "border-primary-green bg-primary-green text-white"
                    : "border-primary-green/15 text-primary-green/70 hover:border-primary-green/40 hover:text-primary-green"
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-10">
          {testimonials.length > 0 ? (
            <TestimonialGrid items={testimonials} />
          ) : (
            <p className="py-16 text-center text-primary-green/50">
              Aucun avis sur ce sujet pour le moment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
