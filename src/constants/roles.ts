import type { UserRole } from "@/types/database";

export const ROLES: Record<UserRole, { label: string; description: string }> = {
  visitor: {
    label: "Visiteur",
    description: "Utilisateur non authentifié",
  },
  client: {
    label: "Client",
    description: "Client authentifié, peut acheter et réserver",
  },
  consultant: {
    label: "Consultante",
    description: "Consultante complète, accès total à son espace",
  },
  consultant_limited: {
    label: "Consultante (limité)",
    description: "Consultante restreinte, accès limité",
  },
  marketing_manager: {
    label: "Responsable Marketing",
    description: "Accès emails marketing et analytics",
  },
  admin: {
    label: "Administrateur",
    description: "Accès total à la plateforme",
  },
} as const;

export const PROTECTED_ROLES: UserRole[] = [
  "client",
  "consultant",
  "consultant_limited",
  "marketing_manager",
  "admin",
];

export const CONSULTANT_ROLES: UserRole[] = [
  "consultant",
  "consultant_limited",
];

export const ADMIN_ROLES: UserRole[] = ["admin"];

/** Rôles ayant accès au backoffice (espace consultante ou admin). */
export const BACKOFFICE_ROLES: UserRole[] = [
  "consultant",
  "consultant_limited",
  "marketing_manager",
  "admin",
];

/** URL de redirection vers le backoffice selon les rôles. */
export const getBackofficeRedirectUrl = (roles: UserRole[]): string => {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("consultant") || roles.includes("consultant_limited")) {
    return "/espace-consultante";
  }
  if (roles.includes("marketing_manager")) return "/admin";
  return "/espace-client";
};

export const canAccessBackoffice = (roles: UserRole[]): boolean =>
  roles.some((r) => (BACKOFFICE_ROLES as readonly string[]).includes(r));
