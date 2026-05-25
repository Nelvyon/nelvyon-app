import { apiClient } from "@/core/api";

export const linkedinApi = {
  connect: (body: {
    client_id: string;
    prospect_name: string;
    company?: string;
    sector?: string;
    role?: string;
    contact_id?: string;
    preview_only?: boolean;
  }) =>
    apiClient.post<Record<string, unknown>>("/api/linkedin/connect", { tenantScoped: true, body }),

  startSequence: (
    contactId: string,
    body: {
      client_id: string;
      prospect_name: string;
      company?: string;
      sector?: string;
      role?: string;
    },
  ) =>
    apiClient.post<Record<string, unknown>>(`/api/linkedin/sequence/${encodeURIComponent(contactId)}`, {
      tenantScoped: true,
      body,
    }),

  stats: (clientId: string) =>
    apiClient.get<Record<string, unknown>>(`/api/linkedin/stats/${encodeURIComponent(clientId)}`, {
      tenantScoped: true,
    }),

  inbox: (clientId: string) =>
    apiClient.get<{ items: Array<Record<string, unknown>> }>(
      `/api/linkedin/inbox/${encodeURIComponent(clientId)}`,
      { tenantScoped: true },
    ),

  prospects: (clientId: string) =>
    apiClient.get<{ prospects: Array<Record<string, unknown>> }>(
      `/api/linkedin/prospects/${encodeURIComponent(clientId)}`,
      { tenantScoped: true },
    ),
};
