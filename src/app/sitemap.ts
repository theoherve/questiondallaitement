import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://questiondallaitement.fr";

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/accompagnements`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/consultantes`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/formations`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/livres`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/medias`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/a-propos`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/reserver`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/mentions-legales`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/politique-de-confidentialite`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/cgv`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Formations
  const { data: formations } = await supabase
    .from("formations")
    .select("slug, updated_at")
    .eq("status", "published")
    .is("deleted_at", null);

  const formationPages: MetadataRoute.Sitemap = (formations ?? []).map((f) => ({
    url: `${BASE_URL}/accompagnements/${f.slug}`,
    lastModified: f.updated_at,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Consultants
  const { data: consultants } = await supabase
    .from("consultants")
    .select("slug, updated_at")
    .eq("is_active", true);

  const consultantPages: MetadataRoute.Sitemap = (consultants ?? []).map(
    (c) => ({
      url: `${BASE_URL}/consultantes/${c.slug}`,
      lastModified: c.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }),
  );

  // Events
  const { data: events } = await supabase
    .from("events")
    .select("slug, updated_at")
    .eq("is_published", true);

  const eventPages: MetadataRoute.Sitemap = (events ?? []).map((e) => ({
    url: `${BASE_URL}/formations/${e.slug}`,
    lastModified: e.updated_at,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Blog posts
  const { data: blogPosts } = await supabase
    .from("blog_posts")
    .select("slug, updated_at, published_at")
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", now);

  const blogPages: MetadataRoute.Sitemap = (blogPosts ?? []).map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.updated_at || post.published_at,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Blog categories
  const { data: categories } = await supabase
    .from("blog_categories")
    .select("slug");

  const categoryPages: MetadataRoute.Sitemap = (categories ?? []).map(
    (cat) => ({
      url: `${BASE_URL}/blog?category=${cat.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }),
  );

  return [
    ...staticPages,
    ...formationPages,
    ...consultantPages,
    ...eventPages,
    ...blogPages,
    ...categoryPages,
  ];
};

export default sitemap;
