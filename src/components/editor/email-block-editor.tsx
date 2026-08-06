"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Editor as MailyEditor } from "@maily-to/core";
import {
  MailyKit,
  ColumnExtension,
  VariableExtension,
  ImageUploadExtension,
  getVariableSuggestions,
  type Variable,
} from "@maily-to/core/extensions";
import type { JSONContent } from "@maily-to/render";
import { uploadFileAction } from "@/lib/storage/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  Crop,
  Info,
  Lightbulb,
  AlertTriangle,
  XCircle,
  MessageSquare,
  Image as ImageIcon,
  PanelTop,
} from "lucide-react";
import { EmailPreviewDialog } from "./email-preview-dialog";
import { ImageCropDialog } from "./image-crop-dialog";
import {
  CALLOUT_PRESETS,
  buildCalloutSectionNode,
  type CalloutVariant,
} from "./email-callout-presets";
import { toPlainDesign, mimeToExt } from "./email-block-helpers";
import {
  buildBannerNode,
  buildLogoNode,
  type EmailBranding,
} from "@/lib/emails/branding";
import { getEmailBrandingAction } from "@/lib/emails/branding-action";
import "@maily-to/core/style.css";

/**
 * Minimal shape of the Tiptap editor we rely on — kept loose because Maily's
 * Tiptap v3 types conflict with the v2 copy pulled in by Novel. Adding a hard
 * dep on @tiptap/core as a runtime package would double-bundle ProseMirror.
 */
type TiptapEditorLike = {
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler: () => void) => void;
  state: {
    selection: {
      node?: { type: { name: string }; attrs: Record<string, unknown> };
      from: number;
    };
  };
  chain: () => {
    focus: () => {
      setNodeSelection: (pos: number) => {
        updateAttributes: (
          name: string,
          attrs: Record<string, unknown>,
        ) => { run: () => boolean };
      };
      insertContent: (content: unknown) => { run: () => boolean };
    };
  };
};

type EmailBlockEditorProps = {
  /** Stored Maily JSON content (or null for blank). */
  initialDesign?: JSONContent | null;
  /** Fires with JSON design on every edit. */
  onChange: (design: JSONContent) => void;
  /** List of available template variables (without {{}}). */
  variables?: readonly string[];
  /** Subfolder inside `mails` bucket for uploads. */
  uploadFolder?: string;
  /** Optional subject passed through to the preview dialog. */
  previewSubject?: string;
  className?: string;
};

