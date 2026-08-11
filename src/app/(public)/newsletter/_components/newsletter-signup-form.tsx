"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NEWSLETTER_CONSENT_SHORT_TEXT,
  type NewsletterSource,
} from "@/config/newsletter";
import { newsletterSignupSchema } from "@/validations/newsletter";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

type FieldErrors = Partial<Record<"first_name" | "email" | "form", string>>;

type Outcome = { status: "subscribed" | "already_subscribed"; firstName: string };

/**
 * `dark` reprend le fond vert de la page /newsletter (labels et bordures
 * clairs). `light` s'appuie sur les styles par defaut d'Input/Label, pour une
 * section a fond clair comme le teaser de l'accueil.
 */
type Theme = "dark" | "light";

export const NewsletterSignupForm = ({
  source,
  theme = "dark",
  compact = false,
}: {
  source: NewsletterSource;
  theme?: Theme;
  /**
   * Prenom et email sur une meme ligne, labels remplaces par des placeholders
   * (toujours annonces aux lecteurs d'ecran via `sr-only`) : pense pour un
   * teaser qui n'a pas la hauteur d'une page dediee.
   */
  compact?: boolean;
}) => {
  const fieldId = useId();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;

    const payload = {
      first_name: firstName,
      email,
      // Pas de case a cocher : le formulaire ne sert qu'a l'inscription
      // newsletter, le clic sur le bouton vaut consentement explicite (voir
      // NEWSLETTER_CONSENT_SHORT_TEXT affiche sous le bouton).
      consent: true as const,
      source,
      website,
    };

    // Meme schema que la route : un message d'erreur ne peut pas diverger entre
    // ce que le navigateur annonce et ce que le serveur accepte.
    const parsed = newsletterSignupSchema.safeParse(payload);
    if (!parsed.success) {
      const { fieldErrors } = parsed.error.flatten();
      setErrors({
        first_name: fieldErrors.first_name?.[0],
        email: fieldErrors.email?.[0],
      });
      return;
    }

    setErrors({});
    setPending(true);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Les champs saisis ne sont jamais vides ici : reprendre son prenom et
        // son adresse apres une panne serveur est le meilleur moyen de perdre
        // l'inscription.
        setErrors({
          form:
            data?.error ??
            `Une erreur est survenue, réessayez ou écrivez-nous à ${siteConfig.contactEmail}`,
        });
        return;
      }

      setOutcome(data as Outcome);
    } catch {
      setErrors({
        form: "Connexion impossible. Vérifiez votre réseau et réessayez.",
      });
    } finally {
      setPending(false);
    }
  };

  const isDark = theme === "dark";

  if (outcome) {
    return (
      <div
        role="status"
        className="border border-accent-peach bg-accent-peach-soft p-8 text-center"
      >
        <p className="font-serif text-2xl font-bold text-primary-green">
          {outcome.status === "subscribed"
            ? `Merci ${outcome.firstName}, vérifiez votre boîte mail !`
            : `Vous êtes déjà abonnée, à bientôt dans votre boîte mail !`}
        </p>
        {outcome.status === "subscribed" && (
          <p className="mt-3 text-primary-green/70">
            Le mémo « Conservation du lait maternel » arrive dans les prochaines
            minutes. Pensez à regarder vos indésirables s&apos;il tarde.
          </p>
        )}
      </div>
    );
  }

  const inputClassName = cn(
    "h-12",
    isDark && "border-background-beige/30 bg-background-beige text-primary-green",
  );
  const labelClassName = cn(
    compact ? "sr-only" : undefined,
    isDark && "text-background-beige",
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("text-left", compact ? "space-y-3" : "space-y-5")}
    >
      <div className={cn(compact && "grid gap-3 sm:grid-cols-2")}>
        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-first-name`} className={labelClassName}>
            Prénom
          </Label>
          <Input
            id={`${fieldId}-first-name`}
            name="first_name"
            placeholder={compact ? "Prénom" : undefined}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            autoComplete="given-name"
            aria-invalid={Boolean(errors.first_name)}
            aria-describedby={errors.first_name ? `${fieldId}-first-name-error` : undefined}
            className={inputClassName}
          />
          <FieldError id={`${fieldId}-first-name-error`} message={errors.first_name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-email`} className={labelClassName}>
            Email
          </Label>
          <Input
            id={`${fieldId}-email`}
            name="email"
            type="email"
            inputMode="email"
            placeholder={compact ? "Email" : undefined}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${fieldId}-email-error` : undefined}
            className={inputClassName}
          />
          <FieldError id={`${fieldId}-email-error`} message={errors.email} />
        </div>
      </div>

      {/*
        Piege a robots. Masque par un decalage hors ecran plutot que par
        `display: none` : les scripts les plus courants ignorent les champs
        totalement retires du flux, et rempliraient alors le formulaire sans
        jamais se trahir. `tabIndex={-1}` et `aria-hidden` le tiennent hors du
        parcours clavier et des lecteurs d'ecran.
      */}
      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <Label htmlFor={`${fieldId}-website`}>Site web</Label>
        <Input
          id={`${fieldId}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className={cn(
          "w-full bg-primary-red text-base hover:bg-primary-red-dark",
          compact ? "h-12" : "h-14",
        )}
      >
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Inscription en cours…
          </>
        ) : (
          "Je m'inscris"
        )}
      </Button>

      <FieldError id={`${fieldId}-form-error`} message={errors.form} />

      <p
        className={cn(
          "text-xs leading-relaxed",
          isDark ? "text-background-beige/60" : "text-primary-green/60",
        )}
      >
        {compact ? (
          <>
            {NEWSLETTER_CONSENT_SHORT_TEXT}{" "}
            <a
              href="/politique-de-confidentialite"
              className={cn(
                "underline underline-offset-2",
                isDark ? "hover:text-background-beige" : "hover:text-primary-green",
              )}
            >
              Politique de confidentialité
            </a>
          </>
        ) : (
          <>
            {NEWSLETTER_CONSENT_SHORT_TEXT} Vos données sont hébergées chez Brevo,
            notre outil d&apos;emailing, et ne sont jamais cédées.{" "}
            <a
              href="/politique-de-confidentialite"
              className={cn(
                "underline underline-offset-2",
                isDark ? "hover:text-background-beige" : "hover:text-primary-green",
              )}
            >
              Politique de confidentialité
            </a>
          </>
        )}
      </p>
    </form>
  );
};

/**
 * `aria-live` sur un conteneur toujours present : une region annoncee doit
 * exister avant que son contenu change, sinon les lecteurs d'ecran ne
 * signalent rien.
 */
const FieldError = ({ id, message }: { id: string; message?: string }) => (
  <p
    id={id}
    role={message ? "alert" : undefined}
    aria-live="polite"
    className="min-h-0 text-sm font-medium text-primary-red-light empty:hidden"
  >
    {message}
  </p>
);
