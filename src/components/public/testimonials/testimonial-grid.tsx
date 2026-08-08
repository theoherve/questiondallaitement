import { ScrollReveal } from "@/components/public/scroll-reveal";
import type { Testimonial } from "@/data/testimonials";
import { TestimonialCard } from "./testimonial-card";

export function TestimonialGrid({ items }: { items: readonly Testimonial[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {items.map((testimonial, i) => (
        <ScrollReveal key={testimonial.id} delay={i * 80}>
          <TestimonialCard testimonial={testimonial} />
        </ScrollReveal>
      ))}
    </div>
  );
}
