"use client";

import { Label } from "@/components/ui/label";
import { WysiwygEditor } from "@/components/editor/wysiwyg-editor";

/**
 * Les sections editoriales vivent hors d'`formation-form` : l'editeur n'est pas
 * controle (`initialContent` une fois, puis `onChange`) alors que le
 * formulaire l'est entierement. Isoler le pont entre les deux modeles evite
 * de le disperser dans un fichier deja tres long.
 */
export type FormationContentField =
  | "summary_html"
  | "objectives_html"
  | "program_html"
  | "audience_html";

export type FormationContentFieldsProps = {
  values: Record<FormationContentField, string>;
  onChange: (field: FormationContentField, html: string) => void;
};

/**
 * L'ordre de ce tableau est celui du formulaire ET celui de la page publique.
 * Les conseils de saisie ne sont pas decoratifs : le rendu public donne une
 * forme differente a chaque section, et cette forme depend du balisage saisi
 * (liste a puces pour les objectifs, liste numerotee pour le programme).
 */
const FIELDS: Array<{
  key: FormationContentField;
  label: string;
  hint: string;
  placeholder: string;
}> = [
  {
    key: "summary_html",
    label: "Résumé",
    hint: "Affiché dans le bandeau d’en-tête, sous la description. Restez bref : quelques lignes ou une courte liste.",
    placeholder: "Ce que la participante retient en 30 secondes…",
  },
  {
    key: "objectives_html",
    label: "Objectifs pédagogiques",
    hint: "Saisissez une liste à puces : chaque puce devient un objectif coché sur la page publique.",
    placeholder: "Repérer une prise du sein inefficace…",
  },
  {
    key: "program_html",
    label: "Programme",
    hint: "Saisissez une liste numérotée : chaque élément devient une étape du fil du programme.",
    placeholder: "Module 1, Anatomie et physiologie de la lactation…",
  },
  {
    key: "audience_html",
    label: "À qui s’adresse cette formation",
    hint: "Quelques lignes ou une liste courte. Affiché dans un encadré en fin de page.",
    placeholder: "Sages-femmes, puéricultrices, consultantes en lactation…",
  },
];

export const FormationContentFields = ({
  values,
  onChange,
}: FormationContentFieldsProps) => (
  <>
    {FIELDS.map(({ key, label, hint, placeholder }) => (
      <div key={key} className="space-y-2">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
        <WysiwygEditor
          initialContent={values[key]}
          onChange={(html) => onChange(key, html)}
          placeholder={placeholder}
        />
      </div>
    ))}
  </>
);
