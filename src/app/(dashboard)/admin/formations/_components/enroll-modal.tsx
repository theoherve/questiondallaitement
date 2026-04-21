"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Search, UserPlus, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  searchClientsForEnroll,
  manualEnrollExistingClient,
  manualEnrollNewClient,
  type ClientSearchResult,
} from "@/app/(dashboard)/admin/formations/[id]/enroll-actions";

type EnrollModalProps = {
  formationId: string;
  formationTitle: string;
  trigger?: React.ReactNode;
};

const displayName = (c: ClientSearchResult) => {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : c.email;
};

export const EnrollModal = ({
  formationId,
  formationTitle,
  trigger,
}: EnrollModalProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Search tab
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // New account tab
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setQuery("");
      setResults([]);
      setSearching(false);
      setForm({ email: "", first_name: "", last_name: "", phone: "" });
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const result = await searchClientsForEnroll(trimmed, formationId);
      if (result.success) {
        setResults(result.data ?? []);
      } else {
        setResults([]);
        toast.error(result.error ?? "Erreur de recherche");
      }
      setSearching(false);
    }, 300);
  };

  const handleEnrollExisting = (clientId: string) => {
    startTransition(async () => {
      const result = await manualEnrollExistingClient(formationId, clientId);
      if (result.success) {
        toast.success("Utilisateur inscrit. Email envoyé.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  };

  const handleCreateAndEnroll = () => {
    startTransition(async () => {
      const result = await manualEnrollNewClient(formationId, form);
      if (result.success) {
        toast.success("Compte créé et inscrit. Email envoyé.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="default" size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Ajouter un participant
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Ajouter un participant</DialogTitle>
          <DialogDescription>
            Inscrire manuellement à <strong>{formationTitle}</strong>. Un email
            sera envoyé avec le lien d&apos;accès.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="search">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">
              <Search className="mr-2 h-4 w-4" />
              Chercher un compte
            </TabsTrigger>
            <TabsTrigger value="create">
              <UserPlus className="mr-2 h-4 w-4" />
              Nouveau compte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-3">
            <div>
              <Label htmlFor="search-query">Email, prénom ou nom</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search-query"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="alice@example.fr"
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-72 space-y-1 overflow-y-auto">
              {searching && (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recherche…
                </div>
              )}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucun utilisateur trouvé. Utilisez l&apos;onglet « Nouveau compte ».
                </p>
              )}
              {results.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{displayName(c)}</p>
                    <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {c.email}
                      {c.phone && (
                        <>
                          <Phone className="ml-2 h-3 w-3" />
                          {c.phone}
                        </>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => handleEnrollExisting(c.id)}
                  >
                    Inscrire
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="create" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="first_name">Prénom *</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, first_name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="last_name">Nom *</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, last_name: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleCreateAndEnroll}
                disabled={
                  isPending ||
                  !form.email.trim() ||
                  !form.first_name.trim() ||
                  !form.last_name.trim()
                }
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer le compte et inscrire
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
