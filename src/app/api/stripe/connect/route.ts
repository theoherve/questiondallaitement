import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createConnectAccount, createAccountLink } from "@/lib/stripe/connect";

export const POST = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: consultant } = await supabase
    .from("consultants")
    .select("id, stripe_account_id")
    .eq("id", user.id)
    .single();

  if (!consultant) {
    return NextResponse.json(
      { error: "Consultante non trouvée" },
      { status: 404 }
    );
  }

  let accountId = consultant.stripe_account_id;

  if (!accountId) {
    const account = await createConnectAccount(user.id, user.email!);
    accountId = account.id;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const accountLink = await createAccountLink(
    accountId,
    `${appUrl}/espace-consultante/parametres?stripe=refresh`,
    `${appUrl}/espace-consultante/parametres?stripe=success`
  );

  return NextResponse.json({ url: accountLink.url });
};
