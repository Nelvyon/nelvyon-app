import { apiClient } from "@/core/api";
import type { OsAutonomousLearningDashboard } from "@/features/osAutonomous/types";

const BASE = "/api/v1/os/autonomous/learning";

export const osAutonomousLearningApi = {
  dashboard: () => apiClient.get<OsAutonomousLearningDashboard>(BASE, { tenantScoped: true }),
};
