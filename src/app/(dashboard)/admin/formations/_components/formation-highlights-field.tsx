"use client";

import { FORMATION_HIGHLIGHTS } from "@/config/formation-highlights";

export type FormationHighlightsFieldProps = {
  value: string[];
  onChange: (keys: string[]) => void;
};

/**
 * Choix des reperes affiches sur la fiche publique.
 *
 * Cases a cocher et non liste a glisser : l'ordre d'affichage vient du
 * catalogue, pas de la saisie, pour que deux formations qui cochent les memes
 * reperes les presentent dans la meme sequence.
 */
export const FormationHighlightsField = ({
  value,
  onChange,
}: FormationHighlightsFieldProps) => {
  const toggle = (key: string) =>
    onChange(
      value.includes(key)
        ? value.filter((k) => k !== key)
        : [...value, key],
    );

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {FORMATION_HIGHLIGHTS.map(({ key, label, icon: Icon }) => (
          <label
            key={key}
            className="flex cursor-pointer items-center gap-3 rounded-md border border-input p-3 text-sm hover:bg-muted/50"
          >
            <input
              type="checkbox"
              checked={value.includes(key)}
              onChange={() => toggle(key)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Icon className="h-4 w-4 shrink-0 text-primary-red" />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Affichés en bandeau sous le titre, dans l&apos;ordre ci-dessus. Aucun
        repère coché : le bandeau disparaît de la fiche.
      </p>
    </div>
  );
};
