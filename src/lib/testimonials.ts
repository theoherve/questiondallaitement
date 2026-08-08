import { TESTIMONIALS } from "@/data/testimonials";
import type { Testimonial, TestimonialTopic } from "@/data/testimonials";

/**
 * Ordre déterministe : le plus récent d'abord, l'identifiant départageant les
 * avis sans date. Sans cela, deux builds pourraient rendre un ordre différent.
 */
const byRecency = (a: Testimonial, b: Testimonial) => {
  const dateDiff = (b.date ?? "").localeCompare(a.date ?? "");
  return dateDiff !== 0 ? dateDiff : a.id.localeCompare(b.id);
};

const isGeneric = (t: Testimonial) => t.topics.length === 0;

export function selectForTopic(
  pool: readonly Testimonial[],
  topic: TestimonialTopic,
  n = 3
): Testimonial[] {
  const targeted = pool.filter((t) => t.topics.includes(topic)).sort(byRecency);
  if (targeted.length >= n) return targeted.slice(0, n);

  const alreadyPicked = new Set(targeted.map((t) => t.id));
  const filler = pool
    .filter((t) => t.featured && isGeneric(t) && !alreadyPicked.has(t.id))
    .sort(byRecency);

  return [...targeted, ...filler].slice(0, n);
}

export function selectFeatured(
  pool: readonly Testimonial[],
  n = 6
): Testimonial[] {
  return pool
    .filter((t) => t.featured)
    .sort(byRecency)
    .slice(0, n);
}

export function selectAll(
  pool: readonly Testimonial[],
  filters: { topic?: TestimonialTopic; source?: Testimonial["source"] } = {}
): Testimonial[] {
  return pool
    .filter((t) => !filters.topic || t.topics.includes(filters.topic))
    .filter((t) => !filters.source || t.source === filters.source)
    .sort(byRecency);
}

export const getTestimonialsForModule = (topic: TestimonialTopic, n = 3) =>
  selectForTopic(TESTIMONIALS, topic, n);

export const getFeaturedTestimonials = (n = 6) =>
  selectFeatured(TESTIMONIALS, n);

export const getAllTestimonials = (
  filters: { topic?: TestimonialTopic; source?: Testimonial["source"] } = {}
) => selectAll(TESTIMONIALS, filters);
