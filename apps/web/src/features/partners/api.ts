import { apiClient } from "@/core/api";
import type { PartnerHqSummary } from "@/lib/partners/partnerHqSummary";
import type { buildWholesaleCatalogPayload } from "@/lib/partners/wholesaleCatalog";

const BASE = "/api/platform/partners";

export type PartnerHqResponse = PartnerHqSummary & {
  partner_user_id: string;
  workspace_id: number;
};

export type WholesaleCatalogResponse = ReturnType<typeof buildWholesaleCatalogPayload>;

export const partnersApi = {
  hq: () => apiClient.get<PartnerHqResponse>(`${BASE}/hq`, { tenantScoped: true }),
  wholesale: () => apiClient.get<WholesaleCatalogResponse>(`${BASE}/wholesale`, { tenantScoped: true }),
};
