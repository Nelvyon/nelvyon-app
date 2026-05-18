import { apiClient } from "@/core/api";
import {
  Campaign,
  CampaignCreateInput,
  CampaignListResponse,
  CampaignUpdateInput,
} from "@/features/campaigns/types";

const BASE = "/api/v1/entities/nelvyon_campaigns";

export const campaignsApi = {
  list: () => apiClient.get<CampaignListResponse>(BASE, { tenantScoped: true }),
  getById: (id: number) => apiClient.get<Campaign>(`${BASE}/${id}`, { tenantScoped: true }),
  create: (payload: CampaignCreateInput) =>
    apiClient.post<Campaign, CampaignCreateInput>(BASE, { tenantScoped: true, body: payload }),
  update: (id: number, payload: CampaignUpdateInput) =>
    apiClient.put<Campaign, CampaignUpdateInput>(`${BASE}/${id}`, { tenantScoped: true, body: payload }),
};
