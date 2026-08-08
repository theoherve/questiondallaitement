import { ScrollReveal } from "@/components/public/scroll-reveal";
import { TestimonialGrid } from "@/components/public/testimonials/testimonial-grid";
import type { TestimonialTopic } from "@/data/testimonials";
import { getTestimonialsForModule } from "@/lib/testimonials";
import { Section } from "./section";

const DEFAULT_TITLE = "Elles en parlent mieux que moi";

export function SalesTestimonials({
  topic,
  title = DEFAULT_TITLE,
}: {
  topic: TestimonialTopic;
  title?: string;
}) {
  const items = getTestimonialsForModule(topic);
  if (items.length === 0) return null;

  return (
    <Section id="temoignages" className="bg-background-beige">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
      </ScrollReveal>
      <div className="mt-10">
        <TestimonialGrid items={items} />
      </div>
    </Section>
  );
}
