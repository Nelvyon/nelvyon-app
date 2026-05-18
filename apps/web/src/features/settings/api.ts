import { apiClient } from "@/core/api";
import {
  MemberInviteInput,
  TenantSettings,
  TenantSettingsUpdateInput,
  WorkspaceMember,
} from "@/features/settings/types";
import { SecurityEventListResponse, SecurityEventsQuery } from "@/features/settings/securityTypes";

const TENANT = "/api/v1/tenant";
const WORKSPACE = "/api/v1/workspace";

export const settingsApi = {
  getTenantSettings: () =>
    apiClient.get<TenantSettings>(`${TENANT}/settings`, { tenantScoped: true }),
  updateTenantSettings: (body: TenantSettingsUpdateInput) =>
    apiClient.put<TenantSettings, TenantSettingsUpdateInput>(`${TENANT}/settings`, {
      tenantScoped: true,
      body,
    }),
  listMembers: () => apiClient.get<WorkspaceMember[]>(`${WORKSPACE}/members`, { tenantScoped: true }),
  inviteMember: (body: MemberInviteInput) =>
    apiClient.post<WorkspaceMember, MemberInviteInput>(`${WORKSPACE}/members/invite`, {
      tenantScoped: true,
      body,
    }),
  listSecurityEvents: (query: SecurityEventsQuery = {}) => {
    const params = new URLSearchParams();
    params.set("skip", String(query.skip ?? 0));
    params.set("limit", String(query.limit ?? 50));
    if (query.sort) params.set("sort", query.sort);
    const queryDict: Record<string, string> = {};
    if (query.severity) queryDict.severity = query.severity;
    if (query.status) queryDict.status = query.status;
    if (query.eventType) queryDict.event_type = query.eventType;
    if (Object.keys(queryDict).length > 0) {
      params.set("query", JSON.stringify(queryDict));
    }
    return apiClient.get<SecurityEventListResponse>(`/api/v1/entities/security_events?${params.toString()}`, {
      tenantScoped: true,
    });
  },
};
