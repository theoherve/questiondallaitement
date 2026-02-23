export * from "./database";

export type ConsultantWithProfile = {
  id: string;
  slug: string;
  bio: string | null;
  specialties: string[];
  commission_rate: number;
  is_active: boolean;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    avatar_url: string | null;
  };
};

export type FormationWithSections = {
  id: string;
  consultant_id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  thumbnail_url: string | null;
  price_cents: number;
  currency: string;
  status: "draft" | "published" | "archived";
  sections: {
    id: string;
    title: string;
    position: number;
    blocks: {
      id: string;
      type: "text" | "video" | "image" | "quiz" | "download";
      content: Record<string, unknown>;
      position: number;
    }[];
  }[];
};

export type BookingWithDetails = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  zoom_join_url: string | null;
  notes: string | null;
  client: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  consultant: {
    first_name: string | null;
    last_name: string | null;
    slug: string;
  };
  consultation_type: {
    title: string;
    duration_minutes: number;
    price_cents: number;
    is_online: boolean;
  };
};

export type DashboardStats = {
  totalRevenue: number;
  totalBookings: number;
  totalFormations: number;
  totalClients: number;
  recentBookings: BookingWithDetails[];
};

export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};
