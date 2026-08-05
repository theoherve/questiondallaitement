"use client";

import { useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { BookmarkPlus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATALOG, type SidebarItem } from "./block-catalog";
import { toast } from "sonner";


// ─── Snippets (Phase 4) ─────────────────────────────────────────────────────
export type SnippetItem = {
  id: string;
  name: string;
  html: string;
  category?: string | null;
};

// ─── Component ──────────────────────────────────────────────────────────────
type WysiwygSidebarProps = {
  editor: Editor | null;
  snippets?: SnippetItem[];
  onSaveSnippet?: (html: string) => void;
  className?: string;
};

export const WysiwygSidebar = ({
  editor,
  snippets = [],
  onSaveSnippet,
  className,
}: WysiwygSidebarProps) => {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    if (!query.trim()) return CATALOG;
    const q = query.trim().toLowerCase();
    return CATALOG.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (it) =>
          it.label.toLowerCase().includes(q) ||
          it.keywords.some((k) => k.toLowerCase().includes(q))
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [query]);

  const filteredSnippets = useMemo(() => {
    if (!query.trim()) return snippets;
    const q = query.trim().toLowerCase();
    return snippets.filter((s) =>
      s.name.toLowerCase().includes(q)
    );
  }, [query, snippets]);

  const handleInsert = (item: SidebarItem) => {
    if (!editor) return;
    item.insert(editor);
  };

  const handleInsertSnippet = (snip: SnippetItem) => {
    if (!editor) return;
    editor.chain().focus().insertContent(snip.html).run();
  };

  const handleSaveSelection = () => {
    if (!editor || !onSaveSnippet) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      toast.error("Sélectionnez du contenu à sauvegarder");
      return;
    }
    const range = sel.getRangeAt(0);
    const fragment = range.cloneContents();
    const tmp = document.createElement("div");
    tmp.appendChild(fragment);
    const html = tmp.innerHTML.trim();
    if (!html) {
      toast.error("Sélection vide");
      return;
    }
    onSaveSnippet(html);
  };

  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col gap-3 bg-background-beige/40 p-3",
        className
      )}
      aria-label="Bibliothèque de blocs"
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Rechercher un bloc…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 w-full rounded-lg border border-border/60 bg-card pl-7 pr-2 text-xs placeholder:text-muted-foreground focus:border-primary-red/40 focus:outline-none focus:ring-2 focus:ring-primary-red/20"
        />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {matches.map((cat) => (
          <div key={cat.id}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {cat.label}
            </p>
            <ul className="space-y-1">
              {cat.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleInsert(item)}
                    disabled={!editor}
                    tabIndex={0}
                    className="group flex w-full cursor-pointer items-center gap-2 rounded-lg border border-transparent bg-card px-2 py-1.5 text-left text-xs transition-all hover:border-primary-red/30 hover:bg-background-beige-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-background-beige-dark text-primary-red group-hover:bg-primary-red/10">
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-primary-green">
                        {item.label}
                      </span>
                      {item.description && (
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {item.description}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Snippets section */}
        {(snippets.length > 0 || onSaveSnippet) && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Snippets
              </p>
              {onSaveSnippet && (
                <button
                  type="button"
                  onClick={handleSaveSelection}
                  disabled={!editor}
                  tabIndex={0}
                  className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-primary-red hover:bg-primary-red/10 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Sauvegarder la sélection comme snippet"
                >
                  <BookmarkPlus className="h-3 w-3" aria-hidden />
                  Sauver
                </button>
              )}
            </div>
            {filteredSnippets.length > 0 ? (
              <ul className="space-y-1">
                {filteredSnippets.map((snip) => (
                  <li key={snip.id}>
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet(snip)}
                      disabled={!editor}
                      tabIndex={0}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-transparent bg-card px-2 py-1.5 text-left text-xs transition-all hover:border-accent-honey/50 hover:bg-accent-honey-soft/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-honey-soft text-primary-red">
                        <BookmarkPlus className="h-3 w-3" aria-hidden />
                      </span>
                      <span className="block truncate font-medium text-primary-green">
                        {snip.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {query
                  ? "Aucun snippet correspondant"
                  : "Aucun snippet sauvegardé"}
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
