"use server";

import { getSessionUser } from "@/lib/auth";
import { uploadFile, deleteFile, type StorageBucket } from "./helpers";
import type { ActionResult } from "@/types";

export const uploadFileAction = async (
  formData: FormData
): Promise<ActionResult<{ url: string; path: string }>> => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return { success: false, error: "Non autorisé" };
  }

  const file = formData.get("file") as File | null;
  const bucket = formData.get("bucket") as StorageBucket | null;
  const folder = formData.get("folder") as string | null;

  if (!file || !bucket || !folder) {
    return { success: false, error: "Fichier, bucket et dossier requis" };
  }

  if (file.size > 50 * 1024 * 1024) {
    return { success: false, error: "Le fichier dépasse 50 Mo" };
  }

  try {
    const result = await uploadFile(bucket, folder, file);
    return { success: true, data: result };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erreur lors de l'upload",
    };
  }
};

export const deleteFileAction = async (
  bucket: StorageBucket,
  path: string
): Promise<ActionResult> => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return { success: false, error: "Non autorisé" };
  }

  try {
    await deleteFile(bucket, path);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erreur lors de la suppression",
    };
  }
};
