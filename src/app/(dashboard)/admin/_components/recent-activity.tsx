import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  UserPlus,
  CreditCard,
  BookOpen,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

export type ActivityItem = {
  id: string;
  type: "new_client" | "payment" | "enrollment" | "booking";
  label: string;
  detail: string;
  created_at: string;
};

const ICONS: Record<ActivityItem["type"], LucideIcon> = {
  new_client: UserPlus,
  payment: CreditCard,
  enrollment: BookOpen,
  booking: CalendarDays,
};

const COLORS: Record<ActivityItem["type"], string> = {
  new_client: "bg-blue-100 text-blue-600",
  payment: "bg-emerald-100 text-emerald-600",
  enrollment: "bg-amber-100 text-amber-600",
  booking: "bg-primary-red/10 text-primary-red",
};

export const RecentActivity = ({ items }: { items: ActivityItem[] }) => {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aucune activité récente.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const Icon = ICONS[item.type];
        return (
          <div key={item.id} className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${COLORS[item.type]}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{item.label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.detail}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
};
