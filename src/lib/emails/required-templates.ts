/**
 * Templates d'email dont le code depend.
 *
 * Supprimer l'un d'eux ne provoque aucune erreur visible : `getTemplate` fait
 * un `.single()` qui renvoie `null`, l'envoi est abandonne, rien n'est
 * journalise. Le symptome est un email qui cesse d'arriver — constate par une
 * cliente, pas par un log.
 *
 * La liste vit dans le code et non en base (une colonne `is_system`) parce que
 * c'est le code qui cree la dependance. Une colonne obligerait a penser a la
 * positionner pour chaque nouveau template, et rien ne signalerait l'oubli.
 *
 * `required-templates.spec.ts` verifie que cette liste reste synchronisee avec
 * les `getTemplate("...")` de send.ts et avec le contenu de la base.
 */
export const REQUIRED_TEMPLATES = [
  "booking_confirmation",
  "booking_cancelled",
  "booking_reminder",
  "formation_access",
  "welcome",
  "password_reset",
  "migration_welcome",
  "booking_slot_conflict",
  "newsletter_welcome",
] as const;

export type RequiredTemplate = (typeof REQUIRED_TEMPLATES)[number];

const REQUIRED = new Set<string>(REQUIRED_TEMPLATES);

export const isRequiredTemplate = (name: string): boolean => REQUIRED.has(name);

/**
 * Ce que la suppression casserait, en clair. Un message qui dit seulement
 * « suppression interdite » laisse chercher pourquoi.
 */
const BREAKS: Record<string, string> = {
  booking_confirmation: "l'email de confirmation de réservation",
  booking_cancelled: "l'email d'annulation de réservation",
  booking_reminder: "le rappel de consultation envoyé la veille",
  formation_access: "l'email d'accès à un accompagnement acheté",
  welcome: "l'email de bienvenue à l'inscription",
  password_reset: "l'email de réinitialisation de mot de passe",
  migration_welcome: "l'email d'activation des comptes migrés",
  booking_slot_conflict:
    "l'email prévenant qu'un créneau a été vendu deux fois et remboursé",
  newsletter_welcome:
    "l'email de bienvenue de la newsletter, qui porte le mémo offert et le lien de désinscription",
};

export const requiredTemplateReason = (name: string): string =>
  BREAKS[name] ?? "un email transactionnel";
