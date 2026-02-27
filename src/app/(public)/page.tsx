import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthRedirectHandler } from "@/components/auth/auth-redirect-handler";
import { Button } from "@/components/ui/button";
import { FormationCard } from "@/components/formations/formation-card";
import { AccompagnementsCarousel } from "./_components/accompagnements-carousel";
import { ArrowRight } from "lucide-react";
import { TestimonialCarousel } from "./_components/testimonial-carousel";
import { NewsletterForm } from "./_components/newsletter-form";
import { ScrollReveal } from "@/components/public/scroll-reveal";

/* ─── Trust bar stats ─── */
const TRUST_STATS = [
  { value: "20+", label: "ans d'expérience" },
  { value: "5 000+", label: "consultations" },
  { value: "3", label: "livres publiés" },
  { value: "IBCLC", label: "certifiée" },
  { value: "Formatrice", label: "agréée" },
  { value: "Conférences", label: "internationales" },
];

type HomePageProps = {
  searchParams: Promise<{ code?: string; next?: string }>;
};

const HomePage = async ({ searchParams }: HomePageProps) => {
  const params = await searchParams;
  if (params?.code) {
    const next = params.next ?? "/espace-client";
    redirect(
      `/api/auth/callback?code=${encodeURIComponent(params.code)}&next=${encodeURIComponent(next)}`
    );
  }

  const supabase = await createClient();

  const [formationsRes, blogRes] = await Promise.all([
    supabase
      .from("formations")
      .select(
        `id, title, slug, short_description, thumbnail_url, price_cents, currency, consultant_id,
        consultants!formations_consultant_id_fkey (slug, profiles!consultants_id_fkey (first_name, last_name))`
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false }),
    supabase
      .from("blog_posts")
      .select(
        `id, title, slug, excerpt, thumbnail_url, published_at,
        blog_categories (name, slug)`
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3),
  ]);

  const allFormations = formationsRes.data ?? [];
  const featuredFormation = allFormations.find(
    (f) => f.slug === "pack-essentiel-allaitement"
  );
  const otherFormations = allFormations.filter(
    (f) => f.slug !== "pack-essentiel-allaitement"
  );
  const blogPosts = blogRes.data ?? [];

  return (
    <>
      <AuthRedirectHandler />

      {/* ─── HERO — Asymétrique ─── */}
      <section className="bg-background-beige section-padding">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Text side — mobile first */}
          <div className="order-1 text-center lg:order-2 lg:text-left">
            <h1 className="font-serif text-4xl font-bold leading-tight text-primary-green lg:text-7xl">
              L&apos;allaitement,
              <br />
              <span className="text-primary-red">autrement.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-primary-green/80 lg:mx-0 lg:text-xl">
              Consultante IBCLC, auteure et formatrice.
              20+ ans d&apos;expertise au service de votre allaitement.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <Button
                asChild
                size="lg"
                className="bg-primary-red px-8 hover:bg-primary-red-dark"
              >
                <Link href="/formations">
                  Découvrir les accompagnements
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/reserver">Prendre rendez-vous</Link>
              </Button>
            </div>
          </div>

          {/* Photo side */}
          <div className="order-2 lg:order-1">
            <div className="relative mx-auto aspect-[3/4] max-w-md overflow-hidden lg:max-w-none">
              {/* Placeholder — replace with real portrait photo */}
              <div className="flex h-full w-full items-center justify-center bg-primary-green/5">
                <Image
                  src="/carole_herve_portrait.jpg"
                  alt="Carole Hervé — Consultante IBCLC"
                  width={400}
                  height={600}
                  className="h-full w-full object-contain p-12"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUST BAR — Chiffres clés ─── */}
      <section className="bg-primary-green px-5 py-12 sm:px-8 lg:px-16 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
            {TRUST_STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-serif text-3xl font-bold text-background-beige lg:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 font-sans text-xs font-medium uppercase tracking-widest text-background-beige/60">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ACCOMPAGNEMENTS EN LIGNE ─── */}
      {allFormations.length > 0 && (
        <section className="section-padding">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-serif text-3xl font-bold text-primary-green lg:text-5xl">
                    Accompagnements
                    <br className="hidden sm:block" /> en ligne
                  </h2>
                  <p className="mt-4 max-w-lg text-primary-green/70 lg:text-lg">
                    Des parcours complets pour vous accompagner à chaque étape
                    de votre allaitement.
                  </p>
                </div>
                <Button asChild variant="ghost" className="hidden sm:flex">
                  <Link href="/formations">
                    Voir tous les accompagnements
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </ScrollReveal>

            {/* Hero card — Pack L'essentiel */}
            {featuredFormation && (
              <ScrollReveal>
                <div className="mt-12">
                  <FormationCard
                    formation={
                      featuredFormation as unknown as Parameters<
                        typeof FormationCard
                      >[0]["formation"]
                    }
                    featured
                  />
                </div>
              </ScrollReveal>
            )}

            {/* Other accompagnements — horizontal carousel */}
            {otherFormations.length > 0 && (
              <div className="mt-10">
                <h3 className="mb-6 font-sans text-xs font-medium uppercase tracking-widest text-primary-green/40">
                  Tous les accompagnements
                </h3>
                <AccompagnementsCarousel
                  formations={
                    otherFormations as unknown as Parameters<
                      typeof AccompagnementsCarousel
                    >[0]["formations"]
                  }
                />
              </div>
            )}

            <div className="mt-10 text-center sm:hidden">
              <Button asChild variant="outline">
                <Link href="/formations">
                  Voir tous les accompagnements
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ─── TÉMOIGNAGES ─── */}
      <section className="bg-background-beige-dark section-padding">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="text-center">
              <h2 className="font-serif text-3xl font-bold text-primary-green lg:text-5xl">
                Et la parentalité devient plus douce...
              </h2>
              <p className="mt-4 text-primary-green/60">
                Des mamans partagent leur expérience
              </p>
            </div>
          </ScrollReveal>
          <TestimonialCarousel />
        </div>
      </section>

      {/* ─── EXPERTISE / À PROPOS ─── */}
      <section className="section-padding">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Text side */}
          <ScrollReveal>
            <div>
              <h2 className="font-serif text-3xl font-bold text-primary-green lg:text-5xl">
                Une expertise
                <br />
                reconnue.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-primary-green/80 lg:text-xl">
                Consultante IBCLC depuis plus de 20 ans, Carole Hervé
                accompagne les familles dans leur allaitement avec bienveillance
                et rigueur scientifique. Auteure de 3 ouvrages de référence,
                formatrice et conférencière internationale.
              </p>
              <Button asChild variant="ghost" className="mt-8">
                <Link href="/a-propos">
                  En savoir plus
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </ScrollReveal>

          {/* Photo side */}
          <ScrollReveal delay={150}>
            <div className="relative aspect-4/3 overflow-hidden">
              <Image
                src="/en_consultation.jpg"
                alt="Carole Hervé en consultation d'allaitement"
                fill
                className="object-cover"
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── BLOG / LE JOURNAL ─── */}
      {blogPosts.length > 0 && (
        <section className="bg-background-beige-dark/50 section-padding">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-serif text-3xl font-bold text-primary-green lg:text-5xl">
                    Le Journal
                  </h2>
                  <p className="mt-4 text-primary-green/70 lg:text-lg">
                    Articles, réflexions et ressources autour de
                    l&apos;allaitement.
                  </p>
                </div>
                <Button asChild variant="ghost" className="hidden sm:flex">
                  <Link href="/blog">
                    Lire le journal
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </ScrollReveal>

            {/* Magazine layout: 1 featured + 2 secondary */}
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {/* Featured article */}
              <ScrollReveal>
                <Link
                  href={`/blog/${blogPosts[0].slug}`}
                  className="group block"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {blogPosts[0].thumbnail_url ? (
                      <Image
                        src={blogPosts[0].thumbnail_url}
                        alt={blogPosts[0].title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary-green/5">
                        <p className="text-sm text-primary-green/40">Image</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    {blogPosts[0].blog_categories && (
                      <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                        {(blogPosts[0].blog_categories as unknown as { name: string }).name}
                      </p>
                    )}
                    <h3 className="mt-2 font-serif text-xl font-semibold text-primary-green transition-colors group-hover:text-primary-red lg:text-2xl">
                      {blogPosts[0].title}
                    </h3>
                    {blogPosts[0].excerpt && (
                      <p className="mt-2 line-clamp-3 text-primary-green/70">
                        {blogPosts[0].excerpt}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-primary-green/40">
                      {new Date(blogPosts[0].published_at!).toLocaleDateString(
                        "fr-FR",
                        { day: "numeric", month: "long", year: "numeric" }
                      )}
                    </p>
                  </div>
                </Link>
              </ScrollReveal>

              {/* Secondary articles */}
              <div className="flex flex-col gap-6">
                {blogPosts.slice(1, 3).map((post, i) => (
                  <ScrollReveal key={post.id} delay={(i + 1) * 100}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex gap-4"
                    >
                      <div className="relative aspect-square w-28 shrink-0 overflow-hidden sm:w-36">
                        {post.thumbnail_url ? (
                          <Image
                            src={post.thumbnail_url}
                            alt={post.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-primary-green/5">
                            <p className="text-xs text-primary-green/40">
                              Image
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        {post.blog_categories && (
                          <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                            {(post.blog_categories as unknown as { name: string }).name}
                          </p>
                        )}
                        <h3 className="mt-1 font-serif text-lg font-semibold text-primary-green transition-colors group-hover:text-primary-red">
                          {post.title}
                        </h3>
                        <p className="mt-2 text-xs text-primary-green/40">
                          {new Date(post.published_at!).toLocaleDateString(
                            "fr-FR",
                            { day: "numeric", month: "long", year: "numeric" }
                          )}
                        </p>
                      </div>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>
            </div>

            <div className="mt-10 text-center sm:hidden">
              <Button asChild variant="outline">
                <Link href="/blog">Lire le journal</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ─── FORMATIONS PRO — Teaser B2B ─── */}
      <section className="bg-primary-green section-padding">
        <div className="mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <h2 className="font-serif text-3xl font-bold text-background-beige lg:text-5xl">
              Vous êtes
              <br />
              professionnel de santé ?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-background-beige/70">
              Formations, ateliers et webinaires pour développer votre expertise
              en accompagnement de l&apos;allaitement.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-10 bg-primary-red px-8 hover:bg-primary-red-dark"
            >
              <Link href="/formations">
                Découvrir les formations
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── NEWSLETTER ─── */}
      <section className="bg-background-beige-dark section-padding">
        <div className="mx-auto max-w-2xl text-center">
          <ScrollReveal>
            <h2 className="font-serif text-3xl font-bold text-primary-green lg:text-5xl">
              Restez informée
            </h2>
            <p className="mt-4 text-primary-green/70 lg:text-lg">
              Ressources, articles et actualités — sans discours
              culpabilisant. Pas de recettes toutes faites.
            </p>
            <NewsletterForm />
          </ScrollReveal>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="section-padding">
        <div className="mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <h2 className="font-serif text-3xl font-bold text-primary-green lg:text-5xl">
              Prête à commencer ?
            </h2>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="bg-primary-red px-8 hover:bg-primary-red-dark"
              >
                <Link href="/formations">
                  Découvrir les accompagnements
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/reserver">Prendre rendez-vous</Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
};

export default HomePage;
