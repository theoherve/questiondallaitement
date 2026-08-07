/**
 * Droit de retractation — quand une renonciation est necessaire, et quoi faire
 * accepter.
 *
 * Vente a distance a un consommateur : la cliente dispose de quatorze jours
 * pour se retracter (L221-18). Ce droit ne s'eteint que si elle a demande
 * expressement l'execution anticipee et renonce dans les formes.
 *
 * Deux cas, que le code de la consommation ne traite pas pareil :
 *
 * - **consultation** (L221-25) : la demande expresse d'executer avant la fin du
 *   delai, et la reconnaissance que le droit disparait une fois la prestation
 *   pleinement executee ;
 * - **accompagnement en ligne** (L221-28 13°) : contenu numerique accessible
 *   immediatement, donc consentement prealable **et** renonciation explicite.
 *
 * En cas de litige, c'est a la plateforme de prouver que la renonciation a ete
 * recueillie : d'ou la version du texte, conservee avec l'acceptation.
 */

export const WITHDRAWAL_PERIOD_DAYS = 14;

/**
 * Version du texte accepte.
 *
 * A incrementer a chaque reformulation. Sans elle, une trace en base ne
 * prouverait rien : impossible de dire quel texte la cliente a effectivement lu.
 */
export const WITHDRAWAL_TEXT_VERSION = "2026-07-21";

export const WITHDRAWAL_TEXTS = {
  booking:
    "Je demande expressément que la consultation ait lieu à la date choisie, " +
    "avant l'expiration du délai de rétractation de quatorze jours. Je " +
    "reconnais qu'une fois la consultation pleinement exécutée, je ne pourrai " +
    "plus exercer ce droit.",
  accompagnement:
    "Je demande à accéder immédiatement au contenu et renonce expressément à " +
    "mon droit de rétractation de quatorze jours, que je perds dès le début de " +
    "l'exécution.",
} as const;

export type WithdrawalContext = keyof typeof WITHDRAWAL_TEXTS;

/**
 * Une consultation exige-t-elle une renonciation ?
 *
 * Oui des lors qu'elle a lieu dans les quatorze jours : la prestation sera
 * executee avant l'expiration du delai. Au-dela, le droit s'eteint de lui-meme
 * et il n'y a rien a faire signer.
 */
export const bookingRequiresWaiver = (
  startsAt: Date,
  now: Date = new Date(),
): boolean => {
  const deadline = new Date(
    now.getTime() + WITHDRAWAL_PERIOD_DAYS * 24 * 3600 * 1000,
  );
  return startsAt.getTime() < deadline.getTime();
};
