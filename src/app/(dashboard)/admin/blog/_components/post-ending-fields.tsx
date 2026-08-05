"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { WysiwygEditor } from "@/components/editor/wysiwyg-editor";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

/** Article proposable comme suggestion épinglée. */
export type PinnablePost = {
  id: string;
  title: string;
};

type Props = {
  conclusionTitle: string;
  conclusionText: string;
  referencesHtml: string;
  relatedPostIds: string[];
  /** Articles publiés, l'article en cours d'édition exclu. */
  pinnablePosts: PinnablePost[];
  onChange: (
    patch: Partial<{
      conclusion_title: string;
      conclusion_text: string;
      references_html: string;
      related_post_ids: string[];
    }>,
  ) => void;
  fieldError: (field: string) => React.ReactNode;
};

export const MAX_PINNED_POSTS = 3;

/**
 * Champs de fin d'article : rappel, sources et suggestions épinglées.
 *
 * Extraits du formulaire principal — celui-ci portait déjà trois onglets et
 * cinq cents lignes, y ajouter trois blocs l'aurait rendu difficile à relire.
 */
export const PostEndingFields = ({
  conclusionTitle,
  conclusionText,
  referencesHtml,
  relatedPostIds,
  pinnablePosts,
  onChange,
  fieldError,
}: Props) => {
  const [pickerValue, setPickerValue] = useState("");

  const byId = useMemo(
    () => new Map(pinnablePosts.map((p) => [p.id, p])),
    [pinnablePosts],
  );

  const available = pinnablePosts.filter((p) => !relatedPostIds.includes(p.id));
  const isFull = relatedPostIds.length >= MAX_PINNED_POSTS;

  const setIds = (ids: string[]) => onChange({ related_post_ids: ids });

  const addPinned = () => {
    if (!pickerValue || isFull || relatedPostIds.includes(pickerValue)) return;
    setIds([...relatedPostIds, pickerValue]);
    setPickerValue("");
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= relatedPostIds.length) return;
    const next = [...relatedPostIds];
    [next[index], next[target]] = [next[target], next[index]];
    setIds(next);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Encadré de conclusion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Un rappel de ce qu&apos;il faut retenir de l&apos;article, affiché
            dans un encadré juste avant l&apos;invitation à s&apos;abonner à la
            newsletter. Laissez le texte vide pour ne pas afficher
            l&apos;encadré.
          </p>

          <div className="space-y-2">
            <Label htmlFor="conclusion_title">Titre de l&apos;encadré</Label>
            <Input
              id="conclusion_title"
              value={conclusionTitle}
              onChange={(e) => onChange({ conclusion_title: e.target.value })}
              placeholder="À retenir"
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">
              Vide : « À retenir » est utilisé.
            </p>
            {fieldError("conclusion_title")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="conclusion_text">Texte de l&apos;encadré</Label>
            <Textarea
              id="conclusion_text"
              value={conclusionText}
              onChange={(e) => onChange({ conclusion_text: e.target.value })}
              placeholder="Ce que cet article vous a apporté, en deux ou trois phrases…"
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Texte simple : les sauts de ligne sont respectés, pas de mise en
              forme.
            </p>
            {fieldError("conclusion_text")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Références et sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Listées en bas de l&apos;article. Les liens externes s&apos;ouvrent
            dans un nouvel onglet. Laissez vide pour ne pas afficher la section.
          </p>
          <WysiwygEditor
            initialContent={referencesHtml}
            onChange={(html) => onChange({ references_html: html })}
            placeholder="OMS, Recommandations sur l'allaitement, 2023…"
            className="min-h-60"
          />
          {fieldError("references_html")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Articles suggérés</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Épinglez jusqu&apos;à {MAX_PINNED_POSTS} articles à afficher en
            premier dans la colonne « Sur le même sujet ». Les emplacements
            restants sont complétés automatiquement : même catégorie, tags en
            commun, puis articles récents.
          </p>

          {relatedPostIds.length > 0 && (
            <ol className="space-y-2">
              {relatedPostIds.map((id, index) => (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-md border border-input px-3 py-2"
                >
                  <span className="text-sm text-muted-foreground">
                    {index + 1}.
                  </span>
                  <span className="flex-1 truncate text-sm">
                    {byId.get(id)?.title ?? "Article introuvable"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Monter « ${byId.get(id)?.title ?? id} »`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => move(index, 1)}
                    disabled={index === relatedPostIds.length - 1}
                    aria-label={`Descendre « ${byId.get(id)?.title ?? id} »`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIds(relatedPostIds.filter((v) => v !== id))}
                    aria-label={`Retirer « ${byId.get(id)?.title ?? id} »`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ol>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="related_post_ids">Ajouter un article</Label>
              <select
                id="related_post_ids"
                value={pickerValue}
                onChange={(e) => setPickerValue(e.target.value)}
                disabled={isFull || available.length === 0}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">
                  {available.length === 0
                    ? "Aucun autre article publié"
                    : "Choisir un article…"}
                </option>
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addPinned}
              disabled={!pickerValue || isFull}
            >
              <Plus className="mr-2 h-4 w-4" />
              Épingler
            </Button>
          </div>

          {isFull && (
            <p className="text-xs text-muted-foreground">
              Maximum atteint : retirez un article pour en épingler un autre.
            </p>
          )}
          {fieldError("related_post_ids")}
        </CardContent>
      </Card>
    </>
  );
};
