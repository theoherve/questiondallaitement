import { createAdminClient } from "@/lib/supabase/admin";

const ZOOM_API_BASE = "https://api.zoom.us/v2";
const ZOOM_AUTH_BASE = "https://zoom.us/oauth";

export const getAuthorizationUrl = (consultantId: string): string => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.ZOOM_CLIENT_ID!,
    redirect_uri: process.env.ZOOM_REDIRECT_URI!,
    state: consultantId,
  });

  return `${ZOOM_AUTH_BASE}/authorize?${params.toString()}`;
};

export const exchangeCodeForTokens = async (code: string) => {
  const credentials = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${ZOOM_AUTH_BASE}/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.ZOOM_REDIRECT_URI!,
    }),
  });

  if (!response.ok) {
    throw new Error(`Zoom token exchange failed: ${response.statusText}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
};

export const refreshAccessToken = async (refreshToken: string) => {
  const credentials = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${ZOOM_AUTH_BASE}/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Zoom token refresh failed: ${response.statusText}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
};

const getValidToken = async (consultantId: string): Promise<string> => {
  const supabase = createAdminClient();
  const { data: consultant } = await supabase
    .from("consultants")
    .select("zoom_access_token, zoom_refresh_token, zoom_token_expires_at")
    .eq("id", consultantId)
    .single();

  if (!consultant?.zoom_access_token || !consultant.zoom_refresh_token) {
    throw new Error("Zoom not connected for this consultant");
  }

  const expiresAt = new Date(consultant.zoom_token_expires_at ?? 0);
  if (expiresAt > new Date()) {
    return consultant.zoom_access_token;
  }

  const tokens = await refreshAccessToken(consultant.zoom_refresh_token);
  const newExpiresAt = new Date(
    Date.now() + tokens.expires_in * 1000
  ).toISOString();

  await supabase
    .from("consultants")
    .update({
      zoom_access_token: tokens.access_token,
      zoom_refresh_token: tokens.refresh_token,
      zoom_token_expires_at: newExpiresAt,
    })
    .eq("id", consultantId);

  return tokens.access_token;
};

export const createMeeting = async (
  consultantId: string,
  topic: string,
  startTime: string,
  durationMinutes: number
) => {
  const token = await getValidToken(consultantId);

  const response = await fetch(`${ZOOM_API_BASE}/users/me/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic,
      type: 2,
      start_time: startTime,
      duration: durationMinutes,
      timezone: "Europe/Paris",
      settings: {
        join_before_host: false,
        waiting_room: true,
        auto_recording: "none",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Zoom meeting creation failed: ${response.statusText}`);
  }

  const meeting = await response.json();
  return {
    id: String(meeting.id),
    join_url: meeting.join_url as string,
    start_url: meeting.start_url as string,
  };
};

export const deleteMeeting = async (
  consultantId: string,
  meetingId: string
) => {
  const token = await getValidToken(consultantId);

  await fetch(`${ZOOM_API_BASE}/meetings/${meetingId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
