import { isWeekendOrHoliday } from "@/lib/holidays/french-holidays";
import type { ConsultationTypeDuration, ConsultationLocation } from "@/types/database";

/** Default weekend/holiday rate: 110 €/hour, pro-rated linearly. */
const DEFAULT_WEEKEND_RATE_CENTS_PER_HOUR = 11000;

export type PriceBreakdown = {
  basePriceCents: number;
  isWeekendOrHoliday: boolean;
  surchargeCents: number;
  totalCents: number;
};

export const computeBookingPrice = ({
  duration,
  date,
  location,
  surchargeCents,
}: {
  duration: ConsultationTypeDuration;
  date: Date;
  location: ConsultationLocation;
  surchargeCents: number;
}): PriceBreakdown => {
  const weekend = isWeekendOrHoliday(date);

  let basePriceCents: number;
  if (weekend) {
    basePriceCents =
      duration.weekend_price_cents ??
      Math.round(
        (duration.duration_minutes / 60) * DEFAULT_WEEKEND_RATE_CENTS_PER_HOUR
      );
  } else {
    basePriceCents = duration.price_cents;
  }

  const surcharge = location === "domicile" ? surchargeCents : 0;

  return {
    basePriceCents,
    isWeekendOrHoliday: weekend,
    surchargeCents: surcharge,
    totalCents: basePriceCents + surcharge,
  };
};

/** Default duration options seeded when creating a new consultation type. */
export const DEFAULT_DURATION_OPTIONS = [
  { duration_minutes: 30, price_cents: 5000, position: 0 },
  { duration_minutes: 60, price_cents: 9000, position: 1, is_default: true },
  { duration_minutes: 90, price_cents: 13000, position: 2 },
  { duration_minutes: 120, price_cents: 17000, position: 3 },
] as const;
