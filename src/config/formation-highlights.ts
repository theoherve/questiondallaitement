import {
  Award,
  GraduationCap,
  Monitor,
  MonitorPlay,
  Presentation,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/**
 * Catalogue des reperes affichables sur la fiche d'une formation.
 *
 * La base ne stocke que des cles : l'intitule et l'icone vivent ici, si bien
 * qu'une reformulation ne touche aucune donnee et que deux formations qui
 * cochent le meme repere l'affichent forcement a l'identique.
 *
 * MonitorPlay pour l'e-learning (un module qu'on lance a son rythme) et
 * Presentation pour le webinaire (quelqu'un presente en direct) : les deux se
 * distinguent l'un de l'autre, et du Monitor nu de la visio Zoom.
 */
export const FORMATION_HIGHLIGHTS: ReadonlyArray<{
  key: string;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "elearning", label: "E-Learning", icon: MonitorPlay },
  { key: "webinar", label: "Webinaire", icon: Presentation },
  { key: "zoom", label: "Formation en visio Zoom", icon: Monitor },
  { key: "certificate", label: "Attestation de formation", icon: ShieldCheck },
  { key: "evidence", label: "Approche fondée sur les preuves", icon: Award },
  { key: "ibclc", label: "Formatrice certifiée IBCLC", icon: GraduationCap },
];

export const FORMATION_HIGHLIGHT_KEYS = FORMATION_HIGHLIGHTS.map(({ key }) => key);

/**
 * Ne garde que les cles du catalogue, dans son ordre.
 *
 * Applique a l'ecriture : ce qui part en base est deja propre, donc la lecture
 * n'a pas a se defendre d'une cle inventee.
 */
export const filterFormationHighlightKeys = (
  keys: string[] | null | undefined,
): string[] =>
  keys == null ? [] : FORMATION_HIGHLIGHT_KEYS.filter((key) => keys.includes(key));

/**
 * Traduit les cles stockees en reperes affichables.
 *
 * L'ordre est celui du catalogue, pas celui de la saisie : la bande garde la
 * meme sequence d'une formation a l'autre. Les cles inconnues — un repere
 * retire du catalogue, une donnee ancienne — sont ignorees plutot que rendues
 * sans icone.
 */
export const resolveFormationHighlights = (keys: string[] | null | undefined) =>
  keys == null || keys.length === 0
    ? []
    : FORMATION_HIGHLIGHTS.filter(({ key }) => keys.includes(key));