export const EmailBlockEditor = ({
  initialDesign,
  onChange,
  variables = [],
  uploadFolder = "content",
  previewSubject,
  className,
}: EmailBlockEditorProps) => {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editorRef = useRef<TiptapEditorLike | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    pos: number;
  } | null>(null);

  // Latest design captured from onUpdate — used by the preview dialog without
  // forcing a re-render of the editor on every keystroke.
  const liveDesignRef = useRef<JSONContent | null>(initialDesign ?? null);
  const [previewSnapshot, setPreviewSnapshot] = useState<JSONContent | null>(
    initialDesign ?? null,
  );

  // Logo et banniere pre-definis dans l'administration. Charges une fois a
  // l'ouverture de l'editeur : les boutons d'insertion restent desactives tant
  // qu'aucun visuel n'est configure, plutot que d'inserer un bloc vide.
  const [branding, setBranding] = useState<EmailBranding | null>(null);
  useEffect(() => {
    let active = true;
    getEmailBrandingAction()
      .then((b) => {
        if (active) setBranding(b);
      })
      .catch(() => {
        // Sans reglages, l'editeur fonctionne normalement, sans les raccourcis.
      });
    return () => {
      active = false;
    };
  }, []);

  const canInsertLogo = Boolean(branding && buildLogoNode(branding));
  const canInsertBanner = Boolean(branding && buildBannerNode(branding));

  const handleImageUpload = useCallback(
    async (file: Blob): Promise<string> => {
      const formData = new FormData();
      // Blob from Maily may not carry a name — fall back to a timestamped one.
      const name =
        file instanceof File && file.name
          ? file.name
          : `image-${Date.now()}.${mimeToExt(file.type)}`;
      const fileObj = file instanceof File ? file : new File([file], name, { type: file.type });
      formData.set("file", fileObj);
      formData.set("bucket", "mails");
      formData.set("folder", uploadFolder);

      const result = await uploadFileAction(formData);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Upload failed");
      }
      return result.data.url;
    },
    [uploadFolder]
  );

  const variableItems: Variable[] = useMemo(
    () =>
      variables.map((v) => ({
        name: v,
        // no fallback value — renderer keeps {{v}} if unset at send time.
        required: false,
      })),
    [variables]
  );

  const extensions = useMemo(
    () => [
      // Default Maily ColumnExtension only accepts `block+` — can't nest a
      // `columns` node inside a column (group: "columns"). Disable the default
      // and register an extended one that accepts `(block|columns)+` so
      // layouts like "3 logos in a column" work.
      MailyKit.configure({ column: false }),
      ColumnExtension.extend({ content: "(block|columns)+" }),
      VariableExtension.configure({
        suggestion: getVariableSuggestions(),
        variables: variableItems,
      }),
      ImageUploadExtension.configure({
        onImageUpload: handleImageUpload,
      }),
    ],
    [variableItems, handleImageUpload]
  );

  const handleUpdate = useCallback((e: { getJSON: () => JSONContent }) => {
    // Normalise on every update rather than only when a `blob:` src is
    // detected: the raw Tiptap JSON is what consumers hand straight to server
    // actions (save, test send, preview), and anything non-serialisable in it
    // becomes a temporary client reference that blows up server-side rendering.
    const json = toPlainDesign(e.getJSON());
    liveDesignRef.current = json;
    onChangeRef.current(json);
  }, []);

  const openPreview = useCallback(() => {
    // `liveDesignRef` is already normalised by `handleUpdate`, but the initial
    // design comes straight from props — normalise again so the preview action
    // never receives a non-serialisable node.
    const live = liveDesignRef.current;
    setPreviewSnapshot(live ? toPlainDesign(live) : null);
    setPreviewOpen(true);
  }, []);

  /**
   * Watch the editor's selection — when an image node is selected, remember
   * its src + position so the "Rogner" button can act on it.
   */
  const handleCreate = useCallback((e: unknown) => {
    const editor = e as TiptapEditorLike;
    editorRef.current = editor;

    const syncSelection = () => {
      const sel = editor.state.selection;
      const node = sel.node;
      if (node && node.type.name === "image") {
        const src = node.attrs.src;
        if (typeof src === "string" && src.length > 0) {
          setSelectedImage({ src, pos: sel.from });
          return;
        }
      }
      setSelectedImage(null);
    };

    // `selectionUpdate` fires only when the selection actually changes —
    // avoids firing `syncSelection` on every keystroke (the "transaction"
    // event would over-trigger state updates).
    editor.on("selectionUpdate", syncSelection);
    syncSelection();
  }, []);

  const handleInsertCallout = useCallback((variant: CalloutVariant) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.chain().focus().insertContent(buildCalloutSectionNode(variant)).run();
  }, []);

  const handleInsertBranding = useCallback(
    (kind: "logo" | "banner") => {
      const editor = editorRef.current;
      if (!editor || !branding) return;
      const node =
        kind === "logo" ? buildLogoNode(branding) : buildBannerNode(branding);
      if (!node) return;
      editor.chain().focus().insertContent(node).run();
    },
    [branding],
  );

  const handleCropped = useCallback((url: string) => {
    const editor = editorRef.current;
    if (!editor || !selectedImage) return;
    editor
      .chain()
      .focus()
      .setNodeSelection(selectedImage.pos)
      .updateAttributes("image", { src: url })
      .run();
  }, [selectedImage]);

  return (
    <div
      className={`email-block-editor ${className ?? ""}`}
      // Maily ships its own styles under mly: prefix — no Tailwind conflict.
    >
      <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canInsertLogo && !canInsertBanner}
              title={
                canInsertLogo || canInsertBanner
                  ? "Insérer le logo ou la bannière pré-définis"
                  : "Aucun visuel configuré — Paramètres plateforme › Identité visuelle des emails"
              }
            >
              <PanelTop className="mr-2 h-4 w-4" />
              Éléments de marque
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={!canInsertLogo}
              onClick={() => handleInsertBranding("logo")}
            >
              <PanelTop className="mr-2 h-4 w-4 text-primary-green" />
              Insérer le logo
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canInsertBanner}
              onClick={() => handleInsertBranding("banner")}
            >
              <ImageIcon className="mr-2 h-4 w-4 text-primary-red" />
              Insérer la bannière
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <MessageSquare className="mr-2 h-4 w-4" />
              Insérer un encart
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleInsertCallout("info")}>
              <Info className="mr-2 h-4 w-4 text-primary-green" />
              {CALLOUT_PRESETS.info.label}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleInsertCallout("tip")}>
              <Lightbulb className="mr-2 h-4 w-4 text-primary-red" />
              {CALLOUT_PRESETS.tip.label}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleInsertCallout("warning")}>
              <AlertTriangle className="mr-2 h-4 w-4 text-amber-600" />
              {CALLOUT_PRESETS.warning.label}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleInsertCallout("error")}>
              <XCircle className="mr-2 h-4 w-4 text-red-700" />
              {CALLOUT_PRESETS.error.label}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!selectedImage}
          onClick={() => setCropOpen(true)}
          title={
            selectedImage
              ? "Rogner l'image sélectionnée"
              : "Sélectionne une image dans l'éditeur"
          }
        >
          <Crop className="mr-2 h-4 w-4" />
          Rogner l&apos;image
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openPreview}
        >
          <Eye className="mr-2 h-4 w-4" />
          Aperçu
        </Button>
      </div>
      {/*
        Constrain the editing surface to the rendered email width (Maily ships
        emails at 600px max-width, so the WYSIWYG mirrors the inbox layout).
        Maily's own DOM is targeted via #mly-editor — we scope a width on the
        wrapper so any toolbar/popovers stay inside the viewport.
      */}
      <div className="mx-auto max-w-160 [&_#mly-editor]:max-w-full!">
        <MailyEditor
          contentJson={initialDesign ?? undefined}
          extensions={extensions}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          config={{
            hasMenuBar: true,
            spellCheck: true,
            immediatelyRender: false,
          }}
        />
      </div>
      <EmailPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        design={previewSnapshot as Record<string, unknown> | null}
        variables={variables}
        subject={previewSubject}
      />
      <ImageCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        src={selectedImage?.src ?? null}
        bucket="mails"
        uploadFolder={uploadFolder}
        onCropped={handleCropped}
      />
      {variables.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Variables disponibles&nbsp;:&nbsp;
          {variables.map((v) => (
            <code key={v} className="mx-0.5 rounded bg-muted px-1 font-mono text-[11px]">
              {`{{${v}}}`}
            </code>
          ))}
          <span className="ml-1">
            Tape <kbd className="rounded bg-muted px-1">@</kbd> dans l&apos;éditeur pour insérer.
          </span>
        </p>
      )}
    </div>
  );
};
