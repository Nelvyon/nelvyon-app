import { apiClient } from "@/core/api";
import type { WhitelabelApplyConfig } from "@/core/whitelabel/types";

export type WhitelabelConfig = {
  workspace_id?: number;
  custom_domain?: string | null;
  brand_name?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font?: string;
  support_email?: string | null;
  custom_email_from_name?: string | null;
  custom_email_from_address?: string | null;
  hide_nelvyon_branding?: boolean;
  custom_css?: string | null;
  verified_domain?: boolean;
  dns_txt_token?: string | null;
};

export type DnsInstructions = {
  domain: string;
  txt_host: string;
  txt_value: string;
  cname_target: string;
};

export type PartnerClient = {
  id?: string;
  client_workspace_id: number;
  client_name: string;
  admin_email?: string;
  workspace_name?: string;
  status?: string;
  created_at?: string;
};

const BASE = "/api/whitelabel";

export const whitelabelApi = {
  getConfig: () => apiClient.get<WhitelabelConfig>(`${BASE}/config`, { tenantScoped: true }),

  saveConfig: (body: Partial<WhitelabelConfig> & { company_name?: string }) =>
    apiClient.put<WhitelabelConfig>(`${BASE}/config`, { tenantScoped: true, body }),

  apply: () => apiClient.get<WhitelabelApplyConfig>(`${BASE}/apply`, { tenantScoped: true }),

  preview: () => apiClient.get<Record<string, unknown>>(`${BASE}/preview`, { tenantScoped: true }),

  dnsInstructions: () => apiClient.get<DnsInstructions>(`${BASE}/dns-instructions`, { tenantScoped: true }),

  verifyDomain: (domain?: string) =>
    apiClient.post<Record<string, unknown>>(`${BASE}/verify-domain`, {
      tenantScoped: true,
      body: domain ? { domain } : {},
    }),

  listClients: () =>
    apiClient.get<{ clients: PartnerClient[]; count: number }>(`${BASE}/clients`, { tenantScoped: true }),

  createSubworkspace: (name: string, admin_email: string) =>
    apiClient.post<{ client_workspace_id: number; branding: WhitelabelApplyConfig }>(`${BASE}/subworkspace`, {
      tenantScoped: true,
      body: { name, admin_email },
    }),
};
