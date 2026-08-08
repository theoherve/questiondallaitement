"use client";

import { useEffect, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { BarChart3 } from "lucide-react";

type SurveyOption = { id: string; slug: string; title: string; status: string };

/**
 * Vue d'édition du bloc sondage.
 *
 * Le nœud ne stocke qu'un slug et un mode : la définition du sondage reste en
 * base. Un article publié suit donc les modifications du sondage, et le même
 * sondage peut être embarqué dans plusieurs articles sans duplication.
 */
const SurveyEmbedView = ({ node, updateAttributes }: NodeViewProps) => {
  const [surveys, setSurveys] = useState<SurveyOption[]>([]);
  const slug = node.attrs.slug as string;
  const mode = node.attrs.mode as "form" | "chart";

  useEffect(() => {
    fetch("/api/admin/sondages")
      .then((response) => (response.ok ? response.json() : { surveys: [] }))
      .then((data) => setSurveys(data.surveys ?? []))
      .catch(() => setSurveys([]));
  }, []);

  return (
    <NodeViewWrapper className="not-prose my-4">
      <div className="rounded-lg border-2 border-dashed border-primary-red/30 bg-primary-red/5 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary-red-dark">
          <BarChart3 className="h-4 w-4" />
          Sondage
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className="rounded border border-primary-green/20 px-2 py-1 text-sm"
            value={slug}
            onChange={(event) => updateAttributes({ slug: event.target.value })}
          >
            <option value="">, Choisir un sondage ,</option>
            {surveys.map((survey) => (
              <option key={survey.id} value={survey.slug}>
                {survey.title}
                {survey.status !== "published" ? ` (${survey.status})` : ""}
              </option>
            ))}
          </select>

          <select
            className="rounded border border-primary-green/20 px-2 py-1 text-sm"
            value={mode}
            onChange={(event) => updateAttributes({ mode: event.target.value })}
          >
            <option value="form">Formulaire + résultat</option>
            <option value="chart">Graphique seul</option>
          </select>
        </div>

        {!slug && (
          <p className="mt-2 text-xs text-primary-red">
            Aucun sondage sélectionné : ce bloc ne s&apos;affichera pas dans
            l&apos;article.
          </p>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const SurveyEmbedNode = Node.create({
  name: "surveyEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      slug: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-survey-slug") ?? "",
        renderHTML: (attrs) => ({ "data-survey-slug": attrs.slug as string }),
      },
      mode: {
        default: "form",
        parseHTML: (el) => el.getAttribute("data-survey-mode") ?? "form",
        renderHTML: (attrs) => ({ "data-survey-mode": attrs.mode as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-survey-embed]" }];
  },

  // Balise vide et auto-suffisante : c'est ce qui permet à `splitSurveyEmbeds`
  // de la retrouver par expression régulière côté rendu.
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-survey-embed": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SurveyEmbedView);
  },
});
