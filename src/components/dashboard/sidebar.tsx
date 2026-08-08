"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NavItem } from "@/config/navigation";
import { NavList } from "@/components/dashboard/nav-list";

type SidebarProps = {
  items: NavItem[];
  onLogout: () => void;
};

export const Sidebar = ({ items, onLogout }: SidebarProps) => {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-6">
        <Link
          href="/"
          className="font-serif text-lg font-bold text-sidebar-foreground"
          tabIndex={0}
        >
          QdA
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <NavList items={items} ariaLabel="Dashboard navigation" />
      </ScrollArea>
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <form action={onLogout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border border-sidebar-accent/50"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </form>
      </div>
    </aside>
  );
};
