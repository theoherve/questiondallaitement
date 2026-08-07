"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveSurvey } from "../actions";
import type { AdminSurvey } from "../actions";
import type { SurveyChoice } from "@/lib/surveys/types";

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

type QuestionDraft = {
  id?: string;
  kind: "matrix" | "single";
  label: string;
  rows: SurveyChoice[];
  choices: SurveyChoice[];
  is_required: boolean;
  is_segment: boolean;
  is_charted: boolean;
};

type Draft = {
  id?: string;
  slug: string;
  title: string;
  intro: string;
  status: "draft" | "published" | "closed";
  thank_you_message: string;
  questions: QuestionDraft[];
};

const emptyQuestion = (): QuestionDraft => ({
  kind: "single",
  label: "",
  rows: [],
  choices: [
    { key: "", label: "" },
    { key: "", label: "" },
  ],
  is_required: false,
  is_segment: false,
  is_charted: false,
});

const toDraft = (survey: AdminSurvey | null): Draft =>
  survey
    ? {
        id: survey.id,
        slug: survey.slug,
        title: survey.title,
        intro: survey.intro ?? "",
        status: survey.status,
        thank_you_message: survey.thank_you_message,
        questions: survey.survey_questions.map((question) => ({
          id: question.id,
          kind: question.kind,
          label: question.label,
          rows: question.rows,
          choices: question.choices,
          is_required: question.is_required,
          is_segment: question.is_segment,
          is_charted: question.is_charted,
        })),
      }
    : {
        slug: "",
        title: "",
        intro: "",
        status: "draft",
        thank_you_message: "",
        questions: [emptyQuestion()],
      };

