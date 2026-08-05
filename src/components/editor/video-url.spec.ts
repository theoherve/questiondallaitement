import { describe, expect, it } from "vitest";
import { parseVideoUrl } from "./video-url";

describe("parseVideoUrl", () => {
  it("reconnaît une URL YouTube classique", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      provider: "youtube",
      id: "dQw4w9WgXcQ",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    });
  });

  it("reconnaît un lien court youtu.be", () => {
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")?.id).toBe("dQw4w9WgXcQ");
  });

  it("reconnaît une URL de Short YouTube", () => {
    expect(parseVideoUrl("https://youtube.com/shorts/dQw4w9WgXcQ")?.id).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("ignore les paramètres de suivi qui suivent l'identifiant", () => {
    expect(
      parseVideoUrl("https://youtu.be/dQw4w9WgXcQ?si=abc123&t=42")?.id,
    ).toBe("dQw4w9WgXcQ");
  });

  it("reconnaît une URL Vimeo", () => {
    expect(parseVideoUrl("https://vimeo.com/824804225")).toEqual({
      provider: "vimeo",
      id: "824804225",
      embedUrl: "https://player.vimeo.com/video/824804225",
    });
  });

  it("reconnaît une URL Vimeo non répertoriée, avec son jeton", () => {
    expect(parseVideoUrl("https://vimeo.com/824804225/a1b2c3d4e5")).toEqual({
      provider: "vimeo",
      id: "824804225",
      embedUrl: "https://player.vimeo.com/video/824804225?h=a1b2c3d4e5",
    });
  });

  it("renvoie null sur une URL d'un autre site", () => {
    expect(parseVideoUrl("https://example.com/video.mp4")).toBeNull();
  });

  it("renvoie null sur une saisie vide ou absurde", () => {
    expect(parseVideoUrl("")).toBeNull();
    expect(parseVideoUrl("pas une url")).toBeNull();
  });
});
