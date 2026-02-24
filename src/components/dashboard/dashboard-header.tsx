"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/config/navigation";
import { getNavIcon } from "@/config/navigation-icons";

type DashboardHeaderProps = {
  title: string;
  items: NavItem[];
};

export const DashboardHeader = ({ title, items }: DashboardHeaderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card lg:hidden">
      <div className="flex h-14 items-center gap-4 px-4">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ouvrir le menu"
              tabIndex={0}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-sidebar p-0">
            <SheetTitle className="border-b border-sidebar-border px-6 py-4 font-serif text-lg text-sidebar-foreground">
              QdA
            </SheetTitle>
            <ScrollArea className="h-full">
              <nav className="space-y-1 p-4">
                {items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== items[0]?.href &&
                      pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                      )}
                      tabIndex={0}
                    >
                      {(() => {
                    const Icon = getNavIcon(item.iconKey);
                    return <Icon className="h-4 w-4" />;
                  })()}
                      {item.title}
                    </Link>
                  );
                })}
              </nav>
            </ScrollArea>
          </SheetContent>
        </Sheet>
        <h1 className="font-serif text-lg font-semibold text-primary-green">
          {title}
        </h1>
      </div>
    </header>
  );
};
