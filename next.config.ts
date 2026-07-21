import type { NextConfig } from "next";

/**
 * Content-Security-Policy (5-2).
 *
 * Portee reelle de cette politique, pour ne pas se raconter d'histoires :
 * `script-src` autorise `'unsafe-inline'`, faute de quoi le bootstrap inline de
 * Next.js ne s'execute pas. Elle n'arrete donc pas une injection de script
 * inline. Ce qu'elle ferme quand meme :
 *
 * - `connect-src` : une charge utile injectee ne peut pas exfiltrer vers un
 *   domaine arbitraire, seulement vers Supabase et Stripe ;
 * - `frame-ancestors` / `object-src` / `base-uri` : clickjacking, plugins,
 *   detournement des URL relatives ;
 * - `form-action` : un formulaire injecte ne peut pas poster ailleurs.
 *
 * Passer aux nonces (via le middleware) permettrait de retirer
 * `'unsafe-inline'` et de vraiment couvrir le XSS. C'est le prochain palier,
 * volontairement separe : mal pose, un nonce casse le rendu statique.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-eval' est requis par le rafraichissement a chaud en developpement.
  `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === "development" ? "'unsafe-eval' " : ""}https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  // `https:` et non une liste d'hotes : les visuels importes depuis Wix
  // pointent sur des domaines quelconques, et une image bloquee laisserait une
  // page trouee sans erreur visible.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Le websocket de rafraichissement a chaud tourne sur un port local
  // aleatoire : autorise en developpement seulement, jamais en production.
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com${
    process.env.NODE_ENV === "development"
      ? " ws://localhost:* ws://127.0.0.1:*"
      : ""
  }`,
  "frame-src https://js.stripe.com https://hooks.stripe.com https://player.vimeo.com https://www.youtube.com https://youtube.com https://podcast.ausha.co",
  "media-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // Uploads (blog images, email crops) go through Server Actions and can
    // exceed the 1 MB default. Storage helpers already cap files at 50 MB —
    // keep the action limit in line with that.
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
      },
      {
        protocol: "https",
        hostname: "i.vimeocdn.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Route renaming: /evenements → /formations (B2B pro)
      {
        source: "/evenements",
        destination: "/formations",
        permanent: true,
      },
      {
        source: "/evenements/:slug",
        destination: "/formations/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
