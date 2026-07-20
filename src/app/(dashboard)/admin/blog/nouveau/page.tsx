import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BlogPostForm } from "../_components/blog-post-form";

export const metadata: Metadata = {
  title: "Nouvel article",
};

const NewBlogPostPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const supabase = createAdminClient();

  const [categoriesResult, consultantsResult] = await Promise.all([
    supabase
      .from("blog_categories")
      .select("*")
      .order("position", { ascending: true }),
    supabase
      .from("consultants")
      .select("id, slug, profiles!consultants_id_fkey(first_name, last_name)")
      .eq("is_active", true),
  ]);

  const categories = categoriesResult.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const consultants = (consultantsResult.data ?? []).map((c: any) => ({
    id: c.id,
    slug: c.slug,
    bio: c.bio ?? null,
    specialties: c.specialties ?? [],
    commission_rate: c.commission_rate ?? 0,
    is_active: c.is_active ?? true,
    profile: {
      first_name: c.profiles?.first_name ?? null,
      last_name: c.profiles?.last_name ?? null,
      email: c.profiles?.email ?? "",
      avatar_url: c.profiles?.avatar_url ?? null,
    },
    // propriétés Consultant
    stripe_account_id: c.stripe_account_id ?? null,
    stripe_account_status: c.stripe_account_status ?? "",
    zoom_access_token: c.zoom_access_token ?? null,
    zoom_refresh_token: c.zoom_refresh_token ?? null,
    zoom_token_expires_at: c.zoom_token_expires_at ?? null,
    onboarding_completed: c.onboarding_completed ?? false,
    created_at: c.created_at ?? "",
    updated_at: c.updated_at ?? "",
    profiles: c.profiles
      ? {
          first_name: c.profiles.first_name ?? null,
          last_name: c.profiles.last_name ?? null,
        }
      : null,
  }));

  return (
    <BlogPostForm
      categories={categories}
      consultants={consultants}
      mode="create"
    />
  );
};

export default NewBlogPostPage;
