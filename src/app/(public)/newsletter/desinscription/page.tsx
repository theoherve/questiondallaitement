import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { unsubscribeByToken } from "@/lib/newsletter/unsubscribe";
import { ResubscribeButton } from "./_components/resubscribe-button";

export const metadata: Metadata = {
  title: "Désinscription",
  // La page n'a rien a faire dans un index de recherche, et elle porte un jeton.
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

const UnsubscribePage = async ({ searchParams }: PageProps) => {
  const { token } = await searchParams;
  const outcome = token
    ? await unsubscribeByToken(token)
    : ({ status: "unknown_token" } as const);

  return (
    <section className="section-padding">
      <div className="mx-auto max-w-xl text-center">
        {outcome.status === "unknown_token" ? (
          <>
            <h1 className="font-serif text-3xl font-bold text-primary-green lg:text-4xl">
              Ce lien n&apos;est plus valide
            </h1>
            <p className="mt-6 text-primary-green/70">
              Il a peut-être déjà servi. Si vous receviez encore la newsletter,
              utilisez le lien du dernier email reçu, ou écrivez-nous à
              contact@questiondallaitement.fr — nous nous en occupons.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-serif text-3xl font-bold text-primary-green lg:text-4xl">
              {outcome.status === "unsubscribed"
                ? "C'est fait"
                : "Vous étiez déjà désinscrite"}
            </h1>
            <p className="mt-6 text-primary-green/70">
              {outcome.firstName}, vous ne recevrez plus la newsletter. Aucune
              justification à donner, et vous pouvez revenir quand vous voulez.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4">
              <ResubscribeButton token={outcome.token} />
              <Button asChild variant="ghost">
                <Link href="/">Retour à l&apos;accueil</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default UnsubscribePage;
