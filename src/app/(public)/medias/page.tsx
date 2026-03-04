import { Metadata } from "next";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Tv,
  Mic,
  Newspaper,
  Presentation,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Médias & Conférences",
  description:
    "Retrouvez les apparitions médias, podcasts, articles de presse et conférences de Carole Hervé.",
};

type MediaType = "tv" | "podcast" | "press" | "conference";

type MediaItem = {
  type: MediaType;
  title: string;
  outlet: string;
  date: string;
  description: string;
  href: string | null;
};

const MEDIA_TYPE_CONFIG: Record<
  MediaType,
  { label: string; icon: typeof Tv; color: string }
> = {
  tv: {
    label: "TV",
    icon: Tv,
    color: "bg-blue-100 text-blue-800",
  },
  podcast: {
    label: "Podcast",
    icon: Mic,
    color: "bg-purple-100 text-purple-800",
  },
  press: {
    label: "Presse",
    icon: Newspaper,
    color: "bg-amber-100 text-amber-800",
  },
  conference: {
    label: "Conférence",
    icon: Presentation,
    color: "bg-emerald-100 text-emerald-800",
  },
};

const MEDIA_ITEMS: MediaItem[] = [
  {
    type: "tv",
    title: "L'allaitement maternel : les clés pour réussir",
    outlet: "France 5 — La Maison des Maternelles",
    date: "2024-03-15",
    description:
      "Intervention sur les premiers jours d'allaitement et les erreurs courantes à éviter.",
    href: "#",
  },
  {
    type: "podcast",
    title: "Allaiter sans pression",
    outlet: "Bliss Stories — Podcast",
    date: "2024-01-22",
    description:
      "Échange sur l'accompagnement bienveillant de l'allaitement et la place du co-parent.",
    href: "#",
  },
  {
    type: "press",
    title: "Allaitement : les nouvelles recommandations décryptées",
    outlet: "Le Monde — Supplément Santé",
    date: "2023-11-10",
    description:
      "Article citant l'expertise de Carole Hervé sur les recommandations OMS et leur application concrète.",
    href: "#",
  },
  {
    type: "conference",
    title: "Allaitement et retour au travail : accompagner les mères",
    outlet: "Congrès IBCLC Europe — Bruxelles",
    date: "2023-09-05",
    description:
      "Conférence sur les stratégies d'accompagnement des mères allaitantes lors de la reprise professionnelle.",
    href: null,
  },
  {
    type: "podcast",
    title: "Les mythes de l'allaitement",
    outlet: "Parents avant tout — Podcast",
    date: "2023-06-18",
    description:
      "Déconstruction des idées reçues autour de l'allaitement avec une approche scientifique et accessible.",
    href: "#",
  },
  {
    type: "tv",
    title: "Semaine mondiale de l'allaitement",
    outlet: "BFM TV",
    date: "2023-10-02",
    description:
      "Plateau lors de la semaine mondiale de l'allaitement sur les enjeux de santé publique.",
    href: "#",
  },
  {
    type: "press",
    title: "Portrait : Carole Hervé, 20 ans au service de l'allaitement",
    outlet: "Marie Claire",
    date: "2023-05-14",
    description:
      "Portrait de carrière retraçant le parcours de Carole Hervé, de consultante IBCLC à auteure de référence.",
    href: "#",
  },
  {
    type: "conference",
    title: "Lactation et santé maternelle : données récentes",
    outlet: "Journées Nationales de la Sage-Femme — Paris",
    date: "2024-02-20",
    description:
      "Présentation des dernières études sur les bénéfices de l'allaitement pour la santé maternelle à long terme.",
    href: null,
  },
];

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const MediasPage = () => {
  return (
    <>
      {/* Hero */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
              Médias & Conférences
            </p>
            <h1 className="mt-4 font-serif text-4xl font-bold text-primary-green sm:text-5xl lg:text-6xl">
              Dans les médias
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-primary-green/70 lg:text-xl">
              Télévision, podcasts, presse et conférences — retrouvez les
              interventions de Carole Hervé sur l&apos;allaitement et la
              lactation.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Media grid */}
      <section className="pb-24 lg:pb-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-16">
          <div className="grid gap-6 sm:grid-cols-2">
            {MEDIA_ITEMS.map((item, index) => {
              const config = MEDIA_TYPE_CONFIG[item.type];
              const Icon = config.icon;

              return (
                <ScrollReveal key={`${item.title}-${index}`} delay={index * 50}>
                  <article className="group flex h-full flex-col border border-border p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-start justify-between gap-4">
                      <Badge className={`${config.color} gap-1`}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                      <time className="shrink-0 text-xs text-primary-green/40">
                        {formatDate(item.date)}
                      </time>
                    </div>

                    <h2 className="mt-4 font-serif text-lg font-semibold text-primary-green lg:text-xl">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-primary-red">
                      {item.outlet}
                    </p>
                    <p className="mt-3 flex-1 text-sm text-primary-green/70">
                      {item.description}
                    </p>

                    {item.href && (
                      <div className="mt-6">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="gap-2 px-0"
                        >
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Voir
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                    )}
                  </article>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};

export default MediasPage;
