"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NavItem } from "@/config/navigation";
import { NavList } from "@/components/dashboard/nav-list";

type DashboardHeaderProps = {
  title: string;
  items: NavItem[];
};

export const DashboardHeader = ({ title, items }: DashboardHeaderProps) => {
  const [isOpen, setIsOpen] = useState(false);

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
              <NavList
                items={items}
                onNavigate={() => setIsOpen(false)}
                ariaLabel="Navigation mobile"
              />
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
