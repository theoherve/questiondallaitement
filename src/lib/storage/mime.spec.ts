import { describe, it, expect } from "vitest";
import { sniffMime, validateUpload } from "./mime";

// Prefixes magiques minimaux de chaque format.
const bytesOf = (...nums: number[]) => new Uint8Array(nums);
const JPEG = bytesOf(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10);
const PNG = bytesOf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const GIF = bytesOf(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);
const PDF = bytesOf(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31);
const webp = () => {
  const b = new Uint8Array(16);
  b.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  b.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  return b;
};
// HTML/SVG : du texte, aucune signature binaire — le vecteur XSS a bloquer.
const HTML = new TextEncoder().encode("<svg onload=alert(1)></svg>");

describe("sniffMime", () => {
  it("reconnait les formats supportes par leurs octets magiques", () => {
    expect(sniffMime(JPEG)).toBe("image/jpeg");
    expect(sniffMime(PNG)).toBe("image/png");
    expect(sniffMime(GIF)).toBe("image/gif");
    expect(sniffMime(webp())).toBe("image/webp");
    expect(sniffMime(PDF)).toBe("application/pdf");
  });

  it("ne reconnait pas du texte / HTML / SVG", () => {
    expect(sniffMime(HTML)).toBeNull();
  });
});

describe("validateUpload — buckets d'images", () => {
  it("accepte une vraie image et impose le type reniflé, pas le type déclaré", () => {
    const res = validateUpload({
      bucket: "avatars",
      filename: "photo.png",
      declaredType: "image/png",
      bytes: PNG,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.contentType).toBe("image/png");
  });

  it("rejette un HTML déguisé en image (type déclaré menteur)", () => {
    const res = validateUpload({
      bucket: "avatars",
      filename: "avatar.png",
      declaredType: "image/png",
      bytes: HTML,
    });
    expect(res.ok).toBe(false);
  });

  it("rejette un PDF dans un bucket qui n'accepte que des images", () => {
    const res = validateUpload({
      bucket: "avatars",
      filename: "cv.pdf",
      declaredType: "application/pdf",
      bytes: PDF,
    });
    expect(res.ok).toBe(false);
  });

  it("se fie aux octets, pas à l'extension : une image reste acceptée quel que soit son nom", () => {
    const res = validateUpload({
      bucket: "avatars",
      filename: "photo.exe",
      declaredType: "application/octet-stream",
      bytes: JPEG,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.contentType).toBe("image/jpeg");
  });

  it("rejette au-delà de la taille maximale du bucket", () => {
    const big = new Uint8Array(6 * 1024 * 1024);
    big.set(PNG, 0);
    const res = validateUpload({
      bucket: "avatars",
      filename: "x.png",
      declaredType: "image/png",
      bytes: big,
    });
    expect(res.ok).toBe(false);
  });
});

describe("validateUpload — bucket downloads (documents)", () => {
  it("accepte un PDF (reniflé)", () => {
    const res = validateUpload({
      bucket: "downloads",
      filename: "guide.pdf",
      declaredType: "application/pdf",
      bytes: PDF,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.contentType).toBe("application/pdf");
  });

  it("accepte un document bureautique non reniflable via son extension autorisée", () => {
    // .docx est un zip : impossible a distinguer par signature. Sur ce bucket
    // reserve a l'admin, l'extension autorisee suffit.
    const zipBytes = bytesOf(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00);
    const res = validateUpload({
      bucket: "downloads",
      filename: "support.docx",
      declaredType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes: zipBytes,
    });
    expect(res.ok).toBe(true);
  });

  it("rejette une extension dangereuse même sur downloads", () => {
    const res = validateUpload({
      bucket: "downloads",
      filename: "malware.html",
      declaredType: "text/html",
      bytes: HTML,
    });
    expect(res.ok).toBe(false);
  });
});

describe("validateUpload — bucket public ressources", () => {
  // Ce bucket est servi publiquement : ce que la validation laisse passer est
  // directement atteignable par n'importe qui via son URL.
  const PPTX = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

  it("accepte un PDF, le format attendu du mémo", () => {
    const res = validateUpload({
      bucket: "ressources",
      filename: "memo-conservation-lait.pdf",
      declaredType: "application/pdf",
      bytes: PDF,
    });
    expect(res.ok).toBe(true);
  });

  it("accepte un support de présentation", () => {
    const res = validateUpload({
      bucket: "ressources",
      filename: "support.pptx",
      declaredType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      bytes: PPTX,
    });
    expect(res.ok).toBe(true);
  });

  it("rejette le HTML et le SVG, vecteurs XSS sur un bucket public", () => {
    for (const filename of ["page.html", "logo.svg"]) {
      const res = validateUpload({
        bucket: "ressources",
        filename,
        declaredType: "text/html",
        bytes: HTML,
      });
      expect(res.ok).toBe(false);
    }
  });

  it("impose le type reniflé, pas celui déclaré par le client", () => {
    // Un fichier HTML renomme en .pdf ne doit pas passer : sur un bucket
    // public, il serait servi tel quel au navigateur.
    const res = validateUpload({
      bucket: "ressources",
      filename: "piege.pdf",
      declaredType: "application/pdf",
      bytes: HTML,
    });
    expect(res.ok).toBe(false);
  });
});
