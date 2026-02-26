"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Trash2, Loader2, Percent } from "lucide-react";
import {
  addCollaborator,
  updateCollaboratorShare,
  removeCollaborator,
  type FormationCollaboratorRow,
} from "../actions";
import { toast } from "sonner";

type ConsultantOption = {
  id: string;
  profiles: { first_name: string | null; last_name: string | null };
};

export const CollaboratorManager = ({
  formationId,
  collaborators,
  consultants,
  mainConsultantId,
}: {
  formationId: string;
  collaborators: FormationCollaboratorRow[];
  consultants: ConsultantOption[];
  mainConsultantId: string;
}) => {
  const [isPending, startTransition] = useTransition();
  const [selectedConsultantId, setSelectedConsultantId] = useState("");
  const [revenueShare, setRevenueShare] = useState("20");
  const [editingShares, setEditingShares] = useState<Record<string, string>>(
    {},
  );

  // Filter out the main consultant and already-assigned collaborators
  const assignedIds = new Set([
    mainConsultantId,
    ...collaborators.map((c) => c.consultant_id),
  ]);
  const availableConsultants = consultants.filter(
    (c) => !assignedIds.has(c.id),
  );

  const totalShare = collaborators.reduce((sum, c) => sum + c.revenue_share, 0);

  const handleAdd = () => {
    if (!selectedConsultantId) return;
    const share = parseFloat(revenueShare) || 0;

    startTransition(async () => {
      const result = await addCollaborator(formationId, {
        consultant_id: selectedConsultantId,
        revenue_share: share,
      });
      if (result.success) {
        toast.success("Collaboratrice ajoutée");
        setSelectedConsultantId("");
        setRevenueShare("20");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleUpdateShare = (consultantId: string) => {
    const newShare = parseFloat(editingShares[consultantId] ?? "0");
    if (isNaN(newShare) || newShare < 0 || newShare > 100) {
      toast.error("Le pourcentage doit être entre 0 et 100");
      return;
    }

    startTransition(async () => {
      const result = await updateCollaboratorShare(
        formationId,
        consultantId,
        newShare,
      );
      if (result.success) {
        toast.success("Part mise à jour");
        setEditingShares((prev) => {
          const next = { ...prev };
          delete next[consultantId];
          return next;
        });
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleRemove = (consultantId: string) => {
    startTransition(async () => {
      const result = await removeCollaborator(formationId, consultantId);
      if (result.success) {
        toast.success("Collaboratrice retirée");
      } else {
        toast.error(result.error);
      }
    });
  };

  const displayName = (c: { first_name: string | null; last_name: string | null }) =>
    `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Sans nom";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-lg">
          <Users className="h-5 w-5" />
          Co-création
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current collaborators */}
        {collaborators.length > 0 ? (
          <div className="space-y-2">
            {collaborators.map((collab) => (
              <div
                key={collab.consultant_id}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {displayName(collab.consultant)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {collab.consultant.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-20">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={
                        editingShares[collab.consultant_id] ??
                        collab.revenue_share.toString()
                      }
                      onChange={(e) =>
                        setEditingShares((prev) => ({
                          ...prev,
                          [collab.consultant_id]: e.target.value,
                        }))
                      }
                      onBlur={() => {
                        const val = editingShares[collab.consultant_id];
                        if (val !== undefined && parseFloat(val) !== collab.revenue_share) {
                          handleUpdateShare(collab.consultant_id);
                        }
                      }}
                      className="pr-7 text-sm"
                    />
                    <Percent className="absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleRemove(collab.consultant_id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Total des parts collaboratrices : {totalShare.toFixed(1)}% du
              revenu net
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune collaboratrice ajoutée. Les revenus reviennent entièrement à
            la consultante principale.
          </p>
        )}

        {/* Add collaborator */}
        {availableConsultants.length > 0 && (
          <div className="flex items-end gap-2 rounded-md border border-dashed p-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium">
                Ajouter une collaboratrice
              </label>
              <Select
                value={selectedConsultantId}
                onValueChange={setSelectedConsultantId}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {availableConsultants.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {displayName(c.profiles)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24 space-y-1">
              <label className="text-xs font-medium">Part (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={revenueShare}
                onChange={(e) => setRevenueShare(e.target.value)}
                className="h-9"
              />
            </div>
            <Button
              size="sm"
              className="h-9"
              onClick={handleAdd}
              disabled={isPending || !selectedConsultantId}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
