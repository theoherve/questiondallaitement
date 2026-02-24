"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * When Supabase redirects to Site URL (e.g. /) with auth errors in the hash
 * (#error=access_denied&error_code=otp_expired...), redirect to connexion with a friendly message.
 */
export const AuthRedirectHandler = () => {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const search = window.location.search;
    const hasAuthErrorInHash = hash.includes("error=") && hash.includes("error_description=");
    const code = new URLSearchParams(search).get("code");

    if (code) {
      const next = new URLSearchParams(search).get("next") ?? "/espace-client";
      router.replace(`/api/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`);
      return;
    }

    if (hasAuthErrorInHash) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const description = params.get("error_description") ?? "";
      const isExpired = description.includes("expired") || description.includes("invalid");
      const errorMessage = isExpired
        ? "link_expired_or_used"
        : "auth_failed";
      router.replace(`/connexion?error=${errorMessage}`);
    }
  }, [router]);

  return null;
};
