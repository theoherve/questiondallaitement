"use client";

import { useCallback } from "react";
import {
  EditorRoot,
  EditorContent,
  EditorBubble,
  EditorBubbleItem,
  EditorCommand,
  EditorCommandItem,
  EditorCommandList,
  EditorCommandEmpty,
  type JSONContent,
  type EditorInstance,
  handleCommandNavigation,
  createSuggestionItems,
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
} from "lucide-react";

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
    blockquote: { HTMLAttributes: { class: "border-l-4 border-primary-red/30 pl-4 italic" } },
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
  Placeholder.configure({ placeholder: "Commencez à écrire..." }),
];

const slashCommandItems = createSuggestionItems([
  {
    title: "Texte",
    description: "Paragraphe de texte",
    icon: <Type className="h-4 w-4" />,
    searchTerms: ["paragraph", "texte", "p"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").run();
    },
  },
  {
    title: "Titre 1",
    description: "Grand titre de section",
    icon: <Heading1 className="h-4 w-4" />,
    searchTerms: ["title", "titre", "h1"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
  },
  {
    title: "Titre 2",
    description: "Titre de sous-section",
    icon: <Heading2 className="h-4 w-4" />,
    searchTerms: ["subtitle", "sous-titre", "h2"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
  },
  {
    title: "Titre 3",
    description: "Petit titre",
    icon: <Heading3 className="h-4 w-4" />,
    searchTerms: ["h3"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
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
]);

const htmlToContent = (html: string): JSONContent | undefined => {
  if (!html) return undefined;
  return undefined;
};

export const WysiwygEditor = ({
  initialContent,
  onChange,
  placeholder,
  className,
}: WysiwygEditorProps) => {
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
      <EditorContent
        className={`prose prose-sm max-w-none rounded-lg border bg-white p-4 focus-within:ring-2 focus-within:ring-primary-red/20 ${className ?? ""}`}
        extensions={allExtensions}
        initialContent={htmlToContent(initialContent ?? "")}
        editorProps={{
          attributes: {
            class: "outline-none min-h-[150px]",
          },
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
          if (initialContent) {
            editor.commands.setContent(initialContent);
          }
        }}
        onUpdate={({ editor }) => handleUpdate(editor)}
      >
        {/* Bubble menu for inline formatting */}
        <EditorBubble
          tippyOptions={{ placement: "top" }}
          className="flex items-center gap-0.5 rounded-lg border bg-white p-1 shadow-lg"
        >
          <EditorBubbleItem
            onSelect={(editor) => editor.chain().focus().toggleBold().run()}
          >
            <button
              type="button"
              className="rounded p-1.5 hover:bg-background-beige-dark"
              aria-label="Gras"
              tabIndex={0}
            >
              <Bold className="h-4 w-4" />
            </button>
          </EditorBubbleItem>
          <EditorBubbleItem
            onSelect={(editor) => editor.chain().focus().toggleItalic().run()}
          >
            <button
              type="button"
              className="rounded p-1.5 hover:bg-background-beige-dark"
              aria-label="Italique"
              tabIndex={0}
            >
              <Italic className="h-4 w-4" />
            </button>
          </EditorBubbleItem>
          <EditorBubbleItem
            onSelect={(editor) => editor.chain().focus().toggleUnderline().run()}
          >
            <button
              type="button"
              className="rounded p-1.5 hover:bg-background-beige-dark"
              aria-label="Souligné"
              tabIndex={0}
            >
              <Underline className="h-4 w-4" />
            </button>
          </EditorBubbleItem>
          <EditorBubbleItem
            onSelect={(editor) => editor.chain().focus().toggleStrike().run()}
          >
            <button
              type="button"
              className="rounded p-1.5 hover:bg-background-beige-dark"
              aria-label="Barré"
              tabIndex={0}
            >
              <Strikethrough className="h-4 w-4" />
            </button>
          </EditorBubbleItem>
          <EditorBubbleItem
            onSelect={(editor) => editor.chain().focus().toggleCode().run()}
          >
            <button
              type="button"
              className="rounded p-1.5 hover:bg-background-beige-dark"
              aria-label="Code"
              tabIndex={0}
            >
              <Code className="h-4 w-4" />
            </button>
          </EditorBubbleItem>
        </EditorBubble>

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
    </EditorRoot>
  );
};
