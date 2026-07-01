type DialerQueueItem = { phone: string; contact_id?: string | null; use_voicemail?: boolean };

async function dialerFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error?: unknown }).error)
        : typeof payload === "object" && payload && "detail" in payload
          ? String((payload as { detail?: unknown }).detail)
          : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return payload as T;
}

export type { DialerQueueItem };

export const dialerAdvancedApi = {
  powerDial: (body: {
    client_id: string;
    queue: DialerQueueItem[];
    voicemail_url?: string | null;
    max_calls?: number;
  }) =>
    dialerFetch<Record<string, unknown>>("/api/dialer-advanced/power-dial", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  parallelDial: (body: {
    client_id: string;
    queue: DialerQueueItem[];
    parallel_limit?: number;
    voicemail_url?: string | null;
  }) =>
    dialerFetch<Record<string, unknown>>("/api/dialer-advanced/parallel-dial", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  sessionStats: (sessionId: string) =>
    dialerFetch<Record<string, unknown>>(
      `/api/dialer-advanced/session/${encodeURIComponent(sessionId)}/stats`,
    ),

  calls: (clientId: string) =>
    dialerFetch<{ items: Array<Record<string, unknown>> }>(
      `/api/dialer-advanced/calls/${encodeURIComponent(clientId)}`,
    ),

  voicemailDrop: (body: { call_sid?: string; to_number?: string; voicemail_url: string }) =>
    dialerFetch<Record<string, unknown>>("/api/dialer-advanced/voicemail-drop", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
