"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Loader2, X, Check } from "lucide-react";
import { createNote, updateNote, deleteNote } from "../actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Note = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export const NotesEditor = ({
  clientId,
  notes,
}: {
  clientId: string;
  notes: Note[];
}) => {
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    if (!newContent.trim()) return;
    startTransition(async () => {
      const result = await createNote({
        content: newContent.trim(),
        client_id: clientId,
      });
      if (result.success) {
        toast.success("Note ajoutée");
        setNewContent("");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleUpdate = (noteId: string) => {
    if (!editContent.trim()) return;
    startTransition(async () => {
      const result = await updateNote(noteId, editContent.trim());
      if (result.success) {
        toast.success("Note modifiée");
        setEditingId(null);
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = (noteId: string) => {
    startTransition(async () => {
      const result = await deleteNote(noteId);
      if (result.success) {
        toast.success("Note supprimée");
      } else {
        toast.error(result.error);
      }
    });
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  return (
    <div className="space-y-4">
      {/* Create new note */}
      <div className="space-y-2">
        <Textarea
          placeholder="Ajouter une note privée…"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          className="min-h-20"
        />
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={isPending || !newContent.trim()}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Ajouter
        </Button>
      </div>

      {/* Notes list */}
      {notes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucune note pour ce contact.
        </p>
      )}

      <div className="space-y-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className="rounded-md border p-3"
          >
            {editingId === note.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-20"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUpdate(note.id)}
                    disabled={isPending || !editContent.trim()}
                  >
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Enregistrer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(note.created_at), "d MMM yyyy 'à' HH:mm", {
                      locale: fr,
                    })}
                    {note.updated_at !== note.created_at && " (modifiée)"}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => startEdit(note)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(note.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
