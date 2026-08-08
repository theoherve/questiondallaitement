import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { Button } from "@/components/ui/button";
import {
  Newspaper,
  Headphones,
  Info,
  BookOpen,
  ArrowRight,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { PressSection } from "./_components/press-section";
import { MediaSection } from "./_components/media-section";
import { PRESS_ARTICLES } from "./_data/press-articles";
import { PODCASTS, VIDEOS, PRESS_HASHTAGS } from "./_data/media-items";

export const metadata: Metadata = {
  title: "Médias & Conférences",
  description:
    "Retrouvez les interventions de Carole Hervé dans la presse, podcasts et émissions TV. Plus de 100 contributions médias sur l'allaitement et la lactation.",
};

/* ─── Page ─── */

const MediasPage = () => {
  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-background-beige-dark">
        <div className="section-padding">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
              {/* Text */}
              <ScrollReveal>
                <div>
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-red/20 bg-primary-red/5 px-4 py-1.5">
                    <Newspaper
                      className="h-3.5 w-3.5 text-primary-red"
                      aria-hidden
                    />
                    <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                      Médias & Conférences
                    </p>
                  </div>

                  <h1 className="font-serif text-4xl font-bold leading-tight text-primary-green sm:text-5xl lg:text-6xl">
                    Une voix de référence sur{" "}
                    <em className="font-serif italic">l&apos;allaitement</em>
                  </h1>

                  <p className="mt-6 max-w-lg text-lg leading-relaxed text-primary-green/70 lg:text-xl">
                    Presse, podcasts, émissions TV et conférences, Carole
                    Hervé partage son expertise dans les médias français de
                    référence en parentalité et santé pour informer, rassurer
                    et accompagner les familles.
                  </p>

                  {/* Stats */}
                  <div className="mt-8 flex flex-wrap gap-6 border-t border-primary-green/10 pt-6">
                    <div>
                      <p className="font-serif text-2xl font-bold text-primary-green">
                        {PRESS_ARTICLES.length}+
                      </p>
                      <p className="font-sans text-xs text-primary-green/50">
                        articles de presse
                      </p>
                    </div>
                    <div>
                      <p className="font-serif text-2xl font-bold text-primary-green">
                        {PODCASTS.length}
                      </p>
                      <p className="font-sans text-xs text-primary-green/50">
                        podcasts
                      </p>
                    </div>
                    <div>
                      <p className="font-serif text-2xl font-bold text-primary-green">
                        {VIDEOS.length}
                      </p>
                      <p className="font-sans text-xs text-primary-green/50">
                        vidéos & TV
                      </p>
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div className="mt-6 flex flex-wrap gap-x-3 gap-y-1">
                    {PRESS_HASHTAGS.map((tag) => (
                      <span
                        key={tag}
                        className="font-sans text-xs text-primary-red/50"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </ScrollReveal>

              {/* Photo */}
              <ScrollReveal delay={150}>
                <div className="relative mx-auto max-w-sm lg:max-w-none">
                  <div className="relative aspect-3/4 overflow-hidden shadow-2xl">
                    <Image
                      src="/livres/carole_presente_nuls.jpg"
                      alt="Carole Hervé lors d'une intervention média"
                      fill
                      className="object-cover"
                      priority
                      sizes="(max-width: 1024px) 384px, 50vw"
                    />
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PODCASTS & VIDÉOS ─── */}
      <section className="scroll-mt-20 bg-primary-green section-padding">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-16">
          <ScrollReveal>
            <div className="mb-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-background-beige/15 bg-background-beige/5 px-4 py-1.5">
                <Headphones
                  className="h-3.5 w-3.5 text-background-beige/60"
                  aria-hidden
                />
                <p className="font-sans text-xs font-medium uppercase tracking-widest text-background-beige/60">
                  Podcasts & Vidéos
                </p>
              </div>
              <h2 className="font-serif text-3xl font-bold text-background-beige lg:text-4xl">
                Écouter & regarder
              </h2>
              <p className="mt-4 max-w-2xl text-background-beige/60 lg:text-lg">
                Retrouve-moi dans des podcasts, émissions TV et vidéos sur
                l&apos;allaitement : La Maison des Maternelles, Europe 1,
                France Bleu, Milkshaker, et bien d&apos;autres.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <MediaSection />
          </ScrollReveal>
        </div>
      </section>

      {/* ─── REVUE DE PRESSE ─── */}
      <section className="scroll-mt-20 section-padding">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-16">
          <ScrollReveal>
            <div className="mb-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-red/20 bg-primary-red/5 px-4 py-1.5">
                <Newspaper
                  className="h-3.5 w-3.5 text-primary-red"
                  aria-hidden
                />
                <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                  Revue de presse
                </p>
              </div>
              <h2 className="font-serif text-3xl font-bold text-primary-green lg:text-4xl">
                Dans la presse
              </h2>
              <p className="mt-4 max-w-2xl text-primary-green/70 lg:text-lg">
                Près de 100 articles dans les médias français de référence :
                Doctissimo, Parents.fr, Magic Maman, Journal des Femmes, Santé
                Magazine, Elle, aufeminin... Affichez-les tous ou bien
                sélectionnez la rubrique qui vous intéresse le plus
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <PressSection />
          </ScrollReveal>
        </div>
      </section>

      {/* ─── DISCLAIMER ─── */}
      <section className="scroll-mt-20 section-padding">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-16">
          <ScrollReveal>
            <div className="mx-auto max-w-3xl border border-primary-green/10 bg-primary-green/3 p-8 sm:p-10">
              <div className="flex items-start gap-4">
                <Info
                  className="mt-0.5 h-5 w-5 shrink-0 text-primary-green/40"
                  aria-hidden
                />
                <div>
                  <h3 className="font-serif text-lg font-semibold text-primary-green">
                    Précisions
                  </h3>
                  <div className="mt-4 space-y-4 text-sm leading-relaxed text-primary-green/65">
                    <p>
                      Je ne reçois aucune forme de rémunération pour mes
                      contributions à des interviews ou des articles de presse.
                    </p>
                    <p>
                      À ce titre, je ne suis en aucun cas responsable de la
                      ligne éditoriale du magazine ni des choix concernant les
                      annonceurs.
                    </p>
                    <p>
                      Je regrette profondément que certains acteurs ne
                      respectent pas le Code de l&apos;OMS relatif à la
                      commercialisation des substituts du lait maternel, et je
                      maintiens fermement mon engagement à défendre
                      l&apos;allaitement maternel conformément à ces
                      recommandations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── CTA LIVRES ─── */}
      <section className="bg-primary-green section-padding">
        <div className="mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <BookOpen
              className="mx-auto h-10 w-10 text-background-beige/30"
              aria-hidden
            />
            <h2 className="mt-6 font-serif text-3xl font-bold text-background-beige lg:text-5xl">
              Retrouvez mon expertise dans{" "}
              <em className="italic">mes livres</em>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-background-beige/70">
              3 ouvrages de référence sur l&apos;allaitement, disponibles dans
              toutes les librairies et sur les principales plateformes en
              ligne.
            </p>
            <p className="mx-auto mt-4 max-w-xl text-background-beige/60">
              Envie d&apos;un accompagnement personnalisé plutôt que de la
              lecture ?{" "}
              <Link
                href="/accompagnements"
                className="underline decoration-primary-red decoration-2 underline-offset-4 hover:text-background-beige"
              >
                Découvrez les accompagnements en ligne
              </Link>
              .
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="bg-primary-red px-8 hover:bg-primary-red-dark"
              >
                <Link href="/livres">
                  <BookOpen className="h-4 w-4" aria-hidden />
                  Découvrir les livres
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-background-beige/30 bg-transparent text-background-beige hover:bg-background-beige/10 hover:text-background-beige"
              >
                <a
                  href="https://www.amazon.fr/Lallaitement-pour-Nuls-grand-format/dp/2412089841"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ShoppingBag className="h-4 w-4" aria-hidden />
                  Acheter sur Amazon
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
};

export default MediasPage;
