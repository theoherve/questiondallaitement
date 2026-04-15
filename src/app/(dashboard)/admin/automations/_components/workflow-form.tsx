"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Play } from "lucide-react";
import { toast } from "sonner";
import {
  createWorkflow,
  updateWorkflow,
  getAudienceCount,
  triggerManualWorkflow,
} from "../actions";
import { WorkflowStepCard } from "./workflow-step-card";
import type {
  AdminWorkflow,
  AdminWorkflowStep,
  Label,
  RecurringEventDefinition,
  AdminWorkflowActionType,
} from "@/lib/admin-workflows/types";

type StepDraft = {
  key: string;
  position: number;
  delay_days: number;
  send_time: string;
  action_type: AdminWorkflowActionType;
  action_config: Record<string, unknown>;
};

type Props = {
  workflow?: AdminWorkflow & { steps: AdminWorkflowStep[] };
  labels: Label[];
  recurringDefinitions: RecurringEventDefinition[];
  formations: { id: string; title: string }[];
  emailTemplates: {
    id: string;
    name: string;
    subject: string;
    body_html: string;
    body_design: Record<string, unknown> | null;
  }[];
};

export const WorkflowForm = ({
  workflow,
  labels,
  recurringDefinitions,
  formations,
  emailTemplates,
}: Props) => {
  const isEdit = !!workflow;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [name, setName] = useState(workflow?.name ?? "");
  const [description, setDescription] = useState(
    workflow?.description ?? "",
  );
  const [triggerType, setTriggerType] = useState(
    workflow?.trigger_type ?? "recurring_event",
  );
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>(
    (workflow?.trigger_config as Record<string, unknown>) ?? {},
  );
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(
    (workflow?.audience_config as { label_ids?: string[] })?.label_ids ?? [],
  );
  const [matchMode, setMatchMode] = useState<"any" | "all">(
    (workflow?.audience_config as { match?: "any" | "all" })?.match ?? "any",
  );
  const [isActive, setIsActive] = useState(workflow?.is_active ?? false);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);

  // Steps
  const [steps, setSteps] = useState<StepDraft[]>(() => {
    if (workflow?.steps?.length) {
      return workflow.steps.map((s, i) => ({
        key: s.id,
        position: i,
        delay_days: s.delay_days,
        // Postgres TIME returns "HH:MM:SS" — the input expects "HH:MM" and the
        // zod schema rejects the seconds-suffix form.
        send_time: (s.send_time ?? "09:00").slice(0, 5),
        action_type: s.action_type,
        action_config: s.action_config as Record<string, unknown>,
      }));
    }
    return [
      {
        key: crypto.randomUUID(),
        position: 0,
        delay_days: 0,
        send_time: "09:00",
        action_type: "send_email" as const,
        action_config: { subject: "", body_html: "" },
      },
    ];
  });

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        position: prev.length,
        delay_days: 0,
        send_time: "09:00",
        action_type: "send_email" as const,
        action_config: { subject: "", body_html: "" },
      },
    ]);
  };

  const removeStep = (key: string) => {
    setSteps((prev) =>
      prev
        .filter((s) => s.key !== key)
        .map((s, i) => ({ ...s, position: i })),
    );
  };

  const updateStep = (key: string, updates: Partial<StepDraft>) => {
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...updates } : s)),
    );
  };

  // Audience count
  const refreshAudienceCount = () => {
    if (!selectedLabelIds.length) {
      setAudienceCount(0);
      return;
    }
    startTransition(async () => {
      const count = await getAudienceCount(selectedLabelIds, matchMode);
      setAudienceCount(count);
    });
  };

  const handleSubmit = () => {
    const data = {
      name,
      description: description || null,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      audience_config: {
        label_ids: selectedLabelIds,
        match: matchMode,
      },
      steps: steps.map((s) => ({
        position: s.position,
        delay_days: s.delay_days,
        send_time: s.send_time,
        action_type: s.action_type,
        action_config: s.action_config,
      })),
      is_active: isActive,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateWorkflow(workflow.id, data)
        : await createWorkflow(data);

      if (result.success) {
        toast.success(isEdit ? "Workflow mis à jour" : "Workflow créé");
        if (!isEdit && "data" in result && result.data) {
          router.push(
            `/admin/automations/${(result.data as { id: string }).id}/edit`,
          );
        }
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  };

  const handleTriggerManual = () => {
    if (!isEdit) return;
    startTransition(async () => {
      const result = await triggerManualWorkflow(workflow.id);
      if (result.success && result.data) {
        toast.success(`${result.data.scheduled} actions planifiées`);
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  };

  const delayLabel = (days: number): string => {
    if (days === 0) return "Jour J";
    if (days < 0) return `J${days}`;
    return `J+${days}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/automations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          {isEdit ? "Modifier le workflow" : "Nouveau workflow"}
        </h1>
      </div>

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Général</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nom</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Atelier mensuel - Emails"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Envoie 3 emails autour de l'atelier mensuel"
            />
          </div>
        </CardContent>
      </Card>

      {/* Trigger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Déclencheur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={triggerType}
              onChange={(e) => {
                setTriggerType(e.target.value as "recurring_event" | "formation_enrolled" | "manual");
                setTriggerConfig({});
              }}
            >
              <option value="recurring_event">Événement récurrent</option>
              <option value="formation_enrolled">Achat formation</option>
              <option value="manual">Manuel</option>
            </select>
          </div>

          {triggerType === "recurring_event" && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                Définition récurrente
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={
                  (triggerConfig.recurring_definition_id as string) ?? ""
                }
                onChange={(e) =>
                  setTriggerConfig({
                    recurring_definition_id: e.target.value,
                  })
                }
              >
                <option value="">Sélectionner...</option>
                {recurringDefinitions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {triggerType === "formation_enrolled" && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                Formations (laisser vide = toutes)
              </label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded border p-2">
                {formations.map((f) => (
                  <label
                    key={f.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={
                        ((triggerConfig.formation_ids as string[]) ?? []).includes(
                          f.id,
                        )
                      }
                      onChange={(e) => {
                        const current =
                          (triggerConfig.formation_ids as string[]) ?? [];
                        setTriggerConfig({
                          formation_ids: e.target.checked
                            ? [...current, f.id]
                            : current.filter((id) => id !== f.id),
                        });
                      }}
                      className="rounded"
                    />
                    {f.title}
                  </label>
                ))}
              </div>
            </div>
          )}

          {triggerType === "manual" && isEdit && (
            <Button
              variant="outline"
              onClick={handleTriggerManual}
              disabled={isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              Déclencher maintenant
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Audience */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Audience</CardTitle>
            {audienceCount !== null && (
              <Badge variant="secondary">~{audienceCount} personnes</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Labels</label>
            <div className="flex flex-wrap gap-2">
              {labels.map((l) => (
                <label
                  key={l.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    selectedLabelIds.includes(l.id)
                      ? "border-primary-green bg-primary-green/10"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedLabelIds.includes(l.id)}
                    onChange={(e) => {
                      setSelectedLabelIds(
                        e.target.checked
                          ? [...selectedLabelIds, l.id]
                          : selectedLabelIds.filter((id) => id !== l.id),
                      );
                      setAudienceCount(null);
                    }}
                    className="sr-only"
                  />
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: l.color }}
                  />
                  {l.name}
                </label>
              ))}
            </div>
            {labels.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun label.{" "}
                <Link
                  href="/admin/automations/labels"
                  className="underline"
                >
                  Créez-en un
                </Link>
                .
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Mode</label>
              <select
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={matchMode}
                onChange={(e) => {
                  setMatchMode(e.target.value as "any" | "all");
                  setAudienceCount(null);
                }}
              >
                <option value="any">Au moins un label</option>
                <option value="all">Tous les labels</option>
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAudienceCount}
              disabled={isPending || !selectedLabelIds.length}
              className="mt-5"
            >
              Estimer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Étapes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step) => (
            <WorkflowStepCard
              key={step.key}
              step={step}
              delayLabel={delayLabel(step.delay_days)}
              emailTemplates={emailTemplates}
              labels={labels}
              onUpdate={(updates) => updateStep(step.key, updates)}
              onRemove={() => removeStep(step.key)}
              canRemove={steps.length > 1}
            />
          ))}
          <Button variant="outline" onClick={addStep} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une étape
          </Button>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <span className="text-sm font-medium">
            {isActive ? "Actif" : "Inactif"}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/automations">Annuler</Link>
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !name}
            className="bg-primary-red hover:bg-primary-red-dark"
          >
            {isPending
              ? "..."
              : isEdit
                ? "Mettre à jour"
                : "Créer le workflow"}
          </Button>
        </div>
      </div>
    </div>
  );
};
