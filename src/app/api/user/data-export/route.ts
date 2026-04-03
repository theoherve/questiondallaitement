import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const GET = async () => {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const [{ data: profile }, { data: bookings }, { data: enrollments }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, email, first_name, last_name, phone, roles, gdpr_consent_at, created_at, updated_at",
        )
        .eq("id", user.id)
        .single(),
      supabase
        .from("bookings")
        .select(
          "id, status, starts_at, ends_at, created_at, cancelled_at, cancellation_reason",
        )
        .eq("client_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("formation_enrollments")
        .select("id, formation_id, enrolled_at, status")
        .eq("client_id", user.id)
        .order("enrolled_at", { ascending: false }),
    ]);

  const exportData = {
    export_date: new Date().toISOString(),
    profile: profile ?? null,
    bookings: bookings ?? [],
    formation_enrollments: enrollments ?? [],
  };

  const json = JSON.stringify(exportData, null, 2);

  return new Response(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mes-donnees-rgpd-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
};
