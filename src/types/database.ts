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

export type FormationStatus = "draft" | "published" | "archived";

export type BlockType = "text" | "video" | "image" | "quiz" | "download";

export type EventType = "online" | "in_person" | "hybrid";

export type PaymentStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "refunded"
  | "partially_refunded";

export type PaymentType = "formation" | "booking" | "event";

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
  role: UserRole;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  gdpr_consent_at: string | null;
  created_at: string;
  updated_at: string;
};

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

export type Formation = {
  id: string;
  consultant_id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  thumbnail_url: string | null;
  price_cents: number;
  currency: string;
  status: FormationStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FormationCollaborator = {
  formation_id: string;
  consultant_id: string;
  revenue_share: number;
};

export type FormationSection = {
  id: string;
  formation_id: string;
  title: string;
  position: number;
  created_at: string;
};

export type FormationBlock = {
  id: string;
  section_id: string;
  type: BlockType;
  content: BlockContent;
  position: number;
  created_at: string;
};

export type FormationEnrollment = {
  id: string;
  client_id: string;
  formation_id: string;
  stripe_payment_intent_id: string | null;
  enrolled_at: string;
};

export type FormationProgress = {
  id: string;
  enrollment_id: string;
  block_id: string;
  completed: boolean;
  completed_at: string | null;
};

export type Event = {
  id: string;
  consultant_id: string;
  title: string;
  slug: string;
  description: string | null;
  type: EventType;
  starts_at: string;
  ends_at: string;
  location: string | null;
  zoom_meeting_id: string | null;
  zoom_join_url: string | null;
  max_participants: number | null;
  price_cents: number;
  currency: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type EventRegistration = {
  id: string;
  event_id: string;
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
  created_at: string;
  updated_at: string;
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

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body_html: string;
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
  status: "draft" | "scheduled" | "sending" | "sent";
  brevo_campaign_id: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  stats: Record<string, unknown>;
  created_at: string;
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
  scheduled_at: string | null;
  published_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};
