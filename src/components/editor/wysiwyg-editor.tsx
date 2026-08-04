"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EditorRoot,
  EditorContent,
  EditorCommand,
  EditorCommandItem,
  EditorCommandList,
  EditorCommandEmpty,
  type JSONContent,
  type EditorInstance,
  handleCommandNavigation,
  createSuggestionItems,
  StarterKit,
  Placeholder,
  TiptapLink,
  TiptapUnderline,
  TextStyle,
  Color,
  HighlightExtension,
  TaskList,
  TaskItem,
  HorizontalRule,
} from "novel";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Minus,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link,
  Unlink,
  Undo,
  Redo,
  Image as ImageIcon,
  BarChart3,
  Columns2,
  Columns3,
  Info,
  Lightbulb,
  AlertTriangle,
  StickyNote,
  Crop,
  MousePointerClick,
  PanelRightClose,
  PanelRightOpen,
  Eye,
} from "lucide-react";
import { Editor } from "@tiptap/react";
import {
  ImageExtension,
  Columns,
  Column,
  Callout,
  CtaButton,
  blogImageUpload,
  type CalloutVariant,
  type CtaVariant,
} from "./wysiwyg-extensions";
import { ImageCropDialog } from "./image-crop-dialog";
import { SurveyEmbedNode } from "./survey-embed-node";
import { EditorDragHandle } from "./editor-drag-handle";
import { MoveBlockShortcuts } from "./move-block-shortcuts";

/**
 * Tiptap chains for our custom nodes are not in the global Commands<> shape
 * (Maily already augments `columns` differently — see wysiwyg-extensions.tsx).
 * These helpers wrap the slash-command call sites with a single cast.
 */
type ChainAny = {
  focus(): ChainAny;
  deleteRange(r: { from: number; to: number }): ChainAny;
  setColumns(): ChainAny;
  setColumns3(): ChainAny;
  setCallout(v: CalloutVariant): ChainAny;
  setCtaButton(attrs: {
    url?: string;
    variant?: CtaVariant;
    text?: string;
  }): ChainAny;
  run(): boolean;
};
const columns = (editor: Editor, range: { from: number; to: number }) =>
  (editor.chain() as unknown as ChainAny).focus().deleteRange(range).setColumns().run();
const columns3 = (editor: Editor, range: { from: number; to: number }) =>
  (editor.chain() as unknown as ChainAny).focus().deleteRange(range).setColumns3().run();
const callout = (
  editor: Editor,
  range: { from: number; to: number },
  variant: CalloutVariant,
) =>
  (editor.chain() as unknown as ChainAny)
    .focus()
    .deleteRange(range)
    .setCallout(variant)
    .run();
const insertCtaButton = (
  editor: Editor,
  range: { from: number; to: number } | null,
  variant: CtaVariant,
) => {
  const url = window.prompt("URL du bouton", "https://") ?? "";
  if (!url) return false;
  const chain = (editor.chain() as unknown as ChainAny).focus();
  if (range) chain.deleteRange(range);
  return chain.setCtaButton({ url, variant, text: "Découvrir" }).run();
};
import { handleImageDrop, handleImagePaste } from "novel";
import { uploadFileAction } from "@/lib/storage/actions";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { WysiwygSidebar, type SnippetItem } from "./wysiwyg-sidebar";
import { WysiwygPreviewDialog } from "./wysiwyg-preview-dialog";
import { useWysiwygSnippets } from "@/lib/wysiwyg-snippets/context";

type WysiwygEditorProps = {
  initialContent?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  /** Show the right-hand blocks sidebar (default: true). */
  sidebar?: boolean;
  /**
   * Ouvre la bibliothèque de blocs au montage. Fermée par défaut : les
   * éditeurs courts (snippets, descriptions) n'ont pas la largeur pour elle.
   */
  defaultSidebarOpen?: boolean;
  /** Show the Preview button in the toolbar (default: true). */
  preview?: boolean;
  /** Snippets to display in the sidebar "Snippets" section. */
  snippets?: SnippetItem[];
  /** If provided, adds a "Sauver" button to snapshot the current selection. */
  onSaveSnippet?: (html: string) => void;
};

