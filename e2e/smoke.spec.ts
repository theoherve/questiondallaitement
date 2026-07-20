import { test, expect } from "@playwright/test";
import { db, guardTestMode } from "./helpers/env";

/**
 * Harness check, not a product test: proves the browser suite can boot the app
 * and reach the database before any Checkout scenario is written on top of it.
 */
test.describe("N2 — smoke", () => {
  test("refuse de tourner sur une cle Stripe live", () => {
    expect(() => guardTestMode()).not.toThrow();
  });

  test("la home repond", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(400);
  });

  test("la base est joignable avec la service role key", async () => {
    const { error } = await db.from("consultants").select("id").limit(1);
    expect(error).toBeNull();
  });
});
