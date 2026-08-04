import type { Metadata } from "next";
import { findSubscriberByToken } from "@/lib/newsletter/unsubscribe";
import { UnsubscribePanel } from "./_components/unsubscribe-panel";

export const metadata: Metadata = {
  title: "Désinscription",
  // La page n'a rien a faire dans un index de recherche, et elle porte un jeton.
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

/**
 * Le rendu est en lecture seule, et c'est le coeur du sujet.
 *
 * Cette page desinscrivait pendant son rendu. Constate en recette : la
 * passerelle de securite du destinataire a preche le lien vingt secondes apres
 * la reception, et l'abonnee a ete desinscrite sans jamais voir la page — donc
 * sans jamais le savoir. La modification vit desormais dans une action serveur
 * declenchee par un clic.
 */
const UnsubscribePage = async ({ searchParams }: PageProps) => {
  const { token } = await searchParams;
  const lookup = token
    ? await findSubscriberByToken(token)
    : ({ status: "unknown_token" } as const);

  return (
    <section className="section-padding">
      <div className="mx-auto max-w-xl text-center">
        {lookup.status === "unknown_token" ? (
          <>
            <h1 className="font-serif text-3xl font-bold text-primary-green lg:text-4xl">
              Ce lien n&apos;est plus valide
            </h1>
            <p className="mt-6 text-primary-green/70">
              Si vous receviez encore la newsletter, utilisez le lien du dernier
              email reçu, ou écrivez-nous à contact@questiondallaitement.fr —
              nous nous en occupons.
            </p>
          </>
        ) : (
          <UnsubscribePanel
            token={token!}
            firstName={lookup.firstName}
            alreadyUnsubscribed={lookup.alreadyUnsubscribed}
          />
        )}
      </div>
    </section>
  );
};

export default UnsubscribePage;
