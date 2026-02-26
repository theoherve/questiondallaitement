"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { WysiwygEditor } from "@/components/editor/wysiwyg-editor";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { EmailTemplate } from "@/types/database";

type TemplateFormProps = {
  template?: EmailTemplate | null;
  onSave: (data: {
    name: string;
    subject: string;
    body_html: string;
    type: "transactional" | "marketing";
    variables: string[];
  }) => Promise<{ success: boolean; error?: string; data?: { id: string } }>;
  onDelete?: (id: string) => Promise<{ success: boolean; error?: string }>;
};

export const TemplateForm = ({
  template,
  onSave,
  onDelete,
}: TemplateFormProps) => {
  const isEdit = !!template;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: template?.name ?? "",
    subject: template?.subject ?? "",
    body_html: template?.body_html ?? "",
    type: template?.type ?? ("marketing" as "transactional" | "marketing"),
    variables: template?.variables ?? [],
  });

  const [newVariable, setNewVariable] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleSave = () => {
    if (!formData.name.trim() || !formData.subject.trim()) {
      toast.error("Le nom et l'objet sont obligatoires.");
      return;
    }
    if (!formData.body_html || formData.body_html.length < 10) {
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
          {isEdit && onDelete && (
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </DialogTrigger>
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
          )}
          <Button onClick={handleSave} disabled={isPending}>
            <Save className="mr-2 h-4 w-4" />
            Enregistrer
          </Button>
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
              <WysiwygEditor
                initialContent={formData.body_html}
                onChange={(html) =>
                  setFormData((prev) => ({ ...prev, body_html: html }))
                }
                placeholder="Rédigez le contenu du template..."
              />
            </CardContent>
          </Card>
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
