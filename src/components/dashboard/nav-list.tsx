"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  getActiveNavHref,
  groupNavItems,
  type NavItem,
} from "@/config/navigation";
import { getNavIcon } from "@/config/navigation-icons";

type NavListProps = {
  items: NavItem[];
  onNavigate?: () => void;
  ariaLabel?: string;
};

/**
 * Liste de navigation partagée sidebar desktop / menu mobile. Les entrées
 * portant une `section` sont regroupées sous un libellé ; les autres restent
 * rendues à plat.
 */
export const NavList = ({ items, onNavigate, ariaLabel }: NavListProps) => {
  const pathname = usePathname();
  const activeHref = getActiveNavHref(pathname, items);
  const groups = groupNavItems(items);

  return (
    <nav className="px-3 py-2" aria-label={ariaLabel}>
      {groups.map((group, index) => (
        <div key={group.label ?? `flat-${index}`}>
          {group.label && (
            <p
              className={cn(
                "px-3 pb-0.5 text-[0.625rem] font-semibold uppercase leading-none tracking-[0.08em] text-sidebar-foreground/40",
                index > 0 ? "pt-3" : "pt-1",
              )}
            >
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const isActive = item.href === activeHref;
            const Icon = getNavIcon(item.iconKey);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[0.8125rem] font-medium leading-5 transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
                tabIndex={0}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.title}
                {item.badge && (
                  <span className="ml-auto rounded-full bg-primary-red px-2 py-0.5 text-[0.625rem] text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
};
