import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/notifications — list unread notifications for the current user
export const GET = async () => {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, metadata, created_at")
    .eq("user_id", user.id)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
};

// POST /api/notifications — create a notification (admin only)
export const POST = async (request: Request) => {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!user.roles.includes("admin")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = (await request.json()) as {
    user_id: string;
    title: string;
    body?: string;
    metadata?: Record<string, unknown>;
  };

  if (!body.user_id || !body.title) {
    return NextResponse.json(
      { error: "user_id et title sont requis" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: body.user_id,
    type: "admin",
    title: body.title,
    body: body.body ?? null,
    metadata: body.metadata ?? null,
  });

  if (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
};
