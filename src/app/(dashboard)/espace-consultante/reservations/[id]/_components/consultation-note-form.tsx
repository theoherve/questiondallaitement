"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  upsertConsultationNote,
  publishConsultationNote,
  unpublishConsultationNote,
} from "../../../crm/actions";
import type { Child, ConsultationNote } from "@/types/database";

type AntecedentKey =
  | "antecedents_medicaux"
  | "antecedents_chirurgicaux"
  | "allergies"
  | "traitements_en_cours";

const ANTECEDENT_LABELS: Record<AntecedentKey, string> = {
  antecedents_medicaux: "Antécédents médicaux",
  antecedents_chirurgicaux: "Antécédents chirurgicaux",
  allergies: "Allergies",
  traitements_en_cours: "Traitements en cours",
};

export const ConsultationNoteForm = ({
  bookingId,
  initialNote,
  children,
}: {
  bookingId: string;
  initialNote: ConsultationNote | null;
  children: Child[];
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [childId, setChildId] = useState<string | null>(
    initialNote?.child_id ?? null,
  );
  const [motif, setMotif] = useState(initialNote?.motif ?? "");
  const [observation, setObservation] = useState(
    initialNote?.observation ?? "",
  );
  const [conclusion, setConclusion] = useState(initialNote?.conclusion ?? "");
  const [notesInternes, setNotesInternes] = useState(
    initialNote?.notes_internes ?? "",
  );
  const [antecedents, setAntecedents] = useState<Record<AntecedentKey, boolean>>({
    antecedents_medicaux: initialNote?.antecedents_medicaux ?? false,
    antecedents_chirurgicaux: initialNote?.antecedents_chirurgicaux ?? false,
    allergies: initialNote?.allergies ?? false,
    traitements_en_cours: initialNote?.traitements_en_cours ?? false,
  });
  const [antecedentDetails, setAntecedentDetails] = useState<
    Record<AntecedentKey, string>
  >({
    antecedents_medicaux: initialNote?.antecedents_medicaux_detail ?? "",
    antecedents_chirurgicaux:
      initialNote?.antecedents_chirurgicaux_detail ?? "",
    allergies: initialNote?.allergies_detail ?? "",
    traitements_en_cours: initialNote?.traitements_en_cours_detail ?? "",
  });

  const status = initialNote?.status ?? "draft";

  const buildFields = () => ({
    child_id: childId,
    motif,
    antecedents_medicaux: antecedents.antecedents_medicaux,
    antecedents_medicaux_detail: antecedentDetails.antecedents_medicaux || null,
    antecedents_chirurgicaux: antecedents.antecedents_chirurgicaux,
    antecedents_chirurgicaux_detail:
      antecedentDetails.antecedents_chirurgicaux || null,
    allergies: antecedents.allergies,
    allergies_detail: antecedentDetails.allergies || null,
    traitements_en_cours: antecedents.traitements_en_cours,
    traitements_en_cours_detail:
      antecedentDetails.traitements_en_cours || null,
    observation,
    conclusion,
    notes_internes: notesInternes || null,
  });

  const handleSave = () => {
    startTransition(async () => {
      const result = await upsertConsultationNote(bookingId, buildFields());
      if (result.success) {
        toast.success("Fiche enregistrée");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handlePublish = () => {
    startTransition(async () => {
      const saveResult = await upsertConsultationNote(bookingId, buildFields());
      if (!saveResult.success) {
        toast.error(saveResult.error);
        return;
      }
      const publishResult = await publishConsultationNote(bookingId);
      if (publishResult.success) {
        toast.success("Fiche publiée, la patiente peut la consulter");
        router.refresh();
      } else {
        toast.error(publishResult.error);
      }
    });
  };

  const handleUnpublish = () => {
    startTransition(async () => {
      const result = await unpublishConsultationNote(bookingId);
      if (result.success) {
        toast.success("Fiche repassée en brouillon");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Badge variant={status === "published" ? "default" : "secondary"}>
          {status === "published" ? "Publiée" : "Brouillon"}
        </Badge>
      </div>

      <div>
        <Label htmlFor="note-child">Enfant concerné</Label>
        <select
          id="note-child"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={childId ?? ""}
          onChange={(e) => setChildId(e.target.value || null)}
        >
          <option value="">Consultation parent seule</option>
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.first_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="note-motif">Motif</Label>
        <Textarea
          id="note-motif"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <Label>Antécédents</Label>
        {(Object.keys(ANTECEDENT_LABELS) as AntecedentKey[]).map((key) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`note-${key}`}
                checked={antecedents[key]}
                onCheckedChange={(checked) =>
                  setAntecedents((prev) => ({ ...prev, [key]: checked === true }))
                }
              />
              <Label htmlFor={`note-${key}`}>{ANTECEDENT_LABELS[key]}</Label>
            </div>
            {antecedents[key] && (
              <Textarea
                value={antecedentDetails[key]}
                onChange={(e) =>
                  setAntecedentDetails((prev) => ({
                    ...prev,
                    [key]: e.target.value,
                  }))
                }
                placeholder="Détail"
                rows={2}
              />
            )}
          </div>
        ))}
      </div>

      <div>
        <Label htmlFor="note-observation">Observation</Label>
        <Textarea
          id="note-observation"
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="note-conclusion">Conclusion</Label>
        <Textarea
          id="note-conclusion"
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="note-internal">
          Notes internes (jamais visibles de la patiente)
        </Label>
        <Textarea
          id="note-internal"
          value={notesInternes}
          onChange={(e) => setNotesInternes(e.target.value)}
          rows={3}
          className="border-dashed"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={isPending} variant="outline">
          Enregistrer
        </Button>
        {status === "draft" ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isPending}>Publier</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Publier cette fiche ?</AlertDialogTitle>
                <AlertDialogDescription>
                  La patiente pourra voir cette fiche depuis son espace.
                  Vérifiez son contenu avant de continuer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handlePublish}>
                  Publier
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button onClick={handleUnpublish} disabled={isPending} variant="outline">
            Repasser en brouillon
          </Button>
        )}
      </div>
    </div>
  );
};
