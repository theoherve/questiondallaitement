import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArticleBody } from "@/components/blog/article-body";
import { ArticleConclusion } from "@/components/blog/article-conclusion";
import { ArticleNewsletterCta } from "@/components/blog/article-newsletter-cta";
import { ArticleReferences } from "@/components/blog/article-references";
import { ArticleSuggestions } from "@/components/blog/article-suggestions";
import { fetchRelatedPosts } from "@/lib/blog/related-posts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, User, Calendar, ChevronRight } from "lucide-react";

type Props = {
  params: Promise<{ slug: string }>;
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, meta_title, meta_description, og_image_url, excerpt")
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .single();

  if (!post) {
    return { title: "Article non trouvé" };
  }

  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || undefined,
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || undefined,
      images: post.og_image_url ? [post.og_image_url] : undefined,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || undefined,
      images: post.og_image_url ? [post.og_image_url] : undefined,
    },
  };
};

const BlogPostPage = async ({ params }: Props) => {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post, error } = await supabase
    .from("blog_posts")
    .select(
      `
      id,
      title,
      slug,
      excerpt,
      body_html,
      thumbnail_url,
      published_at,
      tags,
      category_id,
      consultant_id,
      conclusion_title,
      conclusion_text,
      references_html,
      related_post_ids,
      blog_categories (
        id,
        name,
        slug
      ),
      consultants (
        id,
        slug,
        bio,
        profiles!consultants_id_fkey (
          first_name,
          last_name,
          avatar_url
        )
      )
    `
    )
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .single();

  if (error || !post) {
    notFound();
  }

  type PostData = typeof post & {
    conclusion_title: string | null;
    conclusion_text: string | null;
    references_html: string | null;
    related_post_ids: string[] | null;
    blog_categories: { id: string; name: string; slug: string } | null;
    consultants: {
      id: string;
      slug: string;
      bio: string | null;
      profiles: {
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
      } | null;
    } | null;
  };

  const postData = post as PostData;
  const consultant = postData.consultants;
  const category = postData.blog_categories;
  const consultantName = consultant?.profiles
    ? `${consultant.profiles.first_name ?? ""} ${consultant.profiles.last_name ?? ""}`.trim()
    : null;

  // Suggestions : epingles de la redactrice d'abord, puis meme categorie, tags
  // communs et recents. La liste n'est donc jamais vide.
  const relatedPosts = await fetchRelatedPosts(supabase, {
    id: post.id,
    category_id: postData.category_id,
    tags: postData.tags as string[] | null,
    related_post_ids: postData.related_post_ids,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center text-sm text-primary-green/70 hover:text-primary-red mb-8"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Retour au blog
      </Link>

      {/*
        Deux colonnes a partir de lg : l'article garde une mesure de lecture
        confortable, les suggestions accompagnent le defilement. En dessous, la
        colonne n'a pas la place d'exister — les suggestions repassent sous
        l'article, en liste compacte.
      */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
        <article className="min-w-0">
          {/* Header */}
          <header className="mb-8">
            {category && (
              <Link href={`/blog?category=${category.slug}`}>
                <Badge variant="secondary" className="mb-4 hover:bg-primary-red/10">
                  {category.name}
                </Badge>
              </Link>
            )}

            <h1 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-4 text-xl text-primary-green/70">{post.excerpt}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-primary-green/60">
              {consultantName && (
                <Link
                  href={`/consultantes/${consultant?.slug}`}
                  className="flex items-center gap-2 hover:text-primary-red"
                >
                  {consultant?.profiles?.avatar_url ? (
                    <Image
                      src={consultant.profiles.avatar_url}
                      alt={consultantName}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                  <span>{consultantName}</span>
                </Link>
              )}
              {post.published_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <time>
                    {format(new Date(post.published_at), "d MMMM yyyy", {
                      locale: fr,
                    })}
                  </time>
                </div>
              )}
            </div>
          </header>

          {/* Featured image */}
          {post.thumbnail_url && (
            <div className="relative aspect-video mb-8 overflow-hidden rounded-xl">
              <Image
                src={post.thumbnail_url}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Content */}
          <ArticleBody
            html={post.body_html}
            className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-primary-green prose-p:text-primary-green/80 prose-a:text-primary-red prose-a:no-underline hover:prose-a:underline prose-blockquote:border-primary-red/30 prose-blockquote:text-primary-green/70"
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-8 pt-8 border-t">
              <div className="flex flex-wrap gap-2">
                {[...new Set(post.tags as string[])].map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Rappel de fin d'article, quand la redactrice en a ecrit un */}
          <ArticleConclusion
            title={postData.conclusion_title}
            text={postData.conclusion_text}
          />

          {/* Inscription newsletter : sur tous les articles, encadre ou non */}
          <ArticleNewsletterCta />

          {/* Références et sources */}
          <ArticleReferences html={postData.references_html} />

          {/* Author card */}
          {consultant && consultantName && (
            <Card className="mt-12 bg-background-beige-dark/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {consultant.profiles?.avatar_url ? (
                    <Image
                      src={consultant.profiles.avatar_url}
                      alt={consultantName}
                      width={64}
                      height={64}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-primary-green/10 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary-green/40" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-primary-green/60">Écrit par</p>
                    <h3 className="font-serif text-xl font-semibold text-primary-green">
                      {consultantName}
                    </h3>
                    {consultant.bio && (
                      <p className="mt-2 text-sm text-primary-green/70 line-clamp-2">
                        {consultant.bio}
                      </p>
                    )}
                    <Button variant="link" className="px-0 mt-2" asChild>
                      <Link href={`/consultantes/${consultant.slug}`}>
                        Voir le profil
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/*
            Repli des suggestions sous l'article : uniquement quand la colonne
            laterale n'est pas rendue, pour ne pas afficher deux fois la meme liste.
          */}
          <ArticleSuggestions
            posts={relatedPosts}
            variant="inline"
            className="mt-16 lg:hidden"
          />
        </article>

        <div className="hidden lg:block">
          <div className="sticky top-24">
            <ArticleSuggestions posts={relatedPosts} variant="sidebar" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPostPage;
