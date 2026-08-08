import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  BookOpen,
  Star,
  Quote,
  ArrowRight,
  ShoppingBag,
  Pen,
} from "lucide-react";
import { BookNav } from "./_components/book-nav";

export const metadata: Metadata = {
  title: "Livres",
  description:
    "Découvrez les ouvrages de Carole Hervé sur l'allaitement et la lactation : L'allaitement pour les nuls, Choisir d'allaiter, Mon allaitement sur mesure.",
};

/* ─── Data ─── */

const BOOKS = [
  {
    id: "allaitement-pour-les-nuls",
    title: "L'allaitement pour les nuls",
    shortTitle: "L'allaitement pour les nuls",
    subtitle:
      "Pour préparer et vivre votre allaitement en toute sérénité !",
    description:
      "Devenir maman est déjà un bouleversement en soi, mais qu'en est-il du projet d'allaitement ? Le lait sera-t-il suffisant pour nourrir son bébé ? Quels sont les freins à l'allaitement ? Le geste est-il moderne ? En quoi est-ce réellement un avantage pour le bébé et pour la maman ? Trois expertes se sont réunies pour répondre à toutes vos questions et vos doutes.",
    personalNote:
      "Ce livre, c'est entre vous et nous 3, le Dr Evelyne Mazurier, le Dr Muriel Mermilliod et moi. Nous y avons chacune mis beaucoup de notre passion, beaucoup de ce que nous aurions aimé savoir à nos débuts. C'est le livre que nous aurions aimé avoir entre les mains.",
    coverImage: "/livres/allaitement_pour_les_nuls.png",
    publisher: "Éditions First",
    year: "2024",
    price: "24,95 €",
    pages: "446 pages",
    coAuthors: "Dr Evelyne Mazurier, Dr Muriel Mermilliod",
    highlights: [
      "De nombreuses illustrations",
      "Des témoignages authentiques de mamans",
      "Le mode d'emploi des accessoires incontournables",
      "Des outils pratiques pour se lancer en toute sérénité",
    ],
    links: [
      {
        label: "Amazon",
        href: "https://www.amazon.fr/Lallaitement-pour-Nuls-grand-format/dp/2412089841",
      },
      {
        label: "Fnac",
        href: "https://www.fnac.com/a20433870/Pour-Les-Nuls-L-allaitement-pour-les-Nuls-grand-format-Carole-Herve",
      },
    ],
  },
  {
    id: "choisir-d-allaiter",
    title: "Choisir d'allaiter",
    shortTitle: "Choisir d'allaiter",
    subtitle:
      "Tout pour comprendre les besoins fondamentaux de votre bébé en préservant les vôtres",
    description:
      "C'est une question que toutes les futures mamans se posent : pourquoi choisir l'allaitement ? Le lait maternel apporte tous les nutriments et tous les anticorps dont votre bébé a besoin. L'OMS recommande d'ailleurs l'allaitement exclusif jusqu'à l'âge de 6 mois. Mais nourrir son enfant au sein est un choix, vous aimeriez le défendre et surtout, vous ressentez le besoin d'être bien préparée.",
    personalNote:
      "Ce livre est une mine d'informations que l'on dévore rapidement. Il inspire et encourage, vous prépare à vous lancer dans l'aventure merveilleuse de l'allaitement, que vous soyez enceinte, jeune parent, ou que vous envisagiez l'allaitement ou le biberon.",
    coverImage: "/livres/choisir_d_allaiter.jpg",
    publisher: "Éditions First",
    year: "2022",
    price: "12,50 €",
    pages: "192 pages",
    coAuthors: "Illustrations : Camille Mage",
    highlights: [
      "Premières tétées et mise en place de l'allaitement",
      "Gestion des douleurs et de la perte de poids du bébé",
      "Se libérer des « intox » sur l'allaitement",
      "Allaitement et reprise du travail",
    ],
    links: [
      {
        label: "Amazon",
        href: "https://www.amazon.fr/Choisir-dallaiter-Carole-Herv%C3%A9/dp/2412081565",
      },
      {
        label: "Fnac",
        href: "https://www.fnac.com",
      },
    ],
  },
  {
    id: "mon-allaitement-sur-mesure",
    title: "Mon allaitement sur mesure",
    shortTitle: "Mon allaitement sur mesure",
    subtitle:
      "Le guide essentiel pour apprendre à nourrir son enfant en toute confiance",
    description:
      "Les bienfaits de l'allaitement sur la santé du nourrisson et celle de sa mère ne sont plus à démontrer, de même que le formidable lien qu'il contribue à créer entre eux. Pourtant, nombreuses sont les femmes qui redoutent d'allaiter : peur de ne pas adopter les bons gestes, de ne pas produire assez de lait, d'avoir mal, d'être jugées… Le but de ce livre est de déculpabiliser les mères, de leur donner confiance et de leur fournir toutes les clés pour vivre un allaitement réussi.",
    personalNote:
      "Écrit en collaboration avec Julie Martory, journaliste spécialisée dans l'univers parental et la santé, également maman de trois enfants allaités. Relu par ma chère amie pédiatre, le Dr Evelyne Mazurier. Enrichi des témoignages vrais de mamans que j'ai eu la chance de soutenir.",
    coverImage: "/livres/mon_allaitement_sur_mesure.jpg",
    publisher: "Éditions Albin Michel",
    year: "2020",
    price: "18,90 €",
    pages: null,
    coAuthors: "Julie Martory",
    highlights: [
      "Physiologie de la lactation et clés du succès",
      "Solutions aux problèmes courants (douleurs, prise de poids…)",
      "L'allaitement au fil du temps : travail, diversification, sevrage",
      "Des suggestions concrètes et des témoignages de mamans",
    ],
    links: [
      {
        label: "Amazon",
        href: "https://www.amazon.fr/Mon-allaitement-sur-mesure-essentiel/dp/2226451773",
      },
      {
        label: "Fnac",
        href: "https://www.fnac.com",
      },
    ],
  },
];

