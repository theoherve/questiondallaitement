export const siteConfig = {
  name: "Question d'Allaitement",
  description:
    "Plateforme de consultations et formations en lactation, sommeil et santé maternelle.",
  url:
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"),
  /**
   * Adresse de contact affichee aux visiteurs (CGV, mentions legales,
   * confidentialite, newsletter).
   *
   * Variable d'environnement plutot que constante : elle change en meme temps
   * que le domaine principal, et elle apparait dans des pages a valeur legale
   * ou une adresse morte se voit. `NEXT_PUBLIC_` est obligatoire — le
   * formulaire newsletter est un composant client.
   */
  contactEmail:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@questiondallaitement.fr",
  ogImage: "/images/og-default.png",
  links: {
    instagram: "https://instagram.com/questiondallaitement",
  },
  defaultCommissionRate: 15.0,
  cancellationThresholdHours: 48,
  cancellationPenaltyRate: 0.5,
} as const;
