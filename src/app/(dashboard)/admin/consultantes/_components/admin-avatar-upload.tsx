"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { adminUploadAvatar } from "../[id]/actions";

type Props = {
  consultantId: string;
  avatarUrl: string | null;
  firstName: string | null;
  lastName: string | null;
};

export const AdminAvatarUpload = ({
  consultantId,
  avatarUrl: initialAvatarUrl,
  firstName,
  lastName,
}: Props) => {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await adminUploadAvatar(consultantId, formData);
    if (result.success && result.data) {
      setAvatarUrl(result.data.url);
    } else {
      setError(result.error ?? "Erreur");
    }
    setIsUploading(false);
  };

  return (
    <div className="relative group w-16 h-16">
      {avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={avatarUrl}
          alt="Avatar"
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-green/10 text-xl font-bold text-primary-green">
          {(firstName?.[0] ?? "").toUpperCase()}
          {(lastName?.[0] ?? "").toUpperCase()}
        </div>
      )}

      {/* Overlay on hover */}
      <Label
        htmlFor="admin-avatar-upload"
        className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Changer la photo"
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 text-white animate-spin" />
        ) : (
          <Upload className="h-5 w-5 text-white" />
        )}
      </Label>
      <input
        id="admin-avatar-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        disabled={isUploading}
      />

      {error && (
        <p className="absolute top-full mt-1 w-32 text-[10px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};
