import { supabase, assertTestMode } from "./lib/env.mjs";
import { IDS, PI } from "./lib/fixtures.mjs";

const PAYMENT_INTENT_IDS = Object.values(PI);

/**
 * Deleted in FK dependency order: rows that reference the fixtures first,
 * then the fixtures themselves.
 */
export const cleanup = async () => {
  assertTestMode();
  console.log("Nettoyage des fixtures E2E…");

  const steps = [
    [
      "payments",
      supabase
        .from("payments")
        .delete()
        .in("stripe_payment_intent_id", PAYMENT_INTENT_IDS),
    ],
    [
      "audit_logs",
      supabase.from("audit_logs").delete().eq("user_id", IDS.clientProfile),
    ],
    [
      "notifications",
      supabase.from("notifications").delete().eq("user_id", IDS.clientProfile),
    ],
    [
      "bookings",
      supabase.from("bookings").delete().eq("client_id", IDS.clientProfile),
    ],
    [
      "formation_enrollments",
      supabase
        .from("formation_enrollments")
        .delete()
        .eq("client_id", IDS.clientProfile),
    ],
    [
      "event_registrations",
      supabase
        .from("event_registrations")
        .delete()
        .eq("client_id", IDS.clientProfile),
    ],
    ["events", supabase.from("events").delete().eq("id", IDS.event)],
    ["formations", supabase.from("formations").delete().eq("id", IDS.formation)],
    [
      "consultation_type_durations",
      supabase
        .from("consultation_type_durations")
        .delete()
        .eq("id", IDS.durationOption),
    ],
    [
      "consultation_types",
      supabase.from("consultation_types").delete().eq("id", IDS.consultationType),
    ],
    [
      "consultants",
      supabase.from("consultants").delete().eq("id", IDS.consultantProfile),
    ],
    [
      "profiles",
      supabase
        .from("profiles")
        .delete()
        .in("id", [IDS.clientProfile, IDS.consultantProfile]),
    ],
  ];

  for (const [label, query] of steps) {
    const { error } = await query;
    // A missing table (audit_logs naming drift) should not abort the cleanup.
    if (error) {
      console.log(`  ! ${label} : ${error.message}`);
      continue;
    }
    console.log(`  ✓ ${label}`);
  }

  console.log("Nettoyage termine.\n");
};

if (import.meta.filename === process.argv[1]) {
  cleanup().catch((error) => {
    console.error(`\nEchec du nettoyage : ${error.message}`);
    process.exit(1);
  });
}
