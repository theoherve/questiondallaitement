import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { handleForgotPassword } from "../actions";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
};

type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

const ForgotPasswordPage = async ({ searchParams }: ForgotPasswordPageProps) => {
  const params = await searchParams;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
        <CardDescription>
          Entrez votre email pour recevoir un lien de réinitialisation
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
            Un email de réinitialisation vous a été envoyé.
          </div>
        )}
        <form action={handleForgotPassword} className="space-y-4">
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
          <Button type="submit" className="w-full bg-primary-red hover:bg-primary-red-dark">
            Envoyer le lien
          </Button>
        </form>
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

export default ForgotPasswordPage;
