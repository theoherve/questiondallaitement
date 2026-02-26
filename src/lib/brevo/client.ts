import type { BrevoList, CampaignStats } from "@/types/database";

const BREVO_API_BASE = "https://api.brevo.com/v3";

const brevoHeaders = () => ({
  "api-key": process.env.BREVO_API_KEY!,
  "Content-Type": "application/json",
  Accept: "application/json",
});

// ─── Helpers ────────────────────────────────────────────────

const brevoFetch = async <T = unknown>(
  path: string,
  options?: RequestInit
): Promise<{ ok: boolean; data: T | null; status: number }> => {
  const response = await fetch(`${BREVO_API_BASE}${path}`, {
    ...options,
    headers: { ...brevoHeaders(), ...options?.headers },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error(`Brevo API error [${response.status}] ${path}:`, error);
    return { ok: false, data: null, status: response.status };
  }

  if (response.status === 204) return { ok: true, data: null, status: 204 };

  const data = (await response.json()) as T;
  return { ok: true, data, status: response.status };
};

// ─── Contacts ───────────────────────────────────────────────

export const createContact = async (
  email: string,
  attributes?: Record<string, string>,
  listIds?: number[]
) => {
  return brevoFetch("/contacts", {
    method: "POST",
    body: JSON.stringify({
      email,
      attributes,
      listIds,
      updateEnabled: true,
    }),
  });
};

export const updateContact = async (
  email: string,
  attributes: Record<string, string>,
  listIds?: number[]
) => {
  return brevoFetch(`/contacts/${encodeURIComponent(email)}`, {
    method: "PUT",
    body: JSON.stringify({ attributes, listIds }),
  });
};

export const getContact = async (email: string) => {
  return brevoFetch<{
    email: string;
    id: number;
    attributes: Record<string, string>;
    listIds: number[];
  }>(`/contacts/${encodeURIComponent(email)}`);
};

export const deleteContact = async (email: string) => {
  return brevoFetch(`/contacts/${encodeURIComponent(email)}`, {
    method: "DELETE",
  });
};

export const addContactToList = async (email: string, listId: number) => {
  return brevoFetch(`/contacts/lists/${listId}/contacts/add`, {
    method: "POST",
    body: JSON.stringify({ emails: [email] }),
  });
};

export const addContactsToList = async (emails: string[], listId: number) => {
  return brevoFetch(`/contacts/lists/${listId}/contacts/add`, {
    method: "POST",
    body: JSON.stringify({ emails }),
  });
};

export const removeContactFromList = async (email: string, listId: number) => {
  return brevoFetch(`/contacts/lists/${listId}/contacts/remove`, {
    method: "POST",
    body: JSON.stringify({ emails: [email] }),
  });
};

// ─── Lists ──────────────────────────────────────────────────

export const getLists = async (
  limit = 50,
  offset = 0
): Promise<BrevoList[]> => {
  const { data } = await brevoFetch<{
    lists: {
      id: number;
      name: string;
      totalSubscribers: number;
      totalBlacklisted: number;
    }[];
  }>(`/contacts/lists?limit=${limit}&offset=${offset}`);

  return (
    data?.lists?.map((l) => ({
      id: l.id,
      name: l.name,
      totalSubscribers: l.totalSubscribers,
      totalBlacklisted: l.totalBlacklisted,
    })) ?? []
  );
};

export const createList = async (
  name: string,
  folderId: number
): Promise<{ id: number } | null> => {
  const { data } = await brevoFetch<{ id: number }>("/contacts/lists", {
    method: "POST",
    body: JSON.stringify({ name, folderId }),
  });
  return data;
};

export const getListContacts = async (
  listId: number,
  limit = 50,
  offset = 0
) => {
  const { data } = await brevoFetch<{
    contacts: { email: string; id: number; attributes: Record<string, string> }[];
    count: number;
  }>(`/contacts/lists/${listId}/contacts?limit=${limit}&offset=${offset}`);

  return { contacts: data?.contacts ?? [], count: data?.count ?? 0 };
};

// ─── Folders ────────────────────────────────────────────────

export const getFolders = async () => {
  const { data } = await brevoFetch<{
    folders: { id: number; name: string; totalSubscribers: number; totalBlacklisted: number; uniqueSubscribers: number }[];
  }>("/contacts/folders?limit=50&offset=0");
  return data?.folders ?? [];
};

// ─── Email Campaigns ────────────────────────────────────────

export const createEmailCampaign = async (params: {
  name: string;
  subject: string;
  htmlContent: string;
  sender: { name: string; email: string };
  recipients: { listIds: number[] };
  scheduledAt?: string; // ISO 8601
}) => {
  return brevoFetch<{ id: number }>("/emailCampaigns", {
    method: "POST",
    body: JSON.stringify({
      ...params,
      type: "classic",
    }),
  });
};

export const updateEmailCampaign = async (
  campaignId: number | string,
  params: {
    name?: string;
    subject?: string;
    htmlContent?: string;
    sender?: { name: string; email: string };
    recipients?: { listIds: number[] };
    scheduledAt?: string;
  }
) => {
  return brevoFetch(`/emailCampaigns/${campaignId}`, {
    method: "PUT",
    body: JSON.stringify(params),
  });
};

export const sendCampaignNow = async (campaignId: number | string) => {
  return brevoFetch(`/emailCampaigns/${campaignId}/sendNow`, {
    method: "POST",
  });
};

export const getCampaignReport = async (
  campaignId: number | string
): Promise<CampaignStats | null> => {
  const { data } = await brevoFetch<{
    statistics: {
      globalStats: {
        delivered: number;
        viewed: number;
        uniqueViews: number;
        clickers: number;
        uniqueClicks: number;
        hardBounces: number;
        softBounces: number;
        unsubscriptions: number;
        complaints: number;
      };
    };
  }>(`/emailCampaigns/${campaignId}`);

  if (!data?.statistics?.globalStats) return null;

  const s = data.statistics.globalStats;
  return {
    delivered: s.delivered,
    opens: s.viewed,
    unique_opens: s.uniqueViews,
    clicks: s.clickers,
    unique_clicks: s.uniqueClicks,
    bounces: s.hardBounces + s.softBounces,
    unsubscribes: s.unsubscriptions,
    spam_reports: s.complaints,
  };
};

export const getCampaigns = async (
  status?: "draft" | "sent" | "queued" | "suspended",
  limit = 50,
  offset = 0
) => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    type: "classic",
  });
  if (status) params.set("status", status);

  const { data } = await brevoFetch<{
    campaigns: {
      id: number;
      name: string;
      subject: string;
      status: string;
      scheduledAt: string | null;
      statistics: {
        globalStats: Record<string, number>;
      };
      recipients: { lists: number[] };
      createdAt: string;
      sentDate: string | null;
    }[];
    count: number;
  }>(`/emailCampaigns?${params}`);

  return { campaigns: data?.campaigns ?? [], count: data?.count ?? 0 };
};

// ─── Transactional (existing, refactored) ───────────────────

export const sendTransactionalEmail = async ({
  to,
  templateId,
  params,
}: {
  to: string;
  templateId: number;
  params?: Record<string, string>;
}) => {
  return brevoFetch("/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      to: [{ email: to }],
      templateId,
      params,
    }),
  });
};