const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    bulletList: { HTMLAttributes: { class: "list-disc ml-4" } },
    orderedList: { HTMLAttributes: { class: "list-decimal ml-4" } },
    blockquote: {
      HTMLAttributes: {
        class: "border-l-4 border-primary-red/30 pl-4 italic",
      },
    },
    codeBlock: false,
    horizontalRule: false,
  }),
  HorizontalRule,
  TiptapLink.configure({
    HTMLAttributes: { class: "text-primary-red underline cursor-pointer" },
    openOnClick: false,
  }),
  TiptapUnderline,
  TextStyle,
  Color,
  HighlightExtension.configure({ multicolor: true }),
  TaskList.configure({ HTMLAttributes: { class: "not-prose" } }),
  TaskItem.configure({ nested: true }),
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  ImageExtension,
  Columns,
  Column,
  Callout,
  CtaButton,
  SurveyEmbedNode,
  MoveBlockShortcuts,
  Placeholder.configure({ placeholder: "Commencez à écrire..." }),
];

const slashCommandItems = createSuggestionItems([
  {
    title: "Texte",
    description: "Paragraphe de texte",
    icon: <Type className="h-4 w-4" />,
    searchTerms: ["paragraph", "texte", "p"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleNode("paragraph", "paragraph")
        .run();
    },
  },
  {
    title: "Titre 1",
    description: "Grand titre de section",
    icon: <Heading1 className="h-4 w-4" />,
    searchTerms: ["title", "titre", "h1"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run();
    },
  },
  {
    title: "Titre 2",
    description: "Titre de sous-section",
    icon: <Heading2 className="h-4 w-4" />,
    searchTerms: ["subtitle", "sous-titre", "h2"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run();
    },
  },
  {
    title: "Titre 3",
    description: "Petit titre",
    icon: <Heading3 className="h-4 w-4" />,
    searchTerms: ["h3"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run();
    },
  },
  {
    title: "Liste à puces",
    description: "Liste non ordonnée",
    icon: <List className="h-4 w-4" />,
    searchTerms: ["bullet", "liste", "puces"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Liste numérotée",
    description: "Liste ordonnée",
    icon: <ListOrdered className="h-4 w-4" />,
    searchTerms: ["ordered", "numérotée"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Tâches",
    description: "Liste de tâches",
    icon: <ListTodo className="h-4 w-4" />,
    searchTerms: ["todo", "task", "tâche"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Citation",
    description: "Bloc de citation",
    icon: <Quote className="h-4 w-4" />,
    searchTerms: ["quote", "citation", "blockquote"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Séparateur",
    description: "Ligne horizontale",
    icon: <Minus className="h-4 w-4" />,
    searchTerms: ["hr", "separator", "ligne"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "Image",
    description: "Uploader une image (max 5 Mo)",
    icon: <ImageIcon className="h-4 w-4" />,
    searchTerms: ["image", "img", "photo", "upload"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
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
          editor
            .chain()
            .focus()
            .setImage({ src: result.data.url, alt: file.name })
            .run();
        } else {
          toast.error(result.error ?? "Upload échoué");
        }
      };
      input.click();
    },
  },
  {
    title: "Deux colonnes",
    description: "Mise en page sur deux colonnes",
    icon: <Columns2 className="h-4 w-4" />,
    searchTerms: ["columns", "colonnes", "grid", "layout", "2"],
    command: ({ editor, range }) => {
      columns(editor, range);
    },
  },
  {
    title: "Trois colonnes",
    description: "Mise en page sur trois colonnes",
    icon: <Columns3 className="h-4 w-4" />,
    searchTerms: ["columns", "colonnes", "grid", "layout", "3"],
    command: ({ editor, range }) => {
      columns3(editor, range);
    },
  },
  {
    title: "Encadré info",
    description: "Bloc d'information mis en valeur",
    icon: <Info className="h-4 w-4" />,
    searchTerms: ["callout", "info", "encadre", "encadré", "section"],
    command: ({ editor, range }) => {
      callout(editor, range, "info");
    },
  },
  {
    title: "Encadré conseil",
    description: "Conseil ou astuce",
    icon: <Lightbulb className="h-4 w-4" />,
    searchTerms: ["tip", "conseil", "astuce"],
    command: ({ editor, range }) => {
      callout(editor, range, "tip");
    },
  },
  {
    title: "Encadré attention",
    description: "Avertissement / point d'attention",
    icon: <AlertTriangle className="h-4 w-4" />,
    searchTerms: ["warning", "attention", "alerte"],
    command: ({ editor, range }) => {
      callout(editor, range, "warning");
    },
  },
  {
    title: "Encadré note",
    description: "Note simple",
    icon: <StickyNote className="h-4 w-4" />,
    searchTerms: ["note", "memo"],
    command: ({ editor, range }) => {
      callout(editor, range, "note");
    },
  },
  {
    title: "Bouton d'action (primaire)",
    description: "Bouton CTA rempli",
    icon: <MousePointerClick className="h-4 w-4" />,
    searchTerms: ["cta", "bouton", "action", "call to action"],
    command: ({ editor, range }) => {
      insertCtaButton(editor, range, "primary");
    },
  },
  {
    title: "Bouton d'action (secondaire)",
    description: "Bouton CTA vert forêt",
    icon: <MousePointerClick className="h-4 w-4" />,
    searchTerms: ["cta", "bouton", "action", "secondaire"],
    command: ({ editor, range }) => {
      insertCtaButton(editor, range, "secondary");
    },
  },
  {
    title: "Bouton d'action (contour)",
    description: "Bouton CTA outline",
    icon: <MousePointerClick className="h-4 w-4" />,
    searchTerms: ["cta", "bouton", "outline", "contour"],
    command: ({ editor, range }) => {
      insertCtaButton(editor, range, "outline");
    },
  },
  {
    title: "Sondage",
    description: "Insérer un sondage ou son graphique de résultats",
    icon: <BarChart3 className="h-4 w-4" />,
    searchTerms: ["sondage", "quiz", "survey", "graphique", "resultats"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "surveyEmbed",
          attrs: { slug: "", mode: "form" },
        })
        .run();
    },
  },
]);

const htmlToContent = (html: string): JSONContent | undefined => {
  if (!html) return undefined;
  return undefined;
};

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded p-1.5 transition-colors ${
        isActive
          ? "bg-primary-red/10 text-primary-red"
          : "text-gray-600 hover:bg-background-beige-dark"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
      aria-label={ariaLabel}
      tabIndex={0}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-gray-200" />;
}

function Toolbar({
  editor,
  onToggleSidebar,
  sidebarOpen,
  showSidebarToggle,
  onOpenPreview,
  showPreview,
}: {
  editor: Editor | null;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  showSidebarToggle?: boolean;
  onOpenPreview?: () => void;
  showPreview?: boolean;
}) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  // Image node currently selected in the editor (null = none). Populated from
  // `selectionUpdate` / `transaction` events so the Crop button enables only
  // when an image is actually clicked.
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    pos: number;
  } | null>(null);

  useEffect(() => {
    if (!editor) return;
    const sync = () => {
      const sel = editor.state.selection as unknown as {
        node?: { type: { name: string }; attrs: Record<string, unknown> };
        from: number;
      };
      if (sel.node && sel.node.type.name === "image") {
        const src = sel.node.attrs.src;
        if (typeof src === "string" && src.length > 0) {
          setSelectedImage({ src, pos: sel.from });
          return;
        }
      }
      setSelectedImage(null);
    };
    editor.on("selectionUpdate", sync);
    editor.on("transaction", sync);
    sync();
    return () => {
      editor.off("selectionUpdate", sync);
      editor.off("transaction", sync);
    };
  }, [editor]);

  if (!editor) return null;

  const addLink = () => {
    if (linkUrl) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
      setLinkUrl("");
      setShowLinkInput(false);
    }
  };

  return (
    <div
      className="sticky z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b bg-gray-50/95 px-2 py-1.5 backdrop-blur"
      style={{ top: "var(--wysiwyg-toolbar-top, 0px)" }}
    >
      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        ariaLabel="Annuler"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        ariaLabel="Rétablir"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        isActive={
          editor.isActive("paragraph") && !editor.isActive("bulletList") && !editor.isActive("orderedList")
        }
        ariaLabel="Paragraphe"
      >
        <Type className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        isActive={editor.isActive("heading", { level: 1 })}
        ariaLabel="Titre 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        isActive={editor.isActive("heading", { level: 2 })}
        ariaLabel="Titre 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        isActive={editor.isActive("heading", { level: 3 })}
        ariaLabel="Titre 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Inline formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        ariaLabel="Gras"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        ariaLabel="Italique"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        ariaLabel="Souligné"
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        ariaLabel="Barré"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        ariaLabel="Code"
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Text alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
        ariaLabel="Aligner à gauche"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
        ariaLabel="Centrer"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
        ariaLabel="Aligner à droite"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        isActive={editor.isActive({ textAlign: "justify" })}
        ariaLabel="Justifier"
      >
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        ariaLabel="Liste à puces"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        ariaLabel="Liste numérotée"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive("taskList")}
        ariaLabel="Liste de tâches"
      >
        <ListTodo className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Block elements */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        ariaLabel="Citation"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        ariaLabel="Séparateur"
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Image crop */}
      <ToolbarButton
        onClick={() => selectedImage && setCropOpen(true)}
        disabled={!selectedImage}
        ariaLabel={
          selectedImage
            ? "Rogner l'image sélectionnée"
            : "Sélectionne une image dans l'éditeur pour la rogner"
        }
      >
        <Crop className="h-4 w-4" />
      </ToolbarButton>

      <ImageCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        src={selectedImage?.src ?? null}
        bucket="blog"
        uploadFolder="content"
        onCropped={(url: string) => {
          if (!selectedImage) return;
          // Re-select the image node by its stored position and swap src.
          // `setNodeSelection` not in Novel's chain types — the cast matches
          // our ChainAny (which already has its own TS escape hatch).
          (editor.chain() as unknown as {
            focus(): {
              setNodeSelection(pos: number): {
                updateAttributes(
                  name: string,
                  attrs: Record<string, unknown>,
                ): { run(): boolean };
              };
            };
          })
            .focus()
            .setNodeSelection(selectedImage.pos)
            .updateAttributes("image", { src: url })
            .run();
        }}
      />

      <ToolbarDivider />

      {/* Link */}
      {showLinkInput ? (
        <div className="flex items-center gap-1">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLink();
              }
              if (e.key === "Escape") {
                setShowLinkInput(false);
                setLinkUrl("");
              }
            }}
            placeholder="https://..."
            className="h-7 w-48 rounded border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-red/30"
            autoFocus
          />
          <button
            type="button"
            onClick={addLink}
            className="rounded bg-primary-red px-2 py-1 text-xs text-white hover:bg-primary-red/90"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLinkInput(false);
              setLinkUrl("");
            }}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          <ToolbarButton
            onClick={() => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run();
              } else {
                setShowLinkInput(true);
              }
            }}
            isActive={editor.isActive("link")}
            ariaLabel="Lien"
          >
            <Link className="h-4 w-4" />
          </ToolbarButton>
          {editor.isActive("link") && (
            <ToolbarButton
              onClick={() => editor.chain().focus().unsetLink().run()}
              ariaLabel="Supprimer le lien"
            >
              <Unlink className="h-4 w-4" />
            </ToolbarButton>
          )}
        </>
      )}

      {(showPreview || showSidebarToggle) && <ToolbarDivider />}

      {showPreview && onOpenPreview && (
        <ToolbarButton onClick={onOpenPreview} ariaLabel="Aperçu">
          <Eye className="h-4 w-4" />
        </ToolbarButton>
      )}

      {showSidebarToggle && onToggleSidebar && (
        <ToolbarButton
          onClick={onToggleSidebar}
          isActive={sidebarOpen}
          ariaLabel={sidebarOpen ? "Masquer la bibliothèque" : "Afficher la bibliothèque de blocs"}
        >
          {sidebarOpen ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
        </ToolbarButton>
      )}
    </div>
  );
}

