import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { handleResetPassword } from "../actions";

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

const ResetPasswordPage = async ({ searchParams }: ResetPasswordPageProps) => {
  const params = await searchParams;
  const token = params.token;

  if (!token && !params.error) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Lien invalide</CardTitle>
          <CardDescription>
            Ce lien de réinitialisation est invalide ou a expiré.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link
            href="/mot-de-passe-oublie"
            className="text-sm text-primary-red hover:underline"
            tabIndex={0}
          >
            Demander un nouveau lien
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
        <CardDescription>
          Choisissez un nouveau mot de passe pour votre compte
        </CardDescription>
      </CardHeader>
      <CardContent>
        {params.error && (
          <div
            className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600"
            role="alert"
          >
            {decodeURIComponent(params.error)}
            {params.error.includes("expiré") && (
              <p className="mt-2">
                <Link
                  href="/mot-de-passe-oublie"
                  className="font-medium text-primary-red hover:underline"
                  tabIndex={0}
                >
                  Demander un nouveau lien
                </Link>
              </p>
            )}
          </div>
        )}
        {token && (
          <form action={handleResetPassword} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimum 8 caractères"
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
                placeholder="Confirmez votre mot de passe"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary-red hover:bg-primary-red-dark"
            >
              Réinitialiser le mot de passe
            </Button>
          </form>
        )}
        <div className="mt-4 text-center">
          <Link
            href="/connexion"
            className="text-sm text-primary-red hover:underline"
            tabIndex={0}
          >
            Retour à la connexion
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResetPasswordPage;
