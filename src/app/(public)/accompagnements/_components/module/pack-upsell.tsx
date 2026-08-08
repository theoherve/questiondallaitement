import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { PACK_SLUG } from "@/config/accompagnements";
import { Section } from "../sales/section";
import type { PackUpsell } from "./pack-upsell-data";

/**
 * Ancrage de valeur en bas d'une page de module. Tous les chiffres sont
 * derives de la base (`computePackUpsell`), rien n'est ecrit en dur.
 */
export function PackUpsellSection({ upsell }: { upsell: PackUpsell | null }) {
  if (!upsell) return null;
  return (
    <Section className="bg-primary-green">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <Layers className="mx-auto h-8 w-8 text-accent-sage" aria-hidden />
        {/* « fait partie de » et non « du pack » : le titre en base commence
            deja par « Pack », doubler le mot donnerait « du pack « Pack … » ». */}
        <h2 className="mt-4 font-serif text-2xl font-bold text-white sm:text-3xl">
          Ce module fait partie de « {upsell.packTitle} »
        </h2>
        <p className="mt-4 text-lg text-white/85">
          Les {upsell.otherModulesCount} autres accompagnements, de la
          préparation au sevrage, pour {upsell.deltaLabel} de plus.
        </p>
        <Link
          href={`/accompagnements/${PACK_SLUG}`}
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-white px-8 py-3.5 text-base font-medium text-primary-green shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-background-beige"
        >
          Découvrir le pack complet
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </ScrollReveal>
    </Section>
  );
}
