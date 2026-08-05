import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BlogPostForm } from "../../_components/blog-post-form";
import type { BlogPost } from "@/types";

export const metadata: Metadata = {
  title: "Modifier l'article",
};

type Props = {
  params: Promise<{ id: string }>;
};

const EditBlogPostPage = async ({ params }: Props) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const { id } = await params;
  const supabase = createAdminClient();

  const [postResult, categoriesResult, consultantsResult, pinnableResult] =
    await Promise.all([
      supabase.from("blog_posts").select("*").eq("id", id).single(),
      supabase
        .from("blog_categories")
        .select("*")
        .order("position", { ascending: true }),
      supabase
        .from("consultants")
        .select("id, slug, profiles!consultants_id_fkey(first_name, last_name)")
        .eq("is_active", true),
      // Candidats a l'epinglage : uniquement des articles publies, sinon la
      // suggestion pointerait vers une page introuvable.
      supabase
        .from("blog_posts")
        .select("id, title")
        .eq("status", "published")
        .is("deleted_at", null)
        .neq("id", id)
        .order("published_at", { ascending: false })
        .limit(200),
    ]);

  if (postResult.error || !postResult.data) {
    notFound();
  }

  const post = postResult.data as BlogPost;
  const categories = categoriesResult.data ?? [];
  const consultants = (consultantsResult.data ?? []) as unknown as Array<{
    id: string;
    slug: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  }>;

  return (
    <BlogPostForm
      post={post}
      categories={categories}
      consultants={consultants as never}
      pinnablePosts={pinnableResult.data ?? []}
      mode="edit"
    />
  );
};

export default EditBlogPostPage;
