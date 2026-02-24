import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { handleLogin } from "../actions";

export const metadata: Metadata = {
  title: "Connexion",
};

type Props = {
  searchParams: Promise<{ redirect?: string; error?: string }>;
};

const LoginPage = async ({ searchParams }: Props) => {
  const params = await searchParams;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Connexion</CardTitle>
        <CardDescription>
          Connectez-vous à votre espace personnel
        </CardDescription>
      </CardHeader>
      <CardContent>
        {params.error && (
          <div
            className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600"
            role="alert"
          >
            {params.error === "link_expired_or_used"
              ? "Ce lien de confirmation a expiré ou a déjà été utilisé. Connectez-vous si votre compte est actif, ou demandez un nouveau lien depuis l’inscription."
              : params.error === "missing_code"
                ? "Lien de confirmation invalide. Utilisez le lien reçu par email ou connectez-vous."
                : params.error === "auth_failed"
                  ? "La confirmation a échoué. Réessayez ou connectez-vous."
                  : decodeURIComponent(params.error)}
          </div>
        )}
        <form action={handleLogin} className="space-y-4">
          {params.redirect && (
            <input type="hidden" name="redirect" value={params.redirect} />
          )}
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <Link
                href="/mot-de-passe-oublie"
                className="text-sm text-primary-red hover:underline"
                tabIndex={0}
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full bg-primary-red hover:bg-primary-red-dark">
            Se connecter
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link
            href="/inscription"
            className="text-primary-red hover:underline"
            tabIndex={0}
          >
            S&apos;inscrire
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginPage;
