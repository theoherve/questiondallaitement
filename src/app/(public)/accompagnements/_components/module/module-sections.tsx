import Link from "next/link";
import { CheckCircle, MinusCircle } from "lucide-react";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { Section } from "../sales/section";
import { SHARED_CONTENT } from "./content/shared";
import type { ModuleContent } from "./content/types";

/* ---------------------------------------------------------- Barre de preuve */
export function ModuleProofBar({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="border-b border-primary-green/10 bg-white">
      <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-4 sm:px-6">
        {[...items, "Accès à vie"].map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 text-sm font-medium text-primary-green/80"
          >
            <CheckCircle className="h-4 w-4 shrink-0 text-accent-sage" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------- Le probleme */
export function ModuleProblem({
  content,
}: {
  content: ModuleContent["problem"];
}) {
  if (!content) return null;
  const { title, intro, points } = content;
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

/* --------------------------------------------------------------- La promesse */
export function ModulePromise({
  content,
}: {
  content: ModuleContent["promise"];
}) {
  if (!content) return null;
  const { title, paragraphs, bullets } = content;
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

/* ------------------------------------------------- Ce qui devient possible */
export function ModuleOutcomes({
  content,
}: {
  content: ModuleContent["outcomes"];
}) {
  return (
    <Section className="bg-background-beige">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {content.title}
        </h2>
        {content.subtitle && (
          <p className="mt-4 text-lg text-primary-green/70">{content.subtitle}</p>
        )}
      </ScrollReveal>
      <div className="mx-auto mt-10 grid max-w-3xl gap-3">
        {content.items.map((s, i) => (
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

/* ------------------------------------------- Pour vous / pas pour vous */
export function ModuleFit({ content }: { content: ModuleContent["fit"] }) {
  return (
    <Section className="bg-accent-cream">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {content.title}
        </h2>
        {content.subtitle && (
          <p className="mt-4 text-lg text-primary-green/70">{content.subtitle}</p>
        )}
      </ScrollReveal>
      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        <ScrollReveal>
          <div className="h-full rounded-lg border border-accent-sage/40 bg-white p-6">
            <h3 className="font-serif text-lg font-semibold text-primary-green">
              {content.forYouTitle}
            </h3>
            <ul className="mt-4 space-y-3">
              {content.forYou.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-primary-green/80"
                >
                  <CheckCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent-sage"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={80}>
          <div className="h-full rounded-lg border border-primary-green/10 bg-white p-6">
            <h3 className="font-serif text-lg font-semibold text-primary-green">
              {content.notForYouTitle}
            </h3>
            <ul className="mt-4 space-y-3">
              {content.notForYou.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-primary-green/70"
                >
                  <MinusCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary-green/30"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </ScrollReveal>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- A quel moment */
export type MomentEntry = { slug: string; title: string; isCurrent: boolean };

export function ModuleMoment({
  content,
  entries,
}: {
  content: ModuleContent["moment"];
  entries: MomentEntry[];
}) {
  if (entries.length < 2) return null;
  return (
    <Section className="bg-background-beige">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {content.title}
        </h2>
        <p className="mt-4 text-lg text-primary-green/70">{content.intro}</p>
      </ScrollReveal>
      <ol className="mx-auto mt-10 max-w-3xl border-l-2 border-primary-green/15 pl-6">
        {entries.map((entry) => (
          <li key={entry.slug} className="relative py-3">
            <span
              className={`absolute -left-[1.9rem] top-5 h-3 w-3 rounded-full border-2 border-background-beige ${
                entry.isCurrent ? "bg-primary-red" : "bg-primary-green/25"
              }`}
              aria-hidden
            />
            {entry.isCurrent ? (
              <p className="font-serif text-base font-semibold text-primary-green">
                {entry.title}
                <span className="ml-3 rounded-full bg-primary-red/10 px-2.5 py-0.5 align-middle text-xs font-medium text-primary-red">
                  {SHARED_CONTENT.moment.currentBadge}
                </span>
              </p>
            ) : (
              <Link
                href={`/accompagnements/${entry.slug}`}
                className="text-base text-primary-green/70 transition-colors hover:text-primary-green hover:underline"
              >
                {entry.title}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* --------------------------------------------------------- Comment ca marche */
export function ModuleHowItWorks() {
  const { title, steps } = SHARED_CONTENT.howItWorks;
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

/* ----------------------------------------------------------------- CTA final */
export function ModuleFinalCta({
  content,
}: {
  content: ModuleContent["finalCta"];
}) {
  return (
    <section className="bg-primary-rose px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-3xl font-bold text-white sm:text-4xl">
          {content.title}
        </h2>
        <p className="mt-4 text-lg text-white/90">{content.subtitle}</p>
        {/* CTA en blanc : sur l'aplat rose, primary-red serait illisible. */}
        <a
          href="#tarif"
          className="mt-8 inline-flex items-center rounded-md bg-white px-8 py-3.5 text-base font-medium text-primary-rose shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-background-beige"
        >
          {content.ctaLabel}
        </a>
      </div>
    </section>
  );
}
