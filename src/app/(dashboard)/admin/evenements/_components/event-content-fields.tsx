"use client";

import { Label } from "@/components/ui/label";
import { WysiwygEditor } from "@/components/editor/wysiwyg-editor";

/**
 * Les deux champs riches vivent hors d'`event-form` : l'editeur n'est pas
 * controle (`initialContent` une fois, puis `onChange`) alors que le
 * formulaire l'est entierement. Isoler le pont entre les deux modeles evite
 * de le disperser dans un fichier deja tres long.
 */
export type EventContentFieldsProps = {
  summaryHtml: string;
  longDescription: string;
  onChange: (field: "summary_html" | "long_description", html: string) => void;
};

export const EventContentFields = ({
  summaryHtml,
  longDescription,
  onChange,
}: EventContentFieldsProps) => (
  <>
    <div className="space-y-2">
      <Label>Résumé</Label>
      <p className="text-xs text-muted-foreground">
        Affiché dans le bandeau d’en-tête, sous la description. Restez bref :
        quelques lignes ou une courte liste.
      </p>
      <WysiwygEditor
        initialContent={summaryHtml}
        onChange={(html) => onChange("summary_html", html)}
        placeholder="Ce que la participante retient en 30 secondes…"
      />
    </div>

    <div className="space-y-2">
      <Label>À propos de cette formation</Label>
      <p className="text-xs text-muted-foreground">
        Le texte long affiché au milieu de la page publique.
      </p>
      <WysiwygEditor
        initialContent={longDescription}
        onChange={(html) => onChange("long_description", html)}
        placeholder="Programme, objectifs, public visé…"
      />
    </div>
  </>
);