const NAV_ITEMS = [
  ...BOOKS.map((b) => ({ id: b.id, title: b.shortTitle })),
  { id: "temoignages", title: "Témoignages" },
  { id: "contributions", title: "Contributions" },
  { id: "auteure", title: "L'auteure" },
];

const READER_TESTIMONIALS = [
  {
    quote:
      "Consultante en lactation certifiée IBCLC, Carole Hervé partage généreusement dans ce livre tout ce qu'une future ou jeune maman allaitante a besoin d'avoir à portée de main pour se sentir confiante et sereine tout au long de son allaitement. Un superbe livre à offrir ou s'offrir dès la grossesse !",
    author: "Vanilla Milk",
    context: "Plateforme de référence en allaitement",
  },
  {
    quote:
      "Une véritable mine d'or pour répondre à toutes vos questions sur l'allaitement ! Des conseils fiables, basés sur des études scientifiques. Un repère solide dans un domaine où les clichés et les avis contradictoires vont bon train ! Je l'ai trouvé tellement intéressant que je l'ai dévoré de A à Z !",
    author: "Emmeline Noé",
    context: "Lectrice",
  },
  {
    quote:
      "Le livre de Carole Hervé est un vrai bijou ! Que vous soyez professionnel de santé souhaitant avoir des informations actualisées et précises, ou future maman en quête d'un livre clair qui réponde à toutes vos questions : vous êtes sûrs de trouver votre bonheur.",
    author: "Pauline Aillery",
    context: "Lectrice",
  },
  {
    quote:
      "Dans un pays où l'on peine à soutenir l'allaitement maternel, lire une personne engagée et passionnée par ce thème fait beaucoup de bien. Je recommanderai ce livre aux parents que j'accompagne.",
    author: "Élise Armoiry",
    context: "Consultante en lactation IBCLC",
  },
  {
    quote:
      "Livre très complet mais pas rébarbatif. Divisé en plusieurs chapitres courts pour qu'on puisse accéder facilement aux infos. Pas du tout injonctif ni culpabilisant. Je regrette de ne pas l'avoir eu au début de mon allaitement.",
    author: "ChaGB",
    context: "Lectrice",
  },
  {
    quote:
      "Excellent et tellement utile pour les parents et futurs parents. L'auteur est une formidable professionnelle de l'allaitement ! Le livre est facile à lire et magnifiquement illustré.",
    author: "Ivoire",
    context: "Lectrice",
  },
];

