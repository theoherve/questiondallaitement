export type { FormationAudienceGroup } from "@/config/formation-audience";
import type { FormationAudienceGroup } from "@/config/formation-audience";

export type UserRole =
  | "visitor"
  | "client"
  | "consultant"
  | "consultant_limited"
  | "marketing_manager"
  | "admin";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type AccompagnementStatus = "draft" | "published" | "archived";

export type BlockType = "text" | "video" | "image" | "quiz" | "download";

export type FormationType = "online" | "in_person" | "hybrid";

/**
 * Famille de format d'une formation. Miroir de l'enum `formation_category`.
 * Les libellés vivent dans `src/config/formation-categories.ts`.
 */
export type FormationCategory =
  | "formation"
  | "webinaire"
  | "atelier_mensuel"
  | "masterclass"
  | "conference"
  | "e_learning";

export type PaymentStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "refunded"
  | "partially_refunded";

export type PaymentType = "accompagnement" | "booking" | "formation" | "gift_card";

export type ConsultationLocation = "cabinet" | "teleconsultation" | "domicile";

export type BookingPaymentMethod = "online" | "on_site";

export type TextBlockContent = {
  html: string;
};

export type VideoBlockContent = {
  provider: "vimeo" | "youtube";
  video_id: string;
  title: string;
};

export type ImageBlockContent = {
  url: string;
  alt: string;
  caption?: string;
};

export type QuizOption = {
  id: string;
  text: string;
  is_correct: boolean;
};

export type QuizBlockContent = {
  question: string;
  options: QuizOption[];
  explanation: string;
};

export type DownloadBlockContent = {
  url: string;
  filename: string;
  size_bytes: number;
};

export type BlockContent =
  | TextBlockContent
  | VideoBlockContent
  | ImageBlockContent
  | QuizBlockContent
  | DownloadBlockContent;

export type Profile = {
  id: string;
  roles: UserRole[];
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  gdpr_consent_at: string | null;
  /**
   * Provenance de l'inscription, lue dans l'URL. Nulle pour les comptes créés
   * avant la colonne, et pour ceux venus de « connexion avec Google ».
   */
  acquisition_source: string | null;
  created_at: string;
  updated_at: string;
};

export type Child = {
  id: string;
  client_id: string;
  first_name: string;
  birth_date: string;
  sex: "female" | "male";
  is_premature: boolean;
  gestational_age_weeks: number | null;
  created_at: string;
  updated_at: string;
};

export type WeightMeasurement = {
  id: string;
  child_id: string;
  weight_grams: number;
  measured_at: string;
  source: "home" | "consultation";
  recorded_by: string;
  consultant_id: string | null;
  created_at: string;
};

export type ConsultationNoteStatus = "draft" | "published";

