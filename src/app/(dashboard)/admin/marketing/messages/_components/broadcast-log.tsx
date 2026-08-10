import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { NotificationBroadcast } from "@/types/database";

const RULE_LABELS: Record<string, string> = {
  all_clients: "Toutes les utilisatrices",
  accompagnement_holders: "Ayants droit d'un accompagnement",
  segment: "Segment",
  role: "Équipe",
  recipient: "Une personne",
  preference_enabled: "Abonnées à la catégorie",
};

/**
 * Derniers envois ciblés, lus dans `notification_broadcasts`.
 *
 * Un envoi qui a touché trois fois plus de monde que prévu doit se voir : c'est
 * la seule trace qu'une condition de segment s'est élargie par erreur.
 */
export const BroadcastLog = ({ rows }: { rows: NotificationBroadcast[] }) => {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun envoi ciblé pour le moment.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => {
        const kind = (row.rule as { kind?: string }).kind ?? "";
        return (
          <li key={row.id} className="flex items-center justify-between py-2.5">
            <div>
              <p className="text-sm font-medium">{row.event}</p>
              <p className="text-xs text-muted-foreground">
                {RULE_LABELS[kind] ?? kind}
                {" · "}
                {formatDistanceToNow(new Date(row.created_at), {
                  addSuffix: true,
                  locale: fr,
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{row.recipient_count}</p>
              {row.truncated && (
                <p className="text-xs text-primary-red">liste plafonnée</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
