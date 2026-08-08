import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { InstagramIcon, LinkedinIcon } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { socialLinks } from "@/config/navigation";
import type { BioLink } from "@/types/database";
import { BioLinkCard } from "./_components/bio-link-card";
import { BioFeaturedCard } from "./_components/bio-featured-card";

/**
 * Page de liens pointée depuis la bio Instagram, en remplacement de Linktree.
 *
 * Volontairement hors du groupe (public) : l'en-tête et le pied de page du site
 * transformeraient une page dont le seul travail est d'orienter en trois
 * secondes en une page de navigation comme une autre.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tous mes liens",
  description:
    "Les accompagnements, formations et livres de Carole Hervé, consultante en lactation IBCLC.",
  // Non listée dans le menu, absente du sitemap, non indexée : elle vit par
  // l'adresse partagée en bio, pas par la recherche.
  robots: { index: false, follow: false },
};

const SOCIAL_ICONS: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  Instagram: InstagramIcon,
  Linkedin: LinkedinIcon,
};

const LiensPage = async () => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bio_links")
    .select("*")
    .eq("is_active", true)
    .order("position", { ascending: true });

  const items = (data ?? []) as BioLink[];

  return (
    <div className="min-h-dvh bg-background-beige">
      <main className="mx-auto flex w-full max-w-[26rem] flex-col px-5 pb-16 pt-12">
        {/* Identité */}
        <header className="flex flex-col items-center text-center">
          <Image
            src="/carole_herve_portrait.jpg"
            alt="Carole Hervé"
            width={96}
            height={96}
            priority
            className="h-24 w-24 rounded-full object-cover ring-4 ring-accent-peach-soft"
          />
          <h1 className="mt-5 font-serif text-2xl leading-tight text-primary-green">
            Carole Hervé
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-primary-green/70">
            Consultante en lactation IBCLC
            <br />
            Conférencière, formatrice, autrice
          </p>

          {socialLinks.length > 0 && (
            <ul className="mt-5 flex items-center gap-2">
              {socialLinks.map((social) => {
                const Icon = SOCIAL_ICONS[social.iconKey];
                if (!Icon) return null;
                return (
                  <li key={social.title}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.title}
                      className="flex h-11 w-11 items-center justify-center rounded-full text-primary-green/60 transition-colors hover:bg-background-beige-dark hover:text-primary-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-red"
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </header>

        {/* Liens */}
        {items.length === 0 ? (
          <p className="mt-12 text-center text-sm text-primary-green/60">
            Les liens arrivent très bientôt.
          </p>
        ) : (
          <ul className="mt-10 flex flex-col gap-3">
            {items.map((item) => {
              if (item.kind === "header") {
                return (
                  <li
                    key={item.id}
                    className="mt-5 flex items-center gap-3 first:mt-0"
                  >
                    <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-primary-green/50">
                      {item.title}
                    </h2>
                    <span
                      aria-hidden="true"
                      className="h-px flex-1 bg-primary-green/15"
                    />
                  </li>
                );
              }

              return (
                <li key={item.id}>
                  {item.is_featured ? (
                    <BioFeaturedCard link={item} />
                  ) : (
                    <BioLinkCard link={item} />
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <footer className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-primary-green/60 underline-offset-4 transition-colors hover:text-primary-red hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-red"
          >
            questiondallaitement.fr
          </Link>
        </footer>
      </main>
    </div>
  );
};

export default LiensPage;
