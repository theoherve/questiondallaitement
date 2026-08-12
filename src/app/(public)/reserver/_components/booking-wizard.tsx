"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StepService } from "./step-service";
import { StepDuration } from "./step-duration";
import { StepLocation } from "./step-location";
import { StepConsultant } from "./step-consultant";
import { StepCalendar } from "./step-calendar";
import { StepContact } from "./step-contact";
import { StepPayment } from "./step-payment";
import { StepConfirmation } from "./step-confirmation";
import { bookingRequiresWaiver } from "@/lib/legal/withdrawal";
import { createBooking, computeSlotPrice, type BookingFormData } from "../actions";
import type { AppliedPromo } from "@/components/promo/promo-code-field";
import type { AppliedGiftCard } from "./gift-card-field";
import type { ConsultationLocation, BookingPaymentMethod, LocationConfig } from "@/types/database";

type ServiceOption = {
  title: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  available_locations: string[];
};

type BookingWizardProps = {
  services: ServiceOption[];
  locationConfigs: LocationConfig[];
};

const STEPS = [
  "Service",
  "Durée",
  "Lieu",
  "Consultante",
  "Créneau",
  "Contact",
  "Paiement",
  "Confirmation",
];

export type BookingState = {
  serviceTitle: string | null;
  durationMinutes: number;
  durationOptionId: string | null;
  isWeekendOrHoliday: boolean;
  location: ConsultationLocation | null;
  consultantId: string | null;
  consultantName: string | null;
  consultationTypeId: string | null;
  selectedSlot: { start: string; end: string; label: string } | null;
  contact: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    reason: string;
  } | null;
  paymentMethod: BookingPaymentMethod | null;
  priceCents: number;
  surchargeCents: number;
  currency: string;
};

const initialState: BookingState = {
  serviceTitle: null,
  durationMinutes: 0,
  durationOptionId: null,
  isWeekendOrHoliday: false,
  location: null,
  consultantId: null,
  consultantName: null,
  consultationTypeId: null,
  selectedSlot: null,
  contact: null,
  paymentMethod: null,
  priceCents: 0,
  surchargeCents: 0,
  currency: "eur",
};

