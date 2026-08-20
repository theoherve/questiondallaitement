import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendNewsletterBlogDigest, tableData } = vi.hoisted(() => ({
  sendNewsletterBlogDigest: vi.fn().mockResolvedValue(undefined),
  tableData: {} as Record<string, unknown[]>,
}));

vi.mock("@/lib/emails/send", () => ({ sendNewsletterBlogDigest }));

const makeChain = (table: string) => {
  const rows = tableData[table] ?? [];
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) =>
      resolve({ data: rows, error: null }),
  };
  return new Proxy(chain, {
    get: (target, prop) =>
      prop in target ? target[prop as string] : () => makeChain(table),
  });
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (t: string) => makeChain(t) }),
}));

import { runNewsletterBlogDigest } from "./newsletter-blog-digest";

const MONDAY = new Date("2026-08-10T09:00:00Z");
const WEDNESDAY = new Date("2026-08-12T09:00:00Z");

describe("runNewsletterBlogDigest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(tableData)) delete tableData[k];
    tableData.platform_settings = [];
    tableData.blog_posts = [
      {
        title: "Le reflux chez bébé",
        slug: "le-reflux-chez-bebe",
        excerpt: "Ce que dit la science.",
        thumbnail_url: null,
      },
    ];
    tableData.newsletter_subscribers = [
      {
        email: "a@b.fr",
        first_name: "Alice",
        unsubscribe_token: "tok-1",
      },
    ];
  });

  it("n'envoie rien un jour qui n'est pas lundi", async () => {
    expect(await runNewsletterBlogDigest(WEDNESDAY)).toBe(0);
    expect(sendNewsletterBlogDigest).not.toHaveBeenCalled();
  });

  it("envoie l'annonce le lundi aux abonnées actives", async () => {
    const sent = await runNewsletterBlogDigest(MONDAY);

    expect(sent).toBe(1);
    expect(sendNewsletterBlogDigest).toHaveBeenCalledWith(
      "a@b.fr",
      expect.objectContaining({
        first_name: "Alice",
        posts: [
          expect.objectContaining({
            title: "Le reflux chez bébé",
            url: expect.stringContaining("/blog/le-reflux-chez-bebe"),
          }),
        ],
      }),
    );
  });

  it("n'envoie rien si aucun article n'a été publié dans les 7 derniers jours", async () => {
    tableData.blog_posts = [];

    expect(await runNewsletterBlogDigest(MONDAY)).toBe(0);
    expect(sendNewsletterBlogDigest).not.toHaveBeenCalled();
  });

  it("n'envoie rien sans abonnée active", async () => {
    tableData.newsletter_subscribers = [];

    expect(await runNewsletterBlogDigest(MONDAY)).toBe(0);
    expect(sendNewsletterBlogDigest).not.toHaveBeenCalled();
  });

  it("liste tous les articles publiés dans la semaine dans un seul envoi", async () => {
    tableData.blog_posts = [
      { title: "Article 1", slug: "article-1", excerpt: null, thumbnail_url: null },
      { title: "Article 2", slug: "article-2", excerpt: null, thumbnail_url: null },
    ];

    await runNewsletterBlogDigest(MONDAY);

    const call = sendNewsletterBlogDigest.mock.calls[0][1] as { posts: unknown[] };
    expect(call.posts).toHaveLength(2);
  });

  it("ne renvoie pas deux fois pour la même semaine ISO", async () => {
    tableData.platform_settings = [{ value: { week: "2026-W33" } }];

    expect(await runNewsletterBlogDigest(MONDAY)).toBe(0);
    expect(sendNewsletterBlogDigest).not.toHaveBeenCalled();
  });

  it("n'envoie rien quand l'annonce a été désactivée depuis l'admin", async () => {
    tableData.platform_settings = [{ value: { enabled: false } }];

    expect(await runNewsletterBlogDigest(MONDAY)).toBe(0);
    expect(sendNewsletterBlogDigest).not.toHaveBeenCalled();
  });

  it("reste active par défaut tant que personne n'a touché au réglage", async () => {
    tableData.platform_settings = [];

    const sent = await runNewsletterBlogDigest(MONDAY);

    expect(sent).toBe(1);
    expect(sendNewsletterBlogDigest).toHaveBeenCalled();
  });
});
