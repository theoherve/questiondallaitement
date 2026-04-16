import { createAdminClient } from "@/lib/supabase/admin";
import { computeOccurrences } from "./recurrence";
import type { RecurrenceRule, RecurringEventDefinition } from "./types";
import { addMinutes, format } from "date-fns";

/**
 * Generate upcoming event occurrences from active recurring definitions.
 * Called by the cron job.
 */
export const generateRecurringEvents = async (): Promise<{
  generated: number;
}> => {
  const supabase = createAdminClient();
  let generated = 0;

  const { data: definitions } = await supabase
    .from("recurring_event_definitions")
    .select("*")
    .eq("is_active", true);

  if (!definitions?.length) return { generated };

  // Compute "today" in Europe/Paris — independent of the host timezone.
  // Intl in `en-CA` emits an unambiguous `YYYY-MM-DD` value we can parse.
  const parisTodayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
  }).format(new Date());
  const [py, pm, pd] = parisTodayStr.split("-").map(Number);
  const today = new Date(py, pm - 1, pd);

  for (const def of definitions as RecurringEventDefinition[]) {
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + def.generate_ahead_days);

    // Start from day after last generated, or today
    let startFrom: Date;
    if (def.last_generated_until) {
      const lastGen = new Date(def.last_generated_until);
      lastGen.setDate(lastGen.getDate() + 1);
      startFrom = lastGen > today ? lastGen : today;
    } else {
      startFrom = today;
    }

    if (startFrom > horizon) continue;

    const rule = def.recurrence_rule as RecurrenceRule;
    const occurrences = computeOccurrences(rule, startFrom, horizon);

    let lastGenerated: Date | null = null;

    for (const occDate of occurrences) {
      const occDateStr = format(occDate, "yyyy-MM-dd");

      // Check if already generated (idempotent)
      const { data: existing } = await supabase
        .from("events")
        .select("id")
        .eq("recurring_definition_id", def.id)
        .eq("occurrence_date", occDateStr)
        .maybeSingle();

      if (existing) {
        lastGenerated = occDate;
        continue;
      }

      // Compute starts_at and ends_at in the definition's timezone
      const [hours, minutes] = def.time_of_day.split(":").map(Number);
      const startsAt = computeUtcFromLocal(
        occDate,
        hours,
        minutes,
        def.timezone,
      );
      const endsAt = addMinutes(startsAt, def.duration_minutes);

      const slug = `${def.slug_prefix}-${occDateStr}`;

      const { error } = await supabase.from("events").insert({
        consultant_id: def.consultant_id,
        title: def.title,
        slug,
        description: def.description,
        type: def.type,
        location: def.location,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        max_participants: def.max_participants,
        price_cents: def.price_cents,
        currency: def.currency,
        is_published: true,
        recurring_definition_id: def.id,
        occurrence_date: occDateStr,
      });

      if (!error) {
        generated++;
        lastGenerated = occDate;
      } else {
        console.error(
          `Failed to generate event for ${def.title} on ${occDateStr}:`,
          error.message,
        );
      }
    }

    // Update last_generated_until
    if (lastGenerated) {
      await supabase
        .from("recurring_event_definitions")
        .update({
          last_generated_until: format(lastGenerated, "yyyy-MM-dd"),
        })
        .eq("id", def.id);
    }
  }

  return { generated };
};

/**
 * Convert a local date+time in a given timezone to a UTC Date object.
 */
const computeUtcFromLocal = (
  date: Date,
  hours: number,
  minutes: number,
  timezone: string,
): Date => {
  // Build an ISO-like string for the local datetime
  const localStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

  // Use Intl to find the UTC offset for this datetime in the target timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find((p) => p.type === "timeZoneName");
  const offsetStr = offsetPart?.value ?? "GMT+1";

  const offsetMatch = offsetStr.match(/GMT([+-]?\d+(?::\d+)?)/);
  let offsetMinutes = 60; // default CET

  if (offsetMatch) {
    const offsetVal = offsetMatch[1];
    if (offsetVal.includes(":")) {
      const [h, m] = offsetVal.split(":").map(Number);
      offsetMinutes = h * 60 + (h < 0 ? -m : m);
    } else {
      offsetMinutes = parseInt(offsetVal, 10) * 60;
    }
  }

  const utc = new Date(`${localStr}.000Z`);
  utc.setMinutes(utc.getMinutes() - offsetMinutes);

  return utc;
};
