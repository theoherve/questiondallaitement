import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        const supabase = createAdminClient();
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, email, roles, password_hash")
          .eq("email", email)
          .is("deleted_at", null)
          .single();

        if (error || !profile?.password_hash) return null;
        const valid = await compare(password, profile.password_hash);
        if (!valid) return null;

        return {
          id: profile.id,
          email: profile.email,
          roles: profile.roles,
        };
      },
    }),
  ],
  pages: {
    signIn: "/connexion",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const u = user as { roles?: string[]; role?: string };
        // Support both new "roles" array and legacy "role" string from DB
        token.roles = u.roles ?? (u.role ? [u.role] : ["client"]);
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { roles?: string[] }).roles = token.roles as string[];
      }
      return session;
    },
  },
});