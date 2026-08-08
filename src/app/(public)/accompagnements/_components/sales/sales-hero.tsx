import Image from "next/image";
import { CheckCircle, type LucideIcon } from "lucide-react";

/**
 * Hero d'une page de vente. Le fond reste `primary-green` meme pour un module :
 * les accents de MODULE_ACCENTS sont clairs, un texte blanc dessus serait
 * illisible. L'accent sert de halo d'ambiance et l'icone de badge.
 */
export function SalesHero({
  productName,
  eyebrow,
  titleOverride,
  subtitle,
  reassurances,
  ctaLabel,
  priceLabel,
  imageUrl,
  accent,
  Icon,
}: {
  /** Nom produit en base ; affiche sous le H1 quand celui-ci porte la promesse. */
  productName: string;
  eyebrow: string;
  titleOverride: string | null;
  subtitle: string;
  reassurances: readonly string[];
  ctaLabel: string;
  priceLabel: string;
  imageUrl: string | null;
  /** Degrade d'ambiance du module ; absent pour le pack. */
  accent?: { from: string; to: string };
  /** Icone du module affichee en badge ; absente pour le pack. */
  Icon?: LucideIcon;
}) {
  return (
    <section className="relative overflow-hidden bg-primary-green">
      {accent && (
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{
            backgroundImage: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
          }}
        />
      )}
      <div
        className={`relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 ${
          imageUrl ? "lg:pr-[calc(38%+2rem)]" : "text-center"
        }`}
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5">
          {Icon ? (
            <Icon className="h-3.5 w-3.5 text-accent-sage" aria-hidden />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-primary-red" aria-hidden />
          )}
          <span className="font-sans text-xs font-medium uppercase tracking-widest text-white/90">
            {eyebrow}
          </span>
        </div>
        {/* Le H1 porte la promesse ; le nom produit reste affiche en dessous. */}
        <h1 className="font-serif text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          {titleOverride ?? productName}
        </h1>
        {titleOverride && (
          <p className="mt-4 font-sans text-sm font-medium uppercase tracking-widest text-background-beige/85">
            {productName}
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
          {ctaLabel}, {priceLabel}
        </a>
        <ul
          className={`mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 ${
            imageUrl ? "" : "justify-center"
          }`}
        >
          {reassurances.map((r) => (
            <li key={r} className="flex items-center gap-2 text-sm text-white/90">
              <CheckCircle className="h-4 w-4 text-accent-sage" aria-hidden />
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* Visuel : sous le texte en mobile, cale a droite en desktop. Aucun voile,
          et `contain` plutot que `cover` — la vignette est un visuel compose,
          un recadrage la mutile. */}
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
