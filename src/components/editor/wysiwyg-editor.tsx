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
  Command,
  renderItems,
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
  Crop,
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
} from "./wysiwyg-extensions";
import { ImageCropDialog } from "./image-crop-dialog";
import { SurveyEmbedNode } from "./survey-embed-node";
import { EditorBlockHandle } from "./editor-drag-handle";
import { MoveBlockShortcuts } from "./move-block-shortcuts";
import { VideoEmbed, Accordion, AccordionSummary } from "./content-nodes";
import { RawHtmlBlock, CtaBanner } from "./embed-nodes";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";


import { handleImageDrop, handleImagePaste } from "novel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { WysiwygSidebar, type SnippetItem } from "./wysiwyg-sidebar";
import { CATALOG } from "./block-catalog";
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
    // Active : le bouton « code » de la barre d'outils ne pose qu'une marque
    // en ligne, il ne remplace pas un vrai bloc.
    codeBlock: {
      HTMLAttributes: {
        class:
          "not-prose my-4 overflow-x-auto rounded-lg bg-primary-green px-4 py-3 font-mono text-sm text-background-beige",
      },
    },
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
  RawHtmlBlock,
  CtaBanner,
  VideoEmbed,
  Accordion,
  AccordionSummary,
  Table.configure({
    resizable: true,
    HTMLAttributes: { class: "not-prose w-full border-collapse text-sm" },
  }),
  TableRow,
  TableHeader.configure({
    HTMLAttributes: {
      class: "border border-primary-green/20 bg-background-beige-dark px-3 py-2 text-left font-medium",
    },
  }),
  TableCell.configure({
    HTMLAttributes: { class: "border border-primary-green/20 px-3 py-2" },
  }),
  MoveBlockShortcuts,
  Placeholder.configure({ placeholder: "Commencez à écrire..." }),
];

/**
 * Entrées du menu « / », dérivées du catalogue de blocs.
 *
 * Dupliquer la liste ici la faisait diverger : un bloc ajouté à la
 * bibliothèque manquait au menu, et inversement. Une seule source, trois
 * portes d'entrée — la marge, « / » et la bibliothèque.
 */
const slashCommandItems = createSuggestionItems(
  CATALOG.flatMap((category) =>
    category.items.map((item) => ({
      title: item.label,
      description: item.description ?? category.label,
      icon: item.icon,
      searchTerms: item.keywords,
      command: ({
        editor,
        range,
      }: {
        editor: Editor;
        range: { from: number; to: number };
      }) => {
        // La plage porte le « / » et ce qui a été tapé après : elle est
        // supprimée avant l'insertion, sinon le texte de recherche resterait
        // dans l'article.
        editor.chain().focus().deleteRange(range).run();
        item.insert(editor);
      },
    })),
  ),
);

/**
 * Branche le menu « / » sur les entrées ci-dessus.
 *
 * Sans cette extension, `slashCommandItems` n'était qu'une liste inerte : le
 * menu existait dans le JSX mais rien ne l'ouvrait, et taper « / » ne faisait
 * qu'écrire une barre oblique.
 */
const slashCommand = Command.configure({
  suggestion: { items: () => slashCommandItems, render: renderItems },
});

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

  const allExtensions = [
    ...(placeholderExt
      ? extensions.map((ext) =>
          ext.name === "placeholder" ? placeholderExt : ext,
        )
      : extensions),
    slashCommand,
  ];

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
        <div ref={editorAreaRef} className="relative pl-14">
        <EditorBlockHandle editor={editor} containerRef={editorAreaRef} />
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
        {/* `self-start` est indispensable : dans un conteneur flex, la colonne
            serait sinon étirée sur toute la hauteur et `sticky` n'aurait aucun
            effet. La hauteur bornée fait défiler la liste à l'intérieur plutôt
            que la colonne entière — le champ de recherche reste donc toujours
            visible. */}
        {sidebar && sidebarOpen && (
          <div
            className="sticky hidden max-h-[calc(100vh-var(--wysiwyg-toolbar-top,0px))] w-64 shrink-0 self-start overflow-hidden border-l border-border/60 lg:block"
            style={{ top: "var(--wysiwyg-toolbar-top, 0px)" }}
          >
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
