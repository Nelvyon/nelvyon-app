import { apiClient } from "@/core/api";
import type {
  ObservabilityAlertsSimulation,
  ObservabilityHealth,
  ObservabilityIncident,
} from "@/features/observability/types";

const BASE = "/api/v1/os/observability";

export const observabilityApi = {
  health: () => apiClient.get<ObservabilityHealth>(BASE, { tenantScoped: true }),
  incidents: () => apiClient.get<ObservabilityIncident[]>(`${BASE}/incidents`, { tenantScoped: true }),
  alerts: () => apiClient.get<ObservabilityAlertsSimulation>(`${BASE}/alerts`, { tenantScoped: true }),
};
