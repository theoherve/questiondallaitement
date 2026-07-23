import {
  MODULE_ACCENTS,
  sortByModuleOrder,
  type ModuleAccent,
} from "@/config/accompagnements";

export type ModuleRow = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  price_cents: number;
  currency: string;
};

export type ModuleCard = ModuleRow & { accent: ModuleAccent | null };

/** Trie les modules (MODULE_ORDER) et attache leur accent visuel. */
export function buildModuleCards(rows: ModuleRow[]): ModuleCard[] {
  return sortByModuleOrder(rows).map((row) => ({
    ...row,
    accent: MODULE_ACCENTS[row.slug] ?? null,
  }));
}
