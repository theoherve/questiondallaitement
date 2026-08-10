import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { BroadcastForm } from "./_components/broadcast-form";
import { BroadcastLog } from "./_components/broadcast-log";
import type { NotificationBroadcast } from "@/types/database";

export const metadata: Metadata = { title: "Messages aux utilisatrices" };

const MessagesPage = async () => {
  const supabase = createAdminClient();

  const [segmentsRes, broadcastsRes] = await Promise.all([
    supabase
      .from("crm_segments")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("notification_broadcasts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

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
          <BroadcastForm segments={segmentsRes.data ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">
            Derniers envois ciblés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BroadcastLog
            rows={(broadcastsRes.data ?? []) as NotificationBroadcast[]}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default MessagesPage;
