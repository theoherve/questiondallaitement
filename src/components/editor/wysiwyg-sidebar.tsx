"use client";

import { useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  AlertTriangle,
  BookmarkPlus,
  Columns2,
  Columns3,
  BarChart3,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Info,
  Lightbulb,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  MousePointerClick,
  Quote,
  Search,
  StickyNote,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadFileAction } from "@/lib/storage/actions";
import { toast } from "sonner";

// ─── Chain helper typing (Maily augments Commands<> differently) ─────────────
type ChainAny = {
  focus(): ChainAny;
  setColumns(): ChainAny;
  setColumns3(): ChainAny;
  setCallout(v: string): ChainAny;
  setCtaButton(attrs: {
    url?: string;
    variant?: "primary" | "secondary" | "outline";
    text?: string;
  }): ChainAny;
  run(): boolean;
};

const chainOf = (editor: Editor) =>
  (editor.chain() as unknown as ChainAny).focus();

// ─── Insert helpers ─────────────────────────────────────────────────────────
const insertImage = (editor: Editor) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("bucket", "blog");
    fd.set("folder", "content");
    const result = await uploadFileAction(fd);
    if (result.success && result.data) {
      editor.chain().focus().setImage({ src: result.data.url, alt: file.name }).run();
    } else {
      toast.error(result.error ?? "Upload échoué");
    }
  };
  input.click();
};

const insertCta = (
  editor: Editor,
  variant: "primary" | "secondary" | "outline"
) => {
  const url = window.prompt("URL du bouton", "https://") ?? "";
  if (!url) return;
  chainOf(editor).setCtaButton({ url, variant, text: "Découvrir" }).run();
};

// ─── Block catalog ──────────────────────────────────────────────────────────
type SidebarItem = {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  keywords: string[];
  insert: (editor: Editor) => void;
};

type SidebarCategory = {
  id: string;
  label: string;
  items: SidebarItem[];
};

const CATALOG: SidebarCategory[] = [
  {
    id: "text",
    label: "Texte",
    items: [
      {
        id: "p",
        label: "Paragraphe",
        icon: <Type className="h-4 w-4" />,
        keywords: ["texte", "paragraphe", "p"],
        insert: (e) => e.chain().focus().setParagraph().run(),
      },
      {
        id: "h1",
        label: "Titre 1",
        icon: <Heading1 className="h-4 w-4" />,
        keywords: ["titre", "h1"],
        insert: (e) =>
          e.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        id: "h2",
        label: "Titre 2",
        icon: <Heading2 className="h-4 w-4" />,
        keywords: ["sous-titre", "h2"],
        insert: (e) =>
          e.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        id: "h3",
        label: "Titre 3",
        icon: <Heading3 className="h-4 w-4" />,
        keywords: ["h3"],
        insert: (e) =>
          e.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      {
        id: "quote",
        label: "Citation",
        icon: <Quote className="h-4 w-4" />,
        keywords: ["quote", "citation"],
        insert: (e) => e.chain().focus().toggleBlockquote().run(),
      },
    ],
  },
  {
    id: "lists",
    label: "Listes",
    items: [
      {
        id: "ul",
        label: "Liste à puces",
        icon: <List className="h-4 w-4" />,
        keywords: ["liste", "puces", "bullet"],
        insert: (e) => e.chain().focus().toggleBulletList().run(),
      },
      {
        id: "ol",
        label: "Liste numérotée",
        icon: <ListOrdered className="h-4 w-4" />,
        keywords: ["liste", "numérotée", "ordered"],
        insert: (e) => e.chain().focus().toggleOrderedList().run(),
      },
      {
        id: "todo",
        label: "Tâches",
        icon: <ListTodo className="h-4 w-4" />,
        keywords: ["task", "tâche", "todo", "cases"],
        insert: (e) => e.chain().focus().toggleTaskList().run(),
      },
    ],
  },
  {
    id: "layout",
    label: "Mise en page",
    items: [
      {
        id: "hr",
        label: "Séparateur",
        icon: <Minus className="h-4 w-4" />,
        keywords: ["hr", "ligne", "separateur"],
        insert: (e) => e.chain().focus().setHorizontalRule().run(),
      },
      {
        id: "cols2",
        label: "2 colonnes",
        icon: <Columns2 className="h-4 w-4" />,
        keywords: ["colonnes", "deux", "grid"],
        insert: (e) => chainOf(e).setColumns().run(),
      },
      {
        id: "cols3",
        label: "3 colonnes",
        icon: <Columns3 className="h-4 w-4" />,
        keywords: ["colonnes", "trois", "grid"],
        insert: (e) => chainOf(e).setColumns3().run(),
      },
    ],
  },
  {
    id: "media",
    label: "Médias",
    items: [
      {
        id: "image",
        label: "Image",
        icon: <ImageIcon className="h-4 w-4" />,
        keywords: ["image", "photo", "upload"],
        insert: insertImage,
      },
    ],
  },
  {
    id: "callouts",
    label: "Encadrés",
    items: [
      {
        id: "callout-info",
        label: "Info",
        icon: <Info className="h-4 w-4" />,
        keywords: ["info", "note"],
        insert: (e) => chainOf(e).setCallout("info").run(),
      },
      {
        id: "callout-tip",
        label: "Conseil",
        icon: <Lightbulb className="h-4 w-4" />,
        keywords: ["tip", "conseil", "astuce"],
        insert: (e) => chainOf(e).setCallout("tip").run(),
      },
      {
        id: "callout-warning",
        label: "Attention",
        icon: <AlertTriangle className="h-4 w-4" />,
        keywords: ["warning", "alerte", "attention"],
        insert: (e) => chainOf(e).setCallout("warning").run(),
      },
      {
        id: "callout-note",
        label: "Note",
        icon: <StickyNote className="h-4 w-4" />,
        keywords: ["note", "memo"],
        insert: (e) => chainOf(e).setCallout("note").run(),
      },
    ],
  },
  {
    id: "actions",
    label: "Actions",
    items: [
      {
        id: "cta-primary",
        label: "Bouton primaire",
        description: "Fond rouge brand",
        icon: <MousePointerClick className="h-4 w-4" />,
        keywords: ["cta", "bouton", "action"],
        insert: (e) => insertCta(e, "primary"),
      },
      {
        id: "cta-secondary",
        label: "Bouton secondaire",
        description: "Fond vert forêt",
        icon: <MousePointerClick className="h-4 w-4" />,
        keywords: ["cta", "bouton", "secondaire"],
        insert: (e) => insertCta(e, "secondary"),
      },
      {
        id: "cta-outline",
        label: "Bouton outline",
        description: "Contour rouge",
        icon: <MousePointerClick className="h-4 w-4" />,
        keywords: ["cta", "bouton", "outline", "contour"],
        insert: (e) => insertCta(e, "outline"),
      },
    ],
  },
  {
    id: "interactif",
    label: "Interactif",
    items: [
      {
        id: "survey-embed",
        label: "Sondage",
        description: "Formulaire ou graphique de résultats, en direct",
        icon: <BarChart3 className="h-4 w-4" />,
        keywords: ["sondage", "quiz", "survey", "graphique", "resultats"],
        insert: (e) =>
          e
            .chain()
            .focus()
            .insertContent({
              type: "surveyEmbed",
              attrs: { slug: "", mode: "form" },
            })
            .run(),
      },
    ],
  },
];

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
