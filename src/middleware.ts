import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC_ROUTES = [
  "/",
  "/formations",
  "/consultantes",
  "/reserver",
  "/politique-de-confidentialite",
  "/mentions-legales",
  "/replay-lives",
  "/accompagnements",
  "/livres",
  "/medias",
  "/blog",
  "/a-propos",
  "/newsletter",
  // Page de liens partagée en bio Instagram : non listée dans le menu et non
  // indexée, mais publique — c'est son adresse qui circule.
  "/liens",
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
  /**
   * `robots.txt` et `sitemap.xml` sont exclus explicitement.
   *
   * Ils ne figuraient ni dans les routes publiques ni dans les exclusions du
   * matcher : le middleware les renvoyait donc vers /connexion. Constate en
   * production — les deux repondaient 307 vers la page de connexion, donc aucun
   * moteur ne lisait ni les directives d'indexation ni la liste des pages.
   *
   * Exclus du matcher plutot qu'ajoutes aux routes publiques : ces deux fichiers
   * n'ont aucune logique d'authentification a traverser.
   *
   * `sw.js` et `manifest.webmanifest` sont exclus pour la meme raison, et c'est
   * vital pour le push : le navigateur refuse d'enregistrer un service worker
   * qui repond une redirection, et un manifeste renvoye vers /connexion rend
   * l'installation sur l'ecran d'accueil impossible. Tous deux sont demandes
   * hors session, avant meme que l'utilisatrice se connecte.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
