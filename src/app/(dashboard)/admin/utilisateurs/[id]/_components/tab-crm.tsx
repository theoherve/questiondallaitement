"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Tag, Trash2, X } from "lucide-react";
import {
  adminAssignTag,
  adminRemoveTag,
  adminCreateNote,
  adminDeleteNote,
} from "../actions";

type TagData = {
  id: string;
  name: string;
  color: string | null;
  consultant_id: string;
};

type NoteData = {
  id: string;
  content: string;
  created_at: string;
  consultant: { first_name: string | null; last_name: string | null } | null;
};

type AvailableTag = {
  id: string;
  name: string;
  color: string | null;
};

type Props = {
  userId: string;
  tags: TagData[];
  notes: NoteData[];
  availableTags: AvailableTag[];
};

export const TabCrm = ({ userId, tags, notes, availableTags }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const assignedTagIds = new Set(tags.map((t) => t.id));
  const unassignedTags = availableTags.filter(
    (t) => !assignedTagIds.has(t.id),
  );

  const handleAssignTag = (tagId: string) => {
    startTransition(async () => {
      await adminAssignTag(userId, tagId);
      setShowTagPicker(false);
      router.refresh();
    });
  };

  const handleRemoveTag = (tagId: string, consultantId: string) => {
    startTransition(async () => {
      await adminRemoveTag(userId, tagId, consultantId);
      router.refresh();
    });
  };

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    startTransition(async () => {
      await adminCreateNote(userId, noteContent);
      setNoteContent("");
      router.refresh();
    });
  };

  const handleDeleteNote = (noteId: string) => {
    if (!confirm("Supprimer cette note ?")) return;
    startTransition(async () => {
      await adminDeleteNote(noteId, userId);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Tags */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-primary-green">
              <Tag className="h-4 w-4" />
              Tags ({tags.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTagPicker(!showTagPicker)}
              disabled={isPending}
            >
              <Plus className="mr-1 h-3 w-3" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showTagPicker && unassignedTags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2 rounded-md border border-dashed p-3">
              {unassignedTags.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleAssignTag(t.id)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors hover:bg-muted"
                >
                  {t.color && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                  )}
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {tags.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucun tag assigné.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Badge
                  key={`${t.id}-${t.consultant_id}`}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {t.color && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                  )}
                  {t.name}
                  <button
                    onClick={() => handleRemoveTag(t.id, t.consultant_id)}
                    disabled={isPending}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">
            Notes ({notes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Ajouter une note..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddNote();
                }
              }}
            />
            <Button
              onClick={handleAddNote}
              disabled={isPending || !noteContent.trim()}
              size="sm"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {notes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucune note.
            </p>
          ) : (
            <div className="space-y-3">
              {notes.map((n) => {
                const authorName = n.consultant
                  ? `${n.consultant.first_name ?? ""} ${n.consultant.last_name ?? ""}`.trim() ||
                    "Admin"
                  : "Admin";

                return (
                  <div
                    key={n.id}
                    className="group flex items-start gap-3 rounded-md border p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm">{n.content}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {authorName} ,{" "}
                        {new Date(n.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(n.id)}
                      disabled={isPending}
                      className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
