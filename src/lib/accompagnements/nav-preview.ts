import { createClient } from "@/lib/supabase/server";
import { PACK_SLUG, sortByModuleOrder } from "@/config/accompagnements";

/** Élément d'aperçu affiché dans le mega-menu du header. Sérialisable. */
export type AccompagnementPreview = {
  title: string;
  slug: string;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  priceCents: number;
  currency: string;
};

export type AccompagnementsNavPreview = {
  pack: AccompagnementPreview | null;
  modules: AccompagnementPreview[];
};

type AccompagnementPreviewRow = {
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  price_cents: number;
  currency: string;
};

const EMPTY: AccompagnementsNavPreview = { pack: null, modules: [] };

const toPreview = (row: AccompagnementPreviewRow): AccompagnementPreview => ({
  title: row.title,
  slug: row.slug,
  shortDescription: row.short_description,
  thumbnailUrl: row.thumbnail_url,
  priceCents: row.price_cents,
  currency: row.currency,
});

/**
 * Précharge la liste des accompagnements publiés pour le mega-menu du header.
 * Le layout public l'appelle et passe le résultat au Header (ouverture instantanée
 * au survol). En cas d'erreur, retourne une structure vide : le header dégrade
 * gracieusement en simple lien vers /accompagnements.
 */
export const getAccompagnementsNavPreview =
  async (): Promise<AccompagnementsNavPreview> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("formations")
      .select(
        "title, slug, short_description, thumbnail_url, price_cents, currency"
      )
      .eq("status", "published")
      .is("deleted_at", null);

    if (error || !data) return EMPTY;

    const rows = data as AccompagnementPreviewRow[];
    const pack = rows.find((r) => r.slug === PACK_SLUG);
    const modules = sortByModuleOrder(rows.filter((r) => r.slug !== PACK_SLUG));

    return {
      pack: pack ? toPreview(pack) : null,
      modules: modules.map(toPreview),
    };
  };
