export const siteConfig = {
  name: "Question d'Allaitement",
  description:
    "Plateforme de consultations et formations en lactation, sommeil et santé maternelle.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ogImage: "/images/og-default.png",
  links: {
    instagram: "https://instagram.com/questiondallaitement",
  },
  defaultCommissionRate: 15.0,
  cancellationThresholdHours: 48,
  cancellationPenaltyRate: 0.5,
} as const;
