import { apiClient } from "@/core/api";

export type WebBuilderBriefing = {
  business_name: string;
  sector: string;
  primary_color: string;
  secondary_color: string;
  description: string;
  city: string;
  services: string[];
};

export const webBuilderApi = {
  generate: (body: {
    client_id: string;
    regenerate_section?: string | null;
    website_id?: number | null;
  } & WebBuilderBriefing) =>
    apiClient.post<{
      website_id: number;
      html: string;
      css: string;
      slug: string;
      version: number;
      subdomain: string;
      preview_url: string;
    }>("/api/web-builder/generate", { tenantScoped: true, body }),

  publish: (website_id: number) =>
    apiClient.post<{
      website_id: number;
      subdomain: string;
      public_url: string;
      published_at: string;
    }>("/api/web-builder/publish", { tenantScoped: true, body: { website_id } }),

  history: (client_id: string) =>
    apiClient.get<{ client_id: string; items: Array<Record<string, unknown>> }>(
      `/api/web-builder/history/${encodeURIComponent(client_id)}`,
      { tenantScoped: true },
    ),

  restore: (client_id: string, website_id: number) =>
    apiClient.post<{ website_id: number; restored_from: number; version: number }>(
      "/api/web-builder/restore",
      { tenantScoped: true, body: { client_id, website_id } },
    ),
};
