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
  Quote,
  type LucideIcon,
} from "lucide-react";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { PurchaseButton } from "../purchase-button";
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

const Section = ({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <section id={id} className={`scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 ${className}`}>
    <div className="mx-auto max-w-6xl">{children}</div>
  </section>
);

/* ---------------------------------------------------------------- Hero */
export function PackHero({
  title,
  priceLabel,
  imageUrl,
}: {
  title: string;
  priceLabel: string;
  imageUrl: string | null;
}) {
  const { eyebrow, subtitle, reassurances, ctaLabel } = PACK_CONTENT.hero;
  return (
    <section className="relative overflow-hidden bg-primary-green px-4 py-20 sm:px-6 sm:py-28">
      {/* Image du pack en fond, avec voile vert pour garder le texte lisible */}
      {imageUrl && (
        <>
          <Image
            src={imageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div
            className="absolute inset-0 bg-linear-to-b from-primary-green/80 via-primary-green/75 to-primary-green/90"
            aria-hidden
          />
        </>
      )}
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-red" aria-hidden />
          <span className="font-sans text-xs font-medium uppercase tracking-widest text-white/90">
            {eyebrow}
          </span>
        </div>
        <h1 className="font-serif text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/85">
          {subtitle}
        </p>
        <a
          href="#tarif"
          className="mt-8 inline-flex items-center rounded-md bg-primary-red px-8 py-3.5 text-base font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-primary-red-dark"
        >
          {ctaLabel} — {priceLabel}
        </a>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {reassurances.map((r) => (
            <li
              key={r}
              className="flex items-center gap-2 text-sm text-white/80"
            >
              <CheckCircle
                className="h-4 w-4 text-accent-sage"
                aria-hidden
              />
              {r}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

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
            <div className="flex h-full items-start gap-3 rounded-lg border border-primary-green/10 bg-white p-4">
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-red"
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
        <p className="mt-4 text-lg text-primary-green/70">{subtitle}</p>
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

/* ---------------------------------------------------------- Instructor */
export function PackInstructor({
  name,
  bio,
  avatarUrl,
}: {
  name: string;
  bio: string | null;
  avatarUrl: string | null;
}) {
  const { title, credentials } = PACK_CONTENT.instructor;
  const displayBio = bio ?? PACK_CONTENT.instructor.fallbackBio;
  return (
    <Section className="bg-accent-cream">
      <ScrollReveal className="mx-auto max-w-3xl">
        <h2 className="text-center font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
        <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              width={112}
              height={112}
              className="h-28 w-28 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="h-28 w-28 shrink-0 rounded-full bg-primary-green/10" />
          )}
          <div>
            <p className="font-serif text-xl font-semibold text-primary-green">
              {name}
            </p>
            <p className="mt-2 text-primary-green/70">{displayBio}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {credentials.map((c) => (
                <li
                  key={c}
                  className="rounded-full bg-primary-green/10 px-3 py-1 text-xs font-medium text-primary-green"
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ScrollReveal>
    </Section>
  );
}

/* -------------------------------------------------------- Testimonials */
export function PackTestimonials() {
  const { title, items } = PACK_CONTENT.testimonials;
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
                <CheckCircle
                  className="h-4 w-4 text-accent-sage"
                  aria-hidden
                />
                <span className="text-sm font-medium text-primary-green">
                  {t.author}
                </span>
                <span className="text-xs text-primary-green/50">
                  · {t.detail}
                </span>
              </figcaption>
            </figure>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- Pricing */
export function PackPricing({
  priceLabel,
  formationId,
  isLoggedIn,
  isEnrolled,
}: {
  priceLabel: string;
  formationId: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
}) {
  const { title, subtitle, includes, guarantee } = PACK_CONTENT.pricing;
  return (
    <Section id="tarif" className="bg-accent-cream">
      <div className="mx-auto max-w-lg rounded-2xl border border-primary-green/10 bg-white p-8 shadow-md">
        <h2 className="text-center font-serif text-2xl font-bold text-primary-green sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm text-primary-green/70">
          {subtitle}
        </p>
        <p className="mt-6 text-center font-serif text-5xl font-bold text-primary-red">
          {priceLabel}
        </p>
        <ul className="mt-6 space-y-2">
          {includes.map((it) => (
            <li key={it} className="flex items-start gap-2 text-sm text-primary-green/80">
              <CheckCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-accent-sage"
                aria-hidden
              />
              {it}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <PurchaseButton
            formationId={formationId}
            isLoggedIn={isLoggedIn}
            isEnrolled={isEnrolled}
          />
        </div>
        <p className="mt-4 text-center text-xs text-primary-green/50">
          {guarantee}
        </p>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------- Final CTA */
export function PackFinalCta() {
  const { title, subtitle, ctaLabel } = PACK_CONTENT.finalCta;
  return (
    <section className="bg-primary-green px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-3xl font-bold text-white sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-lg text-white/80">{subtitle}</p>
        <a
          href="#tarif"
          className="mt-8 inline-flex items-center rounded-md bg-primary-red px-8 py-3.5 text-base font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-primary-red-dark"
        >
          {ctaLabel}
        </a>
      </div>
    </section>
  );
}
