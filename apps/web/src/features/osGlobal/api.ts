import { apiClient } from "@/core/api";
import {
  OsGlobalChangeJournalItem,
  OsGlobalSnapshot,
  OsGlobalWorkspaceRiskItem,
} from "@/features/osGlobal/types";

const BASE = "/api/v1/os/global";

export const osGlobalApi = {
  snapshot: () => apiClient.get<OsGlobalSnapshot>(BASE, { tenantScoped: true }),
  riskQueue: () => apiClient.get<OsGlobalWorkspaceRiskItem[]>(`${BASE}/risk-queue`, { tenantScoped: true }),
  changeJournal: () => apiClient.get<OsGlobalChangeJournalItem[]>(`${BASE}/change-journal`, { tenantScoped: true }),
};
