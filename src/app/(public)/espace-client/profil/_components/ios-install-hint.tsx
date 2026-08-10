"use client";

import { useSyncExternalStore } from "react";
import { isIos, isStandalone } from "@/lib/notifications/push/client";

/** Rien à écouter : ni le système ni le mode d'affichage ne changent en cours de page. */
const subscribe = () => () => {};

const shouldShow = () => isIos() && !isStandalone();

/**
 * Encadré informatif, affiché seulement quand il sert : sur iPhone ou iPad, et
 * seulement si le site n'est pas déjà lancé depuis l'écran d'accueil.
 *
 * Sur iOS, le push n'existe que pour un site installé. Une part de l'audience
 * reste donc hors d'atteinte : c'est assumé, et cet encadré est le seul
 * rattrapage prévu. Ni bannière, ni popup, ni relance.
 */
export const IosInstallHint = () => {
  // Deux tests côté client seulement : l'instantané serveur vaut faux, sans quoi
  // l'encadré s'afficherait à tout le monde le temps de l'hydratation.
  const visible = useSyncExternalStore(subscribe, shouldShow, () => false);

  if (!visible) return null;

  return (
    <div className="rounded-lg border border-accent-honey bg-accent-honey-soft/50 px-3 py-3 text-xs text-primary-green">
      <p className="mb-1 font-medium">
        Sur iPhone, une étape en plus est nécessaire
      </p>
      <p>
        Les notifications ne fonctionnent que si le site est ajouté à
        l&apos;écran d&apos;accueil. Touchez le bouton Partager en bas de Safari,
        puis « Sur l&apos;écran d&apos;accueil ». Ouvrez ensuite le site depuis
        cette icône et revenez ici.
      </p>
    </div>
  );
};
