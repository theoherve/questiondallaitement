import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { handleRegister } from "../actions";

export const metadata: Metadata = {
  title: "Inscription",
};

type RegisterPageProps = {
  searchParams: Promise<{ error?: string; success?: string; ref?: string }>;
};

const RegisterPage = async ({ searchParams }: RegisterPageProps) => {
  const params = await searchParams;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Inscription</CardTitle>
        <CardDescription>
          Créez votre compte pour accéder aux formations et consultations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {params.error && (
          <div
            className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600"
            role="alert"
          >
            {decodeURIComponent(params.error)}
          </div>
        )}
        {params.success && (
          <div
            className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700"
            role="status"
          >
            Compte créé ! Un email de vérification vous a été envoyé. Cliquez sur le lien dans l&apos;email pour activer votre compte.
          </div>
        )}
        <GoogleSignInButton label="S'inscrire avec Google" />
        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            ou
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <form action={handleRegister} className="space-y-4">
              {/* Provenance, lue dans l'URL : /inscription?ref=instagram. Le
                  nettoyage se fait cote serveur, la valeur est forgeable. */}
              <input
                type="hidden"
                name="acquisition_source"
                value={params.ref ?? ""}
              />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prénom</Label>
              <Input
                id="first_name"
                name="first_name"
                required
                minLength={2}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom</Label>
              <Input
                id="last_name"
                name="last_name"
                required
                minLength={2}
                autoComplete="family-name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="vous@exemple.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirmer le mot de passe</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="gdpr_consent"
              name="gdpr_consent"
              required
              className="mt-1 h-4 w-4 rounded border-border"
              aria-label="Accepter la politique de confidentialité"
            />
            <Label htmlFor="gdpr_consent" className="text-sm font-normal leading-snug">
              J&apos;accepte la{" "}
              <Link
                href="/politique-de-confidentialite"
                className="text-primary-red hover:underline"
                target="_blank"
                tabIndex={0}
              >
                politique de confidentialité
              </Link>
            </Label>
          </div>
          <Button type="submit" className="w-full bg-primary-red hover:bg-primary-red-dark">
            Créer mon compte
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link
            href="/connexion"
            className="text-primary-red hover:underline"
            tabIndex={0}
          >
            Se connecter
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

export default RegisterPage;
