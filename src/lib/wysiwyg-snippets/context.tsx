"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSnippet, type WysiwygSnippet } from "./actions";

type SnippetsContextValue = {
  snippets: WysiwygSnippet[];
  requestSave: (html: string) => void;
};

const WysiwygSnippetsContext = createContext<SnippetsContextValue | null>(null);

type ProviderProps = {
  initialSnippets: WysiwygSnippet[];
  children: React.ReactNode;
};

export const WysiwygSnippetsProvider = ({
  initialSnippets,
  children,
}: ProviderProps) => {
  const router = useRouter();
  const [pendingHtml, setPendingHtml] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const requestSave = useCallback((html: string) => {
    setPendingHtml(html);
    setName("");
    setCategory("");
  }, []);

  const handleClose = () => {
    if (saving) return;
    setPendingHtml(null);
    setName("");
    setCategory("");
  };

  const handleConfirm = async () => {
    if (!pendingHtml || !name.trim()) return;
    setSaving(true);
    const res = await createSnippet({
      name: name.trim(),
      html: pendingHtml,
      category: category.trim() || undefined,
    });
    setSaving(false);
    if (res.success) {
      toast.success("Snippet sauvegardé");
      setPendingHtml(null);
      setName("");
      setCategory("");
      router.refresh();
    } else {
      toast.error(res.error ?? "Erreur");
    }
  };

  const value = useMemo(
    () => ({ snippets: initialSnippets, requestSave }),
    [initialSnippets, requestSave]
  );

  return (
    <WysiwygSnippetsContext.Provider value={value}>
      {children}

      <Dialog
        open={pendingHtml !== null}
        onOpenChange={(o) => {
          if (!o) handleClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-primary-green">
              Sauvegarder ce snippet
            </DialogTitle>
            <DialogDescription>
              Ce bloc sera disponible dans la bibliothèque pour tous les
              administrateurs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="snippet-name">Nom</Label>
              <Input
                id="snippet-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. CTA prendre RDV"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="snippet-category">
                Catégorie <span className="text-muted-foreground">(optionnel)</span>
              </Label>
              <Input
                id="snippet-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="CTAs, Encadrés, Intros…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={saving || !name.trim()}
              className="bg-primary-red hover:bg-primary-red-dark"
            >
              {saving ? "Enregistrement…" : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WysiwygSnippetsContext.Provider>
  );
};

export const useWysiwygSnippets = () => useContext(WysiwygSnippetsContext);
