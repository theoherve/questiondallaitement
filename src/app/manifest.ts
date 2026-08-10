import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * Manifeste de l'application. Route de métadonnées de Next plutôt que fichier
 * statique : nom, couleurs et icônes vivent alors à côté du reste de la
 * configuration.
 *
 * Il est indispensable au push : sur iOS, aucune notification n'est délivrée
 * tant que le site n'est pas installé sur l'écran d'accueil, et l'installation
 * exige un manifeste.
 *
 * Les icônes pointent sur le logo SVG, le seul visuel de marque disponible. Sur
 * iPhone, Safari se rabat alors sur une capture de la page pour l'icône de
 * l'écran d'accueil : dégradé accepté, un jeu de PNG pourra le corriger plus
 * tard sans rien changer d'autre.
 */
const manifest = (): MetadataRoute.Manifest => ({
  name: siteConfig.name,
  short_name: "Allaitement",
  description: siteConfig.description,
  // L'espace client : c'est là que vivent les notifications et leurs réglages.
  start_url: "/espace-client",
  display: "standalone",
  background_color: "#fff8f6",
  theme_color: "#203634",
  icons: [{ src: "/logo.svg", sizes: "any", type: "image/svg+xml" }],
});

export default manifest;
