import { apiClient } from "@/core/api";
import {
  TenantBrandingActivationLogItem,
  TenantBrandingActivationPayload,
  TenantBrandingPolicy,
} from "@/features/branding/policyTypes";

const BASE = "/api/v1/tenant";

export const brandingPolicyApi = {
  getPolicy: () => apiClient.get<TenantBrandingPolicy>(`${BASE}/branding/policy`, { tenantScoped: true }),
  setActivation: (body: TenantBrandingActivationPayload) =>
    apiClient.post<TenantBrandingPolicy, TenantBrandingActivationPayload>(`${BASE}/branding-v2/activation`, {
      tenantScoped: true,
      body,
    }),
  getActivationLogs: () =>
    apiClient.get<TenantBrandingActivationLogItem[]>(`${BASE}/branding-v2/activation-logs`, { tenantScoped: true }),
};