export type ConsultationNote = {
  id: string;
  booking_id: string;
  client_id: string;
  consultant_id: string;
  child_id: string | null;
  motif: string;
  antecedents_medicaux: boolean;
  antecedents_medicaux_detail: string | null;
  antecedents_chirurgicaux: boolean;
  antecedents_chirurgicaux_detail: string | null;
  allergies: boolean;
  allergies_detail: string | null;
  traitements_en_cours: boolean;
  traitements_en_cours_detail: string | null;
  observation: string;
  conclusion: string;
  notes_internes: string | null;
  status: ConsultationNoteStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Vue publique d'une fiche : jamais de notes_internes, jamais de brouillon. */
export type PublishedConsultationNote = Omit<
  ConsultationNote,
  "notes_internes" | "consultant_id"
>;

export type Consultant = {
  id: string;
  slug: string;
  bio: string | null;
  specialties: string[];
  stripe_account_id: string | null;
  stripe_account_status: string;
  commission_rate: number;
  zoom_access_token: string | null;
  zoom_refresh_token: string | null;
  zoom_token_expires_at: string | null;
  is_active: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type Availability = {
  id: string;
  consultant_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
};

export type AvailabilityException = {
  id: string;
  consultant_id: string;
  date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
};

export type ConsultationType = {
  id: string;
  consultant_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  is_online: boolean;
  available_locations: ConsultationLocation[];
  buffer_minutes: number;
  is_active: boolean;
  created_at: string;
};

export type ConsultationTypeDuration = {
  id: string;
  consultation_type_id: string;
  duration_minutes: number;
  price_cents: number;
  weekend_price_cents: number | null;
  is_default: boolean;
  position: number;
  created_at: string;
};

export type Booking = {
  id: string;
  client_id: string;
  consultant_id: string;
  consultation_type_id: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  location: ConsultationLocation;
  payment_method: BookingPaymentMethod;
  reason: string | null;
  zoom_meeting_id: string | null;
  zoom_join_url: string | null;
  zoom_host_url: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  stripe_payment_intent_id: string | null;
  refund_amount_cents: number | null;
  duration_option_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ConsultantLocation = {
  id: string;
  consultant_id: string;
  location_type: ConsultationLocation;
  label: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  radius_km: number | null;
  surcharge_cents: number;
  is_active: boolean;
  created_at: string;
};

export type Accompagnement = {
  id: string;
  consultant_id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  thumbnail_url: string | null;
  price_cents: number;
  currency: string;
  status: AccompagnementStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AccompagnementCollaborator = {
  accompagnement_id: string;
  consultant_id: string;
  revenue_share: number;
};

export type AccompagnementSection = {
  id: string;
  accompagnement_id: string;
  title: string;
  position: number;
  created_at: string;
};

export type AccompagnementBlock = {
  id: string;
  section_id: string;
  type: BlockType;
  content: BlockContent;
  position: number;
  created_at: string;
};

export type AccompagnementEnrollment = {
  id: string;
  client_id: string;
  accompagnement_id: string;
  stripe_payment_intent_id: string | null;
  enrolled_at: string;
};

export type AccompagnementProgress = {
  id: string;
  enrollment_id: string;
  block_id: string;
  completed: boolean;
  completed_at: string | null;
};

export type TrainingProvider = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  created_at: string;
};

export type Formation = {
  id: string;
  consultant_id: string;
  title: string;
  slug: string;
  description: string | null;
  // Sections editoriales riches, rendues en HTML sur la page publique.
  // Chacune a sa forme a l'affichage, d'ou une colonne par section.
  summary_html: string | null;
  objectives_html: string | null;
  program_html: string | null;
  audience_html: string | null;
  // Cles du catalogue src/config/formation-highlights.ts. Jamais null cote base.
  highlights: string[];
  thumbnail_url: string | null;
  type: FormationType;
  starts_at: string;
  ends_at: string;
  // false = aucune heure saisie : starts_at/ends_at couvrent la journee
  // entiere et l'horaire ne doit pas etre affiche.
  show_time: boolean;
  location: string | null;
  zoom_meeting_id: string | null;
  zoom_join_url: string | null;
  max_participants: number | null;
  price_cents: number;
  currency: string;
  show_price: boolean;
  is_published: boolean;
  provider_id: string | null;
  external_url: string | null;
  discounted_price_cents: number | null;
  recurring_definition_id: string | null;
  occurrence_date: string | null;
  // Famille de format : pilote la pastille et les filtres publics. Deduite du
  // titre avant la migration 00075.
  category: FormationCategory;
  // Public vise (maman, pro, ou les deux). Pilote le toggle sur
  // /formations. Migration 00091.
  audience_group: FormationAudienceGroup;
  // Mention libre affichee sur la fiche (certification, eligibilite).
  badge: string | null;
  // Codes de reduction de l'organisme partenaire, annonces au public. Sans
  // rapport avec `promo_codes`, qui remise nos propres paiements.
  partner_promo_codes: string[];
  // true = accessible en permanence : ni a venir, ni passee.
  is_evergreen: boolean;
  created_at: string;
  updated_at: string;
};

export type FormationRegistration = {
  id: string;
  formation_id: string;
  client_id: string;
  stripe_payment_intent_id: string | null;
  status: string;
  registered_at: string;
};

export type Payment = {
  id: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  client_id: string;
  consultant_id: string;
  amount_cents: number;
  platform_fee_cents: number;
  currency: string;
  type: PaymentType;
  reference_id: string;
  status: PaymentStatus;
  refund_amount_cents: number;
  refunded_at: string | null;
  stripe_invoice_url: string | null;
  metadata: Record<string, unknown>;
  promo_code_id: string | null;
  discount_cents: number | null;
  original_amount_cents: number | null;
  created_at: string;
  updated_at: string;
};

export type PromoDiscountType = "percent" | "fixed_cents";

export type PromoTargetType =
  | "accompagnements_all"
  | "formations_all"
  | "bookings_all"
  | "accompagnement"
  | "formation"
  | "booking_service";

export type PromoTriggerType = "formation_purchase" | "accompagnement_purchase";

export type PromoRedemptionStatus = "pending" | "confirmed" | "cancelled";

export type PromoCode = {
  id: string;
  code: string;
  label: string | null;
  discount_type: PromoDiscountType;
  discount_value: number;
  scope_all: boolean;
  valid_from: string | null;
  valid_until: string | null;
  max_redemptions: number | null;
  max_per_user: number;
  min_order_cents: number;
  trigger_delay_hours: number | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PromoCodeTarget = {
  id: string;
  promo_code_id: string;
  target_type: PromoTargetType;
  target_id: string | null;
};

export type PromoCodeTrigger = {
  id: string;
  promo_code_id: string;
  trigger_type: PromoTriggerType;
  target_id: string | null;
};

export type PromoCodeRedemption = {
  id: string;
  promo_code_id: string;
  profile_id: string;
  order_kind: PaymentType;
  reference_id: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  original_amount_cents: number;
  discount_cents: number;
  final_amount_cents: number;
  status: PromoRedemptionStatus;
  created_at: string;
  confirmed_at: string | null;
};

export type CrmNote = {
  id: string;
  client_id: string;
  consultant_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type CrmTag = {
  id: string;
  name: string;
  color: string | null;
  consultant_id: string | null;
  created_at: string;
};

export type CrmContactTag = {
  client_id: string;
  tag_id: string;
  consultant_id: string;
};

export type NumericSegmentField =
  | "booking_count"
  | "total_spent_cents"
  | "accompagnement_count"
  | "formation_count"
  | "inactive_days"
  | "days_since_registration";

export type SegmentConditionField =
  | NumericSegmentField
  | "has_tag"
  | "has_accompagnement";

export type SegmentConditionOp = ">=" | "<=" | "=" | "!=";

/**
 * Union discriminée : `has_tag` porte un identifiant de tag et
 * `has_accompagnement` un booléen, là où les autres champs comparent des
 * nombres. Le stockage est en jsonb, les conditions numériques déjà
 * enregistrées restent donc valides telles quelles.
 */
export type SegmentCondition =
  | { field: NumericSegmentField; op: SegmentConditionOp; value: number }
  | { field: "has_tag"; op: "=" | "!="; value: string }
  | { field: "has_accompagnement"; op: "=" | "!="; value: boolean };

export type CrmSegment = {
  id: string;
  consultant_id: string | null;
  name: string;
  description: string | null;
  color: string;
  conditions: SegmentCondition[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ClientScore = {
  client_id: string;
  score: number;
};

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_design: Record<string, unknown> | null;
  type: "transactional" | "marketing";
  variables: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailCampaign = {
  id: string;
  consultant_id: string | null;
  name: string;
  template_id: string | null;
  subject: string;
  body_html: string | null;
  body_design: Record<string, unknown> | null;
  status: "draft" | "scheduled" | "sending" | "sent";
  brevo_campaign_id: string | null;
  recipient_list_ids: number[];
  recipient_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  stats: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CampaignStats = {
  delivered: number;
  opens: number;
  unique_opens: number;
  clicks: number;
  unique_clicks: number;
  bounces: number;
  unsubscribes: number;
  spam_reports: number;
};

export type ConsultantBrevoList = {
  id: string;
  consultant_id: string;
  brevo_list_id: number;
  list_name: string;
  created_at: string;
};

export type BrevoList = {
  id: number;
  name: string;
  totalSubscribers: number;
  totalBlacklisted: number;
};

export type Automation = {
  id: string;
  consultant_id: string | null;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  actions: Record<string, unknown>[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
};

// ─── Blog ───────────────────────────────────────────────────

export type BlogStatus = "draft" | "scheduled" | "published" | "archived";

export type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  created_at: string;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body_html: string;
  thumbnail_url: string | null;
  category_id: string | null;
  author_id: string;
  consultant_id: string | null;
  status: BlogStatus;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  tags: string[];
  /** Titre de l'encadre de conclusion. Vide : « A retenir » a l'affichage. */
  conclusion_title: string | null;
  /** Texte simple de l'encadre. Vide : encadre masque. */
  conclusion_text: string | null;
  /** References et sources en HTML. Vide : section masquee. */
  references_html: string | null;
  /** Jusqu'a 3 articles epingles, ordre de saisie conserve. */
  related_post_ids: string[];
  scheduled_at: string | null;
  published_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReplayLive = {
  id: string;
  title: string;
  vimeo_url: string;
  description: string | null;
  live_date: string;
  created_at: string;
  updated_at: string;
};

export type LocationConfig = {
  location_type: ConsultationLocation;
  label: string;
  description: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/**
 * Le type d'une notification est une clé du catalogue
 * (`src/lib/notifications/catalog.ts`), pas une liste figée en base : ajouter un
 * événement ne doit pas demander de migration.
 */
export type NotificationCategory = "transactional" | "marketing" | "system";

export type NotificationAction = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string | null;
  href: string | null;
  actions: NotificationAction[] | null;
  metadata: Record<string, unknown> | null;
  dedupe_key: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationChannelName = "in_app" | "email" | "push";

/**
 * Un abonnement au push navigateur, une ligne par navigateur. `endpoint` est
 * l'identifiant fourni par le navigateur : il est unique, et il sert de clé de
 * conflit à l'enregistrement.
 *
 * Suffixe `Row` volontaire : `PushSubscription` est déjà un type global du DOM,
 * et deux sens pour un même nom dans un composant client se paie cher.
 */
export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  last_success_at: string | null;
  failure_count: number;
  created_at: string;
};

/** Ce que l'écran de préférences montre d'un appareil abonné. */
export type PushDevice = Pick<
  PushSubscriptionRow,
  "endpoint" | "user_agent" | "created_at"
>;

/**
 * Un écart au défaut, et rien d'autre. Les défauts vivent dans
 * `src/lib/notifications/preference-categories.ts` : les stocker en base
 * imposerait un backfill à chaque nouvelle catégorie.
 */
export type NotificationPreference = {
  user_id: string;
  category_key: string;
  channel: NotificationChannelName;
  enabled: boolean;
  updated_at: string;
};

export type NotificationBroadcast = {
  id: string;
  event: string;
  rule: Record<string, unknown>;
  recipient_count: number;
  truncated: boolean;
  created_at: string;
};

export type BioLinkKind = "link" | "header";

/**
 * Une entrée de la page de liens (/liens), qui remplace Linktree. Les rubriques
 * (`kind: "header"`) partagent la table : la page est une liste ordonnée unique.
 */
export type BioLink = {
  id: string;
  kind: BioLinkKind;
  title: string;
  subtitle: string | null;
  url: string | null;
  thumbnail_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  position: number;
  click_count: number;
  created_at: string;
  updated_at: string;
};
