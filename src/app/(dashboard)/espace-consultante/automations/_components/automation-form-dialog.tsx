"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { createAutomation, updateAutomation } from "../actions";
import { AUTOMATION_TRIGGER_TYPES } from "@/lib/automations/types";

const TRIGGER_LABELS: Record<string, string> = {
  accompagnement_purchased: "Achat formation",
  booking_confirmed: "Réservation confirmée",
  formation_registered: "Inscription formation",
  delay_after_formation: "Jours après formation",
};

type FormOptions = {
  accompagnements: { id: string; title: string }[];
  consultationTypes: { id: string; title: string }[];
  formations: { id: string; title: string }[];
  tags: { id: string; name: string }[];
};

type Automation = {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  actions: unknown[];
  is_active: boolean;
};

type AutomationFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formOptions: FormOptions;
  automation?: Automation;
};

export const AutomationFormDialog = ({
  open,
  onOpenChange,
  formOptions,
  automation,
}: AutomationFormDialogProps) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(automation?.name ?? "");
  const [triggerType, setTriggerType] = useState(
    automation?.trigger_type ?? "accompagnement_purchased"
  );
  const [triggerConfig, setTriggerConfig] = useState<
    Record<string, unknown>
  >(automation?.trigger_config ?? {});
  const [actions, setActions] = useState<unknown[]>(
    automation?.actions?.length
      ? automation.actions
      : [{ type: "send_email", subject: "", body_html: "" }]
  );
  const [isActive, setIsActive] = useState(automation?.is_active ?? false);

  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect -- Batch form reset on dialog open */
      setName(automation?.name ?? "");
      const tt = automation?.trigger_type ?? "accompagnement_purchased";
      setTriggerType(tt);
      const cfg = automation?.trigger_config ?? {};
      if (tt === "delay_after_formation" && !(cfg as { delay_days?: number }).delay_days) {
        setTriggerConfig({ ...cfg, delay_days: 2 });
      } else {
        setTriggerConfig(cfg);
      }
      setActions(
        automation?.actions?.length
          ? automation.actions
          : [{ type: "send_email", subject: "", body_html: "" }]
      );
      setIsActive(automation?.is_active ?? false);
      setError(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, automation]);

  const addAction = (type: "send_email" | "add_crm_tag" | "webhook") => {
    if (type === "send_email") {
      setActions([...actions, { type, subject: "", body_html: "" }]);
    } else if (type === "add_crm_tag") {
      setActions([...actions, { type, tag_id: formOptions.tags[0]?.id ?? "" }]);
    } else {
      setActions([...actions, { type, url: "", method: "POST" }]);
    }
  };

  const updateAction = (index: number, field: string, value: unknown) => {
    const next = [...actions];
    const a = next[index] as Record<string, unknown>;
    a[field] = value;
    setActions(next);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("trigger_type", triggerType);
    formData.set("trigger_config", JSON.stringify(triggerConfig));
    formData.set("actions", JSON.stringify(actions));
    formData.set("is_active", isActive ? "on" : "off");

    startTransition(async () => {
      const result = automation
        ? await updateAutomation(automation.id, formData)
        : await createAutomation(formData);

      if (result.success) {
        onOpenChange(false);
      } else {
        setError(result.error ?? "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {automation ? "Modifier l'automation" : "Nouvelle automation"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Bienvenue après achat"
              required
            />
          </div>

          <div>
            <Label>Déclencheur</Label>
            <Select
              value={triggerType}
              onValueChange={(v) => {
                setTriggerType(v);
                setTriggerConfig(
                  v === "delay_after_formation" ? { delay_days: 2 } : {}
                );
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTOMATION_TRIGGER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TRIGGER_LABELS[t] ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {triggerType === "accompagnement_purchased" && formOptions.formations.length > 0 && (
            <div>
              <Label>Formations concernées (vide = toutes)</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {formOptions.formations.map((f) => {
                  const ids = (triggerConfig.accompagnement_ids as string[]) ?? [];
                  const checked = ids.includes(f.id);
                  return (
                    <label
                      key={f.id}
                      className="flex items-center gap-2 rounded border px-2 py-1 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => {
                          const next = c
                            ? [...ids, f.id]
                            : ids.filter((x) => x !== f.id);
                          setTriggerConfig({ ...triggerConfig, accompagnement_ids: next });
                        }}
                      />
                      {f.title}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {triggerType === "booking_confirmed" && formOptions.consultationTypes.length > 0 && (
            <div>
              <Label>Types de consultation (vide = tous)</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {formOptions.consultationTypes.map((ct) => {
                  const ids = (triggerConfig.consultation_type_ids as string[]) ?? [];
                  const checked = ids.includes(ct.id);
                  return (
                    <label
                      key={ct.id}
                      className="flex items-center gap-2 rounded border px-2 py-1 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => {
                          const next = c
                            ? [...ids, ct.id]
                            : ids.filter((x) => x !== ct.id);
                          setTriggerConfig({
                            ...triggerConfig,
                            consultation_type_ids: next,
                          });
                        }}
                      />
                      {ct.title}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {(triggerType === "formation_registered" || triggerType === "delay_after_formation") &&
            formOptions.formations.length > 0 && (
              <div className="space-y-2">
                {triggerType === "delay_after_formation" && (
                  <div>
                    <Label htmlFor="delay_days">Nombre de jours après la formation</Label>
                    <Input
                      id="delay_days"
                      type="number"
                      min={1}
                      value={(triggerConfig.delay_days as number) ?? 2}
                      onChange={(e) =>
                        setTriggerConfig({
                          ...triggerConfig,
                          delay_days: parseInt(e.target.value, 10) || 1,
                        })
                      }
                    />
                  </div>
                )}
                <div>
                  <Label>Formations concernées (vide = tous)</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formOptions.formations.map((ev) => {
                      const ids = (triggerConfig.formation_ids as string[]) ?? [];
                      const checked = ids.includes(ev.id);
                      return (
                        <label
                          key={ev.id}
                          className="flex items-center gap-2 rounded border px-2 py-1 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) => {
                              const next = c
                                ? [...ids, ev.id]
                                : ids.filter((x) => x !== ev.id);
                              setTriggerConfig({
                                ...triggerConfig,
                                formation_ids: next,
                              });
                            }}
                          />
                          {ev.title}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          <div>
            <Label>Actions</Label>
            <div className="mt-2 space-y-4">
              {actions.map((action, i) => {
                const a = action as { type: string; [key: string]: unknown };
                return (
                  <div
                    key={i}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">
                        {a.type === "send_email"
                          ? "Envoyer un email"
                          : a.type === "add_crm_tag"
                            ? "Ajouter un tag CRM"
                            : "Webhook"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAction(i)}
                      >
                        Supprimer
                      </Button>
                    </div>
                    {a.type === "send_email" && (
                      <>
                        <Input
                          placeholder="Sujet ({{client_name}}, {{accompagnement_title}}...)"
                          value={(a.subject as string) ?? ""}
                          onChange={(e) => updateAction(i, "subject", e.target.value)}
                        />
                        <Textarea
                          placeholder="Contenu HTML (variables: {{client_name}}, {{accompagnement_title}}, {{consultation_type_title}}, {{formation_title}})"
                          value={(a.body_html as string) ?? ""}
                          onChange={(e) => updateAction(i, "body_html", e.target.value)}
                          rows={4}
                        />
                      </>
                    )}
                    {a.type === "add_crm_tag" && (
                      <Select
                        value={(a.tag_id as string) ?? ""}
                        onValueChange={(v) => updateAction(i, "tag_id", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un tag" />
                        </SelectTrigger>
                        <SelectContent>
                          {formOptions.tags.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {a.type === "webhook" && (
                      <>
                        <Input
                          placeholder="URL du webhook"
                          value={(a.url as string) ?? ""}
                          onChange={(e) => updateAction(i, "url", e.target.value)}
                        />
                        <Select
                          value={(a.method as string) ?? "POST"}
                          onValueChange={(v) => updateAction(i, "method", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                );
              })}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addAction("send_email")}
                >
                  + Email
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addAction("add_crm_tag")}
                  disabled={formOptions.tags.length === 0}
                >
                  + Tag CRM
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addAction("webhook")}
                >
                  + Webhook
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Activer l&apos;automation</Label>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary-red hover:bg-primary-red-dark"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {automation ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
