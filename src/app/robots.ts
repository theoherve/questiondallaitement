import { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://www.formation-allaitement.com";

const robots = (): MetadataRoute.Robots => ({
  rules: [
    {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/api/",
        "/espace-client",
        "/espace-client/",
        "/espace-consultante",
        "/espace-consultante/",
        "/connexion",
        "/inscription",
        "/reset-password",
        "/mot-de-passe-oublie",
        "/verification-email",
      ],
    },
  ],
  sitemap: `${BASE_URL}/sitemap.xml`,
});

export default robots;
