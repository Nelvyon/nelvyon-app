export type NelvyonClientOptions = {
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

async function request<T>(opts: NelvyonClientOptions, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${opts.baseUrl.replace(/\/$/, "")}${path}`, {
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
    triggerWorkflow: (workflowId: string, payload: Record<string, unknown>) =>
      request<{ ok: boolean }>(opts, "/workflows/trigger", {
        method: "POST",
        body: JSON.stringify({ workflow_id: workflowId, payload }),
      }),
  };
}

export type NelvyonClient = ReturnType<typeof createNelvyonClient>;