export const WysiwygEditor = ({
  initialContent,
  onChange,
  placeholder,
  className,
  sidebar = true,
  defaultSidebarOpen = false,
  preview = true,
  snippets = [],
  onSaveSnippet,
}: WysiwygEditorProps) => {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [currentHtml, setCurrentHtml] = useState(initialContent ?? "");
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const editorAreaRef = useRef<HTMLDivElement>(null);

  const snippetsCtx = useWysiwygSnippets();
  const effectiveSnippets = snippets.length > 0 ? snippets : snippetsCtx?.snippets ?? [];
  const effectiveOnSave =
    onSaveSnippet ?? snippetsCtx?.requestSave ?? undefined;

  const handleUpdate = useCallback(
    (editor: EditorInstance) => {
      const html = editor.getHTML();
      setCurrentHtml(html);
      onChange?.(html);
    },
    [onChange]
  );

  const placeholderExt = placeholder
    ? Placeholder.configure({ placeholder })
    : undefined;

  const allExtensions = placeholderExt
    ? extensions.map((ext) =>
        ext.name === "placeholder" ? placeholderExt : ext
      )
    : extensions;

  const handleToggleSidebar = () => {
    // Desktop: toggle inline sidebar. Mobile viewports prefer the Sheet.
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileSidebarOpen((v) => !v);
    } else {
      setSidebarOpen((v) => !v);
    }
  };

  return (
    <EditorRoot>
      <div
        className={`flex rounded-lg border bg-white focus-within:ring-2 focus-within:ring-primary-red/20 ${className ?? ""}`}
      >
        <div className="flex min-w-0 flex-1 flex-col">
        <Toolbar
          editor={editor}
          onToggleSidebar={sidebar ? handleToggleSidebar : undefined}
          sidebarOpen={sidebarOpen}
          showSidebarToggle={sidebar}
          onOpenPreview={preview ? () => setPreviewOpen(true) : undefined}
          showPreview={preview}
        />
        {/* `relative` porte le positionnement de la poignée : sans lui, elle se
            placerait par rapport à la page et dériverait au moindre scroll.
            `pl-7` dégage la marge où elle se pose, pour qu'elle ne recouvre
            jamais le texte. */}
        <div ref={editorAreaRef} className="relative pl-7">
        <EditorDragHandle editor={editor} containerRef={editorAreaRef} />
        <EditorContent
          className="prose prose-sm max-w-none p-4"
          extensions={allExtensions}
          initialContent={htmlToContent(initialContent ?? "")}
          editorProps={{
            attributes: {
              class: "outline-none min-h-[150px]",
            },
            handlePaste: (view, event) =>
              handleImagePaste(view, event, blogImageUpload),
            handleDrop: (view, event, _slice, moved) =>
              handleImageDrop(view, event, moved, blogImageUpload),
            ...(initialContent
              ? {
                  handleDOMEvents: {
                    focus: (view) => {
                      if (
                        view.state.doc.textContent === "" &&
                        initialContent
                      ) {
                        const { editor } = view.state as unknown as {
                          editor: EditorInstance;
                        };
                        if (editor) {
                          editor.commands.setContent(initialContent);
                        }
                      }
                      return false;
                    },
                  },
                }
              : {}),
          }}
          onCreate={({ editor }) => {
            setEditor(editor);
            if (initialContent) {
              editor.commands.setContent(initialContent);
            }
          }}
          onUpdate={({ editor }) => {
            setEditor(editor);
            handleUpdate(editor);
          }}
        >
          {/* Slash command menu */}
          <EditorCommand
            className="z-50 rounded-lg border bg-white shadow-lg"
            onKeyDown={(e) => handleCommandNavigation(e.nativeEvent)}
          >
            <EditorCommandEmpty className="px-4 py-2 text-sm text-muted-foreground">
              Aucune commande trouvée
            </EditorCommandEmpty>
            <EditorCommandList>
              {slashCommandItems.map((item) => (
                <EditorCommandItem
                  key={item.title}
                  value={item.title}
                  onCommand={(val) => item.command?.(val)}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-background-beige-dark aria-selected:bg-background-beige-dark"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-background-beige">
                    {item.icon}
                  </span>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>
        </EditorContent>
        </div>
        </div>

        {/* Desktop inline sidebar */}
        {sidebar && sidebarOpen && (
          <div className="hidden w-64 shrink-0 border-l border-border/60 lg:block">
            <WysiwygSidebar
              editor={editor}
              snippets={effectiveSnippets}
              onSaveSnippet={effectiveOnSave}
            />
          </div>
        )}
      </div>

      {/* Mobile sidebar sheet */}
      {sidebar && (
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent
            side="right"
            className="w-[85vw] max-w-xs overflow-y-auto bg-background-beige p-0"
          >
            <SheetHeader className="border-b border-border/50 px-4 py-3">
              <SheetTitle className="font-serif text-primary-green">
                Bibliothèque de blocs
              </SheetTitle>
            </SheetHeader>
            <WysiwygSidebar
              editor={editor}
              snippets={effectiveSnippets}
              onSaveSnippet={effectiveOnSave}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Preview dialog */}
      {preview && (
        <WysiwygPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          html={currentHtml}
        />
      )}
    </EditorRoot>
  );
};
