"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { clientNav } from "@/config/navigation";
import { getNavIcon } from "@/config/navigation-icons";

const getIsActive = (pathname: string, href: string, isFirst: boolean) => {
  if (isFirst) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
};

export const ClientSpaceTabs = () => {
  const pathname = usePathname();

  return (
    <nav
      className="border-b border-border bg-background-beige"
      aria-label="Navigation espace client"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="flex gap-1 overflow-x-auto py-0" role="tablist">
          {clientNav.map((item, index) => {
            const isActive = getIsActive(
              pathname,
              item.href,
              index === 0
            );
            const Icon = getNavIcon(item.iconKey);

            return (
              <li key={item.href} role="presentation">
                <Link
                  href={item.href}
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? "page" : undefined}
                  tabIndex={0}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-green",
                    isActive
                      ? "border-primary-green text-primary-green"
                      : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};
