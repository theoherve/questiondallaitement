import Link from "next/link";
import { Button } from "@/components/ui/button";
import { handleGoogleSignIn } from "@/app/(auth)/actions";

/** Logo Google officiel, en SVG inline pour ne pas dependre d'un CDN. */
const GoogleLogo = () => (
  <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

type Props = {
  /** Chemin de retour apres la connexion, propage depuis `?redirect=`. */
  redirect?: string;
  label?: string;
};

/**
 * Bouton « Continuer avec Google ».
 *
 * La mention RGPD est portee par le bouton lui-meme : le parcours Google ne
 * passe pas par le formulaire d'inscription, qui est le seul endroit ou la case
 * de consentement est cochee. Sans cette phrase, un compte serait cree sans
 * qu'on ait rien affiche.
 */
export const GoogleSignInButton = ({
  redirect,
  label = "Continuer avec Google",
}: Props) => (
  <div className="space-y-3">
    <form action={handleGoogleSignIn}>
      {redirect && <input type="hidden" name="redirect" value={redirect} />}
      <Button type="submit" variant="outline" className="w-full gap-2">
        <GoogleLogo />
        {label}
      </Button>
    </form>
    <p className="text-center text-xs text-muted-foreground">
      En continuant avec Google, vous acceptez nos{" "}
      <Link href="/cgv" className="underline hover:text-foreground">
        conditions
      </Link>{" "}
      et notre{" "}
      <Link
        href="/politique-de-confidentialite"
        className="underline hover:text-foreground"
      >
        politique de confidentialité
      </Link>
      .
    </p>
  </div>
);
