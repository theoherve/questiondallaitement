import type { Metadata } from "next";
import { DM_Sans, Noto_Serif } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsightsWrapper } from "@/components/layout/speed-insights-wrapper";
import { CookieBanner } from "@/components/layout/cookie-banner";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://questiondallaitement.fr";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Question d'Allaitement",
    template: "%s | Question d'Allaitement",
  },
  description:
    "Plateforme de consultations et accompagnements en lactation, sommeil et santé maternelle. Accompagnements en ligne, consultations personnalisées et formations professionnelles avec des consultantes IBCLC certifiées.",
  keywords: [
    "allaitement",
    "lactation",
    "consultation",
    "accompagnement",
    "formation",
    "IBCLC",
    "santé maternelle",
    "parentalité",
    "sommeil bébé",
  ],
  authors: [{ name: "Question d'Allaitement" }],
  creator: "Question d'Allaitement",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "Question d'Allaitement",
    title: "Question d'Allaitement — Accompagnement en lactation et parentalité",
    description:
      "Accompagnements en ligne, consultations personnalisées et formations professionnelles certifiées en allaitement et parentalité.",
    images: [
      {
        url: "/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "Question d'Allaitement",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Question d'Allaitement",
    description:
      "Formations, consultations et événements en allaitement et parentalité.",
    images: ["/images/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/*
          Marque le document comme « JS actif » avant le premier rendu.
          Les revelations au scroll (.scroll-reveal) partent d'opacity: 0 et ne
          sont levees que par un IntersectionObserver. Sans ce drapeau, tout
          navigateur ou robot qui n'execute pas le JS recoit une page dont le
          contenu est bien dans le DOM mais invisible a l'ecran — exactement le
          symptome remonte lors de l'audit du bloc newsletter. Le CSS masque
          donc uniquement sous `.js`, et l'absence de JS laisse le contenu
          visible.

          Inline et dans le <head> : un script differe s'executerait apres la
          peinture, et le contenu clignoterait.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js')`,
          }}
        />
      </head>
      <body
        className={`${dmSans.variable} ${notoSerif.variable} antialiased`}
      >
        {children}
        <Toaster />
        <CookieBanner />
        <SpeedInsightsWrapper />
      </body>
    </html>
  );
};

export default RootLayout;
