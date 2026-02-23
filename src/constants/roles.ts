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
