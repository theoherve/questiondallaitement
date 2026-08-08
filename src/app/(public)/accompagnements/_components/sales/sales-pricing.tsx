import { CheckCircle, ShieldCheck } from "lucide-react";
import { PurchaseButton } from "../purchase-button";
import { Section } from "./section";

export function SalesPricing({
  title,
  subtitle,
  priceLabel,
  anchorLabel,
  includes,
  guarantee,
  ctaLabel,
  accompagnementId,
  isLoggedIn,
  isEnrolled,
  priceCents,
  currency,
}: {
  title: string;
  subtitle: string;
  priceLabel: string;
  /** Ancrage de valeur derive de la DB (« X € d'economie… ») ; masque si null. */
  anchorLabel: string | null;
  includes: readonly string[];
  guarantee: string;
  ctaLabel: string | undefined;
  accompagnementId: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
  priceCents: number;
  currency: string;
}) {
  return (
    <Section id="tarif" className="bg-accent-cream">
      <div className="mx-auto max-w-lg rounded-2xl border border-primary-green/10 bg-white p-8 shadow-md">
        <h2 className="text-center font-serif text-2xl font-bold text-primary-green sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm text-primary-green/70">{subtitle}</p>
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
            <li
              key={it}
              className="flex items-start gap-2 text-sm text-primary-green/80"
            >
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
            ctaLabel={ctaLabel}
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
