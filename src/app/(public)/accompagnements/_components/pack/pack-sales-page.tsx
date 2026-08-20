import { createClient } from "@/lib/supabase/server";
import { isBookingEnabled } from "@/lib/settings/feature-flags/store";
import { MODULE_ORDER, PACK_SLUG, formatPrice } from "@/config/accompagnements";
import { ctaLabelFor } from "@/config/accompagnement-cta";
import { buildModuleCards, type ModuleRow } from "./pack-modules-data";
import { PACK_CONTENT } from "./pack-content";
import { SalesBreadcrumb } from "../sales/sales-breadcrumb";
import { SalesFaq } from "../sales/sales-faq";
import { SalesHero } from "../sales/sales-hero";
import { SalesInstructor } from "../sales/sales-instructor";
import { SalesTestimonials } from "../sales/sales-testimonials";
import { SalesPricing } from "../sales/sales-pricing";
import { SalesSideCta } from "../sales/sales-side-cta";
import {
  PackProblem,
  PackPromise,
  PackModules,
  PackHowItWorks,
  PackForWho,
  PackFinalCta,
} from "./pack-sections";

type PackSalesPageProps = {
  accompagnement: {
    id: string;
    title: string;
    price_cents: number;
    currency: string;
    thumbnail_url: string | null;
    consultants: {
      bio: string | null;
      profiles: {
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
      } | null;
    } | null;
  };
  sectionsCount: number;
  lessonsCount: number;
  moduleRows: ModuleRow[];
  isLoggedIn: boolean;
  isEnrolled: boolean;
};

/** Charge les accompagnements-modules (hors pack) pour la grille « programme ». */
export async function fetchPackModuleRows(): Promise<ModuleRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accompagnements")
    .select(
      "id, title, slug, short_description, thumbnail_url, price_cents, currency"
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .in("slug", MODULE_ORDER as unknown as string[]);
  return (data ?? []) as ModuleRow[];
}

export async function PackSalesPage({
  accompagnement,
  sectionsCount,
  lessonsCount,
  moduleRows,
  isLoggedIn,
  isEnrolled,
}: PackSalesPageProps) {
  const bookingEnabled = await isBookingEnabled();
  const priceLabel = formatPrice(accompagnement.price_cents, accompagnement.currency);
  const modules = buildModuleCards(moduleRows);

  // Ancrage de valeur (spec) : économie du pack vs somme des modules à l'unité.
  // Dérivé de la DB — masqué si le pack n'est pas moins cher que le cumul.
  const modulesTotalCents = moduleRows.reduce(
    (acc, m) => acc + (m.price_cents ?? 0),
    0
  );
  const savingsCents = modulesTotalCents - accompagnement.price_cents;
  const anchorLabel =
    savingsCents > 0
      ? `Soit ${formatPrice(savingsCents, accompagnement.currency)} d'économie par rapport aux modules achetés à l'unité`
      : null;

  const profile = accompagnement.consultants?.profiles;
  const instructorName =
    profile && (profile.first_name || profile.last_name)
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : PACK_CONTENT.instructor.fallbackName;

  // Ligne de contenu de la carte flottante, composee ici pour que le composant
  // partage reste agnostique du vocabulaire (« sections » cote pack,
  // « chapitres » cote module).
  const metaLabel =
    sectionsCount > 0 || lessonsCount > 0
      ? `${sectionsCount} section${sectionsCount > 1 ? "s" : ""}` +
        ` · ${lessonsCount} leçon${lessonsCount > 1 ? "s" : ""}`
      : null;

  return (
    <>
      <SalesBreadcrumb productName={accompagnement.title} />
      <SalesSideCta
        ariaLabel="Rejoindre le pack"
        priceLabel={priceLabel}
        imageUrl={accompagnement.thumbnail_url}
        metaLabel={metaLabel}
        instructorName={instructorName}
        anchors={[
          { href: "#programme", label: "Programme" },
          { href: "#temoignages", label: "Témoignages" },
          { href: "#tarif", label: "Tarif" },
          { href: "#faq", label: "FAQ" },
        ]}
        ctaLabel={ctaLabelFor(PACK_SLUG)}
        accompagnementId={accompagnement.id}
        isLoggedIn={isLoggedIn}
        isEnrolled={isEnrolled}
        priceCents={accompagnement.price_cents}
        currency={accompagnement.currency}
        bookingEnabled={bookingEnabled}
      />
      <SalesHero
        productName={accompagnement.title}
        eyebrow={PACK_CONTENT.hero.eyebrow}
        titleOverride={PACK_CONTENT.hero.titleOverride}
        subtitle={PACK_CONTENT.hero.subtitle}
        reassurances={PACK_CONTENT.hero.reassurances}
        ctaLabel={PACK_CONTENT.hero.ctaLabel}
        priceLabel={priceLabel}
        imageUrl={accompagnement.thumbnail_url}
      />
      <PackProblem />
      <PackPromise />
      <PackModules modules={modules} />
      <PackHowItWorks />
      <PackForWho />
      <SalesInstructor
        title={PACK_CONTENT.instructor.title}
        name={instructorName}
        bio={accompagnement.consultants?.bio ?? null}
        fallbackBio={PACK_CONTENT.instructor.fallbackBio}
        avatarUrl={profile?.avatar_url ?? null}
        credentials={PACK_CONTENT.instructor.credentials}
      />
      <SalesTestimonials topic={PACK_SLUG} />
      <SalesPricing
        title={PACK_CONTENT.pricing.title}
        subtitle={PACK_CONTENT.pricing.subtitle}
        priceLabel={priceLabel}
        anchorLabel={anchorLabel}
        includes={PACK_CONTENT.pricing.includes}
        guarantee={PACK_CONTENT.pricing.guarantee}
        ctaLabel={ctaLabelFor(PACK_SLUG)}
        accompagnementId={accompagnement.id}
        isLoggedIn={isLoggedIn}
        isEnrolled={isEnrolled}
        priceCents={accompagnement.price_cents}
        currency={accompagnement.currency}
      />
      <section id="faq" className="scroll-mt-20 bg-background-beige px-4 py-16 sm:px-6 sm:py-20">
        <SalesFaq title={PACK_CONTENT.faq.title} items={PACK_CONTENT.faq.items} />
      </section>
      <PackFinalCta />
    </>
  );
}
