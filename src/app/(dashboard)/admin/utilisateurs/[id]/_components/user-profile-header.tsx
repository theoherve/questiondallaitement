"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLES } from "@/constants/roles";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Download,
  KeyRound,
  MoreVertical,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import Link from "next/link";
import type { UserRole } from "@/types/database";
import {
  resetUserPassword,
  toggleUserBan,
  exportUserData,
} from "../actions";

type Props = {
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    roles: UserRole[];
    created_at: string;
    email_verified: boolean;
    deleted_at: string | null;
    gdpr_consent_at: string | null;
  };
  score: number;
  isCurrentAdmin: boolean;
};

export const UserProfileHeader = ({ user, score, isCurrentAdmin }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const fullName =
    `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "Sans nom";
  const initials =
    `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() ||
    "?";

  const isBanned = !!user.deleted_at;

  const scoreColor =
    score >= 71
      ? "text-green-600 bg-green-50 border-green-200"
      : score >= 41
        ? "text-orange-600 bg-orange-50 border-orange-200"
        : "text-red-600 bg-red-50 border-red-200";

  const handleResetPassword = () => {
    if (!confirm("Envoyer un email de réinitialisation de mot de passe ?"))
      return;
    startTransition(async () => {
      const result = await resetUserPassword(user.id);
      setMessage(
        result.success
          ? result.data?.message ?? "Email envoyé"
          : result.error ?? "Erreur",
      );
    });
  };

  const handleToggleBan = () => {
    const action = isBanned ? "débannir" : "bannir";
    if (!confirm(`Voulez-vous ${action} cet utilisateur ?`)) return;
    startTransition(async () => {
      const result = await toggleUserBan(user.id, !isBanned);
      if (!result.success) {
        setMessage(result.error ?? "Erreur");
      } else {
        router.refresh();
      }
    });
  };

  const handleExport = () => {
    startTransition(async () => {
      const result = await exportUserData(user.id);
      if (result.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `user-${user.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setMessage(result.error ?? "Erreur lors de l'export");
      }
    });
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/utilisateurs">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Link>
      </Button>

      {isBanned && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Cet utilisateur a été banni le{" "}
          {new Date(user.deleted_at!).toLocaleDateString("fr-FR")}
        </div>
      )}

      {message && (
        <div className="rounded-lg border bg-muted/50 p-3 text-sm">
          {message}
          <button
            onClick={() => setMessage(null)}
            className="ml-2 text-muted-foreground underline"
          >
            Fermer
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {user.avatar_url && <AvatarImage src={user.avatar_url} />}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-serif text-2xl font-bold text-primary-green">
              {fullName}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {user.roles.map((r) => (
                <Badge key={r} variant="secondary">
                  {ROLES[r]?.label ?? r}
                </Badge>
              ))}
              {user.email_verified ? (
                <Badge
                  variant="outline"
                  className="border-green-200 text-green-700"
                >
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  Vérifié
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Non vérifié
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Score gauge */}
          <div
            className={`flex flex-col items-center rounded-lg border px-4 py-2 ${scoreColor}`}
          >
            <span className="text-2xl font-bold">{score}</span>
            <span className="text-[10px] uppercase tracking-wider">Score</span>
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={isPending}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleResetPassword}>
                <KeyRound className="mr-2 h-4 w-4" />
                Réinitialiser le mot de passe
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exporter les données
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {!isCurrentAdmin && (
                <DropdownMenuItem
                  onClick={handleToggleBan}
                  className={
                    isBanned
                      ? "text-green-600 focus:text-green-600"
                      : "text-destructive focus:text-destructive"
                  }
                >
                  {isBanned ? (
                    <>
                      <Unlock className="mr-2 h-4 w-4" />
                      Débannir
                    </>
                  ) : (
                    <>
                      <Ban className="mr-2 h-4 w-4" />
                      Bannir
                    </>
                  )}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>
          Inscrit le{" "}
          {new Date(user.created_at).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
        {user.gdpr_consent_at && (
          <span>
            RGPD accepté le{" "}
            {new Date(user.gdpr_consent_at).toLocaleDateString("fr-FR")}
          </span>
        )}
        <span className="font-mono text-[10px]">ID: {user.id}</span>
      </div>
    </div>
  );
};
