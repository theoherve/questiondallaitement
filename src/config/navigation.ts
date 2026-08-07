/**
 * Serializable nav config: iconKey only (no React components).
 * Safe to pass from Server Components to Client Components.
 */
import { PACK_SLUG } from "@/config/accompagnements";

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

/**
 * Page de vente du pack phare (offre en ligne). Sert de cible aux CTA de
 * conversion quand la réservation de RDV est désactivée (mode formations-only).
 */
export const PACK_SALES_PATH = `/accompagnements/${PACK_SLUG}`;

/** Social links — used in footer. */
export const socialLinks = [
  {
    title: "Instagram",
    href: "https://www.instagram.com/carole.questiondallaitement/",
    iconKey: "Instagram",
  },
  {
    title: "TikTok",
    href: "https://www.tiktok.com/@carole_herve",
    iconKey: "TikTok",
  },
  {
    title: "LinkedIn",
    href: "https://www.linkedin.com/in/carole-herve-ibclc/",
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
    title: "Mes accompagnements",
    href: "/espace-client/accompagnements",
    iconKey: "BookOpen",
  },
  {
    title: "Mes réservations",
    href: "/espace-client/reservations",
    iconKey: "CalendarDays",
  },
  {
    title: "Mes factures",
    href: "/espace-client/factures",
    iconKey: "FileText",
  },
  { title: "Mon profil", href: "/espace-client/profil", iconKey: "Settings" },
];

/**
 * Nav client filtrée selon les feature flags. Masque « Mes réservations »
 * quand la réservation de RDV est désactivée (mode formations-only).
 */
export const getClientNav = (bookingEnabled: boolean): NavItem[] =>
  bookingEnabled
    ? clientNav
    : clientNav.filter((item) => item.href !== "/espace-client/reservations");

export const consultantNav: NavItem[] = [
  {
    title: "Tableau de bord",
    href: "/espace-consultante",
    iconKey: "LayoutDashboard",
  },
  {
    title: "Réservations",
    href: "/espace-consultante/reservations",
    iconKey: "CalendarDays",
  },
  { title: "CRM", href: "/espace-consultante/crm", iconKey: "Users" },
  { title: "Emails", href: "/espace-consultante/emails", iconKey: "Mail" },
  {
    title: "Analytics",
    href: "/espace-consultante/analytics",
    iconKey: "BarChart3",
  },
  {
    title: "Facturation",
    href: "/espace-consultante/facturation",
    iconKey: "FileText",
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
  { title: "Accompagnements", href: "/admin/accompagnements", iconKey: "BookOpen" },
  { title: "Blog", href: "/admin/blog", iconKey: "FileText" },
  { title: "Sondages", href: "/admin/sondages", iconKey: "BarChart3" },
  { title: "Formations", href: "/admin/formations", iconKey: "CalendarClock" },
  { title: "Replay Lives", href: "/admin/replay-lives", iconKey: "Video" },
  { title: "Réservation", href: "/admin/reservation", iconKey: "CalendarCheck" },
  { title: "Paiements", href: "/admin/paiements", iconKey: "CreditCard" },
  { title: "Analytics", href: "/admin/analytics", iconKey: "BarChart3" },
  { title: "Marketing", href: "/admin/marketing", iconKey: "Megaphone" },
  { title: "Newsletter", href: "/admin/marketing/newsletter", iconKey: "Mail" },
  { title: "Automations", href: "/admin/automations", iconKey: "Zap" },
  { title: "Paramètres", href: "/admin/parametres", iconKey: "Settings" },
];

/** Hrefs accessibles au marketing_manager dans l’admin (dashboard + marketing uniquement). */
const ADMIN_MARKETING_MANAGER_HREFS = ["/admin", "/admin/marketing"];

export const getAdminNavForRole = (roles: string[]): NavItem[] => {
  if (roles.includes("marketing_manager") && !roles.includes("admin")) {
    return adminNav.filter((item) =>
      ADMIN_MARKETING_MANAGER_HREFS.includes(item.href),
    );
  }
  return adminNav;
};
