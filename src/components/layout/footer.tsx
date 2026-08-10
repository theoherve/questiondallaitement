import Link from "next/link";
import { InstagramIcon, LinkedinIcon } from "lucide-react";
import { publicNav, socialLinks } from "@/config/navigation";

const LEGAL_LINKS = [
  { href: "/contact", label: "Contact" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/politique-de-confidentialite", label: "Confidentialité" },
  { href: "/cgv", label: "CGV" },
];

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
  </svg>
);

const SOCIAL_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  Instagram: InstagramIcon,
  TikTok: TikTokIcon,
  Linkedin: LinkedinIcon,
};

export const Footer = () => {
  return (
    <footer className="border-t border-background-beige/10 bg-primary-green text-background-beige">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-16">
        {/* 4 columns: logo+tagline · Navigation · Legal · Social */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Logo + tagline */}
          <div>
            <Link
              href="/"
              className="font-serif text-xl font-bold"
              aria-label="Accueil"
            >
              Question d&apos;Allaitement
            </Link>
            <p className="mt-1.5 text-sm text-background-beige/60">
              Consultante en lactation IBCLC, auteure, formatrice et conférencière internationale.
              20+ ans d&apos;expertise au service de l&apos;allaitement.
            </p>
          </div>
          {/* Navigation */}
          <div>
            <h3 className="font-sans text-xs font-medium uppercase tracking-widest text-background-beige/40">
              Navigation
            </h3>
            <ul className="mt-3 space-y-1.5">
              {publicNav.map((link) => (
                <li key={link.href} className="mb-0">
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

          {/* Legal + contact */}
          <div>
            <h3 className="font-sans text-xs font-medium uppercase tracking-widest text-background-beige/40">
              Informations
            </h3>
            <ul className="mt-3 space-y-1.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href} className="mb-0">
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
              Suivez-moi
            </h3>
            <div className="mt-3 flex gap-4">
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
        <div className="mt-6 border-t border-background-beige/10 pt-5 text-center text-sm text-background-beige/40">
          <p>
            &copy; {new Date().getFullYear()} Question d&apos;Allaitement.
            Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};
