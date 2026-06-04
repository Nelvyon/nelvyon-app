import { apiClient } from "@/core/api";
import type { BillingInvoices } from "@/features/billing/types";
import { entityListUrl } from "@/features/os-shell/lib/entityQuery";
import type { EntityListResponse } from "@/features/os-shell/types";

import type { OsAssetRow, OsContractRow, OsOutputDetail } from "./types";

const OUTPUTS = "/api/v1/entities/nelvyon_outputs";
const ASSETS = "/api/v1/entities/nelvyon_assets";
const CONTRACTS = "/api/v1/entities/contracts";

export const osDocumentsApi = {
  outputs: (params?: {
    limit?: number;
    query?: Record<string, string | number>;
  }) =>
    apiClient.get<EntityListResponse<OsOutputDetail>>(
      entityListUrl(OUTPUTS, { limit: params?.limit ?? 500, query: params?.query, sort: "-id" }),
      { tenantScoped: true },
    ),

  outputById: (id: number) =>
    apiClient.get<OsOutputDetail>(`${OUTPUTS}/${id}`, { tenantScoped: true }),

  assets: (params?: { limit?: number; query?: Record<string, string | number> }) =>
    apiClient.get<EntityListResponse<OsAssetRow>>(
      entityListUrl(ASSETS, { limit: params?.limit ?? 500, query: params?.query, sort: "-id" }),
      { tenantScoped: true },
    ),

  assetById: (id: number) =>
    apiClient.get<OsAssetRow>(`${ASSETS}/${id}`, { tenantScoped: true }),

  contracts: (params?: { limit?: number; query?: Record<string, string | number> }) =>
    apiClient.get<EntityListResponse<OsContractRow>>(
      entityListUrl(CONTRACTS, { limit: params?.limit ?? 200, query: params?.query, sort: "-id" }),
      { tenantScoped: true },
    ),

  contractById: (id: number) =>
    apiClient.get<OsContractRow & { content?: string | null }>(`${CONTRACTS}/${id}`, {
      tenantScoped: true,
    }),

  billingInvoices: () =>
    apiClient.get<BillingInvoices>("/api/v1/billing/invoices", { tenantScoped: true }),
};
