"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Pencil, Trash2, Zap } from "lucide-react";
import { useTransition } from "react";
import {
  toggleAutomationActive,
  deleteAutomation,
} from "../actions";
import { AutomationFormDialog } from "./automation-form-dialog";

const TRIGGER_LABELS: Record<string, string> = {
  formation_purchased: "Achat formation",
  booking_confirmed: "Réservation confirmée",
  event_registered: "Inscription événement",
  delay_after_event: "Jours après événement",
};

type Automation = {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  actions: unknown[];
  is_active: boolean;
};

type FormOptions = {
  formations: { id: string; title: string }[];
  consultationTypes: { id: string; title: string }[];
  events: { id: string; title: string }[];
  tags: { id: string; name: string }[];
};

type AutomationsListProps = {
  automations: Automation[];
  formOptions: FormOptions;
};

export const AutomationsList = ({
  automations,
  formOptions,
}: AutomationsListProps) => {
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleToggle = (id: string, isActive: boolean) => {
    startTransition(async () => {
      await toggleAutomationActive(id, !isActive);
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Supprimer l'automation « ${name} » ?`)) return;
    startTransition(async () => {
      await deleteAutomation(id);
    });
  };

  const editing = editingId
    ? automations.find((a) => a.id === editingId)
    : null;

  return (
    <div className="space-y-4">
      <Button
        onClick={() => setCreateOpen(true)}
        className="bg-primary-red hover:bg-primary-red-dark"
      >
        <Plus className="mr-2 h-4 w-4" />
        Nouvelle automation
      </Button>

      {automations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              Aucune automation. Créez-en une pour automatiser vos actions.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCreateOpen(true)}
            >
              Créer une automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {automations.map((auto) => (
            <Card key={auto.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-primary-green">
                      {auto.name}
                    </h3>
                    <Badge variant="secondary" className="mt-1">
                      {TRIGGER_LABELS[auto.trigger_type] ?? auto.trigger_type}
                    </Badge>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {Array.isArray(auto.actions) ? auto.actions.length : 0}{" "}
                      action(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={auto.is_active}
                      onCheckedChange={() =>
                        handleToggle(auto.id, auto.is_active)
                      }
                      disabled={isPending}
                      aria-label={`Activer ${auto.name}`}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditingId(auto.id)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(auto.id, auto.name)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AutomationFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        formOptions={formOptions}
      />

      {editing && (
        <AutomationFormDialog
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          formOptions={formOptions}
          automation={editing}
        />
      )}
    </div>
  );
};
