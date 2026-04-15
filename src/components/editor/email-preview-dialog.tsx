"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Monitor,
  Smartphone,
  RefreshCcw,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { toast } from "sonner";
import { previewEmailHtml } from "@/lib/emails/preview-action";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Live design from the editor (captured each render in parent). */
  design: Record<string, unknown> | null;
  /** Variables available in the current template. */
  variables: readonly string[];
  /** Subject (optional) rendered above the preview for context. */
  subject?: string;
};

type Device = "desktop" | "mobile";

export const EmailPreviewDialog = ({
  open,
  onOpenChange,
  design,
  variables,
  subject,
}: Props) => {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(600);

  const hasDesign = useMemo(
    () => !!design && Object.keys(design).length > 0,
    [design],
  );

  const render = useCallback(async () => {
    if (!hasDesign || !design) return;
    setLoading(true);
    try {
      const result = await previewEmailHtml(design, overrides);
      if (result.success && result.data) {
        setHtml(result.data.html);
      } else {
        toast.error(result.error ?? "Rendu échoué");
      }
    } finally {
      setLoading(false);
    }
  }, [design, hasDesign, overrides]);

  // Re-render on open, or whenever design/overrides change while open.
  // Variable overrides debounce 400ms — each keystroke would otherwise hit
  // the `previewEmailHtml` server action (Maily render + juice CSS inlining
  // is ~100-300ms).
  useEffect(() => {
    if (!open || !hasDesign) return;
    const timer = setTimeout(() => {
      render();
    }, 400);
    return () => clearTimeout(timer);
  }, [open, hasDesign, render]);

  // Auto-size iframe to its content once loaded (no arbitrary cap — the
  // parent container handles scrolling for very tall emails).
  const onIframeLoad = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const h = Math.max(
      doc.documentElement.scrollHeight,
      doc.body?.scrollHeight ?? 0,
    );
    if (h > 0) setIframeHeight(h + 16);
  }, []);

  // Switching device width changes wrapper size — re-measure the iframe
  // content so the mobile preview isn't stuck at desktop height.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onIframeLoad, 50);
    return () => clearTimeout(t);
  }, [device, open, onIframeLoad, html]);

  const maxWidth = device === "mobile" ? 375 : 640;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95vh] w-[95vw] max-w-7xl flex-col gap-0 overflow-hidden p-0 sm:max-w-7xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Aperçu de l&apos;email</DialogTitle>
          <DialogDescription>
            Rendu final avec des valeurs d&apos;exemple — tel qu&apos;il sera
            reçu dans la boîte mail.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Preview pane */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-muted/30">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 border-b bg-background px-4 py-2">
              <div className="flex items-center gap-1 rounded-md border p-1">
                <Button
                  type="button"
                  variant={device === "desktop" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setDevice("desktop")}
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  Desktop
                </Button>
                <Button
                  type="button"
                  variant={device === "mobile" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setDevice("mobile")}
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  Mobile
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={render}
                  disabled={loading || !hasDesign}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="mr-2 h-4 w-4" />
                  )}
                  Rafraîchir
                </Button>
                {variables.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSidebarOpen((v) => !v)}
                  >
                    {sidebarOpen ? (
                      <PanelRightClose className="mr-2 h-4 w-4" />
                    ) : (
                      <PanelRightOpen className="mr-2 h-4 w-4" />
                    )}
                    Variables
                  </Button>
                )}
              </div>
            </div>

            {/* Scroll container */}
            <div className="flex-1 overflow-auto p-6">
              {/* Subject preview */}
              {subject && (
                <div
                  className="mx-auto mb-4 rounded-md border bg-background px-4 py-2 text-sm shadow-sm"
                  style={{ maxWidth }}
                >
                  <span className="text-muted-foreground">Objet : </span>
                  <span className="font-medium">{subject}</span>
                </div>
              )}

              {/* Iframe */}
              <div
                className="mx-auto overflow-hidden rounded-md border bg-white shadow-sm transition-[max-width] duration-200"
                style={{ maxWidth }}
              >
                {hasDesign ? (
                  <iframe
                    ref={iframeRef}
                    title="Aperçu email"
                    srcDoc={
                      html ||
                      "<p style='padding:24px;color:#666;font-family:sans-serif'>Chargement...</p>"
                    }
                    sandbox="allow-same-origin"
                    onLoad={onIframeLoad}
                    style={{ height: iframeHeight }}
                    className="w-full"
                  />
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Ajoute du contenu dans l&apos;éditeur pour voir un aperçu.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Variable overrides — collapsible */}
          {variables.length > 0 && sidebarOpen && (
            <aside className="w-72 shrink-0 overflow-y-auto border-l bg-background p-4">
              <h3 className="mb-1 text-sm font-semibold">Variables</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Laisse vide pour garder la valeur d&apos;exemple par défaut.
              </p>
              <div className="space-y-3">
                {variables.map((v) => (
                  <div key={v}>
                    <Label
                      className="mb-1 block font-mono text-[11px]"
                      htmlFor={`var-${v}`}
                    >
                      {`{{${v}}}`}
                    </Label>
                    <Input
                      id={`var-${v}`}
                      value={overrides[v] ?? ""}
                      onChange={(e) =>
                        setOverrides((prev) => ({
                          ...prev,
                          [v]: e.target.value,
                        }))
                      }
                      placeholder="(exemple)"
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
