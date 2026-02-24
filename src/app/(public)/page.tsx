import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthRedirectHandler } from "@/components/auth/auth-redirect-handler";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FormationCard } from "@/components/formations/formation-card";
import {
  BookOpen,
  CalendarDays,
  Users,
  Star,
  Search,
  CreditCard,
  Sparkles,
  Quote,
  ArrowRight,
  Heart,
  Mail,
} from "lucide-react";
import { TestimonialCarousel } from "./_components/testimonial-carousel";
import { NewsletterForm } from "./_components/newsletter-form";

const STEPS = [
  {
    icon: Search,
    step: "1",
    title: "Trouvez votre accompagnement",
    description:
      "Parcourez notre catalogue de formations en ligne ou trouvez une consultante certifiée près de chez vous.",
  },
  {
    icon: CreditCard,
    step: "2",
    title: "Réservez ou achetez en ligne",
    description:
      "Paiement sécurisé par Stripe. Réservez une consultation en quelques clics ou accédez immédiatement à votre formation.",
  },
  {
    icon: Sparkles,
    step: "3",
    title: "Progressez à votre rythme",
    description:
      "Suivez vos formations quand vous le souhaitez, et bénéficiez d'un accompagnement personnalisé avec votre consultante.",
  },
];

const FEATURES = [
  {
    icon: BookOpen,
    title: "Formations en ligne",
    description:
      "Des parcours complets en vidéo, quiz et ressources téléchargeables. Progressez à votre rythme avec un suivi de progression.",
  },
  {
    icon: CalendarDays,
    title: "Consultations personnalisées",
    description:
      "Cabinet, visio ou domicile — réservez en ligne le créneau qui vous convient avec une consultante certifiée.",
  },
  {
    icon: Users,
    title: "Événements & Ateliers",
    description:
      "Webinaires, ateliers de groupe et rencontres autour de la parentalité. Des moments de partage et d'apprentissage.",
  },
  {
    icon: Star,
    title: "Expertise certifiée",
    description:
      "Toutes nos consultantes sont des professionnelles certifiées (IBCLC, puéricultrice, etc.) avec des années d'expérience terrain.",
  },
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

  const [formationsRes, consultantsRes] = await Promise.all([
    supabase
      .from("formations")
      .select(
        `id, title, slug, short_description, thumbnail_url, price_cents, currency, consultant_id,
        consultants!formations_consultant_id_fkey (slug, profiles!consultants_id_fkey (first_name, last_name))`
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .limit(3),
    supabase
      .from("consultants")
      .select(
        `id, slug, bio, specialties, profiles!consultants_id_fkey (first_name, last_name, avatar_url)`
      )
      .eq("is_active", true)
      .limit(4),
  ]);

  const formations = formationsRes.data ?? [];
  const consultants = consultantsRes.data ?? [];

  return (
    <>
      <AuthRedirectHandler />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-background-beige px-4 py-24 sm:py-36">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-primary-red blur-3xl" />
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-primary-green blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <Badge
            variant="secondary"
            className="mb-6 bg-primary-red/10 px-4 py-1 text-primary-red"
          >
            <Heart className="mr-1 h-3 w-3" />
            Plateforme d&apos;accompagnement en lactation
          </Badge>
          <h1 className="font-serif text-4xl font-bold tracking-tight text-primary-green sm:text-5xl lg:text-6xl">
            Exploitez votre{" "}
            <span className="text-primary-red">plein potentiel</span>
            <br className="hidden sm:block" /> de parent
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-primary-green/80">
            Ne laissez pas les défis de l&apos;allaitement vous freiner.
            Formations, consultations et ressources avec des professionnelles
            certifiées pour vous accompagner à chaque étape.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="bg-primary-red px-8 hover:bg-primary-red-dark"
            >
              <Link href="/formations" tabIndex={0}>
                Découvrir les formations
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/reserver" tabIndex={0}>
                Prendre rendez-vous
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── COMMENT ÇA MARCHE ─── */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold text-primary-green">
              Comment ça marche
            </h2>
            <p className="mt-3 text-primary-green/70">
              En trois étapes simples, trouvez l&apos;accompagnement qui vous
              correspond
            </p>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.step} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-red/10">
                  <step.icon className="h-7 w-7 text-primary-red" />
                </div>
                <span className="mt-4 inline-block rounded-full bg-primary-green px-3 py-0.5 text-xs font-bold text-background-beige">
                  Étape {step.step}
                </span>
                <h3 className="mt-3 font-serif text-lg font-semibold text-primary-green">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-primary-green/70">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="bg-background-beige-dark/50 px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold text-primary-green">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-3 text-primary-green/70">
              Une plateforme complète pour votre accompagnement
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className="border-0 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-red/10">
                    <feature.icon className="h-6 w-6 text-primary-red" />
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-semibold text-primary-green">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-primary-green/70">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FORMATIONS RÉCENTES ─── */}
      {formations.length > 0 && (
        <section className="px-4 py-20">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="font-serif text-3xl font-bold text-primary-green">
                  Formations populaires
                </h2>
                <p className="mt-3 text-primary-green/70">
                  Des parcours complets pour vous accompagner
                </p>
              </div>
              <Button asChild variant="ghost" className="hidden sm:flex">
                <Link href="/formations" tabIndex={0}>
                  Voir toutes les formations
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {formations.map((formation) => (
                <FormationCard
                  key={formation.id}
                  formation={
                    formation as unknown as Parameters<
                      typeof FormationCard
                    >[0]["formation"]
                  }
                />
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Button asChild variant="outline">
                <Link href="/formations" tabIndex={0}>
                  Voir toutes les formations
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ─── TÉMOIGNAGES ─── */}
      <section className="bg-primary-green px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <Quote className="mx-auto h-8 w-8 text-primary-red" />
            <h2 className="mt-4 font-serif text-3xl font-bold text-background-beige">
              Et la parentalité devient plus douce...
            </h2>
            <p className="mt-3 text-background-beige/70">
              Des mamans partagent leur expérience
            </p>
          </div>
          <TestimonialCarousel />
        </div>
      </section>

      {/* ─── NOS CONSULTANTES ─── */}
      {consultants.length > 0 && (
        <section className="px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="font-serif text-3xl font-bold text-primary-green">
                Nos consultantes
              </h2>
              <p className="mt-3 text-primary-green/70">
                Des professionnelles certifiées à votre écoute
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {consultants.map((consultant) => {
                const profile = consultant.profiles as unknown as {
                  first_name: string | null;
                  last_name: string | null;
                  avatar_url: string | null;
                } | null;
                const name = profile
                  ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
                  : "Consultante";
                const initials = profile
                  ? `${(profile.first_name ?? "")[0] ?? ""}${(profile.last_name ?? "")[0] ?? ""}`
                  : "C";
                const specialties = consultant.specialties as string[];

                return (
                  <Link
                    key={consultant.id}
                    href={`/consultantes/${consultant.slug}`}
                    className="group text-center"
                    tabIndex={0}
                    aria-label={`Voir le profil de ${name}`}
                  >
                    <Avatar className="mx-auto h-24 w-24 transition-transform group-hover:scale-105">
                      <AvatarImage
                        src={profile?.avatar_url ?? undefined}
                        alt={name}
                      />
                      <AvatarFallback className="bg-primary-red/10 text-xl font-semibold text-primary-red">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="mt-4 font-serif text-lg font-semibold text-primary-green">
                      {name}
                    </h3>
                    {specialties.length > 0 && (
                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                        {specialties.slice(0, 3).map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="bg-primary-red/10 text-[11px] text-primary-red"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
            <div className="mt-10 text-center">
              <Button asChild variant="outline">
                <Link href="/consultantes" tabIndex={0}>
                  Voir toutes nos consultantes
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ─── NEWSLETTER ─── */}
      <section className="bg-background-beige-dark/50 px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-red/10">
            <Mail className="h-6 w-6 text-primary-red" />
          </div>
          <h2 className="mt-6 font-serif text-3xl font-bold text-primary-green">
            Restez informée
          </h2>
          <p className="mt-3 text-primary-green/70">
            Des ressources pour comprendre, questionner, déconstruire — pas pour
            obéir. Pas de discours culpabilisants. Pas de recettes toutes
            faites.
          </p>
          <NewsletterForm />
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="bg-primary-green px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-serif text-3xl font-bold text-background-beige">
            Prête à commencer ?
          </h2>
          <p className="mt-4 text-background-beige/80">
            Rejoignez notre communauté et accédez à toutes nos ressources
            d&apos;accompagnement.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="bg-primary-red px-8 hover:bg-primary-red-dark"
            >
              <Link href="/inscription" tabIndex={0}>
                Créer mon compte gratuitement
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-background-beige/30 text-background-beige hover:bg-background-beige/10"
            >
              <Link href="/reserver" tabIndex={0}>
                Prendre rendez-vous
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
