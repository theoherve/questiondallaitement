import Image from "next/image";
import {
  CheckCircle,
  Sprout,
  Sunrise,
  CalendarHeart,
  Briefcase,
  UtensilsCrossed,
  Leaf,
  Moon,
  ShieldPlus,
  type LucideIcon,
} from "lucide-react";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { Section } from "../sales/section";
import { PACK_CONTENT } from "./pack-content";
import type { ModuleCard } from "./pack-modules-data";

const MODULE_ICONS: Record<string, LucideIcon> = {
  Sprout,
  Sunrise,
  CalendarHeart,
  Briefcase,
  UtensilsCrossed,
  Leaf,
  Moon,
  ShieldPlus,
};

/* ------------------------------------------------------------- Problem */
export function PackProblem() {
  const { title, intro, points } = PACK_CONTENT.problem;
  return (
    <Section className="bg-background-beige">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-lg text-primary-green/70">{intro}</p>
      </ScrollReveal>
      <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
        {points.map((p, i) => (
          <ScrollReveal key={p} delay={i * 60} className="h-full">
            <div className="flex h-full items-center justify-center gap-3 rounded-lg border border-primary-green/10 bg-white p-5 text-center">
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-primary-red"
                aria-hidden
              />
              <span className="text-sm text-primary-green/80">{p}</span>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- Promise */
export function PackPromise() {
  const { title, paragraphs, bullets } = PACK_CONTENT.promise;
  return (
    <Section className="bg-accent-cream">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
        {paragraphs.map((p) => (
          <p key={p} className="mt-4 text-lg text-primary-green/70">
            {p}
          </p>
        ))}
      </ScrollReveal>
      <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-3">
        {bullets.map((b, i) => (
          <ScrollReveal key={b} delay={i * 60}>
            <div className="flex items-center gap-3">
              <CheckCircle
                className="h-5 w-5 shrink-0 text-primary-green"
                aria-hidden
              />
              <span className="text-primary-green/80">{b}</span>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- Modules */
export function PackModules({ modules }: { modules: ModuleCard[] }) {
  const { title, subtitle } = PACK_CONTENT.modules;
  return (
    <Section id="programme" className="bg-background-beige">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-lg text-primary-green/70">
          {modules.length} {subtitle}
        </p>
      </ScrollReveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((m, i) => {
          const Icon = m.accent ? MODULE_ICONS[m.accent.iconKey] : null;
          return (
            <ScrollReveal key={m.id} delay={(i % 4) * 60}>
              <div className="flex h-full flex-col overflow-hidden rounded-lg border border-primary-green/10 bg-white">
                <div className="relative aspect-video overflow-hidden bg-background-beige-dark">
                  {m.thumbnail_url ? (
                    <Image
                      src={m.thumbnail_url}
                      alt={m.title}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    />
                  ) : (
                    <div
                      className="flex h-full items-center justify-center"
                      style={
                        m.accent
                          ? {
                              backgroundImage: `linear-gradient(135deg, ${m.accent.from}, ${m.accent.to})`,
                            }
                          : undefined
                      }
                    >
                      {Icon && (
                        <Icon className="h-10 w-10 text-primary-green/70" aria-hidden />
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 font-serif text-base font-semibold text-primary-green">
                    {m.title}
                  </h3>
                  {m.short_description && (
                    <p className="mt-2 line-clamp-3 text-sm text-primary-green/70">
                      {m.short_description}
                    </p>
                  )}
                </div>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </Section>
  );
}

/* --------------------------------------------------------- How it works */
export function PackHowItWorks() {
  const { title, steps } = PACK_CONTENT.howItWorks;
  return (
    <Section className="bg-accent-cream">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
      </ScrollReveal>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <ScrollReveal key={s.title} delay={i * 80}>
            <div className="h-full rounded-lg border border-primary-green/10 bg-white p-6 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary-green text-lg font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 font-serif text-lg font-semibold text-primary-green">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-primary-green/70">{s.text}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- For who */
export function PackForWho() {
  const { title, scenarios } = PACK_CONTENT.forWho;
  return (
    <Section className="bg-background-beige">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
      </ScrollReveal>
      <div className="mx-auto mt-10 grid max-w-3xl gap-3">
        {scenarios.map((s, i) => (
          <ScrollReveal key={s} delay={i * 50}>
            <div className="flex items-start gap-3 rounded-lg border border-primary-green/10 bg-white p-4">
              <CheckCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-accent-sage"
                aria-hidden
              />
              <span className="text-primary-green/80">{s}</span>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------- Final CTA */
export function PackFinalCta() {
  const { title, subtitle, ctaLabel } = PACK_CONTENT.finalCta;
  return (
    <section className="bg-primary-rose px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-3xl font-bold text-white sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-lg text-white/90">{subtitle}</p>
        {/* CTA en blanc : sur l'aplat rose, primary-red serait illisible. */}
        <a
          href="#tarif"
          className="mt-8 inline-flex items-center rounded-md bg-white px-8 py-3.5 text-base font-medium text-primary-rose shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-background-beige"
        >
          {ctaLabel}
        </a>
      </div>
    </section>
  );
}
