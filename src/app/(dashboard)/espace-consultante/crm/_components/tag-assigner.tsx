"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2 } from "lucide-react";
import { assignTag, removeTag } from "../actions";
import { toast } from "sonner";

type Tag = { id: string; name: string; color: string | null };

export const TagAssigner = ({
  clientId,
  assignedTags,
  allTags,
}: {
  clientId: string;
  assignedTags: Tag[];
  allTags: Tag[];
}) => {
  const [isPending, startTransition] = useTransition();

  const assignedIds = new Set(assignedTags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !assignedIds.has(t.id));

  const handleAssign = (tagId: string) => {
    startTransition(async () => {
      const result = await assignTag(clientId, tagId);
      if (result.success) {
        toast.success("Tag ajouté");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleRemove = (tagId: string) => {
    startTransition(async () => {
      const result = await removeTag(clientId, tagId);
      if (result.success) {
        toast.success("Tag retiré");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Assigned tags */}
      <div className="flex flex-wrap gap-2">
        {assignedTags.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun tag assigné.</p>
        )}
        {assignedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className="gap-1 pr-1"
            style={
              tag.color
                ? { borderColor: tag.color, color: tag.color }
                : undefined
            }
          >
            {tag.name}
            <button
              onClick={() => handleRemove(tag.id)}
              disabled={isPending}
              className="ml-1 rounded-sm p-0.5 hover:bg-muted"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <X className="h-3 w-3" />
              )}
            </button>
          </Badge>
        ))}
      </div>

      {/* Available tags to add */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="mr-1 text-xs text-muted-foreground self-center">
            Ajouter :
          </span>
          {availableTags.map((tag) => (
            <Button
              key={tag.id}
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs"
              onClick={() => handleAssign(tag.id)}
              disabled={isPending}
            >
              <Plus className="h-3 w-3" />
              <span
                style={tag.color ? { color: tag.color } : undefined}
              >
                {tag.name}
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};
