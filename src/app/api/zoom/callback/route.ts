import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/zoom/client";
import { createAdminClient } from "@/lib/supabase/admin";

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/espace-consultante/parametres?zoom=error`
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const supabase = createAdminClient();

    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    await supabase
      .from("consultants")
      .update({
        zoom_access_token: tokens.access_token,
        zoom_refresh_token: tokens.refresh_token,
        zoom_token_expires_at: expiresAt,
      })
      .eq("id", state);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/espace-consultante/parametres?zoom=success`
    );
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/espace-consultante/parametres?zoom=error`
    );
  }
};
