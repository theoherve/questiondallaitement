export type SurveyStatus = "draft" | "published" | "closed";
export type SurveyQuestionKind = "matrix" | "single";

/** Clé technique stable + libellé affiché. La clé ne change jamais : elle est
 *  stockée dans les réponses déjà collectées. */
export type SurveyChoice = { key: string; label: string };

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
};

export type SurveyDefinition = {
  id: string;
  slug: string;
  title: string;
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
