import { apiClient } from "@/core/api";

export type FinetuningStatus =
  | "none"
  | "pending"
  | "collecting"
  | "uploading"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "active";

export type FinetuningJobStatus = {
  job_id?: string;
  workspace_id: number;
  status: FinetuningStatus;
  progress_pct: number;
  custom_model_active?: boolean;
  examples_count: number;
  error_message?: string | null;
  metrics?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type WorkspaceModelInfo = {
  workspace_id: number;
  custom_model_active: boolean;
  status: FinetuningStatus | "none";
  is_active: boolean;
  examples_count?: number;
  created_at?: string;
  metrics?: Record<string, unknown>;
};

export type CollectPreview = {
  workspace_id: number;
  examples_count: number;
  sources: Record<string, number>;
  dataset_path: string;
  preview: unknown[];
};

const BASE = "/api/finetuning";

export const finetuningApi = {
  start: () =>
    apiClient.post<{
      job_id: string;
      status: string;
      examples_count?: number;
      openai_job_id?: string;
      mock?: boolean;
    }>(`${BASE}/start`, { tenantScoped: true }),

  status: () => apiClient.get<FinetuningJobStatus>(`${BASE}/status`, { tenantScoped: true }),

  model: () => apiClient.get<WorkspaceModelInfo>(`${BASE}/model`, { tenantScoped: true }),

  collect: () => apiClient.post<CollectPreview>(`${BASE}/collect`, { tenantScoped: true }),
};
