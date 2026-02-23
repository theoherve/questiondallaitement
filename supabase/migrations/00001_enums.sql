-- Enums for the platform

CREATE TYPE user_role AS ENUM (
  'visitor',
  'client',
  'consultant',
  'consultant_limited',
  'marketing_manager',
  'admin'
);

CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show'
);

CREATE TYPE formation_status AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE block_type AS ENUM (
  'text',
  'video',
  'image',
  'quiz',
  'download'
);

CREATE TYPE event_type AS ENUM (
  'online',
  'in_person',
  'hybrid'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'succeeded',
  'failed',
  'refunded',
  'partially_refunded'
);

CREATE TYPE payment_type AS ENUM (
  'formation',
  'booking',
  'event'
);
