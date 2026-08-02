"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Square, RectangleHorizontal, RectangleVertical } from "lucide-react";
import { toast } from "sonner";
import { uploadFileAction } from "@/lib/storage/actions";
import type { StorageBucket } from "@/lib/storage/helpers";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current image URL (Supabase public URL). */
  src: string | null;
  /** Bucket subfolder for the cropped upload. */
  uploadFolder: string;
  /** Bucket to upload the cropped image to. */
  bucket: StorageBucket;
  /** Called with the new public URL after crop is saved. */
  onCropped: (url: string) => void;
  /** Ratio pré-sélectionné à l'ouverture (« libre » par défaut). */
  defaultAspect?: AspectPreset;
};

type AspectPreset = "free" | "1:1" | "16:9" | "4:3" | "3:4";

const ASPECTS: Record<AspectPreset, number | undefined> = {
  free: undefined,
  "1:1": 1,
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
};

/** Build a centered default crop covering 90% of the image at the chosen aspect. */
const makeDefaultCrop = (
  mediaWidth: number,
  mediaHeight: number,
  aspect: number | undefined,
): Crop =>
  centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect ?? mediaWidth / mediaHeight,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );

export const ImageCropDialog = ({
  open,
  onOpenChange,
  src,
  uploadFolder,
  bucket,
  onCropped,
  defaultAspect = "free",
}: Props) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<AspectPreset>(defaultAspect);
  const [saving, setSaving] = useState(false);

  // Reset when dialog opens with a new src
  useEffect(() => {
    if (open) {
      setCrop(undefined);
      setCompleted(undefined);
    }
  }, [open, src]);

  // `crossOrigin` MUST be set BEFORE `src` for the browser to issue a CORS
  // request — otherwise `canvas.toBlob()` throws SecurityError on the
  // tainted canvas. Setting via ref guarantees attribute order.
  useEffect(() => {
    if (!open || !src) return;
    const img = imgRef.current;
    if (!img) return;
    img.crossOrigin = "anonymous";
    img.src = src;
  }, [open, src]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      const c = makeDefaultCrop(naturalWidth, naturalHeight, ASPECTS[aspect]);
      setCrop(c);
    },
    [aspect],
  );

  const onAspectChange = useCallback(
    (preset: AspectPreset) => {
      setAspect(preset);
      if (imgRef.current) {
        const { naturalWidth, naturalHeight } = imgRef.current;
        setCrop(makeDefaultCrop(naturalWidth, naturalHeight, ASPECTS[preset]));
      }
    },
    [],
  );

  const cropToBlob = useCallback(async (): Promise<Blob | null> => {
    const img = imgRef.current;
    if (!img || !completed || completed.width === 0 || completed.height === 0) {
      return null;
    }

    // scale between display size and natural size
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(completed.width * scaleX);
    canvas.height = Math.round(completed.height * scaleY);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      img,
      completed.x * scaleX,
      completed.y * scaleY,
      completed.width * scaleX,
      completed.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    // JPEG keeps file size sane for server actions (1 MB default → we bumped
    // it to 50 MB, but a 5 MB PNG still wastes bandwidth for a photo crop).
    // Fill with white first so transparent corners don't go black in JPEG.
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
    });
  }, [completed]);

  const handleSave = useCallback(async () => {
    if (!completed) {
      toast.error("Sélectionne une zone à rogner.");
      return;
    }
    setSaving(true);
    try {
      const blob = await cropToBlob();
      if (!blob) {
        toast.error("Rognage échoué.");
        return;
      }

      const file = new File([blob], `crop-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const fd = new FormData();
      fd.set("file", file);
      fd.set("bucket", bucket);
      fd.set("folder", uploadFolder);

      const result = await uploadFileAction(fd);
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Upload échoué.");
        return;
      }

      onCropped(result.data.url);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }, [completed, cropToBlob, bucket, uploadFolder, onCropped, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Rogner l&apos;image</DialogTitle>
          <DialogDescription>
            Sélectionne la zone à conserver. L&apos;image rognée est
            ré-uploadée et remplace l&apos;originale dans l&apos;éditeur.
          </DialogDescription>
        </DialogHeader>

        {/* Aspect presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Format :</span>
          <Button
            type="button"
            variant={aspect === "free" ? "default" : "outline"}
            size="sm"
            onClick={() => onAspectChange("free")}
          >
            Libre
          </Button>
          <Button
            type="button"
            variant={aspect === "1:1" ? "default" : "outline"}
            size="sm"
            onClick={() => onAspectChange("1:1")}
          >
            <Square className="mr-1 h-4 w-4" />
            1:1
          </Button>
          <Button
            type="button"
            variant={aspect === "16:9" ? "default" : "outline"}
            size="sm"
            onClick={() => onAspectChange("16:9")}
          >
            <RectangleHorizontal className="mr-1 h-4 w-4" />
            16:9
          </Button>
          <Button
            type="button"
            variant={aspect === "4:3" ? "default" : "outline"}
            size="sm"
            onClick={() => onAspectChange("4:3")}
          >
            <RectangleHorizontal className="mr-1 h-4 w-4" />
            4:3
          </Button>
          <Button
            type="button"
            variant={aspect === "3:4" ? "default" : "outline"}
            size="sm"
            onClick={() => onAspectChange("3:4")}
          >
            <RectangleVertical className="mr-1 h-4 w-4" />
            3:4
          </Button>
        </div>

        {/* Crop area */}
        <div className="max-h-[65vh] overflow-auto rounded-md border bg-muted/30 p-4">
          {src ? (
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompleted(c)}
              aspect={ASPECTS[aspect]}
              keepSelection
              ruleOfThirds
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                // `src` + `crossOrigin` set imperatively via ref (see effect
                // above) — setting them in JSX leaves the attr order up to
                // React and may taint the canvas.
                alt="À rogner"
                onLoad={onImageLoad}
                className="max-h-[55vh] max-w-full"
              />
            </ReactCrop>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune image.</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || !completed}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Appliquer le rognage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
