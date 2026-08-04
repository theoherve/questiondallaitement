/** Clé de ligne des questions à choix unique : elles n'ont qu'une ligne, mais
 *  la porter explicitement garde une seule forme de réponse en base. */
export const SINGLE_ROW_KEY = "_";

/**
 * Palette des segments empilés, dans l'ordre des choix de la question.
 * Progression vert → marron clair → rose moyen → rose soutenu : elle se lit
 * comme une échelle d'intensité sans avoir à lire la légende.
 */
export const SURVEY_SEGMENT_COLORS = [
  "#1a4040",
  "#dcb9a5",
  "#c1334d",
  "#bf172b",
] as const;

/**
 * En dessous de dix réponses, un pourcentage ment : trois parents suffiraient
 * à afficher une barre à 100 %. La tranche affiche alors un message plutôt
 * qu'un chiffre.
 */
export const SURVEY_MIN_RESPONSES_PER_ROW = 10;

/** Recopié tel quel dans chaque réponse : preuve du consentement recueilli. */
export const SURVEY_CONSENT_TEXT =
  "J'accepte de recevoir par email les contenus et offres de Carole Hervé. " +
  "Je peux me désinscrire à tout moment.";

/** Intervalle de rafraîchissement du widget, en millisecondes. Assez lent pour
 *  ne pas marteler la base depuis un article très lu, assez rapide pour que le
 *  graphique paraisse vivant. */
export const SURVEY_REFRESH_INTERVAL_MS = 90_000;
