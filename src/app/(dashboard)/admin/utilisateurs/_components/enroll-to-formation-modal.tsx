"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listAvailableFormationsForClient,
  manualEnrollExistingClient,
  type AvailableFormation,
} from "@/app/(dashboard)/admin/formations/[id]/enroll-actions";

type EnrollToFormationModalProps = {
  clientId: string;
  trigger?: React.ReactNode;
};

export const EnrollToFormationModal = ({
  clientId,
  trigger,
}: EnrollToFormationModalProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [formations, setFormations] = useState<AvailableFormation[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setSelectedId("");
      return;
    }
    setLoading(true);
    listAvailableFormationsForClient(clientId).then((result) => {
      if (result.success) {
        setFormations(result.data ?? []);
      } else {
        toast.error(result.error ?? "Erreur");
        setFormations([]);
      }
      setLoading(false);
    });
  };

  const handleEnroll = () => {
    if (!selectedId) return;
    startTransition(async () => {
      const result = await manualEnrollExistingClient(selectedId, clientId);
      if (result.success) {
        toast.success("Utilisateur inscrit. Email envoyé.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="default" size="sm">
            <GraduationCap className="mr-2 h-4 w-4" />
            Inscrire à un accompagnement
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inscrire à un accompagnement</DialogTitle>
          <DialogDescription>
            Sélectionnez un accompagnement. L&apos;utilisateur recevra un email
            avec le lien d&apos;accès.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label htmlFor="formation-select">Accompagnement</Label>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement…
            </div>
          ) : formations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun accompagnement disponible (tous déjà souscrits ou aucun
              publié).
            </p>
          ) : (
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger id="formation-select">
                <SelectValue placeholder="Choisir un accompagnement" />
              </SelectTrigger>
              <SelectContent>
                {formations.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.title}
                    {f.status !== "published" && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({f.status})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleEnroll}
            disabled={!selectedId || isPending || loading}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Inscrire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
