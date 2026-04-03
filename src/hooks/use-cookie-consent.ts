"use client";

import { useEffect, useState } from "react";

export type ConsentState = {
  analytics: boolean;
  marketing: boolean;
};

const COOKIE_NAME = "cookie_consent";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function readConsent(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`)
  );
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1])) as ConsentState;
  } catch {
    return null;
  }
}

function writeConsent(consent: ConsentState): void {
  const value = encodeURIComponent(JSON.stringify(consent));
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}

export const useCookieConsent = () => {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [hasAnswered, setHasAnswered] = useState(true);

  useEffect(() => {
    const stored = readConsent();
    setConsent(stored);
    setHasAnswered(stored !== null);
  }, []);

  const acceptAll = () => {
    const c: ConsentState = { analytics: true, marketing: true };
    writeConsent(c);
    setConsent(c);
    setHasAnswered(true);
  };

  const rejectAll = () => {
    const c: ConsentState = { analytics: false, marketing: false };
    writeConsent(c);
    setConsent(c);
    setHasAnswered(true);
  };

  const saveCustom = (custom: ConsentState) => {
    writeConsent(custom);
    setConsent(custom);
    setHasAnswered(true);
  };

  return { consent, hasAnswered, acceptAll, rejectAll, saveCustom };
};
