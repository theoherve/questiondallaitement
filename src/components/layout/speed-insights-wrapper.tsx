"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { useCookieConsent } from "@/hooks/use-cookie-consent";

export const SpeedInsightsWrapper = () => {
  const { consent } = useCookieConsent();
  if (!consent?.analytics) return null;
  return <SpeedInsights />;
};
