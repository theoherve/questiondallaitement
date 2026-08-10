import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 20;

/**
 * GET /api/notifications?cursor=<iso>&limit=<n>
 *
 * Renvoie les notifications lues **et** non lues, de la plus récente à la plus
 * ancienne. Le panneau a besoin des deux, et le compteur ne peut plus se
 * déduire de la longueur du tableau : il est renvoyé à part.
 */
export const GET = async (request: Request) => {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(Number(url.searchParams.get("limit")) || PAGE_SIZE, 50);

  const supabase = createAdminClient();

  let query = supabase
    .from("notifications")
    .select(
      "id, type, category, title, body, href, actions, metadata, read_at, created_at"
    )
    .eq("user_id", user.id);

  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  const items = data ?? [];

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return NextResponse.json({
    items,
    nextCursor:
      items.length === limit ? items[items.length - 1].created_at : null,
    unreadCount: count ?? 0,
  });
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
    type: "admin_message",
    category: "system",
    title: body.title,
    body: body.body ?? null,
    metadata: body.metadata ?? null,
  });

  if (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
};
