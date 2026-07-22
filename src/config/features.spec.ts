import { afterEach, describe, expect, it, vi } from "vitest";

describe("features.bookingEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const load = async () => (await import("./features")).features;

  it("is true when the env var is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_BOOKING_ENABLED", "");
    expect((await load()).bookingEnabled).toBe(true);
  });

  it('is false only when the env var is exactly "false"', async () => {
    vi.stubEnv("NEXT_PUBLIC_BOOKING_ENABLED", "false");
    expect((await load()).bookingEnabled).toBe(false);
  });

  it('is true for "true"', async () => {
    vi.stubEnv("NEXT_PUBLIC_BOOKING_ENABLED", "true");
    expect((await load()).bookingEnabled).toBe(true);
  });

  it('is true for arbitrary values like "0"', async () => {
    vi.stubEnv("NEXT_PUBLIC_BOOKING_ENABLED", "0");
    expect((await load()).bookingEnabled).toBe(true);
  });
});
