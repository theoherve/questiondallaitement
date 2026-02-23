import { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Nos consultantes",
  description:
    "Découvrez nos consultantes certifiées en lactation, sommeil et santé maternelle.",
};

const ConsultantesPage = async () => {
  const supabase = await createClient();

  const { data: consultants } = await supabase
    .from("consultants")
    .select(
      `
      id,
      slug,
      bio,
      specialties,
      profiles (
        first_name,
        last_name,
        avatar_url
      )
    `
    )
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          Nos consultantes
        </h1>
        <p className="mt-4 text-lg text-primary-green/70">
          Des professionnelles certifiées pour vous accompagner
        </p>
      </div>

      {consultants && consultants.length > 0 ? (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {consultants.map((consultant) => {
            const profile = consultant.profiles as unknown as {
              first_name: string | null;
              last_name: string | null;
              avatar_url: string | null;
            } | null;
            const fullName = profile
              ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
              : "Consultante";
            const initials = profile
              ? `${(profile.first_name ?? "")[0] ?? ""}${(profile.last_name ?? "")[0] ?? ""}`
              : "C";

            return (
              <Card
                key={consultant.id}
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="pt-6 text-center">
                  <Avatar className="mx-auto h-20 w-20">
                    <AvatarImage
                      src={profile?.avatar_url ?? undefined}
                      alt={fullName}
                    />
                    <AvatarFallback className="bg-primary-red/10 text-lg font-semibold text-primary-red">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="mt-4 font-serif text-lg font-semibold text-primary-green">
                    {fullName}
                  </h3>
                  {consultant.specialties.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-1">
                      {consultant.specialties.slice(0, 3).map((specialty: string) => (
                        <Badge
                          key={specialty}
                          variant="secondary"
                          className="text-xs"
                        >
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {consultant.bio && (
                    <p className="mt-3 line-clamp-3 text-sm text-primary-green/70">
                      {consultant.bio}
                    </p>
                  )}
                  <Button
                    asChild
                    variant="outline"
                    className="mt-4 w-full"
                  >
                    <Link href={`/consultantes/${consultant.slug}`} tabIndex={0}>
                      Voir le profil
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="mt-12 text-center">
          <p className="text-primary-green/60">
            Aucune consultante disponible pour le moment.
          </p>
        </div>
      )}
    </div>
  );
};

export default ConsultantesPage;
