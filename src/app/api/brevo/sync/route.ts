import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { syncAllContactsToBrevo } from "@/lib/brevo/sync";

export async function POST() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncAllContactsToBrevo();
  return NextResponse.json(result);
}
