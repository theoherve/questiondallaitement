"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, FolderOpen, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getAttachmentUrl } from "../actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type FormationResource = {
  blockId: string;
  sectionId: string;
  sectionTitle: string;
  url: string;
  filename: string;
  sizeBytes: number;
};

type ResourcesPanelProps = {
  resources: FormationResource[];
  formationId: string;
};

const formatSize = (bytes: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export const ResourcesPanel = ({
  resources,
  formationId,
}: ResourcesPanelProps) => {
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  /**
   * Le bucket des pièces jointes est privé : on demande au serveur un lien
   * signé au moment du clic plutôt que d'exposer une URL permanente.
   */
  const handleDownload = async (resource: FormationResource) => {
    setPendingId(resource.blockId);
    try {
      const result = await getAttachmentUrl(formationId, resource.blockId);
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Téléchargement indisponible");
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    } finally {
      setPendingId(null);
    }
  };

  if (resources.length === 0) return null;

  // Group by section, preserving section order.
  const bySection = new Map<string, FormationResource[]>();
  for (const r of resources) {
    const arr = bySection.get(r.sectionId) ?? [];
    arr.push(r);
    bySection.set(r.sectionId, arr);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          tabIndex={0}
          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border border-accent-honey/40 bg-accent-honey-soft/50 px-3 py-2.5 text-left transition-all hover:border-accent-honey hover:bg-accent-honey-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-red"
          aria-label={`Voir les ${resources.length} ressources téléchargeables`}
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-honey/40 text-primary-red">
              <FolderOpen className="h-4 w-4" aria-hidden />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-primary-green">
                Ressources
              </span>
              <span className="text-[11px] text-muted-foreground">
                {resources.length} fichier{resources.length > 1 ? "s" : ""}
              </span>
            </span>
          </span>
          <Sparkles className="h-3.5 w-3.5 text-accent-honey" aria-hidden />
        </button>
      </DialogTrigger>

      <DialogContent className="overflow-hidden rounded-3xl border-accent-honey-soft bg-linear-to-br from-background-beige via-accent-cream to-accent-honey-soft/40 p-0 sm:max-w-xl">
        <div className="relative max-h-[80vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary-red">
              <FolderOpen className="h-3.5 w-3.5" aria-hidden />
              Toutes les ressources
            </div>
            <DialogTitle className="font-serif text-2xl font-bold text-primary-green">
              {resources.length} fichier{resources.length > 1 ? "s" : ""} à télécharger
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Retrouvez ici tous les documents associés à cet accompagnement.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-5">
            {Array.from(bySection.entries()).map(([sectionId, items]) => (
              <motion.div
                key={sectionId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-2"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-green">
                  {items[0].sectionTitle}
                </p>
                <ul className="space-y-2">
                  {items.map((r) => (
                    <li key={r.blockId}>
                      <button
                        type="button"
                        onClick={() => handleDownload(r)}
                        disabled={pendingId === r.blockId}
                        aria-label={`Télécharger ${r.filename}`}
                        className="group flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary-red/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-red disabled:opacity-60"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-peach-soft text-primary-red group-hover:bg-accent-peach/40">
                          <FileText className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-primary-green">
                            {r.filename}
                          </span>
                          {r.sizeBytes > 0 && (
                            <span className="block text-[11px] text-muted-foreground">
                              {formatSize(r.sizeBytes)}
                            </span>
                          )}
                        </span>
                        {pendingId === r.blockId ? (
                          <Loader2
                            className="h-4 w-4 shrink-0 animate-spin text-primary-red"
                            aria-hidden
                          />
                        ) : (
                          <Download
                            className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary-red"
                            aria-hidden
                          />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <Button
            onClick={() => setOpen(false)}
            variant="outline"
            className="mt-6 w-full rounded-2xl"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
