import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = [
  "/",
  "/formations",
  "/consultantes",
  "/evenements",
  "/politique-de-confidentialite",
  "/mentions-legales",
];

const AUTH_ROUTES = ["/connexion", "/inscription", "/mot-de-passe-oublie"];

const ROLE_ROUTE_MAP: Record<string, string[]> = {
  "/espace-client": ["client", "admin"],
  "/espace-consultante": ["consultant", "consultant_limited", "admin"],
  "/admin": ["admin"],
};

const isPublicRoute = (pathname: string): boolean => {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_ROUTES.some(
    (route) => route !== "/" && pathname.startsWith(route + "/")
  );
};

const isAuthRoute = (pathname: string): boolean => {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
};

const isApiRoute = (pathname: string): boolean => {
  return pathname.startsWith("/api/");
};

export const middleware = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (isApiRoute(pathname) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const { supabaseResponse, user, profile } = await updateSession(request);

  if (isPublicRoute(pathname)) {
    return supabaseResponse;
  }

  if (isAuthRoute(pathname)) {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = "/espace-client";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ROUTE_MAP)) {
    if (pathname.startsWith(routePrefix)) {
      if (!profile || !allowedRoles.includes(profile.role)) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
      break;
    }
  }

  return supabaseResponse;
};

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
