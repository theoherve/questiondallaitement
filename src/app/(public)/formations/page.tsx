import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FormationCard } from "@/components/formations/formation-card";

export const metadata: Metadata = {
  title: "Formations",
  description:
    "Découvrez nos formations en ligne en lactation, sommeil et santé maternelle.",
};

const FormationsPage = async () => {
  const supabase = await createClient();

  const { data: formations } = await supabase
    .from("formations")
    .select(
      `
      id,
      title,
      slug,
      short_description,
      thumbnail_url,
      price_cents,
      currency,
      consultant_id,
      consultants (
        slug,
        profiles (
          first_name,
          last_name
        )
      )
    `
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          Nos formations
        </h1>
        <p className="mt-4 text-lg text-primary-green/70">
          Des parcours complets pour vous accompagner dans votre parentalité
        </p>
      </div>

      {formations && formations.length > 0 ? (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {formations.map((formation) => (
            <FormationCard
              key={formation.id}
              formation={formation as unknown as Parameters<typeof FormationCard>[0]["formation"]}
            />
          ))}
        </div>
      ) : (
        <div className="mt-12 text-center">
          <p className="text-primary-green/60">
            Aucune formation disponible pour le moment. Revenez bientôt !
          </p>
        </div>
      )}
    </div>
  );
};

export default FormationsPage;