export const BookingWizard = ({ services, locationConfigs }: BookingWizardProps) => {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<BookingState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [giftCard, setGiftCard] = useState<AppliedGiftCard | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    setError(null);
  };

  const handleSubmit = () => {
    if (
      !state.consultationTypeId ||
      !state.consultantId ||
      !state.durationOptionId ||
      !state.selectedSlot ||
      !state.contact ||
      !state.paymentMethod ||
      !state.location
    ) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const formData: BookingFormData = {
        consultation_type_id: state.consultationTypeId!,
        consultant_id: state.consultantId!,
        duration_option_id: state.durationOptionId!,
        location: state.location!,
        starts_at: state.selectedSlot!.start,
        contact: state.contact!,
        payment_method: state.paymentMethod!,
        withdrawal_waiver_accepted: waiverAccepted,
        promo_code: promo?.code,
        giftCardCode: giftCard?.code,
      };

      const result = await createBooking(formData);

      if (!result.success) {
        setError(result.error ?? "Erreur lors de la réservation");
        return;
      }

      if (result.data?.redirect_url) {
        window.location.href = result.data.redirect_url;
        return;
      }

      // Ni redirection Stripe, ni erreur : soit un reglement sur place, soit une
      // carte cadeau qui couvre tout le prix (`no_payment_required`). Dans les
      // deux cas la reservation est deja enregistree, la page de confirmation
      // est le bon point d'arrivee.

      router.push(`/reserver/confirmation?booking_id=${result.data?.booking_id}`);
    });
  };

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-1" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={8}>
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`h-2 w-full rounded-full transition-colors ${
                i <= step ? "bg-primary-red" : "bg-muted"
              }`}
            />
            <span
              className={`hidden text-xs sm:block ${
                i === step
                  ? "font-medium text-primary-green"
                  : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <p className="text-center text-sm font-medium text-primary-green sm:hidden">
        Étape {step + 1}/{STEPS.length}, {STEPS[step]}
      </p>

      <Card>
        <CardContent className="pt-6">
          {/* Step 0: Service */}
          {step === 0 && (
            <StepService
              services={services}
              selected={state.serviceTitle}
              onSelect={(title) => {
                setState({
                  ...initialState,
                  serviceTitle: title,
                  durationMinutes: 60,
                });
                setStep(1);
              }}
            />
          )}

          {/* Step 1: Duration */}
          {step === 1 && state.serviceTitle && (
            <StepDuration
              serviceTitle={state.serviceTitle}
              selectedDuration={state.durationMinutes || null}
              onSelect={(durationMinutes) => {
                // Le montant change : une remise calculee sur l'ancien prix
                // n'a plus de sens.
                setPromo(null);
                setGiftCard(null);
                setState({
                  ...state,
                  durationMinutes,
                  // Reset downstream state
                  location: null,
                  consultantId: null,
                  consultantName: null,
                  consultationTypeId: null,
                  durationOptionId: null,
                  selectedSlot: null,
                  surchargeCents: 0,
                  priceCents: 0,
                });
                setStep(2);
              }}
            />
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <StepLocation
              availableLocations={
                services.find((s) => s.title === state.serviceTitle)
                  ?.available_locations ?? []
              }
              locationConfigs={locationConfigs}
              selected={state.location}
              onSelect={(loc) => {
                setPromo(null);
                setGiftCard(null);
                setState({
                  ...state,
                  location: loc,
                  consultantId: null,
                  consultantName: null,
                  consultationTypeId: null,
                  durationOptionId: null,
                  selectedSlot: null,
                  surchargeCents: 0,
                });
                setStep(3);
              }}
            />
          )}

          {/* Step 3: Consultant */}
          {step === 3 && state.serviceTitle && state.location && (
            <StepConsultant
              serviceTitle={state.serviceTitle}
              location={state.location}
              durationMinutes={state.durationMinutes}
              onSelect={(consultantId, consultantName, consultationTypeId, surcharge, durationOptionId) => {
                setPromo(null);
                setGiftCard(null);
                setState({
                  ...state,
                  consultantId,
                  consultantName,
                  consultationTypeId,
                  durationOptionId,
                  surchargeCents: surcharge,
                  selectedSlot: null,
                });
                setStep(4);
              }}
            />
          )}

          {/* Step 4: Calendar */}
          {step === 4 && state.consultantId && state.consultationTypeId && (
            <StepCalendar
              consultantId={state.consultantId}
              consultationTypeId={state.consultationTypeId}
              durationMinutes={state.durationMinutes}
              onSelect={(slot) => {
                // Un creneau week-end majore le prix : la remise doit etre
                // recalculee.
                setPromo(null);
                setGiftCard(null);
                // Compute final price after slot selection (weekend/holiday detection)
                startTransition(async () => {
                  if (state.durationOptionId && state.consultantId && state.location) {
                    const price = await computeSlotPrice(
                      state.durationOptionId,
                      slot.start,
                      state.consultantId,
                      state.location
                    );
                    setState({
                      ...state,
                      selectedSlot: slot,
                      priceCents: price?.basePriceCents ?? 0,
                      surchargeCents: price?.surchargeCents ?? 0,
                      isWeekendOrHoliday: price?.isWeekendOrHoliday ?? false,
                    });
                  } else {
                    setState({ ...state, selectedSlot: slot });
                  }
                  setStep(5);
                });
              }}
            />
          )}

          {/* Step 5: Contact */}
          {step === 5 && (
            <StepContact
              initialValues={state.contact}
              onSubmit={(contact) => {
                setState({ ...state, contact });
                setStep(6);
              }}
            />
          )}

          {/* Step 6: Payment */}
          {step === 6 && (
            <StepPayment
              priceCents={state.priceCents + state.surchargeCents}
              currency={state.currency}
              location={state.location}
              selected={state.paymentMethod}
              onSelect={(method) => {
                setState({ ...state, paymentMethod: method });
                setStep(7);
              }}
            />
          )}

          {/* Step 7: Confirmation */}
          {step === 7 && (
            <StepConfirmation
              state={state}
              services={services}
              onConfirm={handleSubmit}
              onPromoApplied={(next) => {
                setPromo(next);
                // Le montant restant change : un apercu de carte cadeau calcule
                // sur l'ancien montant n'a plus de sens.
                setGiftCard(null);
              }}
              promo={promo}
              onGiftCardApplied={setGiftCard}
              isPending={isPending}
              waiverRequired={
                !!state.selectedSlot &&
                bookingRequiresWaiver(new Date(state.selectedSlot.start))
              }
              waiverAccepted={waiverAccepted}
              onWaiverChange={setWaiverAccepted}
            />
          )}
        </CardContent>
      </Card>

      {error && (
        <p
          data-testid="booking-error"
          className="text-center text-sm font-medium text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {step > 0 && step < 7 && (
        <div className="flex justify-start">
          <Button variant="ghost" onClick={handleBack}>
            ← Retour
          </Button>
        </div>
      )}
    </div>
  );
};
