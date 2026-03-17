import { Metadata } from "next";
import { redirect } from "next/navigation";
import { handleVerifyEmail } from "../actions";

export const metadata: Metadata = {
  title: "Vérification de l'email",
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

const VerificationEmailPage = async ({ searchParams }: Props) => {
  const params = await searchParams;

  if (!params.token) {
    redirect(
      `/connexion?error=${encodeURIComponent("Lien de vérification invalide.")}`,
    );
  }

  // This will redirect to /connexion with a success or error message
  await handleVerifyEmail(params.token);
};

export default VerificationEmailPage;
