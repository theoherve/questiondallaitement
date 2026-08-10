import type { NotificationChannel } from "./types";

export type NotificationPreferenceKey =
  | "rendez_vous"
  | "paiements"
  | "acces_contenus"
  | "systeme"
  | "replays"
  | "articles"
  | "annonces"
  | "rappels_suivi"
  | "digest";

export type PreferenceCategory = {
  key: NotificationPreferenceKey;
  label: string;
  hint?: string;
  /** Imposée : les préférences ne sont jamais consultées pour cette catégorie. */
  forced: boolean;
  defaults: Record<NotificationChannel, boolean>;
  /** Masquée de l'écran client : concerne la consultante et l'administration. */
  internal?: boolean;
  /**
   * Le push est interdit pour cette catégorie, quoi qu'en dise une préférence
   * ou un événement. Garde-fou et non simple défaut : on ne veut pas qu'un
   * réglage ou un ajout de canal au catalogue permette un jour de pousser une
   * facture ou un article de blog sur le téléphone d'une cliente.
   */
  pushForbidden?: boolean;
};

const FORCED = { in_app: true, email: true, push: true };

/** Défauts d'une catégorie optionnelle : les deux canaux calmes, pas le push. */
const OPT_OUT = { in_app: true, email: true, push: false };

/**
 * Les catégories telles que l'utilisatrice les voit. Plus fines que la
 * catégorie technique (`transactional` / `marketing` / `system`), qui ne sert
 * qu'à décider si l'on consulte les préférences.
 *
 * C'est aussi la granularité de ce qu'elle peut couper : sept lignes visibles,
 * pas dix-huit événements.
 */
export const PREFERENCE_CATEGORIES: Record<
  NotificationPreferenceKey,
  PreferenceCategory
> = {
  rendez_vous: {
    key: "rendez_vous",
    label: "Rendez-vous",
    hint: "Confirmation, rappel, annulation",
    forced: true,
    defaults: FORCED,
  },
  paiements: {
    key: "paiements",
    label: "Paiements et factures",
    hint: "Obligation légale",
    forced: true,
    defaults: { in_app: true, email: true, push: false },
    pushForbidden: true,
  },
  acces_contenus: {
    key: "acces_contenus",
    label: "Accès à vos contenus",
    hint: "Ouverture d'accompagnement, inscription à un atelier",
    forced: true,
    defaults: FORCED,
  },
  systeme: {
    key: "systeme",
    label: "Alertes internes",
    hint: "Réservé à l'équipe",
    forced: true,
    defaults: FORCED,
    internal: true,
  },
  replays: {
    key: "replays",
    label: "Nouveaux replays",
    forced: false,
    defaults: OPT_OUT,
  },
  articles: {
    key: "articles",
    label: "Articles du blog",
    forced: false,
    defaults: { in_app: true, email: true, push: false },
    pushForbidden: true,
  },
  annonces: {
    key: "annonces",
    label: "Annonces de l'équipe",
    hint: "Informations ponctuelles, fermeture, nouveauté",
    forced: false,
    defaults: OPT_OUT,
  },
  rappels_suivi: {
    key: "rappels_suivi",
    label: "Rappels et suivi",
    hint: "Module en cours, demande d'avis",
    forced: false,
    defaults: OPT_OUT,
  },
  digest: {
    key: "digest",
    label: "Résumé hebdomadaire",
    hint: "Désactivé par défaut",
    forced: false,
    defaults: { in_app: false, email: false, push: false },
    pushForbidden: true,
  },
};

/** Catégories affichées dans l'écran de préférences de l'espace client. */
export const CLIENT_PREFERENCE_CATEGORIES = Object.values(
  PREFERENCE_CATEGORIES
).filter((c) => !c.internal);
