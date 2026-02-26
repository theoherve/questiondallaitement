"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NavItem } from "@/config/navigation";
import { getNavIcon } from "@/config/navigation-icons";

type SidebarProps = {
  items: NavItem[];
  onLogout: () => void;
};

export const Sidebar = ({ items, onLogout }: SidebarProps) => {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <Link
          href="/"
          className="font-serif text-lg font-bold text-sidebar-foreground"
          tabIndex={0}
        >
          QdA
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <nav className="space-y-1 p-4" aria-label="Dashboard navigation">
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== items[0]?.href &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
                tabIndex={0}
                aria-current={isActive ? "page" : undefined}
              >
                {(() => {
            const Icon = getNavIcon(item.iconKey);
            return <Icon className="h-4 w-4" />;
          })()}
                {item.title}
                {item.badge && (
                  <span className="ml-auto rounded-full bg-primary-red px-2 py-0.5 text-xs text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="border-t border-sidebar-border p-4">
        <form action={onLogout}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </form>
      </div>
    </aside>
  );
};
