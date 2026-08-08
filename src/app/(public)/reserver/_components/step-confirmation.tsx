"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { BookingState } from "./booking-wizard";
import {
  PromoCodeField,
  type AppliedPromo,
} from "@/components/promo/promo-code-field";
import { WITHDRAWAL_TEXTS } from "@/lib/legal/withdrawal";

type StepConfirmationProps = {
  state: BookingState;
  services: { title: string; description: string | null }[];
  onConfirm: () => void;
  /**
   * Remontee du code promo valide. Le champ vit ici et non a l'etape
   * paiement : celle-ci enchaine immediatement sur la confirmation des qu'un
   * mode est choisi, sans laisser le temps de saisir quoi que ce soit.
   */
  onPromoApplied: (promo: AppliedPromo | null) => void;
  isPending: boolean;
  /** La consultation a lieu dans les quatorze jours : accord obligatoire. */
  waiverRequired: boolean;
  waiverAccepted: boolean;
  onWaiverChange: (accepted: boolean) => void;
};

const formatPrice = (cents: number, currency: string): string =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    cents / 100
  );

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
};

const LOCATION_LABELS: Record<string, string> = {
  cabinet: "Au cabinet",
  teleconsultation: "Téléconsultation",
  domicile: "À domicile",
};

const PAYMENT_LABELS: Record<string, string> = {
  online: "Paiement en ligne (Stripe)",
  on_site: "Paiement sur place",
};

export const StepConfirmation = ({
  state,
  onConfirm,
  onPromoApplied,
  isPending,
  waiverRequired,
  waiverAccepted,
  onWaiverChange,
}: StepConfirmationProps) => {
  const totalPrice = state.priceCents + state.surchargeCents;
  const slotDate = state.selectedSlot
    ? new Date(state.selectedSlot.start)
    : null;

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-xl font-semibold text-primary-green">
        Récapitulatif de votre réservation
      </h2>

      <div className="space-y-4 rounded-lg border bg-muted/30 p-5">
        <SummaryRow
          icon={<CreditCard className="h-4 w-4" />}
          label="Service"
          value={state.serviceTitle ?? ""}
        />
        <SummaryRow
          icon={<Clock className="h-4 w-4" />}
          label="Durée"
          value={formatDuration(state.durationMinutes)}
        />
        <SummaryRow
          icon={<MapPin className="h-4 w-4" />}
          label="Lieu"
          value={LOCATION_LABELS[state.location ?? ""] ?? ""}
        />
        <SummaryRow
          icon={<User className="h-4 w-4" />}
          label="Consultante"
          value={state.consultantName ?? ""}
        />
        {slotDate && (
          <>
            <SummaryRow
              icon={<CalendarDays className="h-4 w-4" />}
              label="Date"
              value={format(slotDate, "EEEE d MMMM yyyy", { locale: fr })}
            />
            <SummaryRow
              icon={<Clock className="h-4 w-4" />}
              label="Heure"
              value={format(slotDate, "HH:mm")}
            />
          </>
        )}
        <SummaryRow
          icon={<User className="h-4 w-4" />}
          label="Contact"
          value={`${state.contact?.first_name} ${state.contact?.last_name}, ${state.contact?.email}`}
        />
        {state.contact?.reason && (
          <SummaryRow
            icon={<User className="h-4 w-4" />}
            label="Motif"
            value={state.contact.reason}
          />
        )}

        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-primary-green">Total</span>
            <span className="text-xl font-bold text-primary-green">
              {formatPrice(totalPrice, state.currency)}
            </span>
          </div>
          {state.isWeekendOrHoliday && (
            <p className="mt-1 text-xs text-amber-600 font-medium">
              Tarif week-end / jour férié appliqué
            </p>
          )}
          {state.surchargeCents > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Dont supplément domicile :{" "}
              {formatPrice(state.surchargeCents, state.currency)}
            </p>
          )}
          <Badge variant="secondary" className="mt-2">
            {PAYMENT_LABELS[state.paymentMethod ?? ""] ?? ""}
          </Badge>

          {/* Un reglement sur place ne passe pas par la plateforme : rien a
              remiser. */}
          {state.paymentMethod === "online" && state.consultationTypeId && (
            <div className="mt-4">
              <PromoCodeField
                serviceKind="booking"
                itemId={state.consultationTypeId}
                amountCents={totalPrice}
                currency={state.currency}
                onApplied={onPromoApplied}
              />
            </div>
          )}
        </div>
      </div>

      {waiverRequired && (
        <div className="rounded-lg border border-muted bg-muted/30 p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-primary-green">
            <input
              type="checkbox"
              checked={waiverAccepted}
              onChange={(e) => onWaiverChange(e.target.checked)}
              data-testid="withdrawal-waiver"
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary-red"
            />
            <span>{WITHDRAWAL_TEXTS.booking}</span>
          </label>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          data-testid="booking-confirm"
          onClick={onConfirm}
          disabled={isPending || (waiverRequired && !waiverAccepted)}
          className="w-full bg-primary-red hover:bg-primary-red-dark"
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {state.paymentMethod === "online"
            ? "Procéder au paiement"
            : "Confirmer la réservation"}
        </Button>
      </div>

      {state.paymentMethod === "online" && (
        <p className="text-center text-xs text-muted-foreground">
          Vous allez être redirigé·e vers Stripe pour le paiement sécurisé.
        </p>
      )}
    </div>
  );
};

const SummaryRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 text-primary-green/50">{icon}</div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-primary-green">{value}</p>
    </div>
  </div>
);