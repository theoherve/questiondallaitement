import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getMyPublishedConsultationNotes } from "./actions";

export const metadata: Metadata = {
  title: "Mes consultations",
};

const ANTECEDENT_LABELS = {
  antecedents_medicaux: "Antécédents médicaux",
  antecedents_chirurgicaux: "Antécédents chirurgicaux",
  allergies: "Allergies",
  traitements_en_cours: "Traitements en cours",
} as const;

const MyConsultationsPage = async () => {
  const notes = await getMyPublishedConsultationNotes();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Mes consultations
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Les comptes-rendus de vos consultations, une fois partagés par votre consultante.
      </p>

      {notes.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Aucune fiche de consultation n&apos;a encore été partagée.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="space-y-3 pt-6">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(note.created_at), "d MMMM yyyy", {
                    locale: fr,
                  })}
                </p>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Motif
                  </p>
                  <p className="text-sm">{note.motif}</p>
                </div>
                {(Object.keys(ANTECEDENT_LABELS) as Array<keyof typeof ANTECEDENT_LABELS>)
                  .filter((key) => note[key])
                  .map((key) => (
                    <div key={key}>
                      <p className="text-xs font-medium text-muted-foreground">
                        {ANTECEDENT_LABELS[key]}
                      </p>
                      <p className="text-sm">
                        {note[`${key}_detail` as keyof typeof note] || "—"}
                      </p>
                    </div>
                  ))}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Observation
                  </p>
                  <p className="text-sm">{note.observation}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Conclusion
                  </p>
                  <p className="text-sm">{note.conclusion}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyConsultationsPage;
