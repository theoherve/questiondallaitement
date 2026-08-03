"use client";

import { useEffect, useRef } from "react";
import type { NewsletterSource } from "@/config/newsletter";

/**
 * Signale une visite de la page, une seule fois par montage.
 *
 * `keepalive` pour que la requete survive a une navigation immediate, et un
 * echec passe sous silence : un compteur d'audience n'a aucune raison de
 * remonter une erreur a la personne qui lit la page.
 */
export const NewsletterViewTracker = ({
  source,
}: {
  source: NewsletterSource;
}) => {
  const sent = useRef(false);

  useEffect(() => {
    // React monte deux fois les composants en mode strict : sans ce garde, la
    // page compterait deux visites pour chaque lecteur en developpement.
    if (sent.current) return;
    sent.current = true;

    void fetch("/api/newsletter/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
      keepalive: true,
    }).catch(() => {});
  }, [source]);

  return null;
};
