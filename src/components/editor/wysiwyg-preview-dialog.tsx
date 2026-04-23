"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WysiwygPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
};

export const WysiwygPreviewDialog = ({
  open,
  onOpenChange,
  html,
}: WysiwygPreviewDialogProps) => {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden rounded-3xl p-0 sm:max-w-4xl">
        <div className="flex flex-col">
          <DialogHeader className="border-b border-border/50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="font-serif text-xl text-primary-green">
                  Aperçu du contenu
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Rendu tel qu&apos;il apparaîtra côté client.
                </DialogDescription>
              </div>
              <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border/60 bg-background-beige p-1">
                <Button
                  size="sm"
                  variant={viewport === "desktop" ? "default" : "ghost"}
                  className={cn(
                    "h-7 rounded-md px-2",
                    viewport === "desktop"
                      ? "bg-primary-red hover:bg-primary-red-dark"
                      : ""
                  )}
                  onClick={() => setViewport("desktop")}
                  aria-label="Aperçu desktop"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant={viewport === "mobile" ? "default" : "ghost"}
                  className={cn(
                    "h-7 rounded-md px-2",
                    viewport === "mobile"
                      ? "bg-primary-red hover:bg-primary-red-dark"
                      : ""
                  )}
                  onClick={() => setViewport("mobile")}
                  aria-label="Aperçu mobile"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto bg-background-beige p-6">
            <div
              className={cn(
                "mx-auto rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all",
                viewport === "mobile" ? "max-w-sm" : "max-w-3xl"
              )}
            >
              {html.trim() ? (
                <div
                  className="prose prose-green max-w-none"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Aucun contenu à prévisualiser.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
