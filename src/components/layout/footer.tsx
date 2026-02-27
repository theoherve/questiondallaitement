import Link from "next/link";
import { Instagram, Facebook, Linkedin } from "lucide-react";
import { publicNav, socialLinks } from "@/config/navigation";

const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/politique-de-confidentialite", label: "Confidentialité" },
  { href: "/cgv", label: "CGV" },
];

const SOCIAL_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  Instagram,
  Facebook,
  Linkedin,
};

export const Footer = () => {
  return (
    <footer className="border-t border-background-beige/10 bg-primary-green text-background-beige">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-16">
        {/* Top: logo + tagline */}
        <div className="mb-12">
          <Link
            href="/"
            className="font-serif text-xl font-bold"
            aria-label="Accueil"
          >
            Question d&apos;Allaitement
          </Link>
          <p className="mt-3 max-w-sm text-sm text-background-beige/60">
            Consultante IBCLC, auteure et formatrice.
            20+ ans d&apos;expertise au service de l&apos;allaitement.
          </p>
        </div>

        {/* 3 columns */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {/* Navigation */}
          <div>
            <h3 className="font-sans text-xs font-medium uppercase tracking-widest text-background-beige/40">
              Navigation
            </h3>
            <ul className="mt-4 space-y-2.5">
              {publicNav.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-background-beige/70 transition-colors hover:text-background-beige"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-sans text-xs font-medium uppercase tracking-widest text-background-beige/40">
              Légal
            </h3>
            <ul className="mt-4 space-y-2.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-background-beige/70 transition-colors hover:text-background-beige"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-sans text-xs font-medium uppercase tracking-widest text-background-beige/40">
              Suivez-nous
            </h3>
            <div className="mt-4 flex gap-4">
              {socialLinks.map((social) => {
                const Icon = SOCIAL_ICONS[social.iconKey];
                return (
                  <a
                    key={social.title}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-background-beige/60 transition-colors hover:text-background-beige"
                    aria-label={social.title}
                  >
                    {Icon && <Icon className="h-5 w-5" />}
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 border-t border-background-beige/10 pt-8 text-center text-sm text-background-beige/40">
          <p>
            &copy; {new Date().getFullYear()} Question d&apos;Allaitement.
            Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};
