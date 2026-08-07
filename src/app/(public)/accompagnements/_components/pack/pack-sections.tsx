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
  ShieldCheck,
  Quote,
  type LucideIcon,
} from "lucide-react";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { PurchaseButton } from "../purchase-button";
import { ctaLabelFor } from "@/config/accompagnement-cta";
import { PACK_SLUG } from "@/config/accompagnements";
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
  const { eyebrow, titleOverride, subtitle, reassurances, ctaLabel } =
    PACK_CONTENT.hero;
  return (
    <section className="relative overflow-hidden bg-primary-green">
      <div
        className={`relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 ${
          imageUrl ? "lg:pr-[calc(38%+2rem)]" : "text-center"
        }`}
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-red" aria-hidden />
          <span className="font-sans text-xs font-medium uppercase tracking-widest text-white/90">
            {eyebrow}
          </span>
        </div>
        {/* Le H1 porte la promesse ; le nom produit reste affiché en dessous. */}
        <h1 className="font-serif text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          {titleOverride ?? title}
        </h1>
        {titleOverride && (
          <p className="mt-4 font-sans text-sm font-medium uppercase tracking-widest text-background-beige/85">
            {title}
          </p>
        )}
        <p
          className={`mt-6 max-w-2xl text-lg leading-relaxed text-white/90 ${
            imageUrl ? "" : "mx-auto"
          }`}
        >
          {subtitle}
        </p>
        <a
          href="#tarif"
          className="mt-8 inline-flex items-center rounded-md bg-primary-red px-8 py-3.5 text-base font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-primary-red-dark"
        >
          {ctaLabel} — {priceLabel}
        </a>
        <ul
          className={`mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 ${
            imageUrl ? "" : "justify-center"
          }`}
        >
          {reassurances.map((r) => (
            <li
              key={r}
              className="flex items-center gap-2 text-sm text-white/90"
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

      {/* Visuel du pack : sous le texte en mobile, cale a droite en desktop.
          Aucun voile, et `contain` plutot que `cover` — la vignette est un
          visuel compose, un recadrage la mutile. */}
      {imageUrl && (
        <div className="relative h-56 w-full sm:h-72 lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:w-[38%]">
          <Image
            src={imageUrl}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 38vw, 100vw"
            className="object-contain p-6 lg:p-10"
          />
        </div>
      )}
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
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-primary-green/10 bg-white p-5 text-center">
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
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-green/10 px-3 py-1 text-xs font-medium text-primary-green"
                >
                  <CheckCircle className="h-3 w-3 shrink-0 text-accent-sage" aria-hidden />
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
  anchorLabel,
  accompagnementId,
  isLoggedIn,
  isEnrolled,
  priceCents,
  currency,
}: {
  priceLabel: string;
  /** Ancrage de valeur dérivé de la DB (« X € d'économie… ») ; masqué si absent. */
  anchorLabel: string | null;
  accompagnementId: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
  priceCents: number;
  currency: string;
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
        {anchorLabel && (
          <p className="mt-2 text-center text-sm font-medium text-accent-sage">
            {anchorLabel}
          </p>
        )}
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
            accompagnementId={accompagnementId}
            isLoggedIn={isLoggedIn}
            isEnrolled={isEnrolled}
            priceCents={priceCents}
            currency={currency}
            ctaLabel={ctaLabelFor(PACK_SLUG)}
          />
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm font-medium text-primary-green/80">
          <ShieldCheck className="h-4 w-4 shrink-0 text-accent-sage" aria-hidden />
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
