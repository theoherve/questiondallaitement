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
  formationId: string;
};

const BLOCK_TYPE_LABELS: Record<string, string> = {
  text: "Texte",
  video: "Vidéo",
  image: "Image",
  quiz: "Quiz",
  download: "Téléchargement",
};

export const BlockEditor = ({ block, formationId }: BlockEditorProps) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState(block.content);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateBlock(block.id, formationId, content);
    setIsSaving(false);

    if (result.success) {
      toast.success("Bloc enregistré");
    } else {
      toast.error(result.error ?? "Erreur");
    }
  };

  const handleDelete = async () => {
    const result = await deleteBlock(block.id, formationId);
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
            <DownloadBlockEditor content={content} onChange={setContent} />
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
      <Label>ID de la vidéo</Label>
      <Input
        value={(content.video_id as string) ?? ""}
        onChange={(e) => onChange({ ...content, video_id: e.target.value })}
        placeholder={
          content.provider === "vimeo" ? "123456789" : "dQw4w9WgXcQ"
        }
      />
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

const DownloadBlockEditor = ({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) => (
  <div className="space-y-3">
    <FileUpload
      bucket="downloads"
      folder="formations"
      accept="*/*"
      maxSizeMb={50}
      value={(content.url as string) ?? ""}
      onUpload={(url) => onChange({ ...content, url })}
      onRemove={() => onChange({ ...content, url: "", filename: "" })}
      label="Glissez ou cliquez pour ajouter un fichier"
      previewType="file"
    />
    <div className="space-y-2">
      <Label>Nom du fichier affiché</Label>
      <Input
        value={(content.filename as string) ?? ""}
        onChange={(e) => onChange({ ...content, filename: e.target.value })}
        placeholder="Ex: guide-allaitement.pdf"
      />
    </div>
  </div>
);

// ─── Helpers ────────────────────────────────────────────────

const getBlockSummary = (
  type: string,
  content: Record<string, unknown>
): string => {
  switch (type) {
    case "text": {
      const html = (content.html as string) ?? "";
      const text = html.replace(/<[^>]*>/g, "").slice(0, 60);
      return text || "Texte vide";
    }
    case "video":
      return (content.title as string) || "Vidéo sans titre";
    case "image":
      return (content.alt as string) || "Image";
    case "quiz":
      return (content.question as string)?.slice(0, 60) || "Quiz sans question";
    case "download":
      return (content.filename as string) || "Fichier";
    default:
      return "Bloc";
  }
};
