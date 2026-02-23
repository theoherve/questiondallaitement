import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { revalidatePath } from "next/cache";
import { CheckCircle, ExternalLink, Video } from "lucide-react";
import { getAuthorizationUrl } from "@/lib/zoom/client";

export const metadata: Metadata = {
  title: "Paramètres",
};

const ConsultantSettingsPage = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: consultant } = await supabase
    .from("consultants")
    .select("*")
    .eq("id", user.id)
    .single();

  const handleUpdateProfile = async (formData: FormData) => {
    "use server";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        first_name: formData.get("first_name") as string,
        last_name: formData.get("last_name") as string,
        phone: (formData.get("phone") as string) || null,
      })
      .eq("id", user.id);

    await supabase
      .from("consultants")
      .update({
        bio: (formData.get("bio") as string) || null,
        specialties: (formData.get("specialties") as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      })
      .eq("id", user.id);

    revalidatePath("/espace-consultante/parametres");
  };

  const stripeStatus = consultant?.stripe_account_status ?? "pending";
  const zoomConnected = !!consultant?.zoom_access_token;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Paramètres
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleUpdateProfile} className="space-y-4">
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
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={profile?.phone ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={consultant?.bio ?? ""}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialties">
                Spécialités (séparées par des virgules)
              </Label>
              <Input
                id="specialties"
                name="specialties"
                defaultValue={consultant?.specialties?.join(", ") ?? ""}
                placeholder="Lactation, Sommeil, Portage"
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

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Stripe Connect</CardTitle>
          <CardDescription>
            Connectez votre compte Stripe pour recevoir vos paiements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">Statut :</span>
              <Badge
                variant={stripeStatus === "active" ? "default" : "secondary"}
              >
                {stripeStatus === "active"
                  ? "Actif"
                  : stripeStatus === "pending_verification"
                    ? "Vérification en cours"
                    : "Non connecté"}
              </Badge>
            </div>
            {stripeStatus === "active" ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Connecté
              </div>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <a href="/api/stripe/connect" tabIndex={0}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connecter Stripe
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Zoom</CardTitle>
          <CardDescription>
            Connectez Zoom pour la création automatique de réunions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              <span className="text-sm">
                {zoomConnected ? "Zoom connecté" : "Non connecté"}
              </span>
            </div>
            {zoomConnected ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Connecté
              </div>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={getAuthorizationUrl(user.id)}
                  tabIndex={0}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connecter Zoom
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsultantSettingsPage;
