import { auth } from "@/auth";

export type SessionUser = { id: string; email: string; role: string };

/** Returns the current session user or null. Use in Server Components and Server Actions. */
export const getSessionUser = async (): Promise<SessionUser | null> => {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user?.email) return null;
  return {
    id: user.id,
    email: user.email,
    role: (user as { role?: string }).role ?? "client",
  };
};
