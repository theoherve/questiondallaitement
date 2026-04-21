import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { hasPermission } from "@/constants/permissions";
import type { UserRole } from "@/types/database";
import {
  getAutomations,
  getAutomationLogs,
  getAutomationFormOptions,
} from "./actions";
import { AutomationsList } from "./_components/automations-list";
import { AutomationLogs } from "./_components/automation-logs";

export const metadata: Metadata = {
  title: "Automations",
};

const AutomationsPage = async () => {
  const { user } = await getSupabaseAndUser();

  if (!hasPermission(user.roles as UserRole[], "manage_automations")) {
    redirect("/espace-consultante");
  }

  const [automations, logs, formOptions] = await Promise.all([
    getAutomations(),
    getAutomationLogs(),
    getAutomationFormOptions(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Automations
        </h1>
      </div>

      <p className="text-muted-foreground">
        Créez des automations pour envoyer des emails, ajouter des tags CRM ou
        déclencher des webhooks après un achat d&apos;accompagnement, une réservation ou une
        inscription à un événement.
      </p>

      <AutomationsList
        automations={automations}
        formOptions={formOptions}
      />

      <AutomationLogs logs={logs} />
    </div>
  );
};

export default AutomationsPage;
