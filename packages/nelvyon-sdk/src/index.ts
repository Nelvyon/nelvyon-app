export type NelvyonClientOptions = {
  /** Base URL including /api/public/v2 — e.g. https://app.nelvyon.com/api/public/v2 */
  baseUrl: string;
  apiKey: string;
};

export type NelvyonContact = {
  id: string;
  name: string;
  email?: string | null;
};

export type NelvyonDeal = {
  id: string;
  title: string;
  value: number;
  stage: string;
};

export type NelvyonWebhookFailure = {
  id: string;
  eventType: string | null;
  errorMessage: string | null;
  attempts: number;
};

async function request<T>(opts: NelvyonClientOptions, path: string, init?: RequestInit): Promise<T> {
  const base = opts.baseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function createNelvyonClient(opts: NelvyonClientOptions) {
  return {
    listContacts: () => request<{ contacts: NelvyonContact[] }>(opts, "/contacts"),
    createContact: (body: { name: string; email?: string }) =>
      request<NelvyonContact>(opts, "/contacts", { method: "POST", body: JSON.stringify(body) }),
    listDeals: () => request<{ deals: NelvyonDeal[] }>(opts, "/deals"),
    createDeal: (body: { title: string; value: number; stage?: string }) =>
      request<NelvyonDeal>(opts, "/deals", { method: "POST", body: JSON.stringify(body) }),
    triggerWorkflow: (workflowId: string, payload: Record<string, unknown>) =>
      request<{ ok: boolean }>(opts, "/workflows/trigger", {
        method: "POST",
        body: JSON.stringify({ workflow_id: workflowId, payload }),
      }),
    listWebhookFailures: () =>
      request<{ failures: NelvyonWebhookFailure[] }>(opts, "/webhooks/dlq"),
    replayWebhookFailure: (id: string) =>
      request<{ ok: boolean }>(opts, "/webhooks/dlq", {
        method: "POST",
        body: JSON.stringify({ action: "replay", id }),
      }),
    getHealth: () => request<{ ok: boolean }>(opts, "/health"),
  };
}

export type NelvyonClient = ReturnType<typeof createNelvyonClient>;
