import { apiClient } from "@/core/api";

export const socialPublishApi = {
  getSettings: (client_id: string) =>
    apiClient.get<{ enabled: boolean; frequency: string; sector: string; mock: boolean }>(
      `/api/social-publish/settings/${encodeURIComponent(client_id)}`,
      { tenantScoped: true },
    ),

  updateSettings: (body: { client_id: string; enabled: boolean; frequency: string; sector: string }) =>
    apiClient.put<Record<string, unknown>>("/api/social-publish/settings", { tenantScoped: true, body }),

  preview: (body: { client_id: string; sector: string; platform?: string; topic?: string }) =>
    apiClient.post<{ caption: string; image_url: string; platform: string }>(
      "/api/social-publish/preview",
      { tenantScoped: true, body },
    ),

  schedule: (body: {
    client_id: string;
    sector: string;
    platforms: string[];
    frequency: string;
  }) => apiClient.post<Record<string, unknown>>("/api/social-publish/schedule", { tenantScoped: true, body }),

  publishNow: (body: { client_id: string; sector: string; platforms?: string[] }) =>
    apiClient.post<Record<string, unknown>>("/api/social-publish/publish-now", { tenantScoped: true, body }),

  calendar: (client_id: string) =>
    apiClient.get<{ items: Array<Record<string, unknown>> }>(
      `/api/social-publish/calendar/${encodeURIComponent(client_id)}`,
      { tenantScoped: true },
    ),

  analytics: (client_id: string) =>
    apiClient.get<{ by_platform: Record<string, { reach: number; likes: number; comments: number }> }>(
      `/api/social-publish/analytics/${encodeURIComponent(client_id)}`,
      { tenantScoped: true },
    ),
};
