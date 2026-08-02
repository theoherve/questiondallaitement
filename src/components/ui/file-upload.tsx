"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, FileIcon, Loader2, Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageCropDialog } from "@/components/editor/image-crop-dialog";
import { uploadFileAction } from "@/lib/storage/actions";
import type { StorageBucket } from "@/lib/storage/helpers";

/** Métadonnées du fichier d'origine, utiles pour pré-remplir nom et poids. */
export type UploadedFileInfo = {
  name: string;
  sizeBytes: number;
};

type FileUploadProps = {
  bucket: StorageBucket;
  folder: string;
  accept?: string;
  maxSizeMb?: number;
  value?: string;
  onUpload: (url: string, file?: UploadedFileInfo) => void;
  onRemove?: () => void;
  label?: string;
  previewType?: "image" | "file";
  /**
   * Propose le rognage de l'image après upload. Le fichier rogné est
   * ré-uploadé dans le même bucket et remplace la valeur courante.
   */
  cropable?: boolean;
  /** Ratio pré-sélectionné dans la fenêtre de rognage. */
  cropAspect?: "free" | "1:1" | "16:9" | "4:3" | "3:4";
};

export const FileUpload = ({
  bucket,
  folder,
  accept = "image/*",
  maxSizeMb = 5,
  value,
  onUpload,
  onRemove,
  label = "Choisir un fichier",
  previewType = "image",
  cropable = previewType === "image",
  cropAspect = "free",
}: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);

      if (file.size > maxSizeMb * 1024 * 1024) {
        setError(`Le fichier dépasse ${maxSizeMb} Mo`);
        return;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("bucket", bucket);
        formData.set("folder", folder);

        const result = await uploadFileAction(formData);
        if (!result.success || !result.data) {
          setError(result.error ?? "Erreur lors de l'upload");
          return;
        }
        onUpload(result.data.url, { name: file.name, sizeBytes: file.size });
      } catch {
        setError("Erreur lors de l'upload");
      } finally {
        setIsUploading(false);
      }
    },
    [bucket, folder, maxSizeMb, onUpload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  if (value) {
    const isImage = previewType === "image";

    return (
      <div className="space-y-2">
        <div className="relative">
          {isImage ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-background-beige-dark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Aperçu de l'image"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border bg-background-beige-dark px-3 py-2">
              <FileIcon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">
                {value.split("/").pop()}
              </span>
            </div>
          )}
          {onRemove && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
              onClick={onRemove}
              aria-label="Supprimer le fichier"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {isImage && (
          <div className="flex flex-wrap gap-2">
            {cropable && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCropOpen(true)}
              >
                <Crop className="mr-2 h-3.5 w-3.5" />
                Recadrer
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="mr-2 h-3.5 w-3.5" />
              {isUploading ? "Upload en cours…" : "Remplacer"}
            </Button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {cropable && (
          <ImageCropDialog
            open={cropOpen}
            onOpenChange={setCropOpen}
            src={value}
            bucket={bucket}
            uploadFolder={folder}
            defaultAspect={cropAspect}
            onCropped={(url) => onUpload(url)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
          dragActive
            ? "border-primary-red bg-primary-red/5"
            : "border-muted-foreground/25 hover:border-primary-red/50"
        }`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary-red" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          {isUploading ? "Upload en cours..." : label}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Max {maxSizeMb} Mo
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
