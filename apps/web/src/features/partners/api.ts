import { apiClient } from "@/core/api";
import type { PartnerConnectStatus } from "@/lib/partners/partnerConnectTypes";
import type { PartnerHqSummary } from "@/lib/partners/partnerHqSummary";
import type { buildWholesaleCatalogPayload } from "@/lib/partners/wholesaleCatalog";

const BASE = "/api/platform/partners";

export type PartnerHqResponse = PartnerHqSummary & {
  partner_user_id: string;
  workspace_id: number;
  degraded?: boolean;
};

export type WholesaleCatalogResponse = ReturnType<typeof buildWholesaleCatalogPayload>;

export type PartnerConnectStatusResponse = {
  connect: PartnerConnectStatus;
  workspace_id: number;
};

export type PartnerLedgerResponse = {
  items: PartnerHqSummary["ledger_entries"];
  totals: {
    total_margin_eur: number;
    margin_mtd_eur: number;
    entry_count: number;
  };
  workspace_id: number;
};

export const partnersApi = {
  hq: () => apiClient.get<PartnerHqResponse>(`${BASE}/hq`, { tenantScoped: true }),
  wholesale: () => apiClient.get<WholesaleCatalogResponse>(`${BASE}/wholesale`, { tenantScoped: true }),
  connectStatus: (refresh = false) =>
    apiClient.get<PartnerConnectStatusResponse>(
      `${BASE}/connect/status${refresh ? "?refresh=1" : ""}`,
      { tenantScoped: true },
    ),
  connectOnboard: () =>
    apiClient.post<{ url: string; account_id: string }>(`${BASE}/connect/onboard`, {
      tenantScoped: true,
      body: {},
    }),
  ledger: () => apiClient.get<PartnerLedgerResponse>(`${BASE}/ledger`, { tenantScoped: true }),
};
