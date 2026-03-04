import { Metadata } from "next";
import Image from "next/image";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Livres",
  description:
    "Découvrez les ouvrages de Carole Hervé sur l'allaitement et la lactation.",
};

const BOOKS = [
  {
    title: "Mon allaitement au fil des mois",
    subtitle: "Guide pratique",
    description:
      "Un guide complet qui accompagne les parents mois après mois dans leur allaitement, de la naissance au sevrage naturel. Chaque chapitre aborde les questions et défis spécifiques à chaque étape.",
    coverImage: "/accompagnements/mon_allaitement_au_fil_des_mois.jpg",
    publisher: "Éditions First",
    year: "2023",
    links: [
      {
        label: "Amazon",
        href: "https://www.amazon.fr/dp/2412089515",
      },
      {
        label: "Fnac",
        href: "https://www.fnac.com/a18543127/Carole-Herve-Mon-allaitement-au-fil-des-mois",
      },
    ],
  },
  {
    title: "Le guide de l'allaitement",
    subtitle: "Tout savoir pour un allaitement serein",
    description:
      "Un ouvrage de référence qui couvre tous les aspects de l'allaitement maternel : mise au sein, positions, rythmes, alimentation, reprise du travail, et bien plus encore.",
    coverImage: null,
    publisher: "Éditions Leduc",
    year: "2021",
    links: [
      {
        label: "Amazon",
        href: "#",
      },
    ],
  },
  {
    title: "Allaiter, pourquoi c'est si important",
    subtitle: "Les bienfaits prouvés par la science",
    description:
      "Un livre qui présente les données scientifiques actuelles sur les bienfaits de l'allaitement maternel, pour la mère comme pour l'enfant, avec un ton accessible et non culpabilisant.",
    coverImage: null,
    publisher: "Éditions Marabout",
    year: "2019",
    links: [
      {
        label: "Amazon",
        href: "#",
      },
    ],
  },
];

const LivresPage = () => {
  return (
    <>
      {/* Hero */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
              Publications
            </p>
            <h1 className="mt-4 font-serif text-4xl font-bold text-primary-green sm:text-5xl lg:text-6xl">
              Livres
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-primary-green/70 lg:text-xl">
              Trois ouvrages de référence pour accompagner votre allaitement
              avec des informations fiables et bienveillantes.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Books list */}
      <section className="pb-24 lg:pb-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-16">
          <div className="space-y-20 lg:space-y-28">
            {BOOKS.map((book, index) => (
              <ScrollReveal key={book.title}>
                <article
                  className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                    index % 2 === 1 ? "lg:direction-rtl" : ""
                  }`}
                >
                  {/* Cover */}
                  <div
                    className={`relative aspect-3/4 overflow-hidden bg-background-beige-dark ${
                      index % 2 === 1 ? "lg:order-2" : ""
                    }`}
                  >
                    {book.coverImage ? (
                      <Image
                        src={book.coverImage}
                        alt={`Couverture — ${book.title}`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center p-8">
                        <p className="font-serif text-2xl font-bold text-primary-green/20">
                          {book.title}
                        </p>
                        <p className="mt-2 text-sm text-primary-green/10">
                          Image à venir
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                    <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-green/40">
                      {book.publisher} &middot; {book.year}
                    </p>
                    <h2 className="mt-3 font-serif text-2xl font-bold text-primary-green lg:text-4xl">
                      {book.title}
                    </h2>
                    {book.subtitle && (
                      <p className="mt-2 font-serif text-lg italic text-primary-green/60">
                        {book.subtitle}
                      </p>
                    )}
                    <p className="mt-6 text-primary-green/70 lg:text-lg">
                      {book.description}
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                      {book.links.map((link) => (
                        <Button
                          key={link.label}
                          asChild
                          variant="outline"
                          className="gap-2"
                        >
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {link.label}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default LivresPage;
