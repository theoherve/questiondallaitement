"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const NAV_LINKS = [
  { href: "/formations", label: "Formations" },
  { href: "/consultantes", label: "Consultantes" },
  { href: "/evenements", label: "Événements" },
];

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background-beige/95 backdrop-blur supports-[backdrop-filter]:bg-background-beige/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-serif text-xl font-bold text-primary-green"
          aria-label="Accueil Question d'Allaitement"
          tabIndex={0}
        >
          Question d&apos;Allaitement
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Navigation principale">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-primary-green transition-colors hover:text-primary-red"
              tabIndex={0}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" asChild>
            <Link href="/connexion" tabIndex={0}>
              Connexion
            </Link>
          </Button>
          <Button
            asChild
            className="bg-primary-red hover:bg-primary-red-dark"
          >
            <Link href="/inscription" tabIndex={0}>
              S&apos;inscrire
            </Link>
          </Button>
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ouvrir le menu"
              tabIndex={0}
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="font-serif text-lg text-primary-green">
              Menu
            </SheetTitle>
            <nav className="mt-6 flex flex-col gap-4" aria-label="Navigation mobile">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-base font-medium text-primary-green hover:text-primary-red"
                  onClick={() => setIsOpen(false)}
                  tabIndex={0}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-3 border-t pt-4">
                <Button variant="outline" asChild>
                  <Link href="/connexion" onClick={() => setIsOpen(false)} tabIndex={0}>
                    Connexion
                  </Link>
                </Button>
                <Button
                  asChild
                  className="bg-primary-red hover:bg-primary-red-dark"
                >
                  <Link href="/inscription" onClick={() => setIsOpen(false)} tabIndex={0}>
                    S&apos;inscrire
                  </Link>
                </Button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
