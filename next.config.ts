import type { NextConfig } from "next";

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
