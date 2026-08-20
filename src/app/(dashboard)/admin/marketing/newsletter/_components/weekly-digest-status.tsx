"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setNewsletterDigestEnabled } from "../actions";

type LastSent = {
  week: string;
  sent_at: string;
  subscriber_count: number;
  post_count: number;
  post_titles: string[];
} | null;

/**
 * Statut de l'annonce hebdomadaire du blog (cron du lundi vers
 * `newsletter_subscribers`) : on/off, et trace du dernier envoi reussi.
 *
 * Le contenu de l'email s'edite depuis Marketing > Templates
 * (`newsletter_blog_digest`) : ce panneau ne concerne que le declenchement.
 */
export const WeeklyDigestStatus = ({
  initialEnabled,
  lastSent,
  lastSentLabel,
}: {
  initialEnabled: boolean;
  lastSent: LastSent;
  lastSentLabel: string | null;
}) => {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    setEnabled(next);
    startTransition(async () => {
      const result = await setNewsletterDigestEnabled(next);
      if (!result.success) {
        setEnabled(!next);
        toast.error(result.error);
        return;
      }
      toast.success(next ? "Annonce hebdomadaire activée" : "Annonce hebdomadaire désactivée");
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold">
            Annonce hebdomadaire du blog
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Chaque lundi, un email vers les abonnées actives listant les
            articles publiés dans les 7 jours précédents. Rien n&apos;est
            envoyé si aucun article n&apos;a paru.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} disabled={pending} />
      </div>

      {!enabled && (
        <p className="text-sm font-medium text-destructive">
          Désactivée : le cron du lundi ne fera rien tant que ce réglage n&apos;est pas réactivé.
        </p>
      )}

      {lastSent ? (
        <p className="text-sm text-muted-foreground">
          Dernier envoi {lastSentLabel} : {lastSent.post_count} article
          {lastSent.post_count > 1 ? "s" : ""} à {lastSent.subscriber_count}{" "}
          abonnée{lastSent.subscriber_count > 1 ? "s" : ""} — «{" "}
          {lastSent.post_titles.join(" », « ")} ».
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucun envoi pour l&apos;instant.
        </p>
      )}
    </div>
  );
};
