"use client";

import { useTransition } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleBookmark } from "../actions";

type BookmarkToggleProps = {
  enrollmentId?: string;
  blockId: string;
  isBookmarked: boolean;
  onToggle: (blockId: string, bookmarked: boolean) => void;
  readOnly?: boolean;
};

export const BookmarkToggle = ({
  enrollmentId,
  blockId,
  isBookmarked,
  onToggle,
  readOnly = false,
}: BookmarkToggleProps) => {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const next = !isBookmarked;
    onToggle(blockId, next);
    if (readOnly || !enrollmentId) return;
    startTransition(async () => {
      await toggleBookmark(enrollmentId, blockId, next);
    });
  };

  const Icon = isBookmarked ? BookmarkCheck : Bookmark;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending || readOnly}
      aria-pressed={isBookmarked}
      aria-label={isBookmarked ? "Retirer des favoris" : "Ajouter aux favoris"}
      tabIndex={0}
      className={cn(
        "inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border transition-all",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-red",
        "disabled:cursor-not-allowed disabled:opacity-60",
        isBookmarked
          ? "border-accent-honey bg-accent-honey-soft text-primary-red hover:bg-accent-honey/40"
          : "border-border bg-card text-muted-foreground hover:border-primary-red/40 hover:text-primary-red"
      )}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Icon
          className="h-4 w-4"
          fill={isBookmarked ? "currentColor" : "none"}
          aria-hidden
        />
      )}
    </button>
  );
};
