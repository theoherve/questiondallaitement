"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { publicNav, clientNav } from "@/config/navigation";
import { getNavIcon } from "@/config/navigation-icons";
import {
  canAccessBackoffice,
  getBackofficeRedirectUrl,
} from "@/constants/roles";
import type { SessionUser } from "@/lib/auth";

type HeaderProps = {
  user: SessionUser | null;
  onLogout: () => Promise<void>;
};

export const Header = ({ user, onLogout }: HeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on browser back/forward navigation
  useEffect(() => {
    const onPopState = () => setMenuOpen(false);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background-beige/95 backdrop-blur supports-backdrop-filter:bg-background-beige/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex-shrink-0"
            aria-label="Accueil Question d'Allaitement"
          >
            <Image
              src="/logo.svg"
              alt="Question d'Allaitement"
              width={180}
              height={48}
              className="h-10 w-auto lg:h-12"
              priority
            />
          </Link>

          {/* Desktop nav — 6 links */}
          <nav
            className="hidden items-center gap-8 lg:flex"
            aria-label="Navigation principale"
          >
            {publicNav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link relative text-[15px] font-medium text-primary-green transition-colors hover:text-primary-red"
              >
                {link.title}
              </Link>
            ))}
          </nav>

          {/* Desktop right — icon-only user + CTA */}
          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-green hover:bg-primary-red/10 hover:text-primary-red"
                    aria-label="Mon compte"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {clientNav.map((item) => {
                    const Icon = getNavIcon(item.iconKey);
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className="flex items-center gap-2"
                        >
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
                        <Link href={getBackofficeRedirectUrl(user.role)}>
                          Backoffice
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => void onLogout()}
                    className="cursor-pointer text-primary-red focus:bg-primary-red/10 focus:text-primary-red"
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <Button
              asChild
              className="bg-primary-red px-6 hover:bg-primary-red-dark"
            >
              <Link href="/reserver">Prendre RDV</Link>
            </Button>
          </div>

          {/* Mobile right — CTA RDV + hamburger (always visible) */}
          <div className="flex items-center gap-2 lg:hidden">
            <Button
              asChild
              size="sm"
              className="bg-primary-red hover:bg-primary-red-dark"
            >
              <Link href="/reserver">RDV</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* ─── MOBILE FULLSCREEN OVERLAY ─── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col bg-background-beige lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
        >
          {/* Top bar mirrors header height for alignment */}
          <div className="flex h-16 items-center justify-end px-5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fermer le menu"
              onClick={() => setMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Nav links */}
          <nav
            className="flex flex-1 flex-col gap-1 px-8 pt-4"
            aria-label="Navigation mobile"
          >
            {publicNav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-3 font-serif text-2xl font-semibold text-primary-green transition-colors hover:text-primary-red"
                onClick={() => setMenuOpen(false)}
              >
                {link.title}
              </Link>
            ))}

            <div className="my-6 border-t border-border" />

            {/* Auth section */}
            {user ? (
              <>
                {clientNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="py-2 text-base font-medium text-primary-green/70 transition-colors hover:text-primary-red"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.title}
                  </Link>
                ))}
                {canAccessBackoffice(user.role) && (
                  <Link
                    href={getBackofficeRedirectUrl(user.role)}
                    className="py-2 text-base font-medium text-primary-green/70 transition-colors hover:text-primary-red"
                    onClick={() => setMenuOpen(false)}
                  >
                    Backoffice
                  </Link>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 w-full border-primary-red text-primary-red hover:bg-primary-red/10 hover:text-primary-red"
                  onClick={() => void onLogout()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/connexion"
                  className="py-2 text-base font-medium text-primary-green/70 transition-colors hover:text-primary-red"
                  onClick={() => setMenuOpen(false)}
                >
                  Connexion
                </Link>
                <div className="mt-4 flex flex-col gap-3">
                  <Button
                    asChild
                    className="w-full bg-primary-red hover:bg-primary-red-dark"
                  >
                    <Link
                      href="/reserver"
                      onClick={() => setMenuOpen(false)}
                    >
                      Prendre rendez-vous
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link
                      href="/inscription"
                      onClick={() => setMenuOpen(false)}
                    >
                      Créer mon compte
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
};
