"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAttachmentUrl } from "../../actions";

type DownloadBlockProps = {
  content: {
    url: string;
    filename: string;
    size_bytes: number;
  };
  accompagnementId: string;
  blockId: string;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export const DownloadBlock = ({
  content,
  accompagnementId,
  blockId,
}: DownloadBlockProps) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Les pièces jointes vivent dans un bucket privé : le lien direct ne
      // s'ouvre pas. Le serveur vérifie l'inscription et renvoie un lien signé.
      const result = await getAttachmentUrl(accompagnementId, blockId);
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Téléchargement indisponible");
        return;
      }

      const link = document.createElement("a");
      link.href = result.data.url;
      link.download = content.filename;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-red/10">
        <FileText className="h-5 w-5 text-primary-red" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-primary-green">{content.filename}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(content.size_bytes)}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Download className="mr-1 h-3 w-3" />
        )}
        Télécharger
      </Button>
    </div>
  );
};
