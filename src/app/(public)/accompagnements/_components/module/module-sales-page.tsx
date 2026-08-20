import {
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
import { createClient } from "@/lib/supabase/server";
import { isBookingEnabled } from "@/lib/settings/feature-flags/store";
import {
  MODULE_ACCENTS,
  MODULE_ORDER,
  PACK_SLUG,
  formatPrice,
  sortByModuleOrder,
} from "@/config/accompagnements";
import { ctaLabelFor } from "@/config/accompagnement-cta";
import { SalesBreadcrumb } from "../sales/sales-breadcrumb";
import { SalesHero } from "../sales/sales-hero";
import { SalesInstructor } from "../sales/sales-instructor";
import { SalesTestimonials } from "../sales/sales-testimonials";
import type { TestimonialTopic } from "@/data/testimonials";
import { getTestimonialsForModule } from "@/lib/testimonials";
import { SalesPricing } from "../sales/sales-pricing";
import { SalesFaq, type FaqItem } from "../sales/sales-faq";
import { SalesSideCta, type SideCtaAnchor } from "../sales/sales-side-cta";
import { Section } from "../sales/section";
import {
  ModuleProofBar,
  ModuleProblem,
  ModulePromise,
  ModuleOutcomes,
  ModuleFit,
  ModuleMoment,
  ModuleHowItWorks,
  ModuleFinalCta,
  type MomentEntry,
} from "./module-sections";
import { ModuleProgram } from "./module-program";
import { PackUpsellSection } from "./pack-upsell";
import {
  buildProgramChapters,
  buildProofItems,
  type SectionRow,
} from "./module-program-data";
import { computePackUpsell } from "./pack-upsell-data";
import { MODULE_CONTENT } from "./content";
import { SHARED_CONTENT } from "./content/shared";

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

type CatalogRow = {
  slug: string;
  title: string;
  price_cents: number;
};

/**
 * Catalogue necessaire a une page de module : les 8 modules pour la timeline,
 * le pack pour l'upsell. Une seule requete.
 */
export async function fetchCatalogRows(): Promise<CatalogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accompagnements")
    .select("slug, title, price_cents")
    .eq("status", "published")
    .is("deleted_at", null)
    .in("slug", [...MODULE_ORDER, PACK_SLUG]);
  return (data ?? []) as CatalogRow[];
}

/** Vrai quand le slug a une page de vente dediee prete a etre servie. */
export const hasModuleSalesPage = (slug: string): boolean =>
  MODULE_CONTENT[slug] !== undefined;

