import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  CalendarClock,
  Users,
  Mail,
  Zap,
  BarChart3,
  Settings,
  CreditCard,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export const clientNav: NavItem[] = [
  { title: "Tableau de bord", href: "/espace-client", icon: LayoutDashboard },
  { title: "Mes formations", href: "/espace-client/formations", icon: BookOpen },
  { title: "Mes réservations", href: "/espace-client/reservations", icon: CalendarDays },
  { title: "Mon profil", href: "/espace-client/profil", icon: Settings },
];

export const consultantNav: NavItem[] = [
  { title: "Tableau de bord", href: "/espace-consultante", icon: LayoutDashboard },
  { title: "Formations", href: "/espace-consultante/formations", icon: BookOpen },
  { title: "Réservations", href: "/espace-consultante/reservations", icon: CalendarDays },
  { title: "Événements", href: "/espace-consultante/evenements", icon: CalendarClock },
  { title: "CRM", href: "/espace-consultante/crm", icon: Users },
  { title: "Emails", href: "/espace-consultante/emails", icon: Mail },
  { title: "Automations", href: "/espace-consultante/automations", icon: Zap },
  { title: "Analytics", href: "/espace-consultante/analytics", icon: BarChart3 },
  { title: "Paramètres", href: "/espace-consultante/parametres", icon: Settings },
];

export const adminNav: NavItem[] = [
  { title: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
  { title: "Consultantes", href: "/admin/consultantes", icon: Users },
  { title: "Formations", href: "/admin/formations", icon: BookOpen },
  { title: "Paiements", href: "/admin/paiements", icon: CreditCard },
  { title: "Marketing", href: "/admin/marketing", icon: Megaphone },
  { title: "Paramètres", href: "/admin/parametres", icon: Settings },
];
