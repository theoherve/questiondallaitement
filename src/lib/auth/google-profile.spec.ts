import { describe, it, expect, vi } from "vitest";
import {
  splitFullName,
  planGoogleSignIn,
  resolveGoogleProfile,
  type ExistingProfile,
  type GoogleIdentity,
  type GoogleProfileStore,
} from "@/lib/auth/google-profile";

const NOW = new Date("2026-08-09T10:00:00.000Z");

const identity = (over: Partial<GoogleIdentity> = {}): GoogleIdentity => ({
  email: "carole@example.com",
  emailVerified: true,
  name: "Carole Martin",
  avatarUrl: "https://lh3.googleusercontent.com/a/photo",
  ...over,
});

const profile = (over: Partial<ExistingProfile> = {}): ExistingProfile => ({
  id: "profile-1",
  roles: ["client"],
  first_name: "Carole",
  last_name: "Martin",
  avatar_url: "https://cdn.local/avatar.png",
  email_verified: true,
  deleted_at: null,
  ...over,
});

describe("splitFullName", () => {
  it("prend le premier mot comme prenom et le reste comme nom", () => {
    expect(splitFullName("Carole Martin")).toEqual({
      firstName: "Carole",
      lastName: "Martin",
    });
  });

  it("garde un nom compose entier", () => {
    expect(splitFullName("Carole Martin Dupont")).toEqual({
      firstName: "Carole",
      lastName: "Martin Dupont",
    });
  });

  it("accepte un prenom seul", () => {
    expect(splitFullName("Carole")).toEqual({
      firstName: "Carole",
      lastName: null,
    });
  });

  it("renvoie deux null quand Google ne donne pas de nom", () => {
    expect(splitFullName(null)).toEqual({ firstName: null, lastName: null });
    expect(splitFullName("   ")).toEqual({ firstName: null, lastName: null });
  });
});

describe("planGoogleSignIn", () => {
  it("refuse une adresse non verifiee par Google", () => {
    const plan = planGoogleSignIn(
      identity({ emailVerified: false }),
      null,
      NOW,
    );
    expect(plan).toEqual({ action: "deny", reason: "email_unverified" });
  });

  it("refuse un compte supprime plutot que de le recreer", () => {
    const plan = planGoogleSignIn(
      identity(),
      profile({ deleted_at: "2026-01-01T00:00:00.000Z" }),
      NOW,
    );
    expect(plan).toEqual({ action: "deny", reason: "account_deleted" });
  });

  it("cree un profil client verifie au premier login", () => {
    const plan = planGoogleSignIn(identity(), null, NOW);

    expect(plan.action).toBe("create");
    if (plan.action !== "create") return;
    expect(plan.values).toMatchObject({
      email: "carole@example.com",
      first_name: "Carole",
      last_name: "Martin",
      avatar_url: "https://lh3.googleusercontent.com/a/photo",
      roles: ["client"],
      email_verified: true,
      gdpr_consent_at: NOW.toISOString(),
    });
    expect(plan.values.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rattache un compte existant sans ecraser ses champs", () => {
    const plan = planGoogleSignIn(identity(), profile(), NOW);

    expect(plan).toEqual({
      action: "link",
      profileId: "profile-1",
      roles: ["client"],
      patch: {},
    });
  });

  it("complete uniquement les champs vides du profil existant", () => {
    const plan = planGoogleSignIn(
      identity(),
      profile({ first_name: null, last_name: "Deja", avatar_url: null }),
      NOW,
    );

    expect(plan.action).toBe("link");
    if (plan.action !== "link") return;
    expect(plan.patch).toEqual({
      first_name: "Carole",
      avatar_url: "https://lh3.googleusercontent.com/a/photo",
    });
  });

  it("verifie l'email d'un compte cree par mot de passe et jamais confirme", () => {
    const plan = planGoogleSignIn(
      identity(),
      profile({ email_verified: false }),
      NOW,
    );

    expect(plan.action).toBe("link");
    if (plan.action !== "link") return;
    expect(plan.patch).toEqual({ email_verified: true });
  });

  it("conserve les roles multiples d'une consultante", () => {
    const plan = planGoogleSignIn(
      identity(),
      profile({ roles: ["client", "consultant"] }),
      NOW,
    );

    expect(plan.action).toBe("link");
    if (plan.action !== "link") return;
    expect(plan.roles).toEqual(["client", "consultant"]);
  });

  it("retombe sur le role client quand le profil n'en porte aucun", () => {
    const plan = planGoogleSignIn(identity(), profile({ roles: [] }), NOW);

    expect(plan.action).toBe("link");
    if (plan.action !== "link") return;
    expect(plan.roles).toEqual(["client"]);
  });
});

const createStore = (existing: ExistingProfile | null): GoogleProfileStore => ({
  findByEmail: vi.fn(async () => existing),
  create: vi.fn(async () => {}),
  update: vi.fn(async () => {}),
});

describe("resolveGoogleProfile", () => {
  it("cree le profil et signale la creation", async () => {
    const store = createStore(null);
    const resolved = await resolveGoogleProfile(store, identity(), NOW);

    expect(resolved).toMatchObject({
      email: "carole@example.com",
      roles: ["client"],
      created: true,
    });
    expect(store.create).toHaveBeenCalledOnce();
    expect(store.update).not.toHaveBeenCalled();
  });

  it("normalise l'email avant la recherche et l'insertion", async () => {
    const store = createStore(null);
    await resolveGoogleProfile(
      store,
      identity({ email: "  Carole@Example.COM " }),
      NOW,
    );

    expect(store.findByEmail).toHaveBeenCalledWith("carole@example.com");
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "carole@example.com" }),
    );
  });

  it("renvoie le profil existant sans ecriture inutile", async () => {
    const store = createStore(profile());
    const resolved = await resolveGoogleProfile(store, identity(), NOW);

    expect(resolved).toEqual({
      id: "profile-1",
      email: "carole@example.com",
      roles: ["client"],
      created: false,
    });
    expect(store.update).not.toHaveBeenCalled();
    expect(store.create).not.toHaveBeenCalled();
  });

  it("ecrit le patch quand le profil existant est incomplet", async () => {
    const store = createStore(profile({ avatar_url: null }));
    await resolveGoogleProfile(store, identity(), NOW);

    expect(store.update).toHaveBeenCalledWith("profile-1", {
      avatar_url: "https://lh3.googleusercontent.com/a/photo",
    });
  });

  it("renvoie null quand la connexion est refusee", async () => {
    const store = createStore(profile({ deleted_at: "2026-01-01T00:00:00Z" }));
    const resolved = await resolveGoogleProfile(store, identity(), NOW);

    expect(resolved).toBeNull();
    expect(store.create).not.toHaveBeenCalled();
    expect(store.update).not.toHaveBeenCalled();
  });
});
