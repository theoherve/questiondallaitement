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
  /**
   * Clé de section pour regrouper les entrées dans la sidebar. Optionnelle :
   * une nav sans section (client, consultante) reste rendue à plat.
   */
  section?: string;
};

/** Libellés affichés au-dessus de chaque groupe de la sidebar. */
export const NAV_SECTION_LABELS: Record<string, string> = {
  pilotage: "Pilotage",
  personnes: "Personnes",
  offre: "Offre",
  contenus: "Contenus",
  acquisition: "Acquisition",
  finance: "Finance",
  systeme: "Système",
};

export type NavGroup = {
  /** `undefined` pour les entrées sans section : rendu à plat, sans libellé. */
  label?: string;
  items: NavItem[];
};

/**
 * Regroupe les entrées consécutives partageant la même section, en préservant
 * l'ordre déclaré. Les entrées sans section forment un groupe sans libellé.
 */
export const groupNavItems = (items: NavItem[]): NavGroup[] =>
  items.reduce<NavGroup[]>((groups, item) => {
    const last = groups.at(-1);
    const label = item.section ? NAV_SECTION_LABELS[item.section] : undefined;

    if (last && last.label === label) {
      last.items.push(item);
      return groups;
    }
    groups.push({ label, items: [item] });
    return groups;
  }, []);

/**
 * Détermine l'entrée active par plus long préfixe : `/admin/marketing/newsletter`
 * n'allume que « Newsletter », pas « Marketing ».
 */
export const getActiveNavHref = (
  pathname: string,
  items: NavItem[],
): string | undefined =>
  items
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .reduce<NavItem | undefined>(
      (best, item) =>
        !best || item.href.length > best.href.length ? item : best,
      undefined,
    )?.href;

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
  // Pilotage
  {
    title: "Tableau de bord",
    href: "/admin",
    iconKey: "LayoutDashboard",
    section: "pilotage",
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    iconKey: "BarChart3",
    section: "pilotage",
  },
  // Personnes
  {
    title: "Utilisateurs",
    href: "/admin/utilisateurs",
    iconKey: "Users",
    section: "personnes",
  },
  {
    title: "Consultantes",
    href: "/admin/consultantes",
    iconKey: "UserCog",
    section: "personnes",
  },
  // Offre
  {
    title: "Accompagnements",
    href: "/admin/accompagnements",
    iconKey: "BookOpen",
    section: "offre",
  },
  {
    title: "Formations",
    href: "/admin/formations",
    iconKey: "CalendarClock",
    section: "offre",
  },
  {
    title: "Réservation",
    href: "/admin/reservation",
    iconKey: "CalendarCheck",
    section: "offre",
  },
  // Contenus
  {
    title: "Blog",
    href: "/admin/blog",
    iconKey: "FileText",
    section: "contenus",
  },
  {
    title: "Replay Lives",
    href: "/admin/replay-lives",
    iconKey: "Video",
    section: "contenus",
  },
  {
    title: "Sondages",
    href: "/admin/sondages",
    iconKey: "ClipboardList",
    section: "contenus",
  },
  {
    title: "Page de liens",
    href: "/admin/liens",
    iconKey: "Link",
    section: "contenus",
  },
  // Acquisition
  {
    title: "Marketing",
    href: "/admin/marketing",
    iconKey: "Megaphone",
    section: "acquisition",
  },
  {
    title: "Newsletter",
    href: "/admin/marketing/newsletter",
    iconKey: "Mail",
    section: "acquisition",
  },
  {
    title: "Automations",
    href: "/admin/automations",
    iconKey: "Zap",
    section: "acquisition",
  },
  // Finance
  {
    title: "Paiements",
    href: "/admin/paiements",
    iconKey: "CreditCard",
    section: "finance",
  },
  // Système
  {
    title: "Paramètres",
    href: "/admin/parametres",
    iconKey: "Settings",
    section: "systeme",
  },
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
