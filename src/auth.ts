import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveGoogleProfile } from "@/lib/auth/google-profile";
import { createGoogleProfileStore } from "@/lib/auth/google-store";
import { syncOnSignup } from "@/lib/brevo/sync";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // Google renvoie un `sub` comme id : le callback `signIn` le remplace par
    // l'id du profil maison. Sans adapter NextAuth, c'est le seul endroit qui
    // fait le lien avec la table `profiles`.
    Google,
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
    /**
     * Rattache l'identite Google a un profil `profiles`, puis reecrit `user`
     * avec l'id et les roles maison : le callback `jwt` ci-dessous les recoit
     * ensuite tels quels, comme pour les identifiants classiques.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const email = profile?.email ?? user.email;
      if (!email) return "/connexion?error=google_no_email";

      const resolved = await resolveGoogleProfile(createGoogleProfileStore(), {
        email,
        emailVerified: profile?.email_verified === true,
        name: profile?.name ?? user.name ?? null,
        avatarUrl: profile?.picture ?? user.image ?? null,
      });

      if (!resolved) return "/connexion?error=google_refused";

      user.id = resolved.id;
      user.email = resolved.email;
      (user as { roles?: string[] }).roles = resolved.roles;

      if (resolved.created) {
        // Non bloquant : un echec Brevo ne doit pas empecher la connexion.
        syncOnSignup({
          email: resolved.email,
          first_name: user.name?.split(" ")[0] ?? null,
          last_name: user.name?.split(" ").slice(1).join(" ") || null,
          phone: null,
          roles: resolved.roles,
        }).catch(() => {});
      }

      return true;
    },
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
