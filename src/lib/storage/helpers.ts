import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

export type StorageBucket = "avatars" | "formations" | "accompagnements" | "downloads" | "blog" | "mails";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const getExtension = (filename: string): string => {
  const parts = filename.split(".");
  return parts.length > 1 ? `.${parts.pop()!.toLowerCase()}` : "";
};

export const uploadFile = async (
  bucket: StorageBucket,
  folder: string,
  file: File
): Promise<{ path: string; url: string }> => {
  const supabase = createAdminClient();
  const ext = getExtension(file.name);
  const path = `${folder}/${randomUUID()}${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: file.type,
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
