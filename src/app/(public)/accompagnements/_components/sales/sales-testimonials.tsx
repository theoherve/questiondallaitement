import { CheckCircle, Quote } from "lucide-react";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { Section } from "./section";

export type Testimonial = { quote: string; author: string; detail: string };

export function SalesTestimonials({
  title,
  items,
}: {
  title: string;
  items: readonly Testimonial[];
}) {
  return (
    <Section id="temoignages" className="bg-background-beige">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
      </ScrollReveal>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {items.map((t, i) => (
          <ScrollReveal key={t.author} delay={i * 80}>
            <figure className="flex h-full flex-col rounded-lg border border-primary-green/10 bg-white p-6">
              <Quote className="h-6 w-6 text-primary-red/40" aria-hidden />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-primary-green/80">
                « {t.quote} »
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-accent-sage" aria-hidden />
                <span className="text-sm font-medium text-primary-green">
                  {t.author}
                </span>
                <span className="text-xs text-primary-green/50">· {t.detail}</span>
              </figcaption>
            </figure>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}
