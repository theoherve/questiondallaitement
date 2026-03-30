import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC_ROUTES = [
  "/",
  "/formations",
  "/consultantes",
  "/evenements",
  "/reserver",
  "/politique-de-confidentialite",
  "/mentions-legales",
  "/replay-lives",
  "/accompagnements",
  "/livres",
  "/medias",
  "/blog",
  "/a-propos",
];

const AUTH_ROUTES = [
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/reset-password",
  "/verification-email",
];

const ROLE_ROUTE_MAP: Record<string, string[]> = {
  "/espace-client": ["client", "admin"],
  "/espace-consultante": ["consultant", "consultant_limited", "admin"],
  "/admin": ["admin", "marketing_manager"],
};

const isPublicRoute = (pathname: string): boolean => {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_ROUTES.some(
    (route) => route !== "/" && pathname.startsWith(route + "/"),
  );
};

const isAuthRoute = (pathname: string): boolean => {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
};

const isApiRoute = (pathname: string): boolean => {
  return pathname.startsWith("/api/");
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;
  const u = user as { roles?: string[]; role?: string } | undefined;
  // Fallback: support old JWTs that still have single "role" string
  const roles: string[] = u?.roles ?? (u?.role ? [u.role] : []);

  if (isApiRoute(pathname) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (isAuthRoute(pathname)) {
    if (user) {
      const url = req.nextUrl.clone();
      url.pathname = "/espace-client";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ROUTE_MAP)) {
    if (pathname.startsWith(routePrefix)) {
      const hasAccess = roles.some((r) => allowedRoles.includes(r));
      if (!hasAccess) {
        const url = req.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
      break;
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
