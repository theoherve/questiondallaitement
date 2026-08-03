"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { saveMemoUrl } from "../actions";

/**
 * Depot du memo offert a l'inscription.
 *
 * Le fichier part dans le bucket public « ressources », et son URL est
 * enregistree en base : l'email de bienvenue la relit a chaque envoi, donc
 * remplacer le memo ici suffit — aucun redeploiement, aucune modification du
 * template Brevo.
 */
export const MemoUpload = ({ currentUrl }: { currentUrl: string | null }) => {
  const [url, setUrl] = useState(currentUrl ?? "");
  const [pending, startTransition] = useTransition();

  const persist = (nextUrl: string) => {
    startTransition(async () => {
      const result = await saveMemoUrl(nextUrl);
      if (result.success) {
        setUrl(nextUrl);
        toast.success(nextUrl ? "Mémo enregistré" : "Mémo retiré");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl font-semibold">Mémo offert à l&apos;inscription</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          PDF ou support de présentation, 50 Mo maximum. Le lien part dans
          l&apos;email de bienvenue.
        </p>
      </div>

      <FileUpload
        bucket="ressources"
        folder="newsletter"
        accept=".pdf,.ppt,.pptx,.doc,.docx"
        maxSizeMb={50}
        value={url}
        previewType="file"
        label="Déposer le mémo"
        onUpload={(uploadedUrl) => persist(uploadedUrl)}
        onRemove={() => persist("")}
      />

      {url ? (
        <p className="text-sm text-muted-foreground">
          Lien envoyé aux abonnées :{" "}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            ouvrir le fichier
          </a>
        </p>
      ) : (
        <p className="text-sm text-destructive">
          Aucun mémo déposé — l&apos;email de bienvenue part sans lien de
          téléchargement, alors que la page le promet.
        </p>
      )}

      {pending && (
        <Button disabled variant="ghost" size="sm">
          Enregistrement…
        </Button>
      )}
    </div>
  );
};
