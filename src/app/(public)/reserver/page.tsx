import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BookingWizard } from "./_components/booking-wizard";

export const metadata: Metadata = {
  title: "Réserver une consultation — Question d'Allaitement",
  description:
    "Prenez rendez-vous avec une consultante en lactation, sommeil ou santé maternelle.",
};

export const dynamic = "force-dynamic";

const ReserverPage = async () => {
  type ConsultationTypeRow = {
    id: string;
    consultant_id: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    price_cents: number;
    currency: string;
    is_online?: boolean | null;
    available_locations?: string[] | null;
    buffer_minutes: number | null;
  };

  let list: ConsultationTypeRow[] = [];

  try {
    const supabase = await createClient();
    const { data: consultationTypes, error } = await supabase
      .from("consultation_types")
      .select(
        "id, consultant_id, title, description, duration_minutes, price_cents, currency, is_online, buffer_minutes"
      )
      .eq("is_active", true)
      .order("title");

    if (error) throw error;
    list = consultationTypes ?? [];
  } catch {
    list = [];
  }

  if (list.length === 0) {
    try {
      const admin = createAdminClient();
      const { data: activeIds } = await admin
        .from("consultants")
        .select("id")
        .eq("is_active", true);
      const ids = (activeIds ?? []).map((c) => c.id);
      if (ids.length > 0) {
        const { data } = await admin
          .from("consultation_types")
          .select(
            "id, consultant_id, title, description, duration_minutes, price_cents, currency, is_online, buffer_minutes"
          )
          .eq("is_active", true)
          .in("consultant_id", ids)
          .order("title");
        list = data ?? [];
      }
    } catch {
      // Admin client not available or query failed
    }
  }

  const uniqueServices = Array.from(
    new Map(
      list.map((ct) => [
        ct.title,
        {
          title: ct.title,
          description: ct.description,
          duration_minutes: ct.duration_minutes,
          price_cents: ct.price_cents,
          currency: ct.currency,
          available_locations: [
            ...new Set(
              list
                .filter((t) => t.title === ct.title)
                .flatMap((t) =>
                  t.available_locations?.length
                    ? (t.available_locations as string[])
                    : [t.is_online !== false ? "teleconsultation" : "cabinet"]
                )
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
