"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmailBlockEditor } from "@/components/editor/email-block-editor";
import { WORKFLOW_EMAIL_VARIABLES } from "@/lib/admin-workflows/types";
import type { JSONContent } from "@maily-to/render";

type Props = {
  subject: string;
  bodyHtml: string;
  bodyDesign: Record<string, unknown> | null;
  emailTemplates: {
    id: string;
    name: string;
    subject: string;
    body_html: string;
    body_design: Record<string, unknown> | null;
  }[];
  onSubjectChange: (subject: string) => void;
  onBodyChange: (bodyDesign: Record<string, unknown>) => void;
  onLoadTemplate: (template: {
    id: string;
    subject: string;
    body_html: string;
    body_design: Record<string, unknown> | null;
  }) => void;
};

export const EmailStepEditor = ({
  subject,
  bodyDesign,
  emailTemplates,
  onSubjectChange,
  onBodyChange,
  onLoadTemplate,
}: Props) => {
  const [showTemplates, setShowTemplates] = useState(false);

  return (
    <div className="space-y-3">
      {/* Template loader */}
      {emailTemplates.length > 0 && (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            {showTemplates ? "Masquer templates" : "Charger un template"}
          </Button>
          {showTemplates && (
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded border p-2">
              {emailTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onLoadTemplate(t);
                    setShowTemplates(false);
                  }}
                  className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subject */}
      <div>
        <label className="mb-1 block text-sm font-medium">Objet</label>
        <Input
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="Rappel - {{formation_title}}"
        />
      </div>

      {/* Body — block editor */}
      <div>
        <label className="mb-1 block text-sm font-medium">Contenu</label>
        <EmailBlockEditor
          initialDesign={(bodyDesign as JSONContent | null) ?? undefined}
          onChange={(design) => onBodyChange(design as Record<string, unknown>)}
          variables={WORKFLOW_EMAIL_VARIABLES}
          uploadFolder="workflow-steps"
          previewSubject={subject}
        />
      </div>
    </div>
  );
};
