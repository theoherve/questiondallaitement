import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listSurveys } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  published: "Publié",
  closed: "Clôturé",
};

export default async function AdminSurveysPage() {
  const surveys = await listSurveys();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-primary-green">Sondages</h1>
          <p className="text-sm text-primary-green/60">
            Les sondages publiés peuvent être insérés dans un article de blog.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/sondages/nouveau">Nouveau sondage</Link>
        </Button>
      </div>

      {surveys.length === 0 ? (
        <p className="text-primary-green/70">Aucun sondage pour le moment.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {surveys.map((survey) => (
            <li
              key={survey.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div>
                <Link
                  href={`/admin/sondages/${survey.id}`}
                  className="font-medium text-primary-green hover:underline"
                >
                  {survey.title}
                </Link>
                <p className="text-sm text-primary-green/60">/{survey.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">
                  {STATUS_LABELS[survey.status] ?? survey.status}
                </Badge>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/sondages/${survey.id}/reponses`}>
                    Réponses
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
