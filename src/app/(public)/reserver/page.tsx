import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BookingWizard } from "./_components/booking-wizard";
import { getLocationConfigs } from "@/app/(dashboard)/admin/reservation/actions";
import { redirect } from "next/navigation";
import { isBookingEnabled } from "@/lib/settings/feature-flags/store";

export const metadata: Metadata = {
  title: "Réserver une consultation : Question d'Allaitement",
  description:
    "Prenez rendez-vous avec une consultante en lactation, sommeil ou santé maternelle.",
};

export const dynamic = "force-dynamic";

const ReserverPage = async () => {
  if (!(await isBookingEnabled())) {
    redirect("/accompagnements");
  }

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
  let activeLocationsData: { consultant_id: string; location_type: string }[] = [];

  // Fetch location_configs and active consultation_types in parallel
  const [locationConfigs] = await Promise.all([getLocationConfigs()]);

  // Globally active location types (admin-controlled)
  const globallyActiveTypes = new Set(
    locationConfigs.filter((c) => c.is_active).map((c) => c.location_type)
  );

  try {
    const supabase = await createClient();
    const { data: consultationTypes, error } = await supabase
      .from("consultation_types")
      .select(
        "id, consultant_id, title, description, duration_minutes, price_cents, currency, is_online, available_locations, buffer_minutes"
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
            "id, consultant_id, title, description, duration_minutes, price_cents, currency, is_online, available_locations, buffer_minutes"
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

  // Bug fix: only include consultants that are active AND have an active Stripe account
  // This ensures the tunnel only shows locations for consultants who will actually appear
  // in the consultant selection step (which also filters by is_active + stripe_account_status).
  let eligibleConsultantIds = new Set(list.map((ct) => ct.consultant_id));

  if (eligibleConsultantIds.size > 0) {
    try {
      const admin = createAdminClient();
      const { data: eligibleConsultants } = await admin
        .from("consultants")
        .select("id")
        .eq("is_active", true)
        .eq("stripe_account_status", "active")
        .in("id", [...eligibleConsultantIds]);
      eligibleConsultantIds = new Set((eligibleConsultants ?? []).map((c) => c.id));
    } catch {
      // Non-blocking: fall back to all consultants
    }
  }

  // Filter list to only eligible consultants
  const eligibleList = list.filter((ct) =>
    eligibleConsultantIds.has(ct.consultant_id)
  );

  // Fetch active locations from consultant_locations — source of truth for cabinet/domicile
  if (eligibleList.length > 0) {
    try {
      const supabase = await createClient();
      const consultantIds = [...new Set(eligibleList.map((ct) => ct.consultant_id))];
      const { data } = await supabase
        .from("consultant_locations")
        .select("consultant_id, location_type")
        .eq("is_active", true)
        .in("consultant_id", consultantIds);
      activeLocationsData = data ?? [];
    } catch {
      // Non-blocking
    }
  }

  // Build a map: consultant_id -> Set of active location types
  const consultantLocMap = new Map<string, Set<string>>();
  for (const loc of activeLocationsData) {
    if (!consultantLocMap.has(loc.consultant_id)) {
      consultantLocMap.set(loc.consultant_id, new Set());
    }
    consultantLocMap.get(loc.consultant_id)!.add(loc.location_type);
  }
  // Teleconsultation doesn't require a consultant_locations entry — driven by is_online on the type
  for (const ct of eligibleList) {
    if (ct.is_online !== false) {
      if (!consultantLocMap.has(ct.consultant_id)) {
        consultantLocMap.set(ct.consultant_id, new Set());
      }
      consultantLocMap.get(ct.consultant_id)!.add("teleconsultation");
    }
  }

  const uniqueServices = Array.from(
    new Map(
      eligibleList.map((ct) => [
        ct.title,
        {
          title: ct.title,
          description: ct.description,
          duration_minutes: ct.duration_minutes,
          price_cents: ct.price_cents,
          currency: ct.currency,
          // Only include location types that are:
          // 1. globally active (admin-controlled via location_configs)
          // 2. configured on the consultation type (available_locations)
          // 3. offered by at least one eligible consultant for this service
          available_locations: [
            ...new Set(
              eligibleList
                .filter((t) => t.title === ct.title)
                .flatMap((t) => {
                  const consultantLocs = consultantLocMap.get(t.consultant_id) ?? new Set<string>();
                  const typeLocs = (t.available_locations as string[] | null);
                  // If the type has no available_locations configured, fall back to consultant's locations
                  if (!typeLocs || typeLocs.length === 0) return [...consultantLocs];
                  return typeLocs.filter((loc) => consultantLocs.has(loc));
                })
                .filter((locType) => globallyActiveTypes.has(locType as never))
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
          Prenez rendez-vous avec une consultante IBCLC
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-primary-green/70">
          En cabinet à Paris ou en téléconsultation, selon ce qui vous convient.
          Le même niveau d&apos;expertise, adapté à votre situation précise
          freins de langue, prise de poids qui inquiète, douleur persistante, ou
          simplement l&apos;envie d&apos;un échange en direct.
        </p>
      </div>
      <BookingWizard services={uniqueServices} locationConfigs={locationConfigs} />
    </div>
  );
};

export default ReserverPage;
