/**
 * Rattachement d'une identite Google a un profil de la base.
 *
 * Le site n'utilise pas `auth.users` : les profils sont crees directement dans
 * `profiles` (voir handleRegister). Google ne peut donc pas s'appuyer sur un
 * adapter NextAuth — c'est ce module qui fait le pont, en deux temps : une
 * decision pure (`planGoogleSignIn`) que les tests couvrent, puis une execution
 * qui touche la base (`resolveGoogleProfile`).
 */

export type GoogleIdentity = {
  email: string;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
};

export type ExistingProfile = {
  id: string;
  roles: string[] | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email_verified: boolean | null;
  deleted_at: string | null;
};

export type NewProfileValues = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  roles: string[];
  email_verified: true;
  gdpr_consent_at: string;
};

export type GoogleSignInPlan =
  | { action: "deny"; reason: "email_unverified" | "account_deleted" }
  | { action: "create"; values: NewProfileValues }
  | {
      action: "link";
      profileId: string;
      roles: string[];
      /** Champs a completer sur le profil existant. Vide = rien a ecrire. */
      patch: Record<string, unknown>;
    };

/**
 * Google renvoie un `name` complet, la base stocke prenom et nom separement.
 * Le premier mot est le prenom, le reste le nom : c'est l'ordre d'affichage
 * francais, et un nom compose reste entier.
 */
export const splitFullName = (
  name: string | null,
): { firstName: string | null; lastName: string | null } => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: null, lastName: null };
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

/**
 * Decide quoi faire d'une connexion Google, sans toucher la base.
 *
 * Le rattachement se fait par email : une meme adresse est un meme compte, y
 * compris pour les profils importes de Wix ou crees avec un mot de passe. C'est
 * sur parce que Google garantit que l'adresse lui appartient — d'ou le refus
 * quand `email_verified` est faux.
 *
 * Un profil existant n'est jamais ecrase : le patch ne remplit que les champs
 * vides. Une cliente qui a corrige son prenom chez nous le garde.
 */
export const planGoogleSignIn = (
  identity: GoogleIdentity,
  existing: ExistingProfile | null,
  now: Date,
): GoogleSignInPlan => {
  if (!identity.emailVerified) {
    return { action: "deny", reason: "email_unverified" };
  }

  const { firstName, lastName } = splitFullName(identity.name);

  if (!existing) {
    return {
      action: "create",
      values: {
        // Web Crypto plutot que le module node `crypto` : ce fichier remonte
        // jusqu'au middleware via `@/auth`, qui tourne en Edge Runtime.
        id: globalThis.crypto.randomUUID(),
        email: identity.email,
        first_name: firstName,
        last_name: lastName,
        avatar_url: identity.avatarUrl,
        roles: ["client"],
        // Google a deja verifie l'adresse : redemander un email de confirmation
        // ne prouverait rien de plus.
        email_verified: true,
        gdpr_consent_at: now.toISOString(),
      },
    };
  }

  if (existing.deleted_at) {
    return { action: "deny", reason: "account_deleted" };
  }

  const patch: Record<string, unknown> = {};
  if (!existing.first_name && firstName) patch.first_name = firstName;
  if (!existing.last_name && lastName) patch.last_name = lastName;
  if (!existing.avatar_url && identity.avatarUrl) {
    patch.avatar_url = identity.avatarUrl;
  }
  if (!existing.email_verified) patch.email_verified = true;

  return {
    action: "link",
    profileId: existing.id,
    roles: existing.roles?.length ? existing.roles : ["client"],
    patch,
  };
};

/** Acces base necessaires au rattachement. Injecte pour rester testable. */
export type GoogleProfileStore = {
  /** Ne filtre pas `deleted_at` : un compte supprime doit etre refuse, pas recree. */
  findByEmail: (email: string) => Promise<ExistingProfile | null>;
  create: (values: NewProfileValues) => Promise<void>;
  update: (id: string, patch: Record<string, unknown>) => Promise<void>;
};

export type ResolvedGoogleProfile = {
  id: string;
  email: string;
  roles: string[];
  /** Vrai au premier login Google : l'appelant peut synchroniser Brevo. */
  created: boolean;
};

/**
 * Renvoie le profil correspondant a l'identite Google, en le creant au besoin.
 * `null` = connexion refusee.
 */
export const resolveGoogleProfile = async (
  store: GoogleProfileStore,
  identity: GoogleIdentity,
  now: Date = new Date(),
): Promise<ResolvedGoogleProfile | null> => {
  const email = identity.email.trim().toLowerCase();
  const existing = await store.findByEmail(email);
  const plan = planGoogleSignIn({ ...identity, email }, existing, now);

  if (plan.action === "deny") return null;

  if (plan.action === "create") {
    await store.create(plan.values);
    return {
      id: plan.values.id,
      email,
      roles: plan.values.roles,
      created: true,
    };
  }

  if (Object.keys(plan.patch).length > 0) {
    await store.update(plan.profileId, plan.patch);
  }

  return { id: plan.profileId, email, roles: plan.roles, created: false };
};
