import { apiClient } from "@/core/api";

export const cpqApi = {
  generate: (body: {
    client_id?: string;
    lead_email: string;
    lead_name?: string;
    sector: string;
    services: string[];
    budget_hint?: string;
    company_size?: string;
    send_email?: boolean;
  }) => apiClient.post<Record<string, unknown>>("/api/cpq/generate", { tenantScoped: true, body }),
  quotes: (clientId?: string) =>
    apiClient.get<{ quotes: unknown[]; stats: Record<string, number> }>(
      `/api/cpq/quotes${clientId ? `?client_id=${clientId}` : ""}`,
      { tenantScoped: true },
    ),
  get: (quoteId: string) =>
    apiClient.get<Record<string, unknown>>(`/api/cpq/quotes/${quoteId}`, { tenantScoped: true }),
  updateStatus: (quoteId: string, status: string) =>
    apiClient.put(`/api/cpq/quotes/${quoteId}/status`, {
      tenantScoped: true,
      body: { status },
    }),
  send: (quoteId: string) =>
    apiClient.post(`/api/cpq/quotes/${quoteId}/send`, { tenantScoped: true, body: {} }),
};