type ModuleSalesPageProps = {
  accompagnement: {
    id: string;
    slug: string;
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
  sectionRows: SectionRow[];
  catalogRows: CatalogRow[];
  isLoggedIn: boolean;
  isEnrolled: boolean;
};

export async function ModuleSalesPage({
  accompagnement,
  sectionRows,
  catalogRows,
  isLoggedIn,
  isEnrolled,
}: ModuleSalesPageProps) {
  const content = MODULE_CONTENT[accompagnement.slug];
  // Garde-fou : la page appelante verifie deja `hasModuleSalesPage`.
  if (!content) return null;

  const bookingEnabled = await isBookingEnabled();

  const priceLabel = formatPrice(
    accompagnement.price_cents,
    accompagnement.currency
  );
  const chapters = buildProgramChapters(sectionRows);
  const proofItems = buildProofItems(chapters);

  const moduleRows = sortByModuleOrder(
    catalogRows.filter((row) => row.slug !== PACK_SLUG)
  );
  const packRow = catalogRows.find((row) => row.slug === PACK_SLUG) ?? null;

  const upsell = computePackUpsell({
    packPriceCents: packRow?.price_cents ?? null,
    packTitle: packRow?.title ?? null,
    modulePriceCents: accompagnement.price_cents,
    currency: accompagnement.currency,
    totalModulesCount: moduleRows.length,
  });

  const momentEntries: MomentEntry[] = moduleRows.map((row) => ({
    slug: row.slug,
    title: row.title,
    isCurrent: row.slug === accompagnement.slug,
  }));

  const profile = accompagnement.consultants?.profiles;
  const instructorName =
    profile && (profile.first_name || profile.last_name)
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : SHARED_CONTENT.instructor.fallbackName;

  const accent = MODULE_ACCENTS[accompagnement.slug];
  const Icon = accent ? MODULE_ICONS[accent.iconKey] : undefined;
  const ctaLabel = ctaLabelFor(accompagnement.slug);

  const faqItems: FaqItem[] = [...content.faq, ...SHARED_CONTENT.faq.common];

  // Le slug sert de sujet d'avis. Le transtypage est sûr : la page appelante a
  // déjà validé que le slug appartient à MODULE_CONTENT.
  const testimonialTopic = accompagnement.slug as TestimonialTopic;
  const hasTestimonials = getTestimonialsForModule(testimonialTopic).length > 0;

  const anchors: SideCtaAnchor[] = [
    ...(chapters.length > 0 ? [{ href: "#programme", label: "Programme" }] : []),
    ...(hasTestimonials
      ? [{ href: "#temoignages", label: "Témoignages" }]
      : []),
    { href: "#tarif", label: "Tarif" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <>
      <SalesBreadcrumb productName={accompagnement.title} />
      <SalesSideCta
        ariaLabel={`Rejoindre ${accompagnement.title}`}
        priceLabel={priceLabel}
        imageUrl={accompagnement.thumbnail_url}
        metaLabel={proofItems.length > 0 ? proofItems.join(" · ") : null}
        instructorName={instructorName}
        anchors={anchors}
        ctaLabel={ctaLabel}
        accompagnementId={accompagnement.id}
        isLoggedIn={isLoggedIn}
        isEnrolled={isEnrolled}
        priceCents={accompagnement.price_cents}
        currency={accompagnement.currency}
        bookingEnabled={bookingEnabled}
      />
      <SalesHero
        productName={accompagnement.title}
        eyebrow={content.hero.eyebrow}
        titleOverride={content.hero.titleOverride}
        subtitle={content.hero.subtitle}
        reassurances={SHARED_CONTENT.reassurances}
        ctaLabel={content.hero.ctaLabel}
        priceLabel={priceLabel}
        imageUrl={accompagnement.thumbnail_url}
        accent={accent ? { from: accent.from, to: accent.to } : undefined}
        Icon={Icon}
      />
      <ModuleProofBar items={proofItems} />
      <ModuleProblem content={content.problem} />
      <ModulePromise content={content.promise} />
      {chapters.length > 0 && (
        <ModuleProgram
          title={content.program.title}
          intro={content.program.intro}
          chapters={chapters}
        />
      )}
      <ModuleOutcomes content={content.outcomes} />
      <ModuleFit content={content.fit} />
      <ModuleMoment content={content.moment} entries={momentEntries} />
      <ModuleHowItWorks />
      <SalesInstructor
        title={SHARED_CONTENT.instructor.title}
        name={instructorName}
        bio={accompagnement.consultants?.bio ?? null}
        fallbackBio={SHARED_CONTENT.instructor.fallbackBio}
        avatarUrl={profile?.avatar_url ?? null}
        credentials={SHARED_CONTENT.instructor.credentials}
      />
      <SalesTestimonials topic={testimonialTopic} />
      <SalesPricing
        title={content.pricing.title}
        subtitle={content.pricing.subtitle}
        priceLabel={priceLabel}
        anchorLabel={null}
        includes={SHARED_CONTENT.pricing.includes}
        guarantee={SHARED_CONTENT.pricing.guarantee}
        ctaLabel={ctaLabel}
        accompagnementId={accompagnement.id}
        isLoggedIn={isLoggedIn}
        isEnrolled={isEnrolled}
        priceCents={accompagnement.price_cents}
        currency={accompagnement.currency}
      />
      <PackUpsellSection upsell={upsell} />
      <Section id="faq" className="bg-background-beige">
        <SalesFaq title={SHARED_CONTENT.faq.title} items={faqItems} />
      </Section>
      <ModuleFinalCta content={content.finalCta} />
    </>
  );
}
