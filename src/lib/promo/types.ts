import type {
  PromoCode,
  PromoDiscountType,
  PromoTargetType,
  PromoTriggerType,
} from "@/types/database";

/** Les trois familles de produits payants de la plateforme. */
export type PromoServiceKind = "accompagnement" | "formation" | "booking";

export type PromoCodeWithRules = PromoCode & {
  targets: { target_type: PromoTargetType; target_id: string | null }[];
  triggers: { trigger_type: PromoTriggerType; target_id: string | null }[];
};

/** Achat anterieur susceptible de declencher un code (PREMIERSJOURS). */
export type PromoPurchase = {
  kind: PromoServiceKind;
  itemId: string;
  purchasedAtMs: number;
};

export type PromoContext = {
  serviceKind: PromoServiceKind;
  /** formation.id, formation.id ou consultation_type_id. */
  itemId: string;
  amountCents: number;
  nowMs: number;
  /** Utilisations retenues (confirmees + reservations recentes). */
  globalRedemptions: number;
  userRedemptions: number;
  triggeringPurchases: PromoPurchase[];
};

export type PromoRejection =
  | "not_applicable"
  | "min_order"
  | "exhausted"
  | "already_used";

export type PromoEvaluation =
  | { ok: true; discountCents: number; finalCents: number }
  | { ok: false; reason: PromoRejection; minOrderCents?: number };

export type { PromoDiscountType };
