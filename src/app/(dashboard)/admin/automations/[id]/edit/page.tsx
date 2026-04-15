import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { WorkflowForm } from "../../_components/workflow-form";
import { WorkflowLogs } from "../../_components/workflow-logs";
import {
  getWorkflow,
  getLabels,
  getRecurringDefinitions,
  getFormations,
  getEmailTemplates,
  getWorkflowLogs,
  getScheduledActions,
} from "../../actions";

export const metadata: Metadata = {
  title: "Modifier workflow - Automations",
};

type Props = {
  params: Promise<{ id: string }>;
};

const EditWorkflowPage = async ({ params }: Props) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const { id } = await params;

  const [workflow, labels, recurringDefs, formations, emailTemplates, logs, scheduledActions] =
    await Promise.all([
      getWorkflow(id),
      getLabels(),
      getRecurringDefinitions(),
      getFormations(),
      getEmailTemplates(),
      getWorkflowLogs(id),
      getScheduledActions(id),
    ]);

  if (!workflow) notFound();

  return (
    <div className="space-y-8">
      <WorkflowForm
        workflow={workflow}
        labels={labels}
        recurringDefinitions={recurringDefs}
        formations={formations}
        emailTemplates={emailTemplates}
      />
      <WorkflowLogs logs={logs} scheduledActions={scheduledActions} />
    </div>
  );
};

export default EditWorkflowPage;
