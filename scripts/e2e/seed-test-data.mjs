import { supabase, assertTestMode } from "./lib/env.mjs";
import {
  IDS,
  CLIENT_EMAIL,
  CONSULTANT_EMAIL,
  CONSULTANT_STRIPE_ACCOUNT,
  COMMISSION_RATE,
  PRICES,
} from "./lib/fixtures.mjs";

const check = (label, { error }) => {
  if (error) throw new Error(`${label} : ${error.message}`);
  console.log(`  ✓ ${label}`);
};

export const seed = async () => {
  assertTestMode();
  console.log("Seed des fixtures E2E…");

  check(
    "profiles (client + consultante)",
    await supabase.from("profiles").upsert(
      [
        {
          id: IDS.clientProfile,
          roles: ["client"],
          email: CLIENT_EMAIL,
          first_name: "Camille",
          last_name: "E2E",
        },
        {
          id: IDS.consultantProfile,
          roles: ["consultant"],
          email: CONSULTANT_EMAIL,
          first_name: "Consultante",
          last_name: "E2E",
        },
      ],
      { onConflict: "id" },
    ),
  );

  check(
    "consultants",
    await supabase.from("consultants").upsert(
      {
        id: IDS.consultantProfile,
        slug: "consultante-e2e",
        bio: "Consultante de test — fixtures E2E.",
        specialties: ["allaitement"],
        stripe_account_id: CONSULTANT_STRIPE_ACCOUNT,
        stripe_account_status: "active",
        commission_rate: COMMISSION_RATE,
        is_active: true,
        onboarding_completed: true,
      },
      { onConflict: "id" },
    ),
  );

  check(
    "consultation_types",
    await supabase.from("consultation_types").upsert(
      {
        id: IDS.consultationType,
        consultant_id: IDS.consultantProfile,
        title: "Consultation E2E",
        description: "Type de consultation de test.",
        duration_minutes: 60,
        price_cents: PRICES.booking,
        currency: "eur",
        available_locations: ["teleconsultation", "cabinet"],
        buffer_minutes: 15,
        is_active: true,
      },
      { onConflict: "id" },
    ),
  );

  check(
    "consultation_type_durations",
    await supabase.from("consultation_type_durations").upsert(
      {
        id: IDS.durationOption,
        consultation_type_id: IDS.consultationType,
        duration_minutes: 60,
        price_cents: PRICES.booking,
        is_default: true,
        position: 0,
      },
      { onConflict: "id" },
    ),
  );

  check(
    "formations (accompagnement en ligne)",
    await supabase.from("formations").upsert(
      {
        id: IDS.formation,
        consultant_id: IDS.consultantProfile,
        title: "Accompagnement E2E",
        slug: "accompagnement-e2e",
        short_description: "Accompagnement de test.",
        description: "Accompagnement en ligne utilise par la suite E2E.",
        price_cents: PRICES.formation,
        currency: "eur",
        status: "published",
        published_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    ),
  );

  // N1 never reads these — it injects `starts_at` straight into Stripe metadata.
  // N2 drives the real calendar step, which renders nothing without them.
  check(
    "availabilities (lun-ven, 9h-18h)",
    await supabase.from("availabilities").upsert(
      [1, 2, 3, 4, 5].map((day) => ({
        id: IDS.availability(day),
        consultant_id: IDS.consultantProfile,
        day_of_week: day,
        start_time: "09:00:00",
        end_time: "18:00:00",
        is_active: true,
      })),
      { onConflict: "id" },
    ),
  );

  const eventStart = new Date(Date.now() + 14 * 24 * 3600 * 1000);
  const eventEnd = new Date(eventStart.getTime() + 90 * 60 * 1000);

  check(
    "events",
    await supabase.from("events").upsert(
      {
        id: IDS.event,
        consultant_id: IDS.consultantProfile,
        title: "Atelier E2E",
        slug: "atelier-e2e",
        description: "Evenement de test.",
        type: "online",
        starts_at: eventStart.toISOString(),
        ends_at: eventEnd.toISOString(),
        price_cents: PRICES.event,
        currency: "eur",
        is_published: true,
      },
      { onConflict: "id" },
    ),
  );

  console.log("Seed termine.\n");
};

if (import.meta.filename === process.argv[1]) {
  seed().catch((error) => {
    console.error(`\nEchec du seed : ${error.message}`);
    process.exit(1);
  });
}
