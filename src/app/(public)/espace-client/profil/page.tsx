import { Metadata } from "next";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateClientProfile } from "./actions";
import { ChangePasswordForm } from "./_components/change-password-form";

export const metadata: Metadata = {
  title: "Mon profil",
};

const ProfilePage = async () => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Mon profil
      </h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData: FormData) => {
              await updateClientProfile(formData);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  defaultValue={profile?.first_name ?? ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  defaultValue={profile?.last_name ?? ""}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email ?? ""}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                L&apos;email ne peut pas être modifié ici
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={profile?.phone ?? ""}
                placeholder="+33 6 12 34 56 78"
              />
            </div>
            <Button
              type="submit"
              className="bg-primary-red hover:bg-primary-red-dark"
            >
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>

      <ChangePasswordForm />
    </div>
  );
};

export default ProfilePage;
