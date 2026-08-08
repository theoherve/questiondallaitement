import { describe, expect, it } from "vitest";
import {
  adminNav,
  clientNav,
  getActiveNavHref,
  groupNavItems,
  NAV_SECTION_LABELS,
} from "@/config/navigation";

describe("groupNavItems", () => {
  it("regroupe les entrées consécutives de même section sous leur libellé", () => {
    const groups = groupNavItems(adminNav);

    expect(groups.map((group) => group.label)).toEqual([
      "Pilotage",
      "Personnes",
      "Offre",
      "Contenus",
      "Acquisition",
      "Finance",
      "Système",
    ]);
    expect(groups[0]?.items.map((item) => item.title)).toEqual([
      "Tableau de bord",
      "Analytics",
    ]);
  });

  it("préserve toutes les entrées et leur ordre", () => {
    const flattened = groupNavItems(adminNav).flatMap((group) => group.items);

    expect(flattened).toEqual(adminNav);
  });

  it("rend un groupe unique sans libellé pour une nav sans section", () => {
    const groups = groupNavItems(clientNav);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBeUndefined();
    expect(groups[0]?.items).toEqual(clientNav);
  });

  it("chaque section de l'admin a un libellé déclaré", () => {
    for (const item of adminNav) {
      expect(NAV_SECTION_LABELS[item.section ?? ""]).toBeDefined();
    }
  });
});

describe("getActiveNavHref", () => {
  it("retient le plus long préfixe pour une route imbriquée", () => {
    expect(getActiveNavHref("/admin/marketing/newsletter", adminNav)).toBe(
      "/admin/marketing/newsletter",
    );
  });

  it("n'allume pas le tableau de bord sur une sous-page", () => {
    expect(getActiveNavHref("/admin/blog", adminNav)).toBe("/admin/blog");
  });

  it("allume le tableau de bord sur sa route exacte", () => {
    expect(getActiveNavHref("/admin", adminNav)).toBe("/admin");
  });

  it("suit le parent sur une sous-route sans entrée dédiée", () => {
    expect(getActiveNavHref("/admin/blog/nouvel-article", adminNav)).toBe(
      "/admin/blog",
    );
  });

  it("ne matche pas un préfixe partiel de segment", () => {
    expect(getActiveNavHref("/admin/blogueurs", adminNav)).toBe("/admin");
  });
});
