import { apiClient } from "@/core/api";
import { GoldenPathResponse, I18nBaselineResponse, QaChecklistResponse } from "@/features/excellence/types";

const BASE = "/api/v1/os/excellence";

export const excellenceApi = {
  checklist: () => apiClient.get<QaChecklistResponse>(`${BASE}/checklist`, { tenantScoped: true }),
  i18n: () => apiClient.get<I18nBaselineResponse>(`${BASE}/i18n`, { tenantScoped: true }),
  goldenPath: () => apiClient.get<GoldenPathResponse>(`${BASE}/golden-path`, { tenantScoped: true }),
};
