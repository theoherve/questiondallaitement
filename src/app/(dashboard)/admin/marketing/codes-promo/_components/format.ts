import type { PromoDiscountType } from "@/types/database";

export const formatMoney = (cents: number): string =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );

export const formatDiscount = (
  type: PromoDiscountType,
  value: number,
): string => (type === "percent" ? `-${value} %` : `-${formatMoney(value)}`);

export const targetsSummary = (
  scopeAll: boolean,
  targetCount = 0,
): string => {
  if (scopeAll) return "Tout le catalogue";
  if (targetCount === 0) return "Aucune cible";
  return targetCount === 1 ? "1 cible" : `${targetCount} cibles`;
};

export const TARGET_TYPE_LABELS: Record<string, string> = {
  formations_all: "Tous les accompagnements",
  events_all: "Toutes les formations",
  bookings_all: "Tous les rendez-vous",
  formation: "Un accompagnement",
  event: "Une formation",
  booking_service: "Un type de consultation",
};

export const TRIGGER_TYPE_LABELS: Record<string, string> = {
  event_purchase: "Achat d'une formation",
  formation_purchase: "Achat d'un accompagnement",
};