const CONTRIBUTIONS = [
  {
    title: "La naissance d'une mère",
    authors: "Eve Simonet, Julie Maurice",
    publisher: "Éditions Mango",
    year: "2023",
    coverImage: "/livres/la_naissance_d_une_mere.jpg",
  },
  {
    title: "Un post-partum en douceur",
    authors: "Delphine Petit-Postma, Marion Joseph",
    publisher: "Éditions du Rocher",
    year: "2022",
    coverImage: "/livres/post_partum_en_douceur.jpg",
  },
  {
    title: "Mama Saver",
    authors: "Elena Bizotto",
    publisher: "Éditions Marie-Claire",
    year: "2022",
    coverImage: "/livres/mama_saver.jpeg",
  },
  {
    title: "Les 100 questions que se posent toutes les mamans",
    authors: "Collectif d'auteurs",
    publisher: "Éditions Larousse",
    year: "2015",
    coverImage: "/livres/les_100_questions.jpeg",
  },
  {
    title: "L'art de l'allaitement maternel",
    authors: "La Leche League",
    publisher: "7e édition",
    year: "2015",
    coverImage: "/livres/art_allaitement_maternel.jpeg",
  },
  {
    title: "The Road to IBCLC",
    authors: "B.J. Woodstein",
    publisher: "The Unofficial Guide to Passing the Exam",
    year: "2024",
    coverImage: "/livres/the_road_to_ibclc.png",
  },
];

/* ─── Page ─── */

