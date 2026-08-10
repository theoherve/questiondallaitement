"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contactMessageSchema } from "@/validations/contact";
import { siteConfig } from "@/config/site";

type FieldErrors = Partial<
  Record<"name" | "email" | "subject" | "message" | "form", string>
>;

export const ContactForm = () => {
  const fieldId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;

    const payload = { name, email, subject, message, website };

    // Meme schema que la route : un message d'erreur ne peut pas diverger
    // entre ce que le navigateur annonce et ce que le serveur accepte.
    const parsed = contactMessageSchema.safeParse(payload);
    if (!parsed.success) {
      const { fieldErrors } = parsed.error.flatten();
      setErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        subject: fieldErrors.subject?.[0],
        message: fieldErrors.message?.[0],
      });
      return;
    }

    setErrors({});
    setPending(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setErrors({
          form:
            data?.error ??
            `Une erreur est survenue, réessayez ou écrivez-nous à ${siteConfig.contactEmail}`,
        });
        return;
      }

      setSent(true);
    } catch {
      setErrors({
        form: "Connexion impossible. Vérifiez votre réseau et réessayez.",
      });
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <div
        role="status"
        className="border border-accent-peach bg-accent-peach-soft p-8 text-center"
      >
        <p className="font-serif text-2xl font-bold text-primary-green">
          Merci, votre message a bien été envoyé.
        </p>
        <p className="mt-3 text-primary-green/70">
          Nous vous répondrons directement à l&apos;adresse indiquée.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-left">
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-name`}>Nom</Label>
        <Input
          id={`${fieldId}-name`}
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${fieldId}-name-error` : undefined}
        />
        <FieldError id={`${fieldId}-name-error`} message={errors.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-email`}>Email</Label>
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
        />
        <FieldError id={`${fieldId}-email-error`} message={errors.email} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-subject`}>Sujet</Label>
        <Input
          id={`${fieldId}-subject`}
          name="subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={errors.subject ? `${fieldId}-subject-error` : undefined}
        />
        <FieldError id={`${fieldId}-subject-error`} message={errors.subject} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-message`}>Message</Label>
        <Textarea
          id={`${fieldId}-message`}
          name="message"
          rows={6}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? `${fieldId}-message-error` : undefined}
        />
        <FieldError id={`${fieldId}-message-error`} message={errors.message} />
      </div>

      {/* Piege a robots, meme pattern que NewsletterSignupForm
          (src/app/(public)/newsletter/_components/newsletter-signup-form.tsx). */}
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

      <Button type="submit" size="lg" disabled={pending} className="h-14 w-full">
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Envoi en cours…
          </>
        ) : (
          "Envoyer le message"
        )}
      </Button>

      <FieldError id={`${fieldId}-form-error`} message={errors.form} />
    </form>
  );
};

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
