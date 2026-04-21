import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, BookOpen, Mic, FileText } from "lucide-react";
import type { Interaction, InteractionType } from "../actions";

const ICON_MAP: Record<InteractionType, React.ReactNode> = {
  booking: <Calendar className="h-4 w-4" />,
  enrollment: <BookOpen className="h-4 w-4" />,
  event: <Mic className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
};

const TYPE_LABEL: Record<InteractionType, string> = {
  booking: "Réservation",
  enrollment: "Accompagnement",
  event: "Événement",
  note: "Note",
};

const STATUS_LABEL: Record<string, string> = {
  completed: "Terminée",
  confirmed: "Confirmée",
  pending: "En attente",
  cancelled: "Annulée",
  no_show: "Absent",
};

interface Props {
  interactions: Interaction[];
}

export function InteractionTimeline({ interactions }: Props) {
  if (interactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Aucune interaction enregistrée
      </p>
    );
  }

  return (
    <ol className="relative border-s border-border ms-3">
      {interactions.map((item) => (
        <li key={`${item.type}-${item.id}`} className="mb-6 ms-6">
          <span className="absolute flex items-center justify-center w-7 h-7 rounded-full -start-3.5 bg-muted text-muted-foreground ring-2 ring-background">
            {ICON_MAP[item.type]}
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium text-muted-foreground">
              {TYPE_LABEL[item.type]}
              {item.status && STATUS_LABEL[item.status] && (
                <span className="ml-2 text-xs text-muted-foreground/70">
                  · {STATUS_LABEL[item.status]}
                </span>
              )}
            </p>
            <p className="text-sm font-medium">{item.title}</p>
            <time className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.date), {
                addSuffix: true,
                locale: fr,
              })}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}
