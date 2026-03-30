import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Eye, Folder } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CategoriesDialog } from "./_components/categories-dialog";

export const metadata: Metadata = {
  title: "Gestion du blog",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Brouillon", variant: "secondary" },
  scheduled: { label: "Programmé", variant: "outline" },
  published: { label: "Publié", variant: "default" },
  archived: { label: "Archivé", variant: "destructive" },
};

type Props = {
  searchParams: Promise<{
    status?: string;
    category?: string;
    q?: string;
  }>;
};

const AdminBlogPage = async ({ searchParams }: Props) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const params = await searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from("blog_posts")
    .select(
      `
      id,
      title,
      slug,
      status,
      excerpt,
      thumbnail_url,
      created_at,
      published_at,
      scheduled_at,
      category_id,
      consultant_id,
      blog_categories (
        id,
        name,
        slug
      ),
      consultants (
        id,
        profiles!consultants_id_fkey (
          first_name,
          last_name
        )
      )
    `
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.category) {
    query = query.eq("category_id", params.category);
  }

  if (params.q) {
    query = query.ilike("title", `%${params.q}%`);
  }

  const { data: posts } = await query;

  const { data: categories } = await supabase
    .from("blog_categories")
    .select("id, name, slug")
    .order("position", { ascending: true });

  type PostRow = {
    id: string;
    title: string;
    slug: string;
    status: string;
    excerpt: string | null;
    thumbnail_url: string | null;
    created_at: string;
    published_at: string | null;
    scheduled_at: string | null;
    category_id: string | null;
    consultant_id: string | null;
    blog_categories: { id: string; name: string; slug: string } | null;
    consultants: {
      id: string;
      profiles: { first_name: string | null; last_name: string | null } | null;
    } | null;
  };

  type CategoryOption = {
    id: string;
    name: string;
    slug: string;
  };

  const rows = (posts ?? []) as unknown as PostRow[];
  const categoryOptions = (categories ?? []) as unknown as CategoryOption[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Blog
        </h1>
        <div className="flex gap-2">
          <CategoriesDialog categories={categoryOptions} />
          <Button asChild className="bg-primary-red hover:bg-primary-red-dark">
            <Link href="/admin/blog/nouveau">
              <Plus className="mr-2 h-4 w-4" />
              Nouvel article
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <form className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-50">
              <label htmlFor="search" className="mb-1 block text-sm font-medium">
                Recherche
              </label>
              <Input
                id="search"
                name="q"
                placeholder="Rechercher un article..."
                defaultValue={params.q}
              />
            </div>
            <div className="w-40">
              <label htmlFor="status" className="mb-1 block text-sm font-medium">
                Statut
              </label>
              <select
                id="status"
                name="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={params.status || "all"}
              >
                <option value="all">Tous</option>
                <option value="draft">Brouillon</option>
                <option value="scheduled">Programmé</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
            </div>
            <div className="w-48">
              <label htmlFor="category" className="mb-1 block text-sm font-medium">
                Catégorie
              </label>
              <select
                id="category"
                name="category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={params.category || ""}
              >
                <option value="">Toutes</option>
                {categoryOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[45%]">Titre</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Consultante</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun article trouvé
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((post) => {
                  const statusConfig = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.draft;
                  const consultantName = post.consultants?.profiles
                    ? `${post.consultants.profiles.first_name ?? ""} ${post.consultants.profiles.last_name ?? ""}`.trim()
                    : null;

                  const dateLabel =
                    post.status === "scheduled" && post.scheduled_at
                      ? `Prévu : ${format(new Date(post.scheduled_at), "d MMM yyyy", { locale: fr })}`
                      : post.status === "published" && post.published_at
                        ? format(new Date(post.published_at), "d MMM yyyy", { locale: fr })
                        : format(new Date(post.created_at), "d MMM yyyy", { locale: fr });

                  return (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {post.thumbnail_url ? (
                            <Image
                              src={post.thumbnail_url}
                              alt=""
                              width={64}
                              height={40}
                              className="h-10 w-16 object-cover rounded"
                            />
                          ) : (
                            <div className="h-10 w-16 bg-muted rounded flex items-center justify-center">
                              <Folder className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate" title={post.title}>{post.title}</p>
                            <p className="text-xs text-muted-foreground truncate" title={`/blog/${post.slug}`}>/blog/{post.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {post.blog_categories?.name ? (
                          <span className="block truncate" title={post.blog_categories.name}>
                            {post.blog_categories.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {consultantName ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dateLabel}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {post.status === "published" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="Voir"
                            >
                              <Link href={`/blog/${post.slug}`} target="_blank">
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Modifier"
                          >
                            <Link href={`/admin/blog/${post.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBlogPage;
