"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FileUpload } from "@/components/ui/file-upload";
import { WysiwygEditor } from "@/components/editor/wysiwyg-editor";
import { updateBlock, deleteBlock } from "../actions";
import { toast } from "sonner";
import { Save, Trash2, Plus, X } from "lucide-react";
import { randomUUID } from "@/lib/utils-client";

type BlockData = {
  id: string;
  type: string;
  content: Record<string, unknown>;
  position: number;
};

type BlockEditorProps = {
  block: BlockData;
  accompagnementId: string;
};

const BLOCK_TYPE_LABELS: Record<string, string> = {
  text: "Texte",
  video: "Vidéo",
  image: "Image",
  quiz: "Quiz",
  download: "Pièce jointe",
};

export const BlockEditor = ({ block, accompagnementId }: BlockEditorProps) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState(block.content);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateBlock(block.id, accompagnementId, content);
    setIsSaving(false);

    if (result.success) {
      toast.success("Bloc enregistré");
    } else {
      toast.error(result.error ?? "Erreur");
    }
  };

  const handleDelete = async () => {
    const result = await deleteBlock(block.id, accompagnementId);
    if (result.success) {
      toast.success("Bloc supprimé");
      router.refresh();
    } else {
      toast.error(result.error ?? "Erreur");
    }
  };

  const summary = getBlockSummary(block.type, content);

  return (
    <div className="space-y-2">
      {/* Collapsed view */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-2 text-left"
          onClick={() => setIsExpanded(!isExpanded)}
          tabIndex={0}
          aria-label={`${isExpanded ? "Réduire" : "Ouvrir"} le bloc ${BLOCK_TYPE_LABELS[block.type]}`}
        >
          <Badge variant="outline" className="text-xs">
            {BLOCK_TYPE_LABELS[block.type] ?? block.type}
          </Badge>
          <span className="truncate text-sm text-muted-foreground">
            {summary}
          </span>
        </button>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleDelete}
            aria-label="Supprimer le bloc"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
      </div>

      {/* Expanded editor */}
      {isExpanded && (
        <div className="space-y-3 rounded-md border bg-background-beige/50 p-3">
          {block.type === "text" && (
            <TextBlockEditor content={content} onChange={setContent} />
          )}
          {block.type === "video" && (
            <VideoBlockEditor content={content} onChange={setContent} />
          )}
          {block.type === "image" && (
            <ImageBlockEditor content={content} onChange={setContent} />
          )}
          {block.type === "quiz" && (
            <QuizBlockEditor content={content} onChange={setContent} />
          )}
          {block.type === "download" && (
            <DownloadBlockEditor
              content={content}
              onChange={setContent}
              accompagnementId={accompagnementId}
            />
          )}

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary-red hover:bg-primary-red-dark"
            >
              <Save className="mr-2 h-3.5 w-3.5" />
              {isSaving ? "..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Text Block ─────────────────────────────────────────────

const TextBlockEditor = ({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) => (
  <WysiwygEditor
    initialContent={(content.html as string) ?? ""}
    onChange={(html) => onChange({ ...content, html })}
    placeholder="Écrivez votre contenu ici..."
  />
);

// ─── Video Block ────────────────────────────────────────────

const VideoBlockEditor = ({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) => (
  <div className="space-y-3">
    <div className="space-y-2">
      <Label>Plateforme</Label>
      <Select
        value={(content.provider as string) ?? "youtube"}
        onValueChange={(v) => onChange({ ...content, provider: v })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="youtube">YouTube</SelectItem>
          <SelectItem value="vimeo">Vimeo</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label>
        {content.provider === "vimeo" ? "URL de la vidéo" : "ID de la vidéo"}
      </Label>
      <Input
        value={(content.video_id as string) ?? ""}
        onChange={(e) => onChange({ ...content, video_id: e.target.value })}
        placeholder={
          content.provider === "vimeo"
            ? "https://vimeo.com/123456789/abc123def"
            : "dQw4w9WgXcQ"
        }
      />
      {content.provider === "vimeo" && (
        <p className="text-xs text-muted-foreground">
          Collez l&apos;URL complète Vimeo (avec le code de confidentialité
          après le « / » pour les vidéos non répertoriées).
        </p>
      )}
    </div>
    <div className="space-y-2">
      <Label>Titre</Label>
      <Input
        value={(content.title as string) ?? ""}
        onChange={(e) => onChange({ ...content, title: e.target.value })}
        placeholder="Titre de la vidéo"
      />
    </div>
  </div>
);

// ─── Image Block ────────────────────────────────────────────

const ImageBlockEditor = ({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) => (
  <div className="space-y-3">
    <FileUpload
      bucket="formations"
      folder="images"
      accept="image/*"
      maxSizeMb={5}
      value={(content.url as string) ?? ""}
      onUpload={(url) => onChange({ ...content, url })}
      onRemove={() => onChange({ ...content, url: "" })}
      label="Glissez ou cliquez pour ajouter une image"
    />
    <div className="space-y-2">
      <Label>Texte alternatif (accessibilité)</Label>
      <Input
        value={(content.alt as string) ?? ""}
        onChange={(e) => onChange({ ...content, alt: e.target.value })}
        placeholder="Description de l'image"
      />
    </div>
    <div className="space-y-2">
      <Label>Légende (optionnel)</Label>
      <Input
        value={(content.caption as string) ?? ""}
        onChange={(e) => onChange({ ...content, caption: e.target.value })}
        placeholder="Légende sous l'image"
      />
    </div>
  </div>
);

// ─── Quiz Block ─────────────────────────────────────────────

type QuizOption = { id: string; text: string; is_correct: boolean };

const QuizBlockEditor = ({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) => {
  const options = (content.options as QuizOption[]) ?? [];

  const handleOptionChange = (
    index: number,
    field: keyof QuizOption,
    value: string | boolean
  ) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    onChange({ ...content, options: newOptions });
  };

  const handleAddOption = () => {
    const newOption: QuizOption = {
      id: randomUUID(),
      text: "",
      is_correct: false,
    };
    onChange({ ...content, options: [...options, newOption] });
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    onChange({
      ...content,
      options: options.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Question</Label>
        <Textarea
          value={(content.question as string) ?? ""}
          onChange={(e) => onChange({ ...content, question: e.target.value })}
          placeholder="Posez votre question..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Options de réponse</Label>
        {options.map((option, index) => (
          <div key={option.id} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={option.is_correct}
                onCheckedChange={(v) =>
                  handleOptionChange(index, "is_correct", v)
                }
                aria-label={`Option ${index + 1} est correcte`}
              />
              <span className="text-xs text-muted-foreground">
                {option.is_correct ? "Correcte" : "Incorrecte"}
              </span>
            </div>
            <Input
              value={option.text}
              onChange={(e) =>
                handleOptionChange(index, "text", e.target.value)
              }
              placeholder={`Option ${index + 1}`}
              className="flex-1"
            />
            {options.length > 2 && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => handleRemoveOption(index)}
                aria-label={`Supprimer option ${index + 1}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddOption}
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Ajouter une option
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Explication</Label>
        <Textarea
          value={(content.explanation as string) ?? ""}
          onChange={(e) =>
            onChange({ ...content, explanation: e.target.value })
          }
          placeholder="Explication affichée après la réponse..."
          rows={2}
        />
      </div>
    </div>
  );
};

// ─── Download Block ─────────────────────────────────────────

/** Extensions acceptées côté serveur pour le bucket `downloads`. */
const ATTACHMENT_ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.ods,.odp,.csv,.txt,.zip,.mp3,.wav,.m4a,.mp4,.mov,image/*";

const DownloadBlockEditor = ({
  content,
  onChange,
  accompagnementId,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  accompagnementId: string;
}) => (
  <div className="space-y-3">
    <FileUpload
      bucket="downloads"
      // Le dossier porte l'id de l'accompagnement : c'est ce que la règle
      // d'accès du bucket privé compare pour n'ouvrir le fichier qu'aux
      // personnes inscrites.
      folder={accompagnementId}
      accept={ATTACHMENT_ACCEPT}
      maxSizeMb={50}
      value={(content.url as string) ?? ""}
      onUpload={(url, file) =>
        onChange({
          ...content,
          url,
          // Le nom affiché est pré-rempli avec celui du fichier d'origine,
          // et reste modifiable juste en dessous.
          filename: (content.filename as string) || file?.name || "",
          size_bytes: file?.sizeBytes ?? content.size_bytes ?? 0,
        })
      }
      onRemove={() =>
        onChange({ ...content, url: "", filename: "", size_bytes: 0 })
      }
      label="Glissez ou cliquez pour ajouter un PDF, un support ou un document"
      previewType="file"
    />
    <div className="space-y-2">
      <Label>Nom affiché aux clientes</Label>
      <Input
        value={(content.filename as string) ?? ""}
        onChange={(e) => onChange({ ...content, filename: e.target.value })}
        placeholder="Ex : Guide de l'allaitement (PDF)"
      />
      <p className="text-xs text-muted-foreground">
        PDF, Word, PowerPoint, Excel, audio, vidéo ou image, 50 Mo maximum. Le
        fichier apparaît dans la leçon et dans le panneau « Ressources ».
      </p>
    </div>
  </div>
);

// ─── Helpers ────────────────────────────────────────────────

const SUMMARY_MAX_LENGTH = 80;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  laquo: "«",
  raquo: "»",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  // Table de décodage : chaque entité doit rendre son caractère exact. La
  // chasse aux tirets cadratins porte sur les textes, pas sur ce décodeur.
  mdash: "—",
  ndash: "–",
  eacute: "é",
  egrave: "è",
  ecirc: "ê",
  agrave: "à",
  ccedil: "ç",
  ugrave: "ù",
  ocirc: "ô",
  icirc: "î",
  iuml: "ï",
};

/** Décode les entités HTML (numériques + nommées courantes). Sans DOM, donc SSR-safe. */
const decodeEntities = (input: string): string =>
  input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(Number.parseInt(dec, 10))
    )
    .replace(
      /&([a-z]+);/gi,
      (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match
    );

const truncate = (text: string): string => {
  if (text.length <= SUMMARY_MAX_LENGTH) return text;
  const cut = text.slice(0, SUMMARY_MAX_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};

/** Titre du premier heading si le contenu en ouvre un, sinon première ligne non vide. */
const getTextSummary = (html: string): string => {
  const heading = html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
  const headingIsFirst =
    heading !== null &&
    html.slice(0, heading.index).replace(/<[^>]*>/g, "").trim() === "";

  const source = headingIsFirst ? heading[1] : html;
  const lines = decodeEntities(
    source
      // les balises bloc séparent le texte : sans ça les lignes se collent
      .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return lines[0] ?? "";
};

const getBlockSummary = (
  type: string,
  content: Record<string, unknown>
): string => {
  switch (type) {
    case "text": {
      const text = getTextSummary((content.html as string) ?? "");
      return text ? truncate(text) : "Texte vide";
    }
    case "video":
      return (content.title as string) || "Vidéo sans titre";
    case "image":
      return (content.alt as string) || "Image";
    case "quiz": {
      const question = (content.question as string) ?? "";
      return question ? truncate(decodeEntities(question)) : "Quiz sans question";
    }
    case "download":
      return (content.filename as string) || "Pièce jointe";
    default:
      return "Bloc";
  }
};
