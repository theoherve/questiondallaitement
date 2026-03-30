import { auth } from "@/auth";
import type { UserRole } from "@/types/database";

export type SessionUser = { id: string; email: string; roles: UserRole[] };

/** Returns the current session user or null. Use in Server Components and Server Actions. */
export const getSessionUser = async (): Promise<SessionUser | null> => {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user?.email) return null;

  const u = user as { roles?: unknown; role?: unknown };
  const rawRoles = u.roles;
  // Fallback: support old JWTs that still have single "role" string
  const legacyRole = typeof u.role === "string" ? u.role : null;
  const roles: UserRole[] = Array.isArray(rawRoles) && rawRoles.length > 0
    ? (rawRoles as UserRole[])
    : legacyRole
      ? [legacyRole as UserRole]
      : ["client"];

  return { id: user.id, email: user.email, roles };
};

/** Check if a session user has a specific role. */
export const hasRole = (user: SessionUser | null, role: UserRole): boolean => {
  if (!user) return false;
  return user.roles.includes(role);
};

/** Check if a session user has any of the given roles. */
export const hasAnyRole = (user: SessionUser | null, roles: UserRole[]): boolean => {
  if (!user) return false;
  return roles.some((r) => user.roles.includes(r));
};
