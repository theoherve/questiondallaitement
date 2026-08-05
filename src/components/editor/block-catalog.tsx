"use client";

import type { Editor } from "@tiptap/react";
import {
  AlertTriangle,
  BarChart3,
  ChevronsUpDown,
  Columns2,
  Columns3,
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
  SquareCode,
  StickyNote,
  Table as TableIcon,
  Type,
  Youtube,
} from "lucide-react";
import { insertVideo } from "./content-nodes";
import { uploadFileAction } from "@/lib/storage/actions";
import { toast } from "sonner";

/**
 * Catalogue des blocs insérables.
 *
 * Partagé par la bibliothèque latérale et par le bouton « + » de la marge :
 * les deux doivent proposer exactement la même chose, et une seule source
 * évite qu'un bloc ajouté d'un côté manque de l'autre.
 */

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
  toggleCodeBlock(): ChainAny;
  insertTable(options: {
    rows: number;
    cols: number;
    withHeaderRow: boolean;
  }): ChainAny;
  setAccordion(): ChainAny;
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
export type SidebarItem = {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  keywords: string[];
  insert: (editor: Editor) => void;
};

export type SidebarCategory = {
  id: string;
  label: string;
  items: SidebarItem[];
};

export const CATALOG: SidebarCategory[] = [
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
    id: "contenus-riches",
    label: "Contenus riches",
    items: [
      {
        id: "code-block",
        label: "Bloc de code",
        description: "Extrait en chasse fixe",
        icon: <SquareCode className="h-4 w-4" />,
        keywords: ["code", "bloc", "pre", "snippet"],
        insert: (e) => chainOf(e).toggleCodeBlock().run(),
      },
      {
        id: "table",
        label: "Tableau",
        description: "3 × 3 avec ligne d'en-tête",
        icon: <TableIcon className="h-4 w-4" />,
        keywords: ["tableau", "table", "grille", "colonnes"],
        insert: (e) =>
          chainOf(e).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      },
      {
        id: "video",
        label: "Vidéo",
        description: "YouTube ou Vimeo",
        icon: <Youtube className="h-4 w-4" />,
        keywords: ["video", "youtube", "vimeo", "lecteur"],
        insert: (e) => insertVideo(e, null),
      },
      {
        id: "accordion",
        label: "Accordéon",
        description: "Question repliable, pour une FAQ",
        icon: <ChevronsUpDown className="h-4 w-4" />,
        keywords: ["accordeon", "faq", "question", "repliable"],
        insert: (e) => chainOf(e).setAccordion().run(),
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
