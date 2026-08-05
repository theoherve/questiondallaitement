"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WysiwygEditor } from "@/components/editor/wysiwyg-editor";
import { FileUpload } from "@/components/ui/file-upload";
import {
  PostEndingFields,
  type PinnablePost,
} from "./post-ending-fields";
import { createBlogPost, updateBlogPost, deleteBlogPost } from "../actions";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye, Trash2, Calendar } from "lucide-react";
import Link from "next/link";
import type { BlogPost, BlogCategory, Consultant, Profile } from "@/types";

type ConsultantWithProfile = Consultant & {
  profiles: Pick<Profile, "first_name" | "last_name"> | null;
};

type Props = {
  post?: BlogPost;
  categories: BlogCategory[];
  consultants: ConsultantWithProfile[];
  /** Articles publiés épinglables comme suggestions, article courant exclu. */
  pinnablePosts?: PinnablePost[];
  mode: "create" | "edit";
};

export const BlogPostForm = ({
  post,
  categories,
  consultants,
  pinnablePosts = [],
  mode,
}: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("content");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    body_html: post?.body_html ?? "",
    thumbnail_url: post?.thumbnail_url ?? "",
    category_id: post?.category_id ?? "",
    consultant_id: post?.consultant_id ?? "",
    status: post?.status ?? "draft",
    meta_title: post?.meta_title ?? "",
    meta_description: post?.meta_description ?? "",
    og_image_url: post?.og_image_url ?? "",
    tags: post?.tags ?? [],
    conclusion_title: post?.conclusion_title ?? "",
    conclusion_text: post?.conclusion_text ?? "",
    references_html: post?.references_html ?? "",
    related_post_ids: post?.related_post_ids ?? [],
    scheduled_at: post?.scheduled_at?.slice(0, 16) ?? "",
  });

  const slugify = (text: string): string =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title,
      slug: mode === "create" ? slugify(title) : prev.slug,
    }));
  };

  /** Ramène la rédactrice sur l'onglet qui porte l'erreur. */
  const revealFieldErrors = (errors: Record<string, string> | undefined) => {
    setFieldErrors(errors ?? {});
    if (!errors) return;
    const seoFields = ["meta_title", "meta_description", "og_image_url"];
    const endingFields = [
      "conclusion_title",
      "conclusion_text",
      "references_html",
      "related_post_ids",
    ];
    const hasSeoError = seoFields.some((f) => f in errors);
    const hasEndingError = endingFields.some((f) => f in errors);
    const hasContentError = Object.keys(errors).some(
      (f) => !seoFields.includes(f) && !endingFields.includes(f),
    );
    if (hasContentError) setActiveTab("content");
    else if (hasSeoError) setActiveTab("seo");
    else if (hasEndingError) setActiveTab("ending");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      formData.status === "scheduled" &&
      formData.scheduled_at &&
      new Date(formData.scheduled_at) <= new Date()
    ) {
      setFieldErrors({
        scheduled_at: "Choisissez une date de publication dans le futur",
      });
      toast.error("La date de publication programmée doit être dans le futur");
      return;
    }

    setFieldErrors({});

    const payload = {
      ...formData,
      conclusion_title: formData.conclusion_title || null,
      conclusion_text: formData.conclusion_text || null,
      references_html: formData.references_html || null,
      category_id: formData.category_id || null,
      consultant_id: formData.consultant_id || null,
      thumbnail_url: formData.thumbnail_url || null,
      og_image_url: formData.og_image_url || null,
      scheduled_at: formData.scheduled_at
        ? new Date(formData.scheduled_at).toISOString()
        : null,
    };

    startTransition(async () => {
      if (mode === "create") {
        const result = await createBlogPost(payload);
        if (result.success && result.data) {
          toast.success("Article créé");
          router.push(`/admin/blog/${result.data.id}/edit`);
        } else {
          revealFieldErrors(result.fieldErrors);
          toast.error(result.error || "Erreur lors de la création");
        }
      } else if (post) {
        const result = await updateBlogPost(post.id, payload);
        if (result.success) {
          toast.success("Article mis à jour");
          router.refresh();
        } else {
          revealFieldErrors(result.fieldErrors);
          toast.error(result.error ?? "Erreur lors de l'enregistrement");
        }
      }
    });
  };

  const handleDelete = async () => {
    if (!post) return;
    if (!confirm("Supprimer cet article ? Cette action est irréversible.")) return;

    startTransition(async () => {
      const result = await deleteBlogPost(post.id);
      if (result.success) {
        toast.success("Article supprimé");
        router.push("/admin/blog");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handlePublishNow = async () => {
    if (!post) return;

    startTransition(async () => {
      const result = await updateBlogPost(post.id, {
        ...formData,
        status: "published",
        scheduled_at: null,
      });
      if (result.success) {
        toast.success("Article publié");
        router.refresh();
      } else {
        revealFieldErrors(result.fieldErrors);
        toast.error(result.error ?? "Erreur lors de la publication");
      }
    });
  };

  const fieldError = (field: string) =>
    fieldErrors[field] ? (
      <p className="text-sm text-destructive" role="alert">
        {fieldErrors[field]}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/blog">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="font-serif text-2xl font-bold text-primary-green">
            {mode === "create" ? "Nouvel article" : "Modifier l'article"}
          </h1>
        </div>
        <div className="flex gap-2">
          {mode === "edit" && post?.status === "published" && (
            <Button type="button" variant="outline" asChild>
              <Link href={`/blog/${post.slug}`} target="_blank">
                <Eye className="mr-2 h-4 w-4" />
                Voir
              </Link>
            </Button>
          )}
          {mode === "edit" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isPending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="informations">Informations</TabsTrigger>
            <TabsTrigger value="ending">Fin d&apos;article</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="ending" className="space-y-4">
            <PostEndingFields
              conclusionTitle={formData.conclusion_title}
              conclusionText={formData.conclusion_text}
              referencesHtml={formData.references_html}
              relatedPostIds={formData.related_post_ids}
              pinnablePosts={pinnablePosts}
              onChange={(patch) =>
                setFormData((prev) => ({ ...prev, ...patch }))
              }
              fieldError={fieldError}
            />
          </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titre</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={handleTitleChange}
                      placeholder="Titre de l'article"
                      required
                      aria-invalid={Boolean(fieldErrors.title)}
                    />
                    {fieldError("title")}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (URL)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">/blog/</span>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, slug: e.target.value }))
                        }
                        placeholder="slug-de-larticle"
                        required
                        aria-invalid={Boolean(fieldErrors.slug)}
                      />
                    </div>
                    {fieldError("slug")}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="excerpt">Extrait (résumé)</Label>
                    <Textarea
                      id="excerpt"
                      value={formData.excerpt}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
                      }
                      placeholder="Court résumé de l'article..."
                      rows={3}
                      maxLength={300}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.excerpt.length}/300 caractères
                    </p>
                    {fieldError("excerpt")}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contenu</CardTitle>
                </CardHeader>
                <CardContent>
                  <WysiwygEditor
                    initialContent={formData.body_html}
                    onChange={(html) =>
                      setFormData((prev) => ({ ...prev, body_html: html }))
                    }
                    placeholder="Rédigez votre article ici..."
                    className="min-h-100"
                    defaultSidebarOpen
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Référencement (SEO)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="meta_title">Titre SEO</Label>
                    <Input
                      id="meta_title"
                      value={formData.meta_title}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          meta_title: e.target.value,
                        }))
                      }
                      placeholder="Titre pour les moteurs de recherche"
                      maxLength={70}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.meta_title.length}/70 caractères
                    </p>
                    {fieldError("meta_title")}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meta_description">Description SEO</Label>
                    <Textarea
                      id="meta_description"
                      value={formData.meta_description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          meta_description: e.target.value,
                        }))
                      }
                      placeholder="Description pour les moteurs de recherche"
                      rows={3}
                      maxLength={160}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.meta_description.length}/160 caractères
                    </p>
                    {fieldError("meta_description")}
                  </div>

                  <div className="space-y-2">
                    <Label>Image Open Graph</Label>
                    <FileUpload
                      bucket="blog"
                      folder="og"
                      accept="image/*"
                      maxSizeMb={10}
                      value={formData.og_image_url}
                      onUpload={(url) =>
                        setFormData((prev) => ({ ...prev, og_image_url: url }))
                      }
                      onRemove={() =>
                        setFormData((prev) => ({ ...prev, og_image_url: "" }))
                      }
                      label="Ajouter l'image de partage"
                      cropAspect="16:9"
                    />
                    <p className="text-xs text-muted-foreground">
                      Image affichée lors du partage sur les réseaux sociaux.
                      Recadrez-la en 16:9 pour éviter les coupes.
                    </p>
                    {fieldError("og_image_url")}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          <TabsContent value="informations" className="space-y-4">
            {/* Deux colonnes sur grand ecran : ces cartes sont courtes,
                les empiler laisserait la moitie de la largeur vide. */}
            <div className="grid gap-6 lg:grid-cols-2">
            {/* Publication */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Publication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as typeof formData.status,
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="draft">Brouillon</option>
                    <option value="scheduled">Programmé</option>
                    <option value="published">Publié</option>
                    <option value="archived">Archivé</option>
                  </select>
                </div>

                {formData.status === "scheduled" && (
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_at">Date de publication</Label>
                    <Input
                      id="scheduled_at"
                      type="datetime-local"
                      value={formData.scheduled_at}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          scheduled_at: e.target.value,
                        }))
                      }
                      required={formData.status === "scheduled"}
                    />
                    <p className="text-xs text-muted-foreground">
                      La date doit être dans le futur
                    </p>
                    {fieldError("scheduled_at")}
                  </div>
                )}

                {mode === "edit" && formData.status !== "published" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handlePublishNow}
                    disabled={isPending}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Publier maintenant
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Meta */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category_id">Catégorie</Label>
                  <select
                    id="category_id"
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category_id: e.target.value,
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Aucune</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consultant_id">Consultante associée</Label>
                  <select
                    id="consultant_id"
                    value={formData.consultant_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        consultant_id: e.target.value,
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Aucune</option>
                    {consultants.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.profiles?.first_name} {c.profiles?.last_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Affichée comme auteur de l&apos;article
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Image de couverture</Label>
                  <FileUpload
                    bucket="blog"
                    folder="covers"
                    accept="image/*"
                    maxSizeMb={10}
                    value={formData.thumbnail_url}
                    onUpload={(url) =>
                      setFormData((prev) => ({ ...prev, thumbnail_url: url }))
                    }
                    onRemove={() =>
                      setFormData((prev) => ({ ...prev, thumbnail_url: "" }))
                    }
                    label="Ajouter une image de couverture"
                    cropAspect="16:9"
                  />
                  {fieldError("thumbnail_url")}
                </div>
              </CardContent>
            </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </form>
  );
};