const LivresPage = () => {
  return (
    <>
      {/* ─── HERO — full width ─── */}
      <section className="relative overflow-hidden bg-background-beige-dark">
        <div className="section-padding">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
              {/* Text */}
              <ScrollReveal>
                <div>
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-red/20 bg-primary-red/5 px-4 py-1.5">
                    <BookOpen
                      className="h-3.5 w-3.5 text-primary-red"
                      aria-hidden
                    />
                    <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                      Publications
                    </p>
                  </div>

                  <h1 className="font-serif text-4xl font-bold leading-tight text-primary-green sm:text-5xl lg:text-6xl">
                    Les livres que vous cherchez sur{" "}
                    <em className="font-serif italic">l&apos;allaitement</em>
                  </h1>

                  <p className="mt-6 max-w-lg text-lg leading-relaxed text-primary-green/70 lg:text-xl">
                    Que vous décidiez d&apos;allaiter ou non, être bien informée
                    vous permet d&apos;être mieux préparée aux défis qui vous
                    attendent, de prévenir les difficultés et de prendre les
                    bonnes décisions pour vous-même et votre bébé.
                  </p>

                  <blockquote className="mt-8 border-l-2 border-primary-red/30 pl-5">
                    <p className="font-serif text-lg italic leading-relaxed text-primary-green/80">
                      &ldquo;Dans mes livres, formations et conférences, je
                      partage avec enthousiasme une vision positive et empreinte
                      de bienveillance de l&apos;allaitement maternel.&rdquo;
                    </p>
                    <footer className="mt-3 font-sans text-sm text-primary-green/50">
                     , Carole Hervé, consultante IBCLC
                    </footer>
                  </blockquote>
                </div>
              </ScrollReveal>

              {/* Photo Carole with books */}
              <ScrollReveal delay={150}>
                <div className="relative mx-auto max-w-sm lg:max-w-none">
                  <div className="relative aspect-3/4 overflow-hidden shadow-2xl">
                    <Image
                      src="/livres/carole_tient_livres.jpeg"
                      alt="Carole Hervé présentant ses livres sur l'allaitement"
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

      {/* ─── SIDEBAR LAYOUT: Nav column + Content ─── */}
      <div className="relative mx-auto max-w-360 xl:grid xl:grid-cols-[220px_1fr]">
        {/* Nav column — sticky in its own lane, hidden below xl */}
        <aside className="hidden xl:block">
          <div className="sticky top-24 py-16 pl-8">
            <BookNav items={NAV_ITEMS} />
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0">
          {/* ─── BOOKS ─── */}
          {BOOKS.map((book, index) => (
            <section
              key={book.id}
              id={book.id}
              className={`scroll-mt-20 section-padding ${index % 2 !== 0 ? "bg-background-beige-dark" : ""}`}
            >
              <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-16">
                <ScrollReveal>
                  <div
                    className={`grid items-start gap-12 lg:grid-cols-2 lg:gap-16 ${
                      index % 2 !== 0
                        ? "lg:[&>*:first-child]:order-2"
                        : ""
                    }`}
                  >
                    {/* Cover */}
                    <div className="relative mx-auto w-full max-w-xs sm:max-w-sm lg:sticky lg:top-28 lg:max-w-none">
                      <div className="relative aspect-3/4 overflow-hidden shadow-xl">
                        <Image
                          src={book.coverImage}
                          alt={`Couverture, ${book.title}`}
                          fill
                          className="bg-white object-contain"
                          sizes="(max-width: 1024px) 384px, 40vw"
                        />
                      </div>
                      {index === 0 && (
                        <div className="absolute -bottom-4 -right-4 flex items-center gap-2 bg-primary-green px-5 py-3 shadow-lg sm:-right-6">
                          <Star
                            className="h-4 w-4 fill-amber-400 text-amber-400"
                            aria-hidden
                          />
                          <span className="font-serif text-sm font-bold text-background-beige">
                            Nouveau &middot; {book.year}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge className="bg-primary-red/10 text-primary-red hover:bg-primary-red/10">
                          {book.publisher}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-primary-green/60"
                        >
                          {book.year}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-primary-green/60"
                        >
                          {book.price}
                        </Badge>
                        {book.pages && (
                          <Badge
                            variant="outline"
                            className="text-primary-green/60"
                          >
                            {book.pages}
                          </Badge>
                        )}
                      </div>

                      <h2 className="mt-5 font-serif text-3xl font-bold text-primary-green lg:text-4xl">
                        {book.title}
                      </h2>

                      <p className="mt-2 font-serif text-lg italic text-primary-green/60">
                        {book.subtitle}
                      </p>

                      {book.coAuthors && (
                        <p className="mt-3 text-sm text-primary-green/50">
                          Avec {book.coAuthors}
                        </p>
                      )}

                      <p className="mt-6 leading-relaxed text-primary-green/70 lg:text-lg">
                        {book.description}
                      </p>

                      {/* Personal note */}
                      {book.personalNote && (
                        <blockquote className="mt-6 border-l-2 border-primary-red/20 pl-5">
                          <p className="text-sm italic leading-relaxed text-primary-green/65">
                            {book.personalNote}
                          </p>
                        </blockquote>
                      )}

                      {/* Highlights */}
                      <div className="mt-8">
                        <h3 className="font-sans text-xs font-medium uppercase tracking-widest text-primary-green/40">
                          Ce que vous y trouverez
                        </h3>
                        <ul className="mt-4 space-y-3">
                          {book.highlights.map((highlight) => (
                            <li
                              key={highlight}
                              className="flex items-start gap-3"
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-red" />
                              <span className="text-primary-green/80">
                                {highlight}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* CTA */}
                      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                        {book.links.map((link, i) => (
                          <Button
                            key={link.label}
                            asChild
                            size="lg"
                            variant={i === 0 ? "default" : "outline"}
                            className={
                              i === 0
                                ? "bg-primary-red px-8 hover:bg-primary-red-dark"
                                : "gap-2"
                            }
                          >
                            <a
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {i === 0 && (
                                <ShoppingBag
                                  className="h-4 w-4"
                                  aria-hidden
                                />
                              )}
                              Acheter sur {link.label}
                              <ExternalLink
                                className="h-3.5 w-3.5"
                                aria-hidden
                              />
                            </a>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </section>
          ))}

          {/* ─── READER TESTIMONIALS ─── */}
          <section
            id="temoignages"
            className="scroll-mt-20 bg-primary-green section-padding"
          >
            <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-16">
              <ScrollReveal>
                <div className="text-center">
                  <p className="font-sans text-xs font-medium uppercase tracking-widest text-background-beige/40">
                    Témoignages
                  </p>
                  <h2 className="mt-3 font-serif text-3xl font-bold text-background-beige lg:text-4xl">
                    Ce qu&apos;en disent les lectrices
                  </h2>
                </div>
              </ScrollReveal>

              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {READER_TESTIMONIALS.map((testimonial, i) => (
                  <ScrollReveal key={testimonial.author} delay={i * 80}>
                    <div className="flex h-full flex-col border border-background-beige/10 bg-background-beige/5 p-7">
                      {/* Quote */}
                      <div className="relative flex-1">
                        <Quote
                          className="absolute -top-1 -left-1 h-8 w-8 text-background-beige/10"
                          aria-hidden
                        />
                        <p className="relative font-serif text-sm italic leading-relaxed text-background-beige/80">
                          &ldquo;{testimonial.quote}&rdquo;
                        </p>
                      </div>

                      {/* Author */}
                      <div className="mt-6 border-t border-background-beige/10 pt-4">
                        <p className="font-sans text-sm font-semibold text-background-beige">
                          {testimonial.author}
                        </p>
                        <p className="mt-0.5 text-xs text-background-beige/50">
                          {testimonial.context}
                        </p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
          {/* ─── CONTRIBUTIONS ─── */}
          <section
            id="contributions"
            className="scroll-mt-20 section-padding"
          >
            <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-16">
              <ScrollReveal>
                <div className="text-center">
                  <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-primary-red/20 bg-primary-red/5 px-4 py-1.5">
                    <Pen
                      className="h-3.5 w-3.5 text-primary-red"
                      aria-hidden
                    />
                    <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                      Contributions
                    </p>
                  </div>
                  <h2 className="mt-3 font-serif text-3xl font-bold text-primary-green lg:text-4xl">
                    Mon expertise citée dans les ouvrages de référence
                  </h2>
                  <p className="mx-auto mt-4 max-w-xl text-primary-green/70 lg:text-lg">
                    Des ouvrages auxquels j&apos;ai apporté mon expertise en
                    allaitement et lactation (en français et en anglais).
                  </p>
                </div>
              </ScrollReveal>

              <div className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
                {CONTRIBUTIONS.map((contrib, i) => (
                  <ScrollReveal key={contrib.title} delay={i * 60}>
                    <div className="group flex flex-col items-center text-center">
                      <div className="relative aspect-3/4 w-full overflow-hidden bg-background-beige-dark shadow-md transition-shadow group-hover:shadow-lg">
                        <Image
                          src={contrib.coverImage}
                          alt={`Couverture, ${contrib.title}`}
                          fill
                          className="object-contain"
                          sizes="(max-width: 640px) 40vw, (max-width: 1024px) 30vw, 14vw"
                        />
                      </div>
                      <h3 className="mt-3 font-serif text-sm font-semibold leading-tight text-primary-green">
                        {contrib.title}
                      </h3>
                      <p className="mt-1 text-xs text-primary-green/50">
                        {contrib.authors}
                      </p>
                      <p className="text-xs text-primary-green/40">
                        {contrib.publisher}, {contrib.year}
                      </p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* ─── AUTHOR / TRUST ─── */}
          <section
            id="auteure"
            className="scroll-mt-20 bg-background-beige-dark section-padding"
          >
            <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-16">
              <div className="grid items-center gap-12 lg:grid-cols-5 lg:gap-16">
                {/* Photo */}
                <div className="lg:col-span-2">
                  <ScrollReveal>
                    <div className="relative mx-auto max-w-xs lg:max-w-none">
                      <div className="relative aspect-3/4 overflow-hidden">
                        <Image
                          src="/livres/carole_presente_nuls.jpg"
                          alt="Carole Hervé présentant L'allaitement pour les nuls"
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 320px, 30vw"
                        />
                      </div>
                    </div>
                  </ScrollReveal>
                </div>

                {/* Text */}
                <div className="lg:col-span-3">
                  <ScrollReveal delay={100}>
                    <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                      L&apos;auteure
                    </p>
                    <h2 className="mt-3 font-serif text-3xl font-bold text-primary-green lg:text-4xl">
                      Carole Hervé
                    </h2>
                    <p className="mt-2 font-serif text-lg italic text-primary-green/60">
                      Consultante en lactation IBCLC, auteure, formatrice et
                      conférencière
                    </p>

                    <p className="mt-6 leading-relaxed text-primary-green/70 lg:text-lg">
                      Consultante IBCLC depuis plus de 20 ans, Carole Hervé
                      accompagne les familles dans leur allaitement. Experte en
                      allaitement maternel et accompagnante en Biological
                      Nurturing, elle combine une expertise clinique approfondie
                      à une passion pour la vulgarisation scientifique. Ses
                      ouvrages sont le fruit de milliers de consultations et
                      d&apos;une écoute attentive des besoins des parents.
                    </p>

                    {/* Stats */}
                    <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {[
                        { value: "20+", label: "ans d'expérience" },
                        { value: "5 000+", label: "consultations" },
                        { value: "3", label: "livres publiés" },
                        { value: "100+", label: "publications presse" },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="border-t-2 border-primary-red/20 pt-3"
                        >
                          <p className="font-serif text-2xl font-bold text-primary-green">
                            {stat.value}
                          </p>
                          <p className="mt-0.5 font-sans text-xs text-primary-green/50">
                            {stat.label}
                          </p>
                        </div>
                      ))}
                    </div>

                    <Button asChild variant="ghost" className="-ml-3 mt-8">
                      <Link href="/a-propos">
                        En savoir plus sur Carole
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </ScrollReveal>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ─── CTA FINAL — full width ─── */}
      <section className="bg-primary-green section-padding">
        <div className="mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <BookOpen
              className="mx-auto h-10 w-10 text-background-beige/30"
              aria-hidden
            />
            <h2 className="mt-6 font-serif text-3xl font-bold text-background-beige lg:text-5xl">
              Offrez-vous, ou offrez à une proche, un{" "}
              <em className="italic">guide de confiance</em>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-background-beige/70">
              Les livres de Carole Hervé sont disponibles dans toutes les
              librairies et sur les principales plateformes en ligne.
            </p>
            <p className="mx-auto mt-4 max-w-xl text-background-beige/60">
              Vous avez lu, et vous voulez maintenant être accompagnée pas à
              pas ?{" "}
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
                <a
                  href={BOOKS[0].links[0].href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ShoppingBag className="h-4 w-4" aria-hidden />
                  Découvrir sur Amazon
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-background-beige/30 bg-transparent text-background-beige hover:bg-background-beige/10 hover:text-background-beige"
              >
                <a
                  href={BOOKS[0].links[1].href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Découvrir sur la Fnac
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

export default LivresPage;
