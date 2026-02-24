"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, X, Loader2 } from "lucide-react";
import { searchUsers, promoteToConsultant } from "../actions";

type UserResult = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
};

export const PromoteConsultantForm = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);

  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [specialtiesInput, setSpecialtiesInput] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [commissionRate, setCommissionRate] = useState(15);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (searchQuery.length < 2) return;
    setIsSearching(true);
    const result = await searchUsers(searchQuery);
    if (result.success && result.data) {
      setSearchResults(result.data);
    }
    setIsSearching(false);
  }, [searchQuery]);

  const handleSelectUser = (user: UserResult) => {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchQuery("");
    const nameSlug =
      `${user.first_name ?? ""}-${user.last_name ?? ""}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    if (nameSlug.length >= 3) setSlug(nameSlug);
  };

  const handleAddSpecialty = () => {
    const trimmed = specialtiesInput.trim();
    if (!trimmed || specialties.includes(trimmed)) return;
    setSpecialties([...specialties, trimmed]);
    setSpecialtiesInput("");
  };

  const handleRemoveSpecialty = (spec: string) => {
    setSpecialties(specialties.filter((s) => s !== spec));
  };

  const handleSpecialtyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSpecialty();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError(null);

    startTransition(async () => {
      const result = await promoteToConsultant({
        user_id: selectedUser.id,
        slug,
        bio: bio || undefined,
        specialties,
        commission_rate: commissionRate,
      });

      if (!result.success) {
        setError(result.error ?? "Erreur inconnue");
        return;
      }

      router.push("/admin/consultantes");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">
            1. Sélectionner un utilisateur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedUser ? (
            <div className="flex items-center justify-between rounded-lg border bg-green-50/50 p-4">
              <div>
                <p className="font-medium text-primary-green">
                  {selectedUser.first_name} {selectedUser.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedUser.email}
                </p>
                <Badge variant="secondary" className="mt-1">
                  {selectedUser.role}
                </Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUser(null)}
                aria-label="Retirer la sélection"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="user-search">
                Rechercher par nom ou email
              </Label>
              <div className="flex gap-2">
                <Input
                  id="user-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder="ex: marie@exemple.com"
                  aria-label="Rechercher un utilisateur"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSearch}
                  disabled={isSearching || searchQuery.length < 2}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="rounded-md border">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                      onClick={() => handleSelectUser(user)}
                      tabIndex={0}
                      aria-label={`Sélectionner ${user.first_name} ${user.last_name}`}
                    >
                      <div>
                        <p className="font-medium">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                      <Badge variant="outline">{user.role}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-primary-green">
              2. Paramètres consultante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL publique)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="marie-dupont"
                required
                aria-label="Slug de la consultante"
              />
              <p className="text-xs text-muted-foreground">
                URL : /consultantes/{slug || "..."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Biographie</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Parcours, spécialités, approche..."
                rows={4}
                aria-label="Biographie de la consultante"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialties">Spécialités</Label>
              <div className="flex gap-2">
                <Input
                  id="specialties"
                  value={specialtiesInput}
                  onChange={(e) => setSpecialtiesInput(e.target.value)}
                  onKeyDown={handleSpecialtyKeyDown}
                  placeholder="Ex: Allaitement maternel"
                  aria-label="Ajouter une spécialité"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddSpecialty}
                  disabled={!specialtiesInput.trim()}
                >
                  Ajouter
                </Button>
              </div>
              {specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {specialties.map((spec) => (
                    <Badge
                      key={spec}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {spec}
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecialty(spec)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                        aria-label={`Retirer ${spec}`}
                        tabIndex={0}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="commission">Taux de commission (%)</Label>
              <Input
                id="commission"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                aria-label="Taux de commission"
              />
              <p className="text-xs text-muted-foreground">
                Pourcentage prélevé sur les ventes de la consultante (défaut :
                15%)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/consultantes")}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={!selectedUser || !slug || isPending}
          className="bg-primary-red hover:bg-primary-red-dark"
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          Promouvoir en consultante
        </Button>
      </div>
    </form>
  );
};
