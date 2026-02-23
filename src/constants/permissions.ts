import type { UserRole } from "@/types/database";

export const PERMISSIONS = {
  view_public_pages: "view_public_pages",
  book_consultation: "book_consultation",
  buy_formation: "buy_formation",
  manage_own_formations: "manage_own_formations",
  manage_own_formations_readonly: "manage_own_formations_readonly",
  manage_bookings: "manage_bookings",
  manage_events: "manage_events",
  access_crm: "access_crm",
  manage_emails: "manage_emails",
  manage_automations: "manage_automations",
  view_analytics: "view_analytics",
  view_analytics_limited: "view_analytics_limited",
  view_analytics_marketing: "view_analytics_marketing",
  manage_consultants: "manage_consultants",
  manage_platform: "manage_platform",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  visitor: [PERMISSIONS.view_public_pages],
  client: [
    PERMISSIONS.view_public_pages,
    PERMISSIONS.book_consultation,
    PERMISSIONS.buy_formation,
  ],
  consultant: [
    PERMISSIONS.view_public_pages,
    PERMISSIONS.manage_own_formations,
    PERMISSIONS.manage_bookings,
    PERMISSIONS.manage_events,
    PERMISSIONS.access_crm,
    PERMISSIONS.manage_emails,
    PERMISSIONS.manage_automations,
    PERMISSIONS.view_analytics,
  ],
  consultant_limited: [
    PERMISSIONS.view_public_pages,
    PERMISSIONS.manage_own_formations_readonly,
    PERMISSIONS.manage_bookings,
    PERMISSIONS.view_analytics_limited,
  ],
  marketing_manager: [
    PERMISSIONS.view_public_pages,
    PERMISSIONS.manage_emails,
    PERMISSIONS.view_analytics_marketing,
  ],
  admin: Object.values(PERMISSIONS),
};

export const hasPermission = (
  role: UserRole | undefined,
  permission: Permission
): boolean => {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
};

export const getUserPermissions = (role: UserRole): Permission[] => {
  return ROLE_PERMISSIONS[role] ?? [];
};
