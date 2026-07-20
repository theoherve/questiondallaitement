import type { Page } from "@playwright/test";

/**
 * Connecte la cliente fixture via le vrai formulaire `/connexion`.
 *
 * Passer par l'UI plutot que de forger un JWT NextAuth : le cookie de session
 * est signe avec NEXTAUTH_SECRET et son format est un detail d'implementation
 * de la lib. Un helper qui le fabrique casse a chaque montee de version, et il
 * court-circuiterait `handleLogin` — qui refuse les comptes non verifies.
 *
 * Le mot de passe vient de l'environnement : le seed pose le hash de la meme
 * valeur. Aucun mot de passe en dur dans le depot, car le compte est cree dans
 * une vraie base.
 */
export const clientPassword = (): string => {
  const password = process.env.E2E_CLIENT_PASSWORD;
  if (!password) {
    throw new Error(
      "E2E_CLIENT_PASSWORD est absent : le seed n'a pas pose de mot de passe " +
        "sur la cliente fixture, la connexion echouera. " +
        "Definir la variable dans .env.local puis relancer le seed.",
    );
  }
  return password;
};

export const loginAsClient = async (
  page: Page,
  email: string,
  redirectTo?: string,
): Promise<void> => {
  const url = redirectTo
    ? `/connexion?redirect=${encodeURIComponent(redirectTo)}`
    : "/connexion";
  await page.goto(url);

  await page.locator("#email").fill(email);
  await page.locator("#password").fill(clientPassword());
  await page.getByRole("button", { name: "Se connecter" }).click();

  // `handleLogin` ne renvoie jamais d'erreur : il redirige vers
  // /connexion?error=... Rester sur la page de connexion est donc le signe
  // d'un echec, et le message est dans l'URL — sans ce garde-fou, la suite
  // repart en timeout sur l'etape suivante avec une cause invisible.
  await page.waitForURL((u) => !u.pathname.startsWith("/connexion"), {
    timeout: 15_000,
  }).catch(() => {
    const error = new URL(page.url()).searchParams.get("error");
    throw new Error(
      `connexion echouee pour ${email} : ${error ?? "toujours sur /connexion, sans message"}`,
    );
  });
};
