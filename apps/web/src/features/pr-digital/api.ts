import { apiClient } from "@/core/api";

export const prDigitalApi = {
  generate: (body: {
    client_id?: string;
    company: string;
    sector: string;
    news: string;
    tone?: string;
    type?: string;
  }) => apiClient.post("/api/pr/generate", { tenantScoped: true, body }),
  headlines: (body: { company: string; sector: string; news: string }) =>
    apiClient.post<{ headlines: string[]; mock?: boolean }>("/api/pr/headlines", {
      tenantScoped: true,
      body,
    }),
  crisis: (body: {
    client_id?: string;
    company: string;
    sector: string;
    situation: string;
    tone?: string;
  }) => apiClient.post("/api/pr/crisis", { tenantScoped: true, body }),
  releases: (clientId?: string) =>
    apiClient.get<{ releases: unknown[] }>(
      `/api/pr/releases${clientId ? `?client_id=${encodeURIComponent(clientId)}` : ""}`,
      { tenantScoped: true },
    ),
  mediaList: (sector: string) =>
    apiClient.get<{ media: unknown[]; estimated_reach: number }>(`/api/pr/media-list/${sector}`, {
      tenantScoped: true,
    }),
};
