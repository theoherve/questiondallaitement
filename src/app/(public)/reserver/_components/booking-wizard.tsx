"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StepService } from "./step-service";
import { StepLocation } from "./step-location";
import { StepConsultant } from "./step-consultant";
import { StepCalendar } from "./step-calendar";
import { StepContact } from "./step-contact";
import { StepPayment } from "./step-payment";
import { StepConfirmation } from "./step-confirmation";
import { createBooking, type BookingFormData } from "../actions";
import type { ConsultationLocation, BookingPaymentMethod } from "@/types/database";

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
};

const STEPS = [
  "Service",
  "Lieu",
  "Consultante",
  "Créneau",
  "Contact",
  "Paiement",
  "Confirmation",
];

export type BookingState = {
  serviceTitle: string | null;
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
  durationMinutes: number;
};

const initialState: BookingState = {
  serviceTitle: null,
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
  durationMinutes: 0,
};

export const BookingWizard = ({ services }: BookingWizardProps) => {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<BookingState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    setError(null);
  };

  const handleSubmit = () => {
    if (
      !state.consultationTypeId ||
      !state.consultantId ||
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
        location: state.location!,
        starts_at: state.selectedSlot!.start,
        contact: state.contact!,
        payment_method: state.paymentMethod!,
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

      router.push(`/reserver/confirmation?booking_id=${result.data?.booking_id}`);
    });
  };

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-1" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={7}>
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
        Étape {step + 1}/7 — {STEPS[step]}
      </p>

      <Card>
        <CardContent className="pt-6">
          {step === 0 && (
            <StepService
              services={services}
              selected={state.serviceTitle}
              onSelect={(title, price, currency, duration) => {
                setState({
                  ...state,
                  serviceTitle: title,
                  priceCents: price,
                  currency,
                  durationMinutes: duration,
                });
                setStep(1);
              }}
            />
          )}

          {step === 1 && (
            <StepLocation
              availableLocations={
                services.find((s) => s.title === state.serviceTitle)
                  ?.available_locations ?? []
              }
              selected={state.location}
              onSelect={(loc) => {
                setState({ ...state, location: loc, consultantId: null, consultantName: null, consultationTypeId: null, selectedSlot: null, surchargeCents: 0 });
                setStep(2);
              }}
            />
          )}

          {step === 2 && state.serviceTitle && state.location && (
            <StepConsultant
              serviceTitle={state.serviceTitle}
              location={state.location}
              onSelect={(consultantId, consultantName, consultationTypeId, surcharge) => {
                setState({
                  ...state,
                  consultantId,
                  consultantName,
                  consultationTypeId,
                  surchargeCents: surcharge,
                  selectedSlot: null,
                });
                setStep(3);
              }}
            />
          )}

          {step === 3 && state.consultantId && state.consultationTypeId && (
            <StepCalendar
              consultantId={state.consultantId}
              consultationTypeId={state.consultationTypeId}
              onSelect={(slot) => {
                setState({ ...state, selectedSlot: slot });
                setStep(4);
              }}
            />
          )}

          {step === 4 && (
            <StepContact
              initialValues={state.contact}
              onSubmit={(contact) => {
                setState({ ...state, contact });
                setStep(5);
              }}
            />
          )}

          {step === 5 && (
            <StepPayment
              priceCents={state.priceCents + state.surchargeCents}
              currency={state.currency}
              selected={state.paymentMethod}
              onSelect={(method) => {
                setState({ ...state, paymentMethod: method });
                setStep(6);
              }}
            />
          )}

          {step === 6 && (
            <StepConfirmation
              state={state}
              services={services}
              onConfirm={handleSubmit}
              isPending={isPending}
            />
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="text-center text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      {step > 0 && step < 6 && (
        <div className="flex justify-start">
          <Button variant="ghost" onClick={handleBack}>
            ← Retour
          </Button>
        </div>
      )}
    </div>
  );
};
