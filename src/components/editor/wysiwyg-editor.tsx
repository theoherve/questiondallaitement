"use client";

import { useCallback, useEffect, useState } from "react";
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
  Columns2,
  Columns3,
  Info,
  Lightbulb,
  AlertTriangle,
  StickyNote,
  Crop,
} from "lucide-react";
import { Editor } from "@tiptap/react";
import {
  ImageExtension,
  Columns,
  Column,
  Callout,
  blogImageUpload,
  type CalloutVariant,
} from "./wysiwyg-extensions";
import { ImageCropDialog } from "./image-crop-dialog";

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
import { handleImageDrop, handleImagePaste } from "novel";
import { uploadFileAction } from "@/lib/storage/actions";
import { toast } from "sonner";

type WysiwygEditorProps = {
  initialContent?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
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

function Toolbar({ editor }: { editor: Editor | null }) {
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
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-gray-50/80 px-2 py-1.5 rounded-t-lg">
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
    </div>
  );
}

export const WysiwygEditor = ({
  initialContent,
  onChange,
  placeholder,
  className,
}: WysiwygEditorProps) => {
  const [editor, setEditor] = useState<Editor | null>(null);

  const handleUpdate = useCallback(
    (editor: EditorInstance) => {
      onChange?.(editor.getHTML());
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

  return (
    <EditorRoot>
      <div className={`rounded-lg border bg-white focus-within:ring-2 focus-within:ring-primary-red/20 ${className ?? ""}`}>
        <Toolbar editor={editor} />
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
    </EditorRoot>
  );
};
