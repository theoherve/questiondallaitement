import { resolve } from "node:path";

/**
 * Emplacements des sessions ouvertes une fois par `e2e/auth.setup.ts`.
 *
 * Dans un module a part et non dans le fichier de setup : Playwright refuse
 * qu'un spec importe un autre fichier de test.
 */
export const CLIENT_STATE = resolve(__dirname, "../.auth/client.json");
export const CONSULTANT_STATE = resolve(__dirname, "../.auth/consultant.json");
