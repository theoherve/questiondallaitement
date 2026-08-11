"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { X, Loader2, Save } from "lucide-react";
import { updateConsultant } from "../actions";

type EditConsultantFormProps = {
  consultant: {
    id: string;
    slug: string;
    bio: string;
    specialties: string[];
    certifications: string[];
    languages: string[];
    career_start_year: number | null;
    service_area: string | null;
    commission_rate: number;
    is_active: boolean;
  };
};

type TagListInputProps = {
  id: string;
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
};

const TagListInput = ({
  id,
  label,
  placeholder,
  items,
  onChange,
}: TagListInputProps) => {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onChange([...items, trimmed]);
    setInputValue("");
  };

  const handleRemove = (item: string) => {
    onChange(items.filter((i) => i !== item));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={`Ajouter : ${label}`}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
        >
          Ajouter
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {items.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 pr-1">
              {item}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted"
                aria-label={`Retirer ${item}`}
                tabIndex={0}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export const EditConsultantForm = ({
  consultant,
}: EditConsultantFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [slug, setSlug] = useState(consultant.slug);
  const [bio, setBio] = useState(consultant.bio);
  const [specialties, setSpecialties] = useState<string[]>(
    consultant.specialties
  );
  const [certifications, setCertifications] = useState<string[]>(
    consultant.certifications
  );
  const [languages, setLanguages] = useState<string[]>(consultant.languages);
  const [careerStartYear, setCareerStartYear] = useState<string>(
    consultant.career_start_year?.toString() ?? ""
  );
  const [serviceArea, setServiceArea] = useState(
    consultant.service_area ?? ""
  );
  const [commissionRate, setCommissionRate] = useState(
    consultant.commission_rate
  );
  const [isActive, setIsActive] = useState(consultant.is_active);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateConsultant(consultant.id, {
        slug,
        bio: bio || undefined,
        specialties,
        certifications,
        languages,
        career_start_year: careerStartYear
          ? Number(careerStartYear)
          : undefined,
        service_area: serviceArea || undefined,
        commission_rate: commissionRate,
        is_active: isActive,
      });

      if (!result.success) {
        setError(result.error ?? "Erreur inconnue");
        return;
      }

      router.push(`/admin/consultantes/${consultant.id}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">
            Informations publiques
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL publique)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="marie-dupont"
              required
              aria-label="Slug de la consultante"
            />
            <p className="text-xs text-muted-foreground">
              URL : /consultantes/{slug || "..."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biographie</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Parcours, spécialités, approche..."
              rows={4}
              aria-label="Biographie de la consultante"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="career-start-year">
                Année de début de carrière
              </Label>
              <Input
                id="career-start-year"
                type="number"
                min={1950}
                max={new Date().getFullYear()}
                value={careerStartYear}
                onChange={(e) => setCareerStartYear(e.target.value)}
                placeholder="Ex: 2016"
                aria-label="Année de début de carrière"
              />
              <p className="text-xs text-muted-foreground">
                Sert à calculer l&apos;ancienneté affichée sur le profil
                public
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-area">Zone d&apos;intervention</Label>
              <Input
                id="service-area"
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
                placeholder="Ex: Île-de-France, 100% visio…"
                aria-label="Zone d'intervention"
              />
            </div>
          </div>

          <TagListInput
            id="specialties"
            label="Spécialités"
            placeholder="Ex: Allaitement maternel"
            items={specialties}
            onChange={setSpecialties}
          />

          <TagListInput
            id="certifications"
            label="Certifications / diplômes"
            placeholder="Ex: IBCLC, DE"
            items={certifications}
            onChange={setCertifications}
          />

          <TagListInput
            id="languages"
            label="Langues parlées"
            placeholder="Ex: Français"
            items={languages}
            onChange={setLanguages}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">
            Paramètres admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="commission">Taux de commission (%)</Label>
            <Input
              id="commission"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={commissionRate}
              onChange={(e) => setCommissionRate(Number(e.target.value))}
              aria-label="Taux de commission"
            />
            <p className="text-xs text-muted-foreground">
              Pourcentage prélevé sur les ventes de la consultante
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Consultante active</p>
              <p className="text-sm text-muted-foreground">
                Les consultantes inactives ne sont pas visibles publiquement
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              aria-label="Activer ou désactiver la consultante"
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/admin/consultantes/${consultant.id}`)}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={!slug || isPending}
          className="bg-primary-red hover:bg-primary-red-dark"
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Enregistrer
        </Button>
      </div>
    </form>
  );
};
