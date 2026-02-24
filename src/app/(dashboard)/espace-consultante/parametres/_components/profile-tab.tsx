"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { updateProfile, uploadAvatar } from "../actions";

type ProfileTabProps = {
  profile: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  consultant: {
    bio: string | null;
    specialties: string[];
  } | null;
};

export const ProfileTab = ({ profile, consultant }: ProfileTabProps) => {
  const [isPending, startTransition] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfile(formData);
      setMessage(
        result.success
          ? { type: "success", text: "Profil mis à jour" }
          : { type: "error", text: result.error ?? "Erreur" }
      );
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadAvatar(formData);
      if (result.success && result.data) {
        setAvatarUrl(result.data.url);
        setMessage({ type: "success", text: "Avatar mis à jour" });
      } else {
        setMessage({ type: "error", text: result.error ?? "Erreur" });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur lors de l'upload" });
    }
    setIsUploading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-lg">
          Profil & informations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-green/10 text-xl font-bold text-primary-green">
              {(profile?.first_name?.[0] ?? "").toUpperCase()}
              {(profile?.last_name?.[0] ?? "").toUpperCase()}
            </div>
          )}
          <div>
            <Label
              htmlFor="avatar-upload"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted"
              tabIndex={0}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Changer la photo
            </Label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={isUploading}
            />
          </div>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prénom</Label>
              <Input
                id="first_name"
                name="first_name"
                defaultValue={profile?.first_name ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom</Label>
              <Input
                id="last_name"
                name="last_name"
                defaultValue={profile?.last_name ?? ""}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={profile?.phone ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue={consultant?.bio ?? ""}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialties">
              Spécialités (séparées par des virgules)
            </Label>
            <Input
              id="specialties"
              name="specialties"
              defaultValue={consultant?.specialties?.join(", ") ?? ""}
              placeholder="Lactation, Sommeil, Portage"
            />
          </div>

          {message && (
            <p
              className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}
              role="alert"
            >
              {message.text}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary-red hover:bg-primary-red-dark"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
