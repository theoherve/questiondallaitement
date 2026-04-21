"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmailBlockEditor } from "@/components/editor/email-block-editor";
import { toast } from "sonner";
import type { JSONContent } from "@maily-to/render";
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  X,
  Sparkles,
  FileCode,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EmailTemplate } from "@/types/database";

const MIN_LEGACY_HTML_LENGTH = 10;

type TemplateFormProps = {
  template?: EmailTemplate | null;
  /** True when a bundled default design exists for this template name. */
  hasDefaultDesign?: boolean;
  onSave: (data: {
    name: string;
    subject: string;
    body_html: string;
    body_design: Record<string, unknown> | null;
    type: "transactional" | "marketing";
    variables: string[];
  }) => Promise<{ success: boolean; error?: string; data?: { id: string } }>;
  onDelete?: (id: string) => Promise<{ success: boolean; error?: string }>;
  /** Optional per-template restore — applies the bundled default to this row. */
  onRestoreDefault?: () => Promise<{ success: boolean; error?: string }>;
};

export const TemplateForm = ({
  template,
  hasDefaultDesign = false,
  onSave,
  onDelete,
  onRestoreDefault,
}: TemplateFormProps) => {
  const isEdit = !!template;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: template?.name ?? "",
    subject: template?.subject ?? "",
    body_html: template?.body_html ?? "",
    body_design: template?.body_design ?? null,
    type: template?.type ?? ("marketing" as "transactional" | "marketing"),
    variables: template?.variables ?? [],
  });

  const [newVariable, setNewVariable] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [forceEditor, setForceEditor] = useState(false);

  const hasDesign =
    formData.body_design !== null &&
    typeof formData.body_design === "object" &&
    Object.keys(formData.body_design as Record<string, unknown>).length > 0;
  const hasLegacyHtml =
    !hasDesign &&
    !!formData.body_html &&
    formData.body_html.length > MIN_LEGACY_HTML_LENGTH;

  const handleSave = () => {
    if (!formData.name.trim() || !formData.subject.trim()) {
      toast.error("Le nom et l'objet sont obligatoires.");
      return;
    }
    if (
      !hasDesign &&
      (!formData.body_html ||
        formData.body_html.length < MIN_LEGACY_HTML_LENGTH)
    ) {
      toast.error("Le contenu du template est trop court.");
      return;
    }

    startTransition(async () => {
      const result = await onSave(formData);
      if (result.success) {
        toast.success(isEdit ? "Template mis à jour." : "Template créé.");
        if (!isEdit && result.data?.id) {
          router.push(`/admin/marketing/templates/${result.data.id}/edit`);
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.error ?? "Erreur.");
      }
    });
  };

  const handleDelete = () => {
    if (!template?.id || !onDelete) return;
    startTransition(async () => {
      const result = await onDelete(template.id);
      if (result.success) {
        toast.success("Template supprimé.");
        router.push("/admin/marketing");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur.");
      }
    });
    setShowDeleteDialog(false);
  };

  const addVariable = () => {
    const v = newVariable.trim();
    if (!v) return;
    if (formData.variables.includes(v)) {
      toast.error("Cette variable existe déjà.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      variables: [...prev.variables, v],
    }));
    setNewVariable("");
  };

  const removeVariable = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== idx),
    }));
  };

  const handleRestoreDefault = () => {
    if (!onRestoreDefault) return;
    startTransition(async () => {
      const result = await onRestoreDefault();
      if (result.success) {
        toast.success("Design par défaut restauré.");
        setShowRestoreDialog(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur lors de la restauration.");
      }
    });
  };

  const showLegacyFallback = hasLegacyHtml && !forceEditor;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/marketing">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-serif text-2xl font-bold text-primary-green">
            {isEdit ? "Modifier le template" : "Nouveau template"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={isPending}>
            <Save className="mr-2 h-4 w-4" />
            Enregistrer
          </Button>

          {isEdit && onDelete && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Plus d'actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Supprimer le template ?</DialogTitle>
                    <DialogDescription>
                      Cette action est irréversible. Les campagnes utilisant ce
                      template ne seront pas affectées.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                      Annuler
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                      Supprimer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="font-serif text-lg font-semibold text-primary-green">
                Informations
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nom du template</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex: Welcome email"
                />
              </div>
              <div>
                <Label htmlFor="subject">
                  Objet de l&apos;email (supporte {"{{variables}}"})
                </Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  placeholder="Ex: Bienvenue {{client_name}} !"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <div className="mt-1 flex gap-2">
                  <Button
                    type="button"
                    variant={formData.type === "marketing" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, type: "marketing" }))
                    }
                  >
                    Marketing
                  </Button>
                  <Button
                    type="button"
                    variant={formData.type === "transactional" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, type: "transactional" }))
                    }
                  >
                    Transactionnel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-serif text-lg font-semibold text-primary-green">
                Contenu
              </h2>
            </CardHeader>
            <CardContent>
              {showLegacyFallback ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-amber-900">
                        Ce template n&apos;a pas encore de design en blocs
                      </p>
                      <p className="text-amber-800">
                        Le contenu actuel provient d&apos;un HTML brut (probablement
                        issu d&apos;une migration). L&apos;aperçu ci-dessous
                        correspond à l&apos;email envoyé. Pour l&apos;éditer en
                        blocs, restaure le design par défaut ou commence depuis
                        zéro.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {hasDefaultDesign && onRestoreDefault && (
                      <Button
                        variant="default"
                        onClick={() => setShowRestoreDialog(true)}
                        disabled={isPending}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Restaurer le design par défaut
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setForceEditor(true)}
                      disabled={isPending}
                    >
                      <FileCode className="mr-2 h-4 w-4" />
                      Commencer depuis zéro
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Aperçu HTML actuel (lecture seule)
                    </Label>
                    <iframe
                      srcDoc={formData.body_html}
                      title="Aperçu du template"
                      className="h-96 w-full rounded-lg border bg-white"
                      sandbox=""
                    />
                  </div>
                </div>
              ) : (
                <EmailBlockEditor
                  initialDesign={(formData.body_design as JSONContent | null) ?? undefined}
                  onChange={(design) =>
                    setFormData((prev) => ({
                      ...prev,
                      body_design: design as Record<string, unknown>,
                    }))
                  }
                  variables={formData.variables}
                  uploadFolder="templates"
                  previewSubject={formData.subject}
                />
              )}
            </CardContent>
          </Card>

          {/* Per-template restore confirmation */}
          {hasDefaultDesign && onRestoreDefault && (
            <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Restaurer le design par défaut ?</DialogTitle>
                  <DialogDescription>
                    Le contenu (design blocs, HTML rendu, sujet, variables) sera
                    réécrit avec le design bundled de la marque. Aucune
                    personnalisation ne sera conservée.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowRestoreDialog(false)}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleRestoreDefault} disabled={isPending}>
                    {isPending ? "Restauration..." : "Restaurer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <h2 className="font-serif text-lg font-semibold text-primary-green">
                Variables
              </h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Définissez les variables utilisables dans l&apos;objet et le corps
                avec la syntaxe {"{{nom_variable}}"}.
              </p>
              <div className="flex gap-2">
                <Input
                  value={newVariable}
                  onChange={(e) => setNewVariable(e.target.value)}
                  placeholder="nom_variable"
                  onKeyDown={(e) => e.key === "Enter" && addVariable()}
                />
                <Button variant="outline" size="icon" onClick={addVariable}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.variables.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.variables.map((v, i) => (
                    <Badge key={v} variant="secondary" className="gap-1">
                      {`{{${v}}}`}
                      <button onClick={() => removeVariable(i)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
