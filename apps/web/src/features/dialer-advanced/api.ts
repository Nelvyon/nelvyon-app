import { apiClient } from "@/core/api";

export type DialerQueueItem = { phone: string; contact_id?: string | null; use_voicemail?: boolean };

export const dialerAdvancedApi = {
  powerDial: (body: {
    client_id: string;
    queue: DialerQueueItem[];
    voicemail_url?: string | null;
    max_calls?: number;
  }) =>
    apiClient.post<Record<string, unknown>>("/api/dialer-advanced/power-dial", {
      tenantScoped: true,
      body,
    }),

  parallelDial: (body: {
    client_id: string;
    queue: DialerQueueItem[];
    parallel_limit?: number;
    voicemail_url?: string | null;
  }) =>
    apiClient.post<Record<string, unknown>>("/api/dialer-advanced/parallel-dial", {
      tenantScoped: true,
      body,
    }),

  sessionStats: (sessionId: string) =>
    apiClient.get<Record<string, unknown>>(`/api/dialer-advanced/session/${encodeURIComponent(sessionId)}/stats`, {
      tenantScoped: true,
    }),

  calls: (clientId: string) =>
    apiClient.get<{ items: Array<Record<string, unknown>> }>(
      `/api/dialer-advanced/calls/${encodeURIComponent(clientId)}`,
      { tenantScoped: true },
    ),

  voicemailDrop: (body: { call_sid?: string; to_number?: string; voicemail_url: string }) =>
    apiClient.post<Record<string, unknown>>("/api/dialer-advanced/voicemail-drop", {
      tenantScoped: true,
      body,
    }),
};
