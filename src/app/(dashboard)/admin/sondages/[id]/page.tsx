import { notFound } from "next/navigation";
import { getSurveyForAdmin } from "../actions";
import { SurveyBuilder } from "../_components/survey-builder";

export default async function EditSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // « nouveau » n'est pas un identifiant : la même page sert la création, ce
  // qui évite de dupliquer le constructeur dans deux routes.
  if (id === "nouveau") return <SurveyBuilder survey={null} />;

  const survey = await getSurveyForAdmin(id);
  if (!survey) notFound();

  return <SurveyBuilder survey={survey} />;
}
