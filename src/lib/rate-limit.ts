import { headers } from "next/headers";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

const cleanup = () => {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
};

type RateLimitConfig = {
  /** Unique prefix for this limiter (e.g. "login", "forgot-password") */
  prefix: string;
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
};

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

export const rateLimit = async (
  config: RateLimitConfig,
): Promise<RateLimitResult> => {
  cleanup();

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  const key = `${config.prefix}:${ip}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowSeconds * 1000;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: config.limit - 1, resetAt };
  }

  entry.count++;

  if (entry.count > config.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
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
