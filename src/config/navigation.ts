/**
 * Serializable nav config: iconKey only (no React components).
 * Safe to pass from Server Components to Client Components.
 */
export type NavItem = {
  title: string;
  href: string;
  iconKey: string;
  badge?: string;
};

/** Public site navigation — displayed in header, footer, mobile menu. */
export type PublicNavItem = {
  title: string;
  href: string;
};

export const publicNav: PublicNavItem[] = [
  { title: "Accompagnements en ligne", href: "/accompagnements" },
  { title: "Formations", href: "/formations" },
  { title: "Livres", href: "/livres" },
  { title: "Médias", href: "/medias" },
  { title: "Blog", href: "/blog" },
  { title: "À propos", href: "/a-propos" },
];

/** Social links — used in footer. */
export const socialLinks = [
  {
    title: "Instagram",
    href: "https://instagram.com/questiondallaitement",
    iconKey: "Instagram",
  },
  {
    title: "Facebook",
    href: "https://facebook.com/questiondallaitement",
    iconKey: "Facebook",
  },
  {
    title: "LinkedIn",
    href: "https://linkedin.com/in/carole-herve",
    iconKey: "Linkedin",
  },
] as const;

export const clientNav: NavItem[] = [
  {
    title: "Tableau de bord",
    href: "/espace-client",
    iconKey: "LayoutDashboard",
  },
  {
    title: "Mes formations",
    href: "/espace-client/formations",
    iconKey: "BookOpen",
  },
  {
    title: "Mes réservations",
    href: "/espace-client/reservations",
    iconKey: "CalendarDays",
  },
  { title: "Mon profil", href: "/espace-client/profil", iconKey: "Settings" },
];

export const consultantNav: NavItem[] = [
  {
    title: "Tableau de bord",
    href: "/espace-consultante",
    iconKey: "LayoutDashboard",
  },
  {
    title: "Formations",
    href: "/espace-consultante/formations",
    iconKey: "BookOpen",
  },
  {
    title: "Réservations",
    href: "/espace-consultante/reservations",
    iconKey: "CalendarDays",
  },
  {
    title: "Événements",
    href: "/espace-consultante/evenements",
    iconKey: "CalendarClock",
  },
  { title: "CRM", href: "/espace-consultante/crm", iconKey: "Users" },
  { title: "Emails", href: "/espace-consultante/emails", iconKey: "Mail" },
  {
    title: "Automations",
    href: "/espace-consultante/automations",
    iconKey: "Zap",
  },
  {
    title: "Analytics",
    href: "/espace-consultante/analytics",
    iconKey: "BarChart3",
  },
  {
    title: "Paramètres",
    href: "/espace-consultante/parametres",
    iconKey: "Settings",
  },
];

export const adminNav: NavItem[] = [
  { title: "Tableau de bord", href: "/admin", iconKey: "LayoutDashboard" },
  { title: "Utilisateurs", href: "/admin/utilisateurs", iconKey: "Users" },
  { title: "Consultantes", href: "/admin/consultantes", iconKey: "Users" },
  { title: "Formations", href: "/admin/formations", iconKey: "BookOpen" },
  { title: "Blog", href: "/admin/blog", iconKey: "FileText" },
  { title: "Événements", href: "/admin/evenements", iconKey: "CalendarClock" },
  { title: "Paiements", href: "/admin/paiements", iconKey: "CreditCard" },
  { title: "Analytics", href: "/admin/analytics", iconKey: "BarChart3" },
  { title: "Marketing", href: "/admin/marketing", iconKey: "Megaphone" },
  { title: "Paramètres", href: "/admin/parametres", iconKey: "Settings" },
];

/** Hrefs accessibles au marketing_manager dans l’admin (dashboard + marketing uniquement). */
const ADMIN_MARKETING_MANAGER_HREFS = ["/admin", "/admin/marketing"];

export const getAdminNavForRole = (role: string): NavItem[] => {
  if (role === "marketing_manager") {
    return adminNav.filter((item) =>
      ADMIN_MARKETING_MANAGER_HREFS.includes(item.href),
    );
  }
  return adminNav;
};
