import { describe, expect, it } from "vitest";
import { handleOffset } from "./drag-handle-geometry";

describe("handleOffset", () => {
  it("centre la poignée sur la première ligne du bloc", () => {
    const offset = handleOffset(
      { top: 200, left: 120, height: 24 },
      { top: 100, left: 100, height: 500 },
      16,
    );

    // 200 - 100 = 100 depuis le haut du conteneur, puis (24 - 16) / 2 = 4.
    expect(offset.top).toBe(104);
  });

  it("place la poignée dans la marge, à gauche du bloc", () => {
    const offset = handleOffset(
      { top: 200, left: 140, height: 24 },
      { top: 100, left: 100, height: 500 },
      16,
    );

    expect(offset.left).toBe(12);
  });

  it("ne sort jamais du conteneur par la gauche", () => {
    const offset = handleOffset(
      { top: 200, left: 100, height: 24 },
      { top: 100, left: 100, height: 500 },
      16,
    );

    expect(offset.left).toBe(0);
  });

  it("aligne la poignée en haut d'un bloc plus court qu'elle", () => {
    const offset = handleOffset(
      { top: 200, left: 120, height: 10 },
      { top: 100, left: 100, height: 500 },
      16,
    );

    expect(offset.top).toBe(100);
  });
});
