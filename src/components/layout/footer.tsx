import Link from "next/link";

const FOOTER_LINKS = {
  plateforme: [
    { href: "/formations", label: "Formations" },
    { href: "/consultantes", label: "Consultantes" },
    { href: "/evenements", label: "Événements" },
  ],
  legal: [
    { href: "/mentions-legales", label: "Mentions légales" },
    { href: "/politique-de-confidentialite", label: "Politique de confidentialité" },
    { href: "/cgv", label: "CGV" },
  ],
};

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-primary-green text-background-beige">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <Link
              href="/"
              className="font-serif text-xl font-bold"
              aria-label="Accueil"
              tabIndex={0}
            >
              Question d&apos;Allaitement
            </Link>
            <p className="mt-3 text-sm text-background-beige/70">
              Plateforme de consultations et formations en lactation, sommeil et
              santé maternelle.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-sm font-semibold uppercase tracking-wider">
              Plateforme
            </h3>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.plateforme.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-background-beige/70 transition-colors hover:text-background-beige"
                    tabIndex={0}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-sm font-semibold uppercase tracking-wider">
              Légal
            </h3>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-background-beige/70 transition-colors hover:text-background-beige"
                    tabIndex={0}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-background-beige/10 pt-8 text-center text-sm text-background-beige/50">
          <p>
            &copy; {new Date().getFullYear()} Question d&apos;Allaitement. Tous
            droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};
