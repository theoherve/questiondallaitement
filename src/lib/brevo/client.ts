const BREVO_API_BASE = "https://api.brevo.com/v3";

const brevoHeaders = () => ({
  "api-key": process.env.BREVO_API_KEY!,
  "Content-Type": "application/json",
  Accept: "application/json",
});

export const createContact = async (email: string, attributes?: Record<string, string>) => {
  const response = await fetch(`${BREVO_API_BASE}/contacts`, {
    method: "POST",
    headers: brevoHeaders(),
    body: JSON.stringify({
      email,
      attributes,
      updateEnabled: true,
    }),
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.json();
    console.error("Brevo create contact error:", error);
  }
};

export const addContactToList = async (email: string, listId: number) => {
  await fetch(`${BREVO_API_BASE}/contacts/lists/${listId}/contacts/add`, {
    method: "POST",
    headers: brevoHeaders(),
    body: JSON.stringify({ emails: [email] }),
  });
};

export const removeContactFromList = async (email: string, listId: number) => {
  await fetch(`${BREVO_API_BASE}/contacts/lists/${listId}/contacts/remove`, {
    method: "POST",
    headers: brevoHeaders(),
    body: JSON.stringify({ emails: [email] }),
  });
};

export const sendTransactionalEmail = async ({
  to,
  templateId,
  params,
}: {
  to: string;
  templateId: number;
  params?: Record<string, string>;
}) => {
  const response = await fetch(`${BREVO_API_BASE}/smtp/email`, {
    method: "POST",
    headers: brevoHeaders(),
    body: JSON.stringify({
      to: [{ email: to }],
      templateId,
      params,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Brevo send email error:", error);
  }
};
