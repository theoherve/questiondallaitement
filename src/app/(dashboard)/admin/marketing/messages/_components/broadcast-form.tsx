"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { previewBroadcast, submitBroadcast } from "../actions";
import type { BroadcastAudience } from "@/lib/notifications/broadcast";

type Props = { segments: { id: string; name: string }[] };

export const BroadcastForm = ({ segments }: Props) => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");
  const [audienceKey, setAudienceKey] = useState("all_clients");
  const [count, setCount] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const audience = (): BroadcastAudience =>
    audienceKey === "all_clients"
      ? { kind: "all_clients" }
      : audienceKey === "accompagnement_holders"
        ? { kind: "accompagnement_holders" }
        : { kind: "segment", segmentId: audienceKey };

  const preview = () => {
    startTransition(async () => {
      setCount(await previewBroadcast(audience()));
    });
  };

  const send = () => {
    if (count === null) {
      toast.error("Comptez d'abord les destinataires");
      return;
    }
    if (!confirm(`Envoyer ce message à ${count} personne(s) ?`)) return;

    startTransition(async () => {
      const result = await submitBroadcast({
        title,
        body,
        href: href || undefined,
        audience: audience(),
      });
      if (result.success) {
        toast.success(`Message envoyé à ${result.data?.sent} personne(s)`);
        setTitle("");
        setBody("");
        setHref("");
        setCount(null);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        Ce message part aux <strong>utilisatrices ayant un compte</strong>, dans
        leur espace et par email. Pour écrire aux abonnées de la newsletter,
        utilisez les campagnes.
      </div>

      <Input
        placeholder="Titre"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
      />
      <Textarea
        placeholder="Votre message"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        maxLength={2000}
      />
      <Input
        placeholder="Lien interne facultatif, par exemple /replay-lives"
        value={href}
        onChange={(e) => setHref(e.target.value)}
      />

      <Select
        value={audienceKey}
        onValueChange={(v) => {
          setAudienceKey(v);
          // Le compte affiche ne vaut plus rien des que l'audience change :
          // l'effacer evite d'envoyer en croyant viser autre chose.
          setCount(null);
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all_clients">Toutes les utilisatrices</SelectItem>
          <SelectItem value="accompagnement_holders">
            Ayants droit d&apos;un accompagnement
          </SelectItem>
          {segments.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              Segment : {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={preview} disabled={isPending}>
          Compter les destinataires
        </Button>
        {count !== null && (
          <span className="text-sm text-muted-foreground">
            {count} personne{count > 1 ? "s" : ""}
          </span>
        )}
        <Button
          onClick={send}
          disabled={isPending || !title.trim() || !body.trim()}
        >
          Envoyer
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Les personnes ayant désactivé les annonces ne recevront rien, le compte
        ci-dessus ne tient pas compte de leurs préférences.
      </p>
    </div>
  );
};
