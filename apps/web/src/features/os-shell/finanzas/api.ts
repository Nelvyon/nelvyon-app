import { apiClient } from "@/core/api";
import { dashboardInvoicesApi } from "@/features/dashboard/api";
import { entityListUrl } from "@/features/os-shell/lib/entityQuery";
import { osDealsApi } from "@/features/os-shell/pipeline/api";
import { osPlatformApi } from "@/features/os-shell/api";
import { TERMINAL_PROJECT_STATUSES } from "@/features/os-shell/constants";

import type { InvoiceStatsRow, OsContractFinanceRow, SpanishInvoiceRow } from "./types";

const CONTRACTS = "/api/v1/entities/contracts";

export const osFinanzasApi = {
  invoiceStats: () =>
    apiClient.get<InvoiceStatsRow>("/api/invoices/stats", { tenantScoped: true }),

  invoicesList: (limit = 200) =>
    apiClient.get<{ items?: SpanishInvoiceRow[]; total?: number }>(
      `/api/invoices?skip=0&limit=${limit}`,
      { tenantScoped: true },
    ),

  contracts: (limit = 200) =>
    apiClient.get<{ items?: OsContractFinanceRow[]; total?: number }>(
      entityListUrl(CONTRACTS, { limit, sort: "-id" }),
      { tenantScoped: true },
    ),

  billingSummary: () => osPlatformApi.billingSummary(),
  billingInvoices: () => osPlatformApi.billingInvoices(),
  clients: () => osPlatformApi.clients(),
  projects: () => osPlatformApi.projects(),
  dealsWon: () => osDealsApi.list({ limit: 500, query: { status: "ganado" } }),

  /** Re-export for PDF links */
  invoicePdf: (id: number) => dashboardInvoicesApi.pdf(id),
};
