import { Metadata } from "next";
import { BookingWizard } from "./_components/booking-wizard";
import { getConsultationTypes } from "./actions";

export const metadata: Metadata = {
  title: "Réserver une consultation — Question d'Allaitement",
  description:
    "Prenez rendez-vous avec une consultante en lactation, sommeil ou santé maternelle.",
};

const ReserverPage = async () => {
  const consultationTypes = await getConsultationTypes();

  const uniqueServices = Array.from(
    new Map(
      consultationTypes.map((ct) => [
        ct.title,
        {
          title: ct.title,
          description: ct.description,
          duration_minutes: ct.duration_minutes,
          price_cents: ct.price_cents,
          currency: ct.currency,
          available_locations: [
            ...new Set(
              consultationTypes
                .filter((t) => t.title === ct.title)
                .flatMap((t) => (t.available_locations as string[]) ?? [])
            ),
          ],
        },
      ])
    ).values()
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          Réserver une consultation
        </h1>
        <p className="mt-3 text-lg text-primary-green/70">
          Prenez rendez-vous en quelques étapes simples.
        </p>
      </div>
      <BookingWizard services={uniqueServices} />
    </div>
  );
};

export default ReserverPage;
