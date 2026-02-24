import { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Mes formations",
};

const ClientFormationsPage = async () => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: enrollments } = await supabase
    .from("formation_enrollments")
    .select(
      `
      id,
      enrolled_at,
      formations (
        id,
        title,
        slug,
        short_description,
        thumbnail_url
      )
    `
    )
    .eq("client_id", user.id)
    .order("enrolled_at", { ascending: false });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Mes formations
      </h1>

      {enrollments && enrollments.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {enrollments.map((enrollment) => {
            const formation = enrollment.formations as unknown as {
              id: string;
              title: string;
              slug: string;
              short_description: string | null;
              thumbnail_url: string | null;
            } | null;

            if (!formation) return null;

            return (
              <Card key={enrollment.id} className="overflow-hidden">
                <div className="aspect-video bg-background-beige-dark">
                  {formation.thumbnail_url ? (
                    <img
                      src={formation.thumbnail_url}
                      alt={formation.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-primary-green/30">Formation</span>
                    </div>
                  )}
                </div>
                <CardContent className="pt-4">
                  <h3 className="font-serif font-semibold text-primary-green">
                    {formation.title}
                  </h3>
                  {formation.short_description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {formation.short_description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Inscrit le{" "}
                    {format(new Date(enrollment.enrolled_at), "d MMMM yyyy", {
                      locale: fr,
                    })}
                  </p>
                  <Button asChild className="mt-3 w-full bg-primary-red hover:bg-primary-red-dark">
                    <Link href={`/espace-client/formations/${formation.id}`} tabIndex={0}>
                      Continuer
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Vous n&apos;êtes inscrit à aucune formation.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/formations" tabIndex={0}>
                Découvrir les formations
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientFormationsPage;
