import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Limitation de debit adossee a Postgres (5-1).
 *
 * L'implementation precedente comptait dans une `Map` en memoire. Sur Vercel,
 * chaque instance a la sienne : la limite reelle vaut le seuil multiplie par le
 * nombre d'instances, et repart a zero a chaque demarrage a froid. Une attaque
 * par force brute n'a qu'a repartir ses tentatives.
 *
 * Le comptage vit desormais en base, ou toutes les instances le partagent.
 * Supabase plutot qu'un Redis dedie : le besoin est un etat partage, et la base
 * est de toute facon interrogee a chaque tentative de connexion — elle n'ajoute
 * donc aucun nouveau mode de panne.
 */

type RateLimitConfig = {
  /** Prefixe propre au limiteur (« login », « forgot-password »…). */
  prefix: string;
  /** Nombre de requetes autorisees dans la fenetre. */
  limit: number;
  /** Duree de la fenetre, en secondes. */
  windowSeconds: number;
};

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

const clientIp = async (): Promise<string> => {
  const headersList = await headers();

  // `x-forwarded-for` accumule les proxies traverses. Seule la premiere
  // adresse identifie l'appelant : garder la chaine entiere donnerait une cle
  // differente selon le chemin reseau, et la limite ne mordrait plus.
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown"
  );
};

export const rateLimit = async (
  config: RateLimitConfig,
): Promise<RateLimitResult> => {
  const key = `${config.prefix}:${await clientIp()}`;

  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: key,
    p_limit: config.limit,
    p_window_seconds: config.windowSeconds,
  });

  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row) {
    // Choix assume : on laisse passer. Bloquer sur une panne de base
    // verrouillerait la connexion pour tout le monde, et l'authentification
    // interroge cette meme base juste apres — si elle est tombee, rien ne
    // fonctionne de toute facon. On trace bruyamment pour que la degradation
    // ne soit pas silencieuse.
    console.error(
      `[rateLimit] comptage indisponible pour ${key} — requete laissee passer`,
      error,
    );
    return {
      success: true,
      remaining: config.limit,
      resetAt: Date.now() + config.windowSeconds * 1000,
    };
  }

  return {
    success: row.allowed,
    remaining: row.remaining,
    resetAt: new Date(row.reset_at).getTime(),
  };
};

export const AUTH_RATE_LIMITS = {
  login: { prefix: "login", limit: 5, windowSeconds: 300 },
  register: { prefix: "register", limit: 3, windowSeconds: 600 },
  forgotPassword: { prefix: "forgot-password", limit: 3, windowSeconds: 600 },
  resetPassword: { prefix: "reset-password", limit: 5, windowSeconds: 600 },
  resendVerification: {
    prefix: "resend-verification",
    limit: 3,
    windowSeconds: 600,
  },
} as const satisfies Record<string, RateLimitConfig>;
