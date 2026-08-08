"use client";

import { useState } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  /**
   * Contenu de la fiche partagee, quand la session en a une.
   *
   * Sans lui, une session qui herite tout affiche quatre editeurs vides et
   * laisse croire que le contenu a disparu, alors qu'il s'affiche bien en
   * public.
   */
  inherited?: Partial<Record<FormationContentField, string | null>>;
  /** Lien vers la fiche a corriger : c'est la que la retouche profite a tous. */
  templateHref?: string;
  templateTitle?: string;
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

const isEmpty = (html: string | null | undefined): boolean =>
  !html || html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";

export const FormationContentFields = ({
  values,
  onChange,
  inherited,
  templateHref,
  templateTitle,
}: FormationContentFieldsProps) => {
  /**
   * L'editeur ne lit `initialContent` qu'au montage. Recopier l'heritage dans
   * l'etat ne suffirait donc pas a l'afficher : on change sa cle pour le
   * remonter avec la nouvelle valeur.
   */
  const [remounts, setRemounts] = useState<Record<string, number>>({});

  const takeOver = (field: FormationContentField, html: string) => {
    onChange(field, html);
    setRemounts((prev) => ({ ...prev, [field]: (prev[field] ?? 0) + 1 }));
  };

  return (
    <>
      {FIELDS.map(({ key, label, hint, placeholder }) => {
        const inheritedHtml = inherited?.[key];
        const showsInherited = isEmpty(values[key]) && !isEmpty(inheritedHtml);

        return (
          <div key={key} className="space-y-2">
            <Label>{label}</Label>
            <p className="text-xs text-muted-foreground">{hint}</p>

            {showsInherited && (
              <div className="space-y-2 rounded-md border border-dashed border-primary-green/40 bg-primary-green/5 p-3">
                <p className="text-xs text-muted-foreground">
                  Hérité de la fiche
                  {templateHref ? (
                    <>
                      {" "}
                      <Link
                        href={templateHref}
                        className="font-medium underline"
                      >
                        {templateTitle ?? "partagée"}
                      </Link>
                    </>
                  ) : (
                    " partagée"
                  )}
                  . C&apos;est ce texte qui s&apos;affiche en public tant que
                  cette section reste vide.
                </p>
                <div
                  className="prose prose-sm max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: inheritedHtml as string }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => takeOver(key, inheritedHtml as string)}
                >
                  Reprendre ce texte pour cette session
                </Button>
              </div>
            )}

            <WysiwygEditor
              key={`${key}-${remounts[key] ?? 0}`}
              initialContent={values[key]}
              onChange={(html) => onChange(key, html)}
              placeholder={
                showsInherited
                  ? "Laisser vide pour garder le texte de la fiche…"
                  : placeholder
              }
            />
          </div>
        );
      })}
    </>
  );
};
