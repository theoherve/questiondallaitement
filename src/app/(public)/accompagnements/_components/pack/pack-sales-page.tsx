import { createClient } from "@/lib/supabase/server";
import { MODULE_ORDER, formatPrice } from "@/config/accompagnements";
import { buildModuleCards, type ModuleRow } from "./pack-modules-data";
import { PACK_CONTENT } from "./pack-content";
import { PackFaq } from "./pack-faq";
import { PackStickyHeader } from "./pack-sticky-header";
import {
  PackHero,
  PackProblem,
  PackPromise,
  PackModules,
  PackHowItWorks,
  PackForWho,
  PackInstructor,
  PackTestimonials,
  PackPricing,
  PackFinalCta,
} from "./pack-sections";

type PackSalesPageProps = {
  formation: {
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
  moduleRows: ModuleRow[];
  isLoggedIn: boolean;
  isEnrolled: boolean;
};

/** Charge les formations-modules (hors pack) pour la grille « programme ». */
export async function fetchPackModuleRows(): Promise<ModuleRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("formations")
    .select(
      "id, title, slug, short_description, thumbnail_url, price_cents, currency"
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .in("slug", MODULE_ORDER as unknown as string[]);
  return (data ?? []) as ModuleRow[];
}

export function PackSalesPage({
  formation,
  moduleRows,
  isLoggedIn,
  isEnrolled,
}: PackSalesPageProps) {
  const priceLabel = formatPrice(formation.price_cents, formation.currency);
  const modules = buildModuleCards(moduleRows);

  const profile = formation.consultants?.profiles;
  const instructorName =
    profile && (profile.first_name || profile.last_name)
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : PACK_CONTENT.instructor.fallbackName;

  return (
    <>
      <PackStickyHeader title={formation.title} priceLabel={priceLabel} />
      <PackHero
        title={formation.title}
        priceLabel={priceLabel}
        imageUrl={formation.thumbnail_url}
      />
      <PackProblem />
      <PackPromise />
      <PackModules modules={modules} />
      <PackHowItWorks />
      <PackForWho />
      <PackInstructor
        name={instructorName}
        bio={formation.consultants?.bio ?? null}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <PackTestimonials />
      <PackPricing
        priceLabel={priceLabel}
        formationId={formation.id}
        isLoggedIn={isLoggedIn}
        isEnrolled={isEnrolled}
      />
      <section id="faq" className="scroll-mt-20 bg-background-beige px-4 py-16 sm:px-6 sm:py-20">
        <PackFaq />
      </section>
      <PackFinalCta />
    </>
  );
}
