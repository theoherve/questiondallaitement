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
    "Plateforme de consultations et formations en lactation, sommeil et santé maternelle. Formations en ligne, consultations personnalisées et événements avec des professionnelles certifiées.",
  keywords: [
    "allaitement",
    "lactation",
    "consultation",
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
      "Formations en ligne, consultations personnalisées et événements avec des professionnelles certifiées en allaitement et parentalité.",
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
