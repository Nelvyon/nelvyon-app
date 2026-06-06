import { apiClient } from "@/core/api";
import { osDeliverablesApi } from "@/features/os-shell/deliverables/api";
import type { OsDeliverable } from "@/features/os-shell/deliverables/types";
import type { OsProjectLinkedTask } from "@/features/os-shell/projects/types";

const TASKS = "/api/v1/os/tasks";

export async function fetchLinkedTasks(projectId: string, limit = 20): Promise<OsProjectLinkedTask[]> {
  const res = await apiClient.get<{ items: OsProjectLinkedTask[]; total: number }>(
    `${TASKS}?project_id=${encodeURIComponent(projectId)}&page=1&page_size=${limit}`,
    { tenantScoped: true },
  );
  return res.items ?? [];
}

export async function fetchLinkedDeliverables(projectId: string, limit = 8): Promise<OsDeliverable[]> {
  const res = await osDeliverablesApi.list({ project_id: projectId, page: 1, page_size: limit });
  return res.items ?? [];
}

export function legacyProjectIdFromMetadata(metadata: Record<string, unknown>): number | undefined {
  const raw = metadata.legacy_nelvyon_project_id ?? metadata.legacy_id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
