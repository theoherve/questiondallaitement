"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NEWSLETTER_CONSENT_TEXT,
  type NewsletterSource,
} from "@/config/newsletter";
import { newsletterSignupSchema } from "@/validations/newsletter";
import { siteConfig } from "@/config/site";

type FieldErrors = Partial<
  Record<"first_name" | "email" | "consent" | "form", string>
>;

type Outcome = { status: "subscribed" | "already_subscribed"; firstName: string };

export const NewsletterSignupForm = ({
  source,
}: {
  source: NewsletterSource;
}) => {
  const fieldId = useId();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
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
      consent,
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
        consent: fieldErrors.consent?.[0],
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

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-left">
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-first-name`} className="text-background-beige">
          Prénom
        </Label>
        <Input
          id={`${fieldId}-first-name`}
          name="first_name"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          autoComplete="given-name"
          aria-invalid={Boolean(errors.first_name)}
          aria-describedby={errors.first_name ? `${fieldId}-first-name-error` : undefined}
          className="h-12 border-background-beige/30 bg-background-beige text-primary-green"
        />
        <FieldError id={`${fieldId}-first-name-error`} message={errors.first_name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-email`} className="text-background-beige">
          Email
        </Label>
        <Input
          id={`${fieldId}-email`}
          name="email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? `${fieldId}-email-error` : undefined}
          className="h-12 border-background-beige/30 bg-background-beige text-primary-green"
        />
        <FieldError id={`${fieldId}-email-error`} message={errors.email} />
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

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <input
            id={`${fieldId}-consent`}
            name="consent"
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? `${fieldId}-consent-error` : undefined}
            className="mt-1 h-5 w-5 shrink-0 accent-primary-red"
          />
          <Label
            htmlFor={`${fieldId}-consent`}
            className="text-sm leading-relaxed font-normal text-background-beige/80"
          >
            {NEWSLETTER_CONSENT_TEXT}
          </Label>
        </div>
        <FieldError id={`${fieldId}-consent-error`} message={errors.consent} />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-14 w-full bg-primary-red text-base hover:bg-primary-red-dark"
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

      <p className="text-xs leading-relaxed text-background-beige/60">
        Vos données servent uniquement à vous envoyer cette newsletter. Elles
        sont hébergées chez Brevo, notre outil d&apos;emailing, et ne sont
        jamais cédées. Désinscription en un clic dans chaque email.{" "}
        <a
          href="/politique-de-confidentialite"
          className="underline underline-offset-2 hover:text-background-beige"
        >
          Politique de confidentialité
        </a>
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
