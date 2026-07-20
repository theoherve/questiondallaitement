import { defineConfig, devices } from "@playwright/test";

const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:3000";

/**
 * N2 browser suite — drives the real UI through Stripe Checkout in test mode.
 *
 * Unlike the N1 harness (scripts/e2e), these specs hit Stripe over the network,
 * so they need `stripe listen` running to forward webhooks back to the app:
 *
 *   stripe listen --api-key "$STRIPE_SECRET_KEY" \
 *     --forward-to localhost:3000/api/webhooks/stripe
 *
 * The webhook is what fulfills the purchase, so post-checkout assertions poll
 * the database rather than expecting the row to exist immediately.
 */
export default defineConfig({
  testDir: "./e2e",
  // N1 supprime les fixtures partagees en fin de passe : N2 les resseme.
  globalSetup: "./e2e/global-setup.ts",
  // Checkout redirects are slow; the default 30s trips on cold Next compiles.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // Payment fixtures are shared state — parallel runs race on the same rows.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: APP_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    // Ouvre une session par role et la range sur disque. Sans ce prealable,
    // chaque scenario connecte rejouerait le formulaire et declencherait le
    // rate limit de `handleLogin` (5 tentatives / 5 min).
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  // Reuse a dev server if one is already up, otherwise start one.
  webServer: {
    command: "pnpm dev",
    url: APP_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
