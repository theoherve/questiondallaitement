import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthRedirectHandler } from "@/components/auth/auth-redirect-handler";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, CalendarDays, Users, Star } from "lucide-react";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Formations en ligne",
    description:
      "Accédez à des formations complètes en lactation, sommeil et santé maternelle, à votre rythme.",
  },
  {
    icon: CalendarDays,
    title: "Consultations personnalisées",
    description:
      "Réservez une consultation en visio ou en présentiel avec une consultante certifiée.",
  },
  {
    icon: Users,
    title: "Événements & Ateliers",
    description:
      "Participez à des ateliers de groupe, webinaires et événements autour de la parentalité.",
  },
  {
    icon: Star,
    title: "Accompagnement expert",
    description:
      "Bénéficiez de l'expertise de consultantes spécialisées pour vous accompagner au quotidien.",
  },
];

type HomePageProps = { searchParams: Promise<{ code?: string; next?: string }> };

const HomePage = async ({ searchParams }: HomePageProps) => {
  const params = await searchParams;
  if (params?.code) {
    const next = params.next ?? "/espace-client";
    redirect(`/api/auth/callback?code=${encodeURIComponent(params.code)}&next=${encodeURIComponent(next)}`);
  }

  return (
    <>
      <AuthRedirectHandler />
      <section className="bg-background-beige px-4 py-20 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-primary-green sm:text-5xl lg:text-6xl">
            Votre accompagnement en{" "}
            <span className="text-primary-red">allaitement</span> et{" "}
            <span className="text-primary-red">parentalité</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-primary-green/80">
            Formations, consultations et événements avec des professionnelles
            certifiées. Un espace dédié pour vous accompagner dans votre
            parcours de parent.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="bg-primary-red px-8 hover:bg-primary-red-dark"
            >
              <Link href="/formations" tabIndex={0}>
                Découvrir les formations
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/consultantes" tabIndex={0}>
                Trouver une consultante
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold text-primary-green">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-4 text-primary-green/70">
              Une plateforme complète pour votre accompagnement
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className="border-border bg-card transition-shadow hover:shadow-md"
              >
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-red/10">
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

      <section className="bg-primary-green px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-serif text-3xl font-bold text-background-beige">
            Prête à commencer ?
          </h2>
          <p className="mt-4 text-background-beige/80">
            Rejoignez notre communauté et accédez à toutes nos ressources.
          </p>
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              className="bg-primary-red px-8 hover:bg-primary-red-dark"
            >
              <Link href="/inscription" tabIndex={0}>
                Créer mon compte gratuitement
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
