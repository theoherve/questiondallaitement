export type SurveyStatus = "draft" | "published" | "closed";

/**
 * `matrix` : une ligne par item, un choix unique par ligne.
 * `single` : une seule ligne implicite, un choix unique.
 * `multi`  : cases à cocher. Une ligne par option, cochée ou absente — la
 *            forme des réponses reste celle d'une matrice, seul le rendu
 *            change (migration 00075).
 */
export type SurveyQuestionKind = "matrix" | "single" | "multi";

/** `poll` : sondage d'opinion. `quiz` : correction et score. */
export type SurveyKind = "poll" | "quiz";

/** Clé technique stable + libellé affiché. La clé ne change jamais : elle est
 *  stockée dans les réponses déjà collectées.
 *  `href` n'existe que sur les lignes qui renvoient vers un contenu du site. */
export type SurveyChoice = { key: string; label: string; href?: string };

export type SurveyQuestion = {
  id: string;
  position: number;
  kind: SurveyQuestionKind;
  label: string;
  rows: SurveyChoice[];
  choices: SurveyChoice[];
  is_required: boolean;
  is_segment: boolean;
  is_charted: boolean;
  /** Clé de `choices` qui vaut la bonne réponse. `null` hors quiz. */
  correct_choice_key: string | null;
  /** Explication montrée après validation, quelle que soit la réponse. */
  explanation_html: string | null;
};

export type SurveyDefinition = {
  id: string;
  slug: string;
  title: string;
  kind: SurveyKind;
  intro: string | null;
  status: SurveyStatus;
  thank_you_message: string;
  questions: SurveyQuestion[];
};

/** `{ [questionId]: { [rowKey]: choiceKey } }`. Les questions `single`
 *  utilisent la ligne unique de clé `SINGLE_ROW_KEY`. */
export type SurveyAnswers = Record<string, Record<string, string>>;

export type AnswerCountRow = {
  question_id: string;
  row_key: string;
  choice_key: string;
  responses: number;
};

/** Ce que la route publique renvoie, et tout ce dont le graphique a besoin. */
export type SurveyPublicPayload = {
  survey: SurveyDefinition;
  counts: AnswerCountRow[];
  totalResponses: number;
};

// ─── Lignes de base ─────────────────────────────────────────
//
// Déclarées ici plutôt que dans `src/types/database.ts` : tout ce qui touche
// aux sondages se lit au même endroit, et le fichier de types global n'a pas à
// grossir d'un domaine de plus.

export type SurveyRow = {
  id: string;
  slug: string;
  title: string;
  kind: SurveyKind;
  intro: string | null;
  status: SurveyStatus;
  thank_you_message: string;
  created_at: string;
  updated_at: string;
};

export type SurveyQuestionRow = {
  id: string;
  survey_id: string;
  position: number;
  kind: SurveyQuestionKind;
  label: string;
  rows: SurveyChoice[];
  choices: SurveyChoice[];
  is_required: boolean;
  is_segment: boolean;
  is_charted: boolean;
  correct_choice_key: string | null;
  explanation_html: string | null;
  created_at: string;
};

export type SurveyResponseRow = {
  id: string;
  survey_id: string;
  answers: SurveyAnswers;
  segment_key: string | null;
  email: string | null;
  marketing_consent: boolean;
  consent_text: string | null;
  consented_at: string | null;
  source_path: string | null;
  ip_hash: string | null;
  created_at: string;
};
