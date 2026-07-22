"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Menu, X, User, LogOut, Bell, Stethoscope, Shield, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { publicNav, clientNav, PACK_SALES_PATH } from "@/config/navigation";
import { features } from "@/config/features";
import { getNavIcon } from "@/config/navigation-icons";
import {
  isConsultant,
  isAdmin,
  isMarketingManagerOnly,
} from "@/constants/roles";
import type { SessionUser } from "@/lib/auth";
import type { Notification } from "@/types/database";

type HeaderProps = {
  user: SessionUser | null;
  onLogout: (formData: FormData) => void | Promise<void>;
};

export const Header = ({ user, onLogout }: HeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = (await res.json()) as Notification[];
          setNotifications(data);
        }
      } catch {
        // silently fail
      }
    };
    fetchNotifications();
  }, [user]);

  const markAllRead = async () => {
    const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
    if (res.ok) setNotifications([]);
  };

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
              <DropdownMenu onOpenChange={(open) => { if (open && notifications.length > 0) markAllRead(); }}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-primary-green hover:bg-primary-red/10 hover:text-primary-red"
                    aria-label="Mon compte"
                  >
                    <User className="h-4 w-4" />
                    {notifications.length > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary-red" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {notifications.length > 0 && (
                    <>
                      <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-medium text-primary-green">
                        <Bell className="h-3 w-3" />
                        Notifications
                      </DropdownMenuLabel>
                      {notifications.slice(0, 3).map((n) => (
                        <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5">
                          <span className="text-xs font-medium">{n.title}</span>
                          {n.body && (
                            <span className="text-xs text-muted-foreground line-clamp-1">{n.body}</span>
                          )}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}
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
                  {isConsultant(user.roles) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/espace-consultante" className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4" />
                          Espace consultante
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {isAdmin(user.roles) && (
                    <>
                      {!isConsultant(user.roles) && <DropdownMenuSeparator />}
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Backoffice
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {isMarketingManagerOnly(user.roles) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2">
                          <Megaphone className="h-4 w-4" />
                          Espace marketing
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <form action={onLogout}>
                    <DropdownMenuItem
                      asChild
                      className="text-primary-red focus:bg-primary-red/10 focus:text-primary-red"
                    >
                      <button
                        type="submit"
                        className="flex w-full cursor-pointer items-center gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        Déconnexion
                      </button>
                    </DropdownMenuItem>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="text-primary-green hover:bg-primary-red/10 hover:text-primary-red"
                aria-label="Se connecter"
              >
                <Link href="/connexion">
                  <User className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button
              asChild
              className="bg-primary-red px-6 hover:bg-primary-red-dark"
            >
              {features.bookingEnabled ? (
                <Link href="/reserver">Prendre RDV</Link>
              ) : (
                <Link href={PACK_SALES_PATH}>Découvrir le pack</Link>
              )}
            </Button>
          </div>

          {/* Mobile right — CTA (RDV ou pack) + hamburger (always visible) */}
          <div className="flex items-center gap-2 lg:hidden">
            <Button
              asChild
              size="sm"
              className="bg-primary-red hover:bg-primary-red-dark"
            >
              {features.bookingEnabled ? (
                <Link href="/reserver">RDV</Link>
              ) : (
                <Link href={PACK_SALES_PATH}>Le pack</Link>
              )}
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
                {isConsultant(user.roles) && (
                  <Link
                    href="/espace-consultante"
                    className="flex items-center gap-2 py-2 text-base font-medium text-primary-green/70 transition-colors hover:text-primary-red"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Stethoscope className="h-4 w-4" />
                    Espace consultante
                  </Link>
                )}
                {isAdmin(user.roles) && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 py-2 text-base font-medium text-primary-green/70 transition-colors hover:text-primary-red"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Shield className="h-4 w-4" />
                    Backoffice
                  </Link>
                )}
                {isMarketingManagerOnly(user.roles) && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 py-2 text-base font-medium text-primary-green/70 transition-colors hover:text-primary-red"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Megaphone className="h-4 w-4" />
                    Espace marketing
                  </Link>
                )}
                <form action={onLogout} className="mt-4">
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full border-primary-red text-primary-red hover:bg-primary-red/10 hover:text-primary-red"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </Button>
                </form>
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
                    {features.bookingEnabled ? (
                      <Link href="/reserver" onClick={() => setMenuOpen(false)}>
                        Prendre rendez-vous
                      </Link>
                    ) : (
                      <Link
                        href={PACK_SALES_PATH}
                        onClick={() => setMenuOpen(false)}
                      >
                        Découvrir le pack
                      </Link>
                    )}
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
