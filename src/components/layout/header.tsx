"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clientNav } from "@/config/navigation";
import { getNavIcon } from "@/config/navigation-icons";
import {
  canAccessBackoffice,
  getBackofficeRedirectUrl,
} from "@/constants/roles";
import type { SessionUser } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/formations", label: "Formations" },
  { href: "/consultantes", label: "Consultantes" },
  { href: "/evenements", label: "Événements" },
];

type HeaderProps = {
  user: SessionUser | null;
  onLogout: () => Promise<void>;
};

export const Header = ({ user, onLogout }: HeaderProps) => {
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
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 text-primary-green hover:bg-primary-red/10 hover:text-primary-red"
                  aria-label="Ouvrir le menu compte"
                  tabIndex={0}
                >
                  <User className="h-4 w-4" />
                  <span className="max-w-[120px] truncate sm:max-w-[180px]">
                    {user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {clientNav.map((item) => {
                  const Icon = getNavIcon(item.iconKey);
                  return (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href} className="flex items-center gap-2" tabIndex={0}>
                        <Icon className="h-4 w-4" />
                        {item.title}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                {canAccessBackoffice(user.role) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href={getBackofficeRedirectUrl(user.role)}
                        tabIndex={0}
                      >
                        Backoffice
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={onLogout} className="w-full">
                    <button
                      type="submit"
                      className="flex w-full cursor-default items-center gap-2 outline-none"
                      tabIndex={0}
                    >
                      <LogOut className="h-4 w-4" />
                      Déconnexion
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
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
            </>
          )}
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
                {user ? (
                  <>
                    {clientNav.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="text-base font-medium text-primary-green hover:text-primary-red"
                        onClick={() => setIsOpen(false)}
                        tabIndex={0}
                      >
                        {item.title}
                      </Link>
                    ))}
                    {canAccessBackoffice(user.role) && (
                      <Link
                        href={getBackofficeRedirectUrl(user.role)}
                        className="text-base font-medium text-primary-green hover:text-primary-red"
                        onClick={() => setIsOpen(false)}
                        tabIndex={0}
                      >
                        Backoffice
                      </Link>
                    )}
                    <form action={onLogout} className="pt-2">
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full"
                        tabIndex={0}
                      >
                        Déconnexion
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
