"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { EmailStepEditor } from "./email-step-editor";
import type {
  AdminWorkflowActionType,
  Label,
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
  step: StepDraft;
  delayLabel: string;
  emailTemplates: {
    id: string;
    name: string;
    subject: string;
    body_html: string;
    body_design: Record<string, unknown> | null;
  }[];
  labels: Label[];
  onUpdate: (updates: Partial<StepDraft>) => void;
  onRemove: () => void;
  canRemove: boolean;
};

export const WorkflowStepCard = ({
  step,
  delayLabel,
  emailTemplates,
  labels,
  onUpdate,
  onRemove,
  canRemove,
}: Props) => {
  return (
    <div className="relative rounded-lg border bg-muted/30 p-4">
      {/* Header row */}
      <div className="mb-4 flex items-center gap-3">
        <Badge variant="outline" className="text-sm font-mono">
          {delayLabel}
        </Badge>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Délai :</label>
          <Input
            type="number"
            value={step.delay_days}
            onChange={(e) =>
              onUpdate({ delay_days: parseInt(e.target.value, 10) || 0 })
            }
            className="h-8 w-20"
            min={-30}
            max={30}
          />
          <span className="text-xs text-muted-foreground">jours</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Heure :</label>
          <Input
            type="time"
            value={step.send_time}
            onChange={(e) => onUpdate({ send_time: e.target.value })}
            className="h-8 w-28"
          />
        </div>
        <div className="flex-1" />
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>

      {/* Action type */}
      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium">Action</label>
        <select
          className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm"
          value={step.action_type}
          onChange={(e) => {
            const newType = e.target.value as AdminWorkflowActionType;
            const defaultConfigs: Record<string, Record<string, unknown>> = {
              send_email: { subject: "", body_html: "", body_design: null },
              add_label: { label_id: "" },
              webhook: { url: "", method: "POST" },
            };
            onUpdate({
              action_type: newType,
              action_config: defaultConfigs[newType],
            });
          }}
        >
          <option value="send_email">Envoyer un email</option>
          <option value="add_label">Ajouter un label</option>
          <option value="webhook">Webhook</option>
        </select>
      </div>

      {/* Action config */}
      {step.action_type === "send_email" && (
        <EmailStepEditor
          subject={(step.action_config.subject as string) ?? ""}
          bodyHtml={(step.action_config.body_html as string) ?? ""}
          bodyDesign={
            (step.action_config.body_design as Record<string, unknown> | null) ?? null
          }
          emailTemplates={emailTemplates}
          onSubjectChange={(subject) =>
            onUpdate({
              action_config: { ...step.action_config, subject },
            })
          }
          onBodyChange={(body_design) =>
            onUpdate({
              action_config: { ...step.action_config, body_design, body_html: "" },
            })
          }
          onLoadTemplate={(template) =>
            onUpdate({
              action_config: {
                ...step.action_config,
                subject: template.subject,
                body_html: template.body_html,
                body_design: template.body_design ?? null,
                template_id: template.id,
              },
            })
          }
        />
      )}

      {step.action_type === "add_label" && (
        <div>
          <label className="mb-1 block text-sm font-medium">Label</label>
          <select
            className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={(step.action_config.label_id as string) ?? ""}
            onChange={(e) =>
              onUpdate({
                action_config: { label_id: e.target.value },
              })
            }
          >
            <option value="">Sélectionner...</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {step.action_type === "webhook" && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">URL</label>
            <Input
              value={(step.action_config.url as string) ?? ""}
              onChange={(e) =>
                onUpdate({
                  action_config: { ...step.action_config, url: e.target.value },
                })
              }
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Méthode</label>
            <select
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={(step.action_config.method as string) ?? "POST"}
              onChange={(e) =>
                onUpdate({
                  action_config: {
                    ...step.action_config,
                    method: e.target.value,
                  },
                })
              }
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
              <option value="PUT">PUT</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
