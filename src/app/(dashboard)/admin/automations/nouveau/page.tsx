import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { WorkflowForm } from "../_components/workflow-form";
import {
  getLabels,
  getRecurringDefinitions,
  getAccompagnements,
  getEmailTemplates,
} from "../actions";

export const metadata: Metadata = {
  title: "Nouveau workflow - Automations",
};

const NewWorkflowPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const [labels, recurringDefs, formations, emailTemplates] =
    await Promise.all([
      getLabels(),
      getRecurringDefinitions(),
      getAccompagnements(),
      getEmailTemplates(),
    ]);

  return (
    <WorkflowForm
      labels={labels}
      recurringDefinitions={recurringDefs}
      formations={formations}
      emailTemplates={emailTemplates}
    />
  );
};

export default NewWorkflowPage;
