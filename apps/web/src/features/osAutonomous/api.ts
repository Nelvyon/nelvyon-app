import { apiClient } from "@/core/api";
import type { LearningExportKey, OsAutonomousLearningDashboard } from "@/features/osAutonomous/types";

const BASE = "/api/v1/os/autonomous/learning";

export const osAutonomousLearningApi = {
  dashboard: () => apiClient.get<OsAutonomousLearningDashboard>(BASE, { tenantScoped: true }),
  exportUrl: (key: LearningExportKey) => `${BASE}/export/${key}`,
  downloadExport: (key: LearningExportKey) =>
    apiClient.getBlob(`${BASE}/export/${key}`, { tenantScoped: true }),
};

export async function triggerLearningExportDownload(key: LearningExportKey): Promise<void> {
  const blob = await osAutonomousLearningApi.downloadExport(key);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${key}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
