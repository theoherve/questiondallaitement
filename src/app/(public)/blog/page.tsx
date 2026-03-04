import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, User } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Conseils, actualités et ressources sur l'allaitement, le sommeil et la santé maternelle.",
};

export const dynamic = "force-dynamic";

const POSTS_PER_PAGE = 12;

type Props = {
  searchParams: Promise<{
    page?: string;
    category?: string;
  }>;
};

const BlogPage = async ({ searchParams }: Props) => {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const categorySlug = params.category;

  const supabase = await createClient();

  // Get categories
  const { data: categories } = await supabase
    .from("blog_categories")
    .select("id, name, slug")
    .order("position", { ascending: true });

  const categoryOptions = categories ?? [];

  // Find category by slug if filtered
  const selectedCategory = categorySlug
    ? categoryOptions.find((c) => c.slug === categorySlug)
    : null;

  // Build query
  let query = supabase
    .from("blog_posts")
    .select(
      `
      id,
      title,
      slug,
      excerpt,
      thumbnail_url,
      published_at,
      category_id,
      consultant_id,
      blog_categories (
        id,
        name,
        slug
      ),
      consultants (
        id,
        slug,
        profiles!consultants_id_fkey (
          first_name,
          last_name,
          avatar_url
        )
      )
    `,
      { count: "exact" }
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (selectedCategory) {
    query = query.eq("category_id", selectedCategory.id);
  }

  // Pagination
  const from = (page - 1) * POSTS_PER_PAGE;
  const to = from + POSTS_PER_PAGE - 1;

  const { data: posts, count, error } = await query.range(from, to);

  const totalPages = Math.ceil((count ?? 0) / POSTS_PER_PAGE);

  type PostRow = {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    thumbnail_url: string | null;
    published_at: string | null;
    category_id: string | null;
    consultant_id: string | null;
    blog_categories: { id: string; name: string; slug: string } | null;
    consultants: {
      id: string;
      slug: string;
      profiles: {
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
      } | null;
    } | null;
  };

  const rows = (posts ?? []) as unknown as PostRow[];

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
            Blog
          </h1>
          <p className="mt-4 text-destructive">
            Erreur lors du chargement : {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          Blog
        </h1>
        <p className="mt-4 text-lg text-primary-green/70">
          Conseils, actualités et ressources pour vous accompagner
        </p>
      </div>

      {/* Categories filter */}
      {categoryOptions.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link href="/blog">
            <Badge
              variant={!categorySlug ? "default" : "outline"}
              className="cursor-pointer px-4 py-1"
            >
              Tous
            </Badge>
          </Link>
          {categoryOptions.map((cat) => (
            <Link key={cat.id} href={`/blog?category=${cat.slug}`}>
              <Badge
                variant={categorySlug === cat.slug ? "default" : "outline"}
                className="cursor-pointer px-4 py-1"
              >
                {cat.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Posts grid */}
      {rows.length > 0 ? (
        <>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((post) => {
              const consultantName = post.consultants?.profiles
                ? `${post.consultants.profiles.first_name ?? ""} ${post.consultants.profiles.last_name ?? ""}`.trim()
                : null;

              return (
                <Card
                  key={post.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <Link href={`/blog/${post.slug}`}>
                    {post.thumbnail_url ? (
                      <div className="relative aspect-video">
                        <Image
                          src={post.thumbnail_url}
                          alt={post.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-linear-to-br from-primary-red/10 to-primary-green/10 flex items-center justify-center">
                        <span className="text-4xl font-serif text-primary-green/20">
                          {post.title.charAt(0)}
                        </span>
                      </div>
                    )}
                  </Link>
                  <CardContent className="p-4">
                    {post.blog_categories && (
                      <Link href={`/blog?category=${post.blog_categories.slug}`}>
                        <Badge
                          variant="secondary"
                          className="mb-2 text-xs hover:bg-primary-red/10"
                        >
                          {post.blog_categories.name}
                        </Badge>
                      </Link>
                    )}
                    <Link href={`/blog/${post.slug}`}>
                      <h2 className="font-serif text-lg font-semibold text-primary-green line-clamp-2 hover:text-primary-red transition-colors">
                        {post.title}
                      </h2>
                    </Link>
                    {post.excerpt && (
                      <p className="mt-2 text-sm text-primary-green/70 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between text-xs text-primary-green/60">
                      {consultantName ? (
                        <Link
                          href={`/consultantes/${post.consultants?.slug}`}
                          className="flex items-center gap-1 hover:text-primary-red"
                        >
                          {post.consultants?.profiles?.avatar_url ? (
                            <Image
                              src={post.consultants.profiles.avatar_url}
                              alt={consultantName}
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                          <span>{consultantName}</span>
                        </Link>
                      ) : (
                        <span />
                      )}
                      {post.published_at && (
                        <time>
                          {format(new Date(post.published_at), "d MMM yyyy", {
                            locale: fr,
                          })}
                        </time>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center gap-4">
              {page > 1 ? (
                <Button variant="outline" asChild>
                  <Link
                    href={`/blog?page=${page - 1}${categorySlug ? `&category=${categorySlug}` : ""}`}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Précédent
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Précédent
                </Button>
              )}
              <span className="text-sm text-primary-green/70">
                Page {page} sur {totalPages}
              </span>
              {page < totalPages ? (
                <Button variant="outline" asChild>
                  <Link
                    href={`/blog?page=${page + 1}${categorySlug ? `&category=${categorySlug}` : ""}`}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="mt-12 text-center">
          <p className="text-primary-green/60">
            {categorySlug
              ? "Aucun article dans cette catégorie pour le moment."
              : "Aucun article publié pour le moment. Revenez bientôt !"}
          </p>
        </div>
      )}
    </div>
  );
};

export default BlogPage;
