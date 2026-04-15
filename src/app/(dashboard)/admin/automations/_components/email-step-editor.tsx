"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WysiwygEditor } from "@/components/editor/wysiwyg-editor";
import { WORKFLOW_EMAIL_VARIABLES } from "@/lib/admin-workflows/types";

type Props = {
  subject: string;
  bodyHtml: string;
  emailTemplates: {
    id: string;
    name: string;
    subject: string;
    body_html: string;
  }[];
  onSubjectChange: (subject: string) => void;
  onBodyChange: (bodyHtml: string) => void;
  onLoadTemplate: (template: {
    id: string;
    subject: string;
    body_html: string;
  }) => void;
};

export const EmailStepEditor = ({
  subject,
  bodyHtml,
  emailTemplates,
  onSubjectChange,
  onBodyChange,
  onLoadTemplate,
}: Props) => {
  const [showTemplates, setShowTemplates] = useState(false);

  const insertVariable = (variable: string) => {
    // Insert into subject at cursor (simplified: append)
    onSubjectChange(subject + `{{${variable}}}`);
  };

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
            <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded border p-2">
              {emailTemplates.map((t) => (
                <button
                  key={t.id}
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

      {/* Variables */}
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Variables disponibles
        </label>
        <div className="flex flex-wrap gap-1">
          {WORKFLOW_EMAIL_VARIABLES.map((v) => (
            <Badge
              key={v}
              variant="outline"
              className="cursor-pointer font-mono text-xs hover:bg-muted"
              onClick={() => insertVariable(v)}
            >
              {`{{${v}}}`}
            </Badge>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="mb-1 block text-sm font-medium">Objet</label>
        <Input
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="Rappel - {{event_title}}"
        />
      </div>

      {/* Body */}
      <div>
        <label className="mb-1 block text-sm font-medium">Contenu</label>
        <div className="min-h-[200px] rounded-md border">
          <WysiwygEditor
            initialContent={bodyHtml}
            onChange={onBodyChange}
            placeholder="Rédigez le contenu de l'email..."
          />
        </div>
      </div>
    </div>
  );
};
