import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * Fil d'Ariane minimal : retour vers le catalogue. Les fiches de vente n'ont
 * qu'un seul niveau de profondeur (catalogue -> fiche), donc pas besoin d'une
 * liste de miettes complete.
 */
export function SalesBreadcrumb({ productName }: { productName: string }) {
  return (
    <nav
      aria-label="Fil d'Ariane"
      className="border-b border-primary-green/10 bg-white"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 text-sm sm:px-6">
        <Link
          href="/accompagnements"
          className="inline-flex items-center gap-1 text-primary-green/70 transition-colors hover:text-primary-green"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Tous les accompagnements
        </Link>
        <span className="text-primary-green/30" aria-hidden>
          /
        </span>
        <span className="truncate text-primary-green/50">{productName}</span>
      </div>
    </nav>
  );
}
