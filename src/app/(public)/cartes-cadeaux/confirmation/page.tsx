import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Votre carte cadeau est confirmée",
  robots: { index: false, follow: false },
};

/**
 * Page d'arrivee apres le paiement d'une carte cadeau (`successUrl` de la
 * session Checkout). Purement statique : la carte est creee par le webhook
 * Stripe, qui peut arriver quelques secondes apres cette redirection. Afficher
 * ici le code lu en base reviendrait donc a montrer « introuvable » a une
 * acheteuse qui vient de payer.
 */
export default function GiftCardConfirmationPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="font-serif text-2xl font-semibold text-primary-green">
        Votre carte cadeau est confirmée
      </h1>

      <div className="mt-6 space-y-4 text-primary-green/80">
        <p>
          Merci, votre paiement a bien été enregistré. Vous allez recevoir un
          email de confirmation dans les prochaines minutes.
        </p>
        <p>
          Selon le mode de remise choisi, cet email contient soit la carte au
          format PDF, prête à être imprimée et offerte, soit le code cadeau
          envoyé directement au bénéficiaire.
        </p>
        <p>
          La carte est valable douze mois à compter de la date d&apos;achat, et
          utilisable en une ou plusieurs fois.
        </p>
        <p className="text-sm">
          Rien reçu au bout de quelques minutes ? Pensez à vérifier vos
          indésirables, puis écrivez-nous : nous retrouverons la carte et vous la
          renverrons.
        </p>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          href="/reserver"
          className="rounded-md bg-primary-red px-5 py-3 text-white transition-colors hover:bg-primary-red-dark"
        >
          Prendre rendez-vous
        </Link>
        <Link href="/" className="text-sm text-primary-green/70 underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
