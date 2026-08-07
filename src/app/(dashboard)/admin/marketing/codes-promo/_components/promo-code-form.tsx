"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, X } from "lucide-react";
import { createPromoCode, updatePromoCode } from "../actions";
import { TARGET_TYPE_LABELS, TRIGGER_TYPE_LABELS } from "./format";
import type { PromoDiscountType } from "@/types/database";

type Option = { id: string; title: string };

type TargetDraft = { target_type: string; target_id: string | null };
type TriggerDraft = { trigger_type: string; target_id: string | null };

type PromoCodeFormProps = {
  initial?: {
    id: string;
    code: string;
    label: string | null;
    discount_type: PromoDiscountType;
    discount_value: number;
    scope_all: boolean;
    valid_from: string | null;
    valid_until: string | null;
    max_redemptions: number | null;
    max_per_user: number;
    min_order_cents: number;
    trigger_delay_hours: number | null;
    is_active: boolean;
    targets: TargetDraft[];
    triggers: TriggerDraft[];
  };
  accompagnements: Option[];
  formations: Option[];
  consultationTypes: Option[];
};

/** Types de cible exigeant le choix d'un item precis. */
const ITEM_TARGET_TYPES = ["accompagnement", "formation", "booking_service"];

/** `datetime-local` ne comprend pas l'ISO complet avec fuseau. */
const toLocalInput = (iso: string | null): string =>
  iso ? new Date(iso).toISOString().slice(0, 16) : "";

const fromLocalInput = (value: string): string | null =>
  value ? new Date(value).toISOString() : null;

