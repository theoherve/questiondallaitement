import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { BroadcastForm } from "./_components/broadcast-form";

export const metadata: Metadata = { title: "Messages aux utilisatrices" };

const MessagesPage = async () => {
  const supabase = createAdminClient();
  const { data: segments } = await supabase
    .from("crm_segments")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Messages aux utilisatrices
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">
            Écrire un message
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BroadcastForm segments={segments ?? []} />
        </CardContent>
      </Card>
    </div>
  );
};

export default MessagesPage;
