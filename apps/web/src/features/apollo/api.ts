import { apiClient } from "@/core/api";

export type ApolloLead = {
  apollo_id?: string;
  name: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  city?: string;
  sector?: string;
  company_size?: string;
  ai_score?: number;
};

export const apolloApi = {
  search: (body: {
    sector: string;
    title?: string;
    city?: string;
    company_size?: string;
    limit?: number;
  }) =>
    apiClient.post<{ items: ApolloLead[]; mock: boolean }>("/api/apollo/search", {
      tenantScoped: true,
      body,
    }),

  enrich: (contactId: string) =>
    apiClient.post<Record<string, unknown>>(`/api/apollo/enrich/${encodeURIComponent(contactId)}`, {
      tenantScoped: true,
      body: {},
    }),

  syncCrm: (leads: ApolloLead[]) =>
    apiClient.post<{ synced: number; contacts: Array<{ contact_id: string }> }>("/api/apollo/sync-crm", {
      tenantScoped: true,
      body: { leads },
    }),

  suggestions: (clientId: string, sector = "saas") =>
    apiClient.get<{ suggestions: ApolloLead[] }>(
      `/api/apollo/suggestions/${encodeURIComponent(clientId)}?sector=${encodeURIComponent(sector)}`,
      { tenantScoped: true },
    ),
};
