import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";
import { validateUpload } from "./mime";

export type StorageBucket =
  | "avatars"
  | "formations"
  | "accompagnements"
  | "downloads"
  | "blog"
  | "mails"
  | "ressources";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const getExtension = (filename: string): string => {
  const parts = filename.split(".");
  return parts.length > 1 ? `.${parts.pop()!.toLowerCase()}` : "";
};

/** Extension canonique pour un type reniflé, sinon on garde celle du fichier. */
const SNIFFED_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

export const uploadFile = async (
  bucket: StorageBucket,
  folder: string,
  file: File
): Promise<{ path: string; url: string }> => {
  const supabase = createAdminClient();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Le type reel du fichier est renifle a partir de ses octets ; on n'accepte
  // ni ne stocke jamais le type declare par le client (falsifiable).
  const validation = validateUpload({
    bucket,
    filename: file.name,
    declaredType: file.type,
    bytes: new Uint8Array(buffer),
  });
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  // Extension calee sur le type reniflé quand on le connait, pour eviter qu'un
  // fichier valide porte une extension trompeuse (une image nommee « .exe »).
  const ext =
    SNIFFED_EXTENSIONS[validation.contentType] ?? getExtension(file.name);
  const path = `${folder}/${randomUUID()}${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: validation.contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const url = getPublicUrl(bucket, path);
  return { path, url };
};

export const deleteFile = async (
  bucket: StorageBucket,
  path: string
): Promise<void> => {
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
};

export const getPublicUrl = (bucket: StorageBucket, path: string): string =>
  `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;

export const getSignedUrl = async (
  bucket: StorageBucket,
  path: string,
  expiresInSeconds = 3600
): Promise<string> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed: ${error?.message ?? "unknown error"}`);
  }

  return data.signedUrl;
};
