import { describe, it, expect } from "vitest";
import {
  CALLOUT_PRESETS,
  buildCalloutSectionNode,
} from "./email-callout-presets";

describe("CALLOUT_PRESETS", () => {
  it("expose les 4 variantes attendues", () => {
    expect(Object.keys(CALLOUT_PRESETS).sort()).toEqual([
      "error",
      "info",
      "tip",
      "warning",
    ]);
  });

  it("fournit des couleurs bg/border en hex pour chaque variante", () => {
    for (const variant of ["info", "tip", "warning", "error"] as const) {
      const preset = CALLOUT_PRESETS[variant];
      expect(preset.backgroundColor).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      expect(preset.borderColor).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      expect(preset.label.length).toBeGreaterThan(0);
      expect(preset.placeholder.length).toBeGreaterThan(0);
    }
  });
});

describe("buildCalloutSectionNode", () => {
  it("retourne un node section Maily-compatible", () => {
    const node = buildCalloutSectionNode("info");
    expect(node.type).toBe("section");
    expect(node.content).toHaveLength(1);
    expect(node.content[0]?.type).toBe("paragraph");
  });

  it("applique backgroundColor/borderColor du preset dans les attrs", () => {
    const node = buildCalloutSectionNode("warning");
    const preset = CALLOUT_PRESETS.warning;
    expect(node.attrs.backgroundColor).toBe(preset.backgroundColor);
    expect(node.attrs.borderColor).toBe(preset.borderColor);
  });

  it("injecte le placeholder text du preset dans le paragraphe", () => {
    const node = buildCalloutSectionNode("error");
    const firstContent = node.content[0] as {
      content?: { type: string; text: string }[];
    };
    expect(firstContent.content?.[0]?.text).toBe(
      CALLOUT_PRESETS.error.placeholder,
    );
  });

  it("définit padding et border-radius non nuls pour que Maily rende la boîte", () => {
    const node = buildCalloutSectionNode("tip");
    expect(node.attrs.paddingTop).toBeGreaterThan(0);
    expect(node.attrs.paddingBottom).toBeGreaterThan(0);
    expect(node.attrs.borderRadius).toBeGreaterThan(0);
  });
});
