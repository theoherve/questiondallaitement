import type { StorageBucket } from "./helpers";

/**
 * Validation du type d'un fichier televerse, par ses octets magiques.
 *
 * Le type declare par le client (`file.type`) et l'extension du nom sont
 * trivialement falsifiables : un script HTML peut se presenter comme
 * `image/png`. Sur un bucket public, c'est un vecteur de XSS stocke. On ne s'y
 * fie donc jamais — on renifle la signature reelle du contenu et on impose le
 * type ainsi reconnu, aussi bien pour accepter le fichier que pour le stocker.
 */

const startsWith = (bytes: Uint8Array, sig: number[]): boolean =>
  sig.every((b, i) => bytes[i] === b);

/**
 * Type reconnu d'apres les octets magiques, ou `null` si non identifie.
 * Volontairement limite aux formats binaires que l'on sait verifier : tout le
 * reste (texte, HTML, SVG) tombe a `null` et sera refuse sur les buckets
 * publics.
 */
export const sniffMime = (bytes: Uint8Array): string | null => {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return "image/png";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  // WEBP : conteneur RIFF (0-3) dont le type de forme est « WEBP » (8-11).
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "image/webp";
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  return null;
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * Extensions de documents autorisees sur `downloads` (ressources telechargeables
 * de l'espace consultante, reserve a l'admin). Ces formats ne sont pas
 * reniflables de facon fiable (docx/xlsx sont des zip, etc.) ; sur un bucket
 * servi en telechargement — jamais rendu en ligne — et alimente par l'admin
 * seul, l'extension autorisee est un garde-fou suffisant. Elle exclut les
 * types dangereux (html, svg, js, executables).
 */
const DOC_EXTENSION_TYPES: Record<string, string> = {
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  csv: "text/csv",
  txt: "text/plain",
  zip: "application/zip",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

const MB = 1024 * 1024;

type BucketPolicy = {
  maxBytes: number;
  /** Types verifiables par octets magiques, autorises sur ce bucket. */
  sniffedTypes: string[];
  /** Autorise en plus les documents non reniflables (par extension). */
  allowDocExtensions?: boolean;
};

const BUCKET_POLICIES: Record<StorageBucket, BucketPolicy> = {
  avatars: { maxBytes: 5 * MB, sniffedTypes: IMAGE_TYPES },
  blog: { maxBytes: 10 * MB, sniffedTypes: IMAGE_TYPES },
  mails: { maxBytes: 10 * MB, sniffedTypes: IMAGE_TYPES },
  formations: { maxBytes: 10 * MB, sniffedTypes: [...IMAGE_TYPES, "application/pdf"] },
  accompagnements: {
    maxBytes: 10 * MB,
    sniffedTypes: [...IMAGE_TYPES, "application/pdf"],
  },
  downloads: {
    maxBytes: 50 * MB,
    sniffedTypes: [...IMAGE_TYPES, "application/pdf"],
    allowDocExtensions: true,
  },
  // Bucket public : les fichiers y sont deposes pour etre diffuses (memo offert
  // a l'inscription, article de presse, support de presentation). Meme
  // politique que `downloads` — l'upload reste reserve a l'admin, et la liste
  // d'extensions exclut deja les types dangereux (html, svg, js, executables),
  // ce qui compte doublement ici puisque le bucket est servi publiquement.
  ressources: {
    maxBytes: 50 * MB,
    sniffedTypes: [...IMAGE_TYPES, "application/pdf"],
    allowDocExtensions: true,
  },
};

const extensionOf = (filename: string): string => {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
};

export type ValidateUploadInput = {
  bucket: StorageBucket;
  filename: string;
  declaredType: string;
  bytes: Uint8Array;
};

export type ValidateUploadResult =
  | { ok: true; contentType: string }
  | { ok: false; error: string };

export const validateUpload = ({
  bucket,
  filename,
  bytes,
}: ValidateUploadInput): ValidateUploadResult => {
  const policy = BUCKET_POLICIES[bucket];
  if (!policy) return { ok: false, error: "Type de stockage inconnu." };

  if (bytes.byteLength > policy.maxBytes) {
    return {
      ok: false,
      error: `Le fichier dépasse ${Math.round(policy.maxBytes / MB)} Mo.`,
    };
  }

  const sniffed = sniffMime(bytes);
  if (sniffed) {
    if (!policy.sniffedTypes.includes(sniffed)) {
      return { ok: false, error: "Ce type de fichier n'est pas autorisé ici." };
    }
    // Type reniflé fait foi : on ne stocke jamais le type declare par le client.
    return { ok: true, contentType: sniffed };
  }

  // Format non reniflable : n'est tolere que sur les buckets de documents, et
  // seulement pour une extension explicitement autorisee.
  if (policy.allowDocExtensions) {
    const mapped = DOC_EXTENSION_TYPES[extensionOf(filename)];
    if (mapped) return { ok: true, contentType: mapped };
  }

  return { ok: false, error: "Ce type de fichier n'est pas autorisé." };
};
