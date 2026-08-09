import { Metadata } from "next";
import Link from "next/link";
import { unsubscribeByToken } from "@/lib/notifications/unsubscribe";

export const metadata: Metadata = {
  title: "Désinscription",
  robots: { index: false, follow: false },
};

const DesinscriptionPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; categorie?: string }>;
}) => {
  const { token, categorie } = await searchParams;
  const result =
    token && categorie
      ? await unsubscribeByToken(token, categorie)
      : { ok: false, label: undefined };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        {result.ok ? "C'est fait" : "Lien invalide"}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {result.ok
          ? `Vous ne recevrez plus d'email pour la catégorie « ${result.label} ». Les emails liés à vos rendez-vous et à vos achats continuent de vous être envoyés.`
          : "Ce lien de désinscription n'est plus valide. Vous pouvez régler vos préférences depuis votre espace."}
      </p>
      <Link
        href="/espace-client/profil"
        className="mt-6 rounded-md bg-primary-green px-5 py-2.5 text-sm font-semibold text-white"
      >
        Gérer mes préférences
      </Link>
    </div>
  );
};

export default DesinscriptionPage;
