"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmailBlockEditor } from "@/components/editor/email-block-editor";
import { toast } from "sonner";
import type { JSONContent } from "@maily-to/render";
import { ArrowLeft, Send, Save, Trash2, Clock } from "lucide-react";
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
import type { EmailCampaign, ConsultantBrevoList } from "@/types/database";

type CampaignFormProps = {
  campaign?: EmailCampaign | null;
  availableLists: ConsultantBrevoList[] | { brevo_list_id: number; list_name: string }[];
  backHref: string;
  onSave: (data: {
    name: string;
    subject: string;
    body_html: string;
    body_design: Record<string, unknown> | null;
    recipient_list_ids: number[];
    scheduled_at?: string | null;
  }) => Promise<{ success: boolean; error?: string; data?: { id: string } }>;
  onSend?: (id: string) => Promise<{ success: boolean; error?: string }>;
  onDelete?: (id: string) => Promise<{ success: boolean; error?: string }>;
  onSchedule?: (id: string, scheduledAt: string) => Promise<{ success: boolean; error?: string }>;
};

export const CampaignForm = ({
  campaign,
  availableLists,
  backHref,
  onSave,
  onSend,
  onDelete,
  onSchedule,
}: CampaignFormProps) => {
  const isEdit = !!campaign;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: campaign?.name ?? "",
    subject: campaign?.subject ?? "",
    body_html: campaign?.body_html ?? "",
    body_design: campaign?.body_design ?? null,
    recipient_list_ids: campaign?.recipient_list_ids ?? [],
    scheduled_at: campaign?.scheduled_at ?? "",
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  const handleSave = () => {
    if (!formData.name.trim() || !formData.subject.trim()) {
      toast.error("Le nom et l'objet sont obligatoires.");
      return;
    }
    if (formData.recipient_list_ids.length === 0) {
      toast.error("Sélectionnez au moins une liste de destinataires.");
      return;
    }

    startTransition(async () => {
      const result = await onSave(formData);
      if (result.success) {
        toast.success(isEdit ? "Campagne mise à jour." : "Campagne créée.");
        if (!isEdit && result.data?.id) {
          router.push(`${backHref.replace(/\/$/, "")}/${result.data.id}/edit`);
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.error ?? "Erreur.");
      }
    });
  };

  const handleSend = () => {
    if (!campaign?.id || !onSend) return;
    startTransition(async () => {
      const result = await onSend(campaign.id);
      if (result.success) {
        toast.success("Campagne envoyée !");
        router.push(backHref);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur lors de l'envoi.");
      }
    });
    setShowSendDialog(false);
  };

  const handleSchedule = () => {
    if (!campaign?.id || !onSchedule || !formData.scheduled_at) return;
    startTransition(async () => {
      const result = await onSchedule(campaign.id, formData.scheduled_at);
      if (result.success) {
        toast.success("Campagne programmée.");
        router.push(backHref);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur lors de la programmation.");
      }
    });
    setShowScheduleDialog(false);
  };

  const handleDelete = () => {
    if (!campaign?.id || !onDelete) return;
    startTransition(async () => {
      const result = await onDelete(campaign.id);
      if (result.success) {
        toast.success("Campagne supprimée.");
        router.push(backHref);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur.");
      }
    });
    setShowDeleteDialog(false);
  };

  const toggleList = (listId: number) => {
    setFormData((prev) => ({
      ...prev,
      recipient_list_ids: prev.recipient_list_ids.includes(listId)
        ? prev.recipient_list_ids.filter((id) => id !== listId)
        : [...prev.recipient_list_ids, listId],
    }));
  };

  const isDraft = !campaign || campaign.status === "draft";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-serif text-2xl font-bold text-primary-green">
            {isEdit ? "Modifier la campagne" : "Nouvelle campagne"}
          </h1>
        </div>
        {isDraft && (
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
                    <DialogTitle>Supprimer la campagne ?</DialogTitle>
                    <DialogDescription>
                      Cette action est irréversible.
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

            <Button variant="outline" onClick={handleSave} disabled={isPending}>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </Button>

            {isEdit && onSchedule && (
              <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Clock className="mr-2 h-4 w-4" />
                    Programmer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Programmer l&apos;envoi</DialogTitle>
                    <DialogDescription>
                      La campagne sera envoyée automatiquement à la date choisie.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label>Date et heure d&apos;envoi</Label>
                    <Input
                      type="datetime-local"
                      value={formData.scheduled_at?.replace("Z", "").slice(0, 16) ?? ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          scheduled_at: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : "",
                        }))
                      }
                      min={new Date().toISOString().slice(0, 16)}
                      className="mt-1"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                      Annuler
                    </Button>
                    <Button
                      onClick={handleSchedule}
                      disabled={isPending || !formData.scheduled_at}
                    >
                      Programmer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {isEdit && onSend && (
              <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Send className="mr-2 h-4 w-4" />
                    Envoyer maintenant
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Envoyer la campagne ?</DialogTitle>
                    <DialogDescription>
                      La campagne sera envoyée immédiatement aux listes
                      sélectionnées.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleSend} disabled={isPending}>
                      Envoyer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="font-serif text-lg font-semibold text-primary-green">
                Informations
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nom interne de la campagne</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex: Newsletter Mars 2026"
                  disabled={!isDraft}
                />
              </div>
              <div>
                <Label htmlFor="subject">Objet de l&apos;email</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  placeholder="Ex: Nos conseils du mois 🍼"
                  disabled={!isDraft}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-serif text-lg font-semibold text-primary-green">
                Contenu de l&apos;email
              </h2>
            </CardHeader>
            <CardContent>
              {isDraft ? (
                <EmailBlockEditor
                  initialDesign={(formData.body_design as JSONContent | null) ?? undefined}
                  onChange={(design) =>
                    setFormData((prev) => ({
                      ...prev,
                      body_design: design as Record<string, unknown>,
                    }))
                  }
                  uploadFolder="campaigns"
                  previewSubject={formData.subject}
                />
              ) : (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: formData.body_html }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="font-serif text-lg font-semibold text-primary-green">
                Destinataires
              </h2>
            </CardHeader>
            <CardContent>
              {availableLists.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune liste disponible. Créez des listes dans votre compte
                  Brevo, puis assignez-les depuis l&apos;admin.
                </p>
              ) : (
                <div className="space-y-3">
                  {availableLists.map((list) => {
                    const listId = list.brevo_list_id;
                    const checked = formData.recipient_list_ids.includes(listId);
                    return (
                      <label
                        key={listId}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleList(listId)}
                          disabled={!isDraft}
                        />
                        <span className="text-sm">{list.list_name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