export const SurveyBuilder = ({ survey }: { survey: AdminSurvey | null }) => {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(survey));
  const [pending, setPending] = useState(false);

  const patchQuestion = (index: number, patch: Partial<QuestionDraft>) =>
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, position) =>
        position === index ? { ...question, ...patch } : question,
      ),
    }));

  const patchEntry = (
    index: number,
    field: "rows" | "choices",
    entryIndex: number,
    patch: Partial<SurveyChoice>,
  ) =>
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, position) => {
        if (position !== index) return question;
        return {
          ...question,
          [field]: question[field].map((entry, i) =>
            i === entryIndex ? { ...entry, ...patch } : entry,
          ),
        };
      }),
    }));

  const submit = async () => {
    setPending(true);

    // Les clés vides sont dérivées du libellé au dernier moment : l'admin
    // n'a pas à les saisir, mais une clé stable doit exister avant l'envoi.
    const payload = {
      ...draft,
      intro: draft.intro || undefined,
      questions: draft.questions.map((question) => ({
        ...question,
        rows: question.rows.map((row) => ({
          key: row.key || slugify(row.label),
          label: row.label,
        })),
        choices: question.choices.map((choice) => ({
          key: choice.key || slugify(choice.label),
          label: choice.label,
        })),
      })),
    };

    const result = await saveSurvey(payload);
    setPending(false);

    if (!result.success) {
      toast.error(result.error ?? "Enregistrement impossible");
      return;
    }

    toast.success("Sondage enregistré");
    router.push("/admin/sondages");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-primary-green">
          {survey ? "Modifier le sondage" : "Nouveau sondage"}
        </h1>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Le sondage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="survey-title">Titre</Label>
              <Input
                id="survey-title"
                value={draft.title}
                onChange={(formation) =>
                  setDraft((current) => ({
                    ...current,
                    title: formation.target.value,
                    // Le slug suit le titre tant que le sondage n'existe pas.
                    // Une fois créé, il est figé : il est écrit dans le HTML
                    // des articles qui embarquent le sondage.
                    slug: current.id ? current.slug : slugify(formation.target.value),
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="survey-slug">Slug</Label>
              <Input
                id="survey-slug"
                value={draft.slug}
                readOnly={Boolean(draft.id)}
                onChange={(formation) =>
                  setDraft((current) => ({
                    ...current,
                    slug: slugify(formation.target.value),
                  }))
                }
              />
              {draft.id && (
                <p className="mt-1 text-xs text-primary-green/60">
                  Figé : les articles qui embarquent ce sondage le désignent par
                  son slug.
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="survey-intro">Introduction</Label>
            <Textarea
              id="survey-intro"
              value={draft.intro}
              rows={3}
              onChange={(formation) =>
                setDraft((current) => ({ ...current, intro: formation.target.value }))
              }
            />
          </div>

          <div>
            <Label htmlFor="survey-thanks">Message de remerciement</Label>
            <Textarea
              id="survey-thanks"
              value={draft.thank_you_message}
              rows={3}
              onChange={(formation) =>
                setDraft((current) => ({
                  ...current,
                  thank_you_message: formation.target.value,
                }))
              }
            />
          </div>

          <div>
            <Label htmlFor="survey-status">Statut</Label>
            <select
              id="survey-status"
              className="mt-1 block rounded border border-primary-green/20 px-2 py-1.5 text-sm"
              value={draft.status}
              onChange={(formation) =>
                setDraft((current) => ({
                  ...current,
                  status: formation.target.value as Draft["status"],
                }))
              }
            >
              <option value="draft">Brouillon — invisible du public</option>
              <option value="published">Publié — répond et affiche</option>
              <option value="closed">
                Clôturé — graphique seul, plus de réponses
              </option>
            </select>
          </div>
        </CardContent>
      </Card>

      {draft.questions.map((question, index) => (
        <Card key={question.id ?? `nouvelle-${index}`}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Question {index + 1}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  questions: current.questions.filter((_, i) => i !== index),
                }))
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor={`question-${index}-label`}>Intitulé</Label>
              <Input
                id={`question-${index}-label`}
                value={question.label}
                onChange={(formation) =>
                  patchQuestion(index, { label: formation.target.value })
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <select
                className="rounded border border-primary-green/20 px-2 py-1.5 text-sm"
                value={question.kind}
                onChange={(formation) =>
                  patchQuestion(index, {
                    kind: formation.target.value as QuestionDraft["kind"],
                  })
                }
              >
                <option value="single">Choix unique</option>
                <option value="matrix">Matrice (une ligne par item)</option>
              </select>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={question.is_required}
                  onCheckedChange={(value) =>
                    patchQuestion(index, { is_required: value === true })
                  }
                />
                Obligatoire
              </label>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={question.is_segment}
                  onCheckedChange={(value) =>
                    patchQuestion(index, { is_segment: value === true })
                  }
                />
                Segment marketing
              </label>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={question.is_charted}
                  onCheckedChange={(value) =>
                    patchQuestion(index, { is_charted: value === true })
                  }
                />
                Alimente le graphique
              </label>
            </div>

            {question.kind === "matrix" && (
              <EntryList
                title="Lignes"
                entries={question.rows}
                locked={Boolean(question.id)}
                onChange={(entryIndex, patch) =>
                  patchEntry(index, "rows", entryIndex, patch)
                }
                onAdd={() =>
                  patchQuestion(index, {
                    rows: [...question.rows, { key: "", label: "" }],
                  })
                }
                onRemove={(entryIndex) =>
                  patchQuestion(index, {
                    rows: question.rows.filter((_, i) => i !== entryIndex),
                  })
                }
              />
            )}

            <EntryList
              title="Options de réponse"
              entries={question.choices}
              locked={Boolean(question.id)}
              onChange={(entryIndex, patch) =>
                patchEntry(index, "choices", entryIndex, patch)
              }
              onAdd={() =>
                patchQuestion(index, {
                  choices: [...question.choices, { key: "", label: "" }],
                })
              }
              onRemove={(entryIndex) =>
                patchQuestion(index, {
                  choices: question.choices.filter((_, i) => i !== entryIndex),
                })
              }
            />
          </CardContent>
        </Card>
      ))}

      <Button
        variant="outline"
        onClick={() =>
          setDraft((current) => ({
            ...current,
            questions: [...current.questions, emptyQuestion()],
          }))
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Ajouter une question
      </Button>
    </div>
  );
};

/**
 * Liste de lignes ou d'options.
 *
 * Les clés sont affichées en lecture seule dès que la question existe en base :
 * elles sont recopiées dans chaque réponse déjà collectée, et les renommer
 * couperait l'historique en deux jeux qui ne s'additionnent plus.
 */
const EntryList = ({
  title,
  entries,
  locked,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  entries: SurveyChoice[];
  locked: boolean;
  onChange: (index: number, patch: Partial<SurveyChoice>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) => (
  <div className="space-y-2">
    <p className="text-sm font-medium text-primary-green">{title}</p>
    {entries.map((entry, index) => (
      <div key={index} className="flex items-center gap-2">
        <Input
          value={entry.label}
          placeholder="Libellé affiché"
          onChange={(formation) => onChange(index, { label: formation.target.value })}
        />
        <Input
          value={entry.key}
          placeholder="clé (auto)"
          readOnly={locked && Boolean(entry.key)}
          className="max-w-48 font-mono text-xs"
          onChange={(formation) => onChange(index, { key: formation.target.value })}
        />
        <Button variant="ghost" size="sm" onClick={() => onRemove(index)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ))}
    <Button variant="outline" size="sm" onClick={onAdd}>
      <Plus className="mr-2 h-3 w-3" />
      Ajouter
    </Button>
  </div>
);