export const PromoCodeForm = ({
  initial,
  accompagnements,
  formations,
  consultationTypes,
}: PromoCodeFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState(initial?.code ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [discountType, setDiscountType] = useState<PromoDiscountType>(
    initial?.discount_type ?? "percent",
  );
  // Une remise fixe se saisit en euros et se stocke en centimes.
  const [discountValue, setDiscountValue] = useState(
    initial
      ? initial.discount_type === "percent"
        ? String(initial.discount_value)
        : String(initial.discount_value / 100)
      : "15",
  );
  const [scopeAll, setScopeAll] = useState(initial?.scope_all ?? true);
  const [targets, setTargets] = useState<TargetDraft[]>(initial?.targets ?? []);
  const [triggers, setTriggers] = useState<TriggerDraft[]>(
    initial?.triggers ?? [],
  );
  const [validFrom, setValidFrom] = useState(
    toLocalInput(initial?.valid_from ?? null),
  );
  const [validUntil, setValidUntil] = useState(
    toLocalInput(initial?.valid_until ?? null),
  );
  const [maxRedemptions, setMaxRedemptions] = useState(
    initial?.max_redemptions ? String(initial.max_redemptions) : "",
  );
  const [maxPerUser, setMaxPerUser] = useState(
    String(initial?.max_per_user ?? 1),
  );
  const [minOrderEuros, setMinOrderEuros] = useState(
    initial ? String(initial.min_order_cents / 100) : "0",
  );
  const [triggerDelay, setTriggerDelay] = useState(
    initial?.trigger_delay_hours ? String(initial.trigger_delay_hours) : "48",
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const [draftTargetType, setDraftTargetType] = useState("accompagnements_all");
  const [draftTargetId, setDraftTargetId] = useState("");
  const [draftTriggerType, setDraftTriggerType] = useState("formation_purchase");
  const [draftTriggerId, setDraftTriggerId] = useState("");

  const optionsFor = (targetType: string): Option[] => {
    if (targetType === "accompagnement") return accompagnements;
    if (targetType === "formation") return formations;
    if (targetType === "booking_service") return consultationTypes;
    return [];
  };

  const itemLabel = (target: TargetDraft): string => {
    if (!target.target_id) return TARGET_TYPE_LABELS[target.target_type] ?? "";
    const option = optionsFor(target.target_type).find(
      (o) => o.id === target.target_id,
    );
    return `${TARGET_TYPE_LABELS[target.target_type]} — ${option?.title ?? target.target_id}`;
  };

  const handleAddTarget = () => {
    const needsItem = ITEM_TARGET_TYPES.includes(draftTargetType);
    if (needsItem && !draftTargetId) return;
    setTargets([
      ...targets,
      {
        target_type: draftTargetType,
        target_id: needsItem ? draftTargetId : null,
      },
    ]);
    setDraftTargetId("");
  };

  const handleAddTrigger = () => {
    setTriggers([
      ...triggers,
      {
        trigger_type: draftTriggerType,
        target_id: draftTriggerId || null,
      },
    ]);
    setDraftTriggerId("");
  };

  const handleSubmit = () => {
    setError(null);

    const payload = {
      code: code.trim().toUpperCase(),
      label: label.trim() || null,
      discount_type: discountType,
      discount_value:
        discountType === "percent"
          ? Number(discountValue)
          : Math.round(Number(discountValue) * 100),
      scope_all: scopeAll,
      targets: scopeAll ? [] : targets,
      triggers,
      valid_from: fromLocalInput(validFrom),
      valid_until: fromLocalInput(validUntil),
      max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
      max_per_user: Number(maxPerUser),
      min_order_cents: Math.round(Number(minOrderEuros) * 100),
      trigger_delay_hours: triggers.length > 0 ? Number(triggerDelay) : null,
      is_active: isActive,
    };

    startTransition(async () => {
      const result = initial
        ? await updatePromoCode(initial.id, payload)
        : await createPromoCode(payload);

      if (!result.success) {
        setError(result.error ?? "L'enregistrement a échoué.");
        return;
      }

      router.push("/admin/marketing/codes-promo");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SUPERMAMAN"
              className="uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Note interne</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Campagne Instagram, réseau partenaire…"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Type de remise</Label>
            <Select
              value={discountType}
              onValueChange={(v) => setDiscountType(v as PromoDiscountType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Pourcentage</SelectItem>
                <SelectItem value="fixed_cents">Montant fixe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="discount-value">
              {discountType === "percent" ? "Remise (%)" : "Remise (€)"}
            </Label>
            <Input
              id="discount-value"
              type="number"
              min="0"
              step={discountType === "percent" ? "1" : "0.01"}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="scope-all">Tout le catalogue</Label>
              <p className="text-xs text-muted-foreground">
                Accompagnements, formations et rendez-vous.
              </p>
            </div>
            <Switch
              id="scope-all"
              checked={scopeAll}
              onCheckedChange={setScopeAll}
            />
          </div>

          {!scopeAll && (
            <div className="space-y-3 border-t pt-3">
              <div className="flex flex-wrap gap-2">
                {targets.map((target, index) => (
                  <span
                    key={`${target.target_type}-${target.target_id}-${index}`}
                    className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs"
                  >
                    {itemLabel(target)}
                    <button
                      type="button"
                      aria-label="Retirer la cible"
                      tabIndex={0}
                      onClick={() =>
                        setTargets(targets.filter((_, i) => i !== index))
                      }
                      className="cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-2">
                  <Label>Type de cible</Label>
                  <Select
                    value={draftTargetType}
                    onValueChange={(v) => {
                      setDraftTargetType(v);
                      setDraftTargetId("");
                    }}
                  >
                    <SelectTrigger className="w-[240px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TARGET_TYPE_LABELS).map(([value, text]) => (
                        <SelectItem key={value} value={value}>
                          {text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {ITEM_TARGET_TYPES.includes(draftTargetType) && (
                  <div className="space-y-2">
                    <Label>Élément</Label>
                    <Select value={draftTargetId} onValueChange={setDraftTargetId}>
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Choisir…" />
                      </SelectTrigger>
                      <SelectContent>
                        {optionsFor(draftTargetType).map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button type="button" variant="outline" onClick={handleAddTarget}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="valid-from">Début de validité</Label>
            <Input
              id="valid-from"
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valid-until">Fin de validité</Label>
            <Input
              id="valid-until"
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="max-redemptions">Quota global</Label>
            <Input
              id="max-redemptions"
              type="number"
              min="1"
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              placeholder="illimité"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-per-user">Par cliente</Label>
            <Input
              id="max-per-user"
              type="number"
              min="1"
              value={maxPerUser}
              onChange={(e) => setMaxPerUser(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-order">Montant minimum (€)</Label>
            <Input
              id="min-order"
              type="number"
              min="0"
              step="0.01"
              value={minOrderEuros}
              onChange={(e) => setMinOrderEuros(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <Label>Déclencheur</Label>
            <p className="text-xs text-muted-foreground">
              Le code n&apos;est valable que dans les heures qui suivent un achat
              correspondant. Laisser vide pour un code sans condition.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {triggers.map((trigger, index) => (
              <span
                key={`${trigger.trigger_type}-${trigger.target_id}-${index}`}
                className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs"
              >
                {TRIGGER_TYPE_LABELS[trigger.trigger_type]}
                {trigger.target_id ? " (élément précis)" : " (n'importe lequel)"}
                <button
                  type="button"
                  aria-label="Retirer le déclencheur"
                  tabIndex={0}
                  onClick={() =>
                    setTriggers(triggers.filter((_, i) => i !== index))
                  }
                  className="cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-2">
              <Label>Achat déclencheur</Label>
              <Select
                value={draftTriggerType}
                onValueChange={(v) => {
                  setDraftTriggerType(v);
                  setDraftTriggerId("");
                }}
              >
                <SelectTrigger className="w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_TYPE_LABELS).map(([value, text]) => (
                    <SelectItem key={value} value={value}>
                      {text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Élément (facultatif)</Label>
              <Select value={draftTriggerId} onValueChange={setDraftTriggerId}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="N'importe lequel" />
                </SelectTrigger>
                <SelectContent>
                  {(draftTriggerType === "formation_purchase"
                    ? formations
                    : accompagnements
                  ).map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="button" variant="outline" onClick={handleAddTrigger}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          </div>

          {triggers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="trigger-delay">Délai (heures)</Label>
              <Input
                id="trigger-delay"
                type="number"
                min="1"
                value={triggerDelay}
                onChange={(e) => setTriggerDelay(e.target.value)}
                className="w-[140px]"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label htmlFor="is-active">Code actif</Label>
            <p className="text-xs text-muted-foreground">
              Un code inactif est refusé, sans message particulier pour la
              cliente.
            </p>
          </div>
          <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initial ? "Enregistrer" : "Créer le code"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/marketing/codes-promo")}
          >
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
