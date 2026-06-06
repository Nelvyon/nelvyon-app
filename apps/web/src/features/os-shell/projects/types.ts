export type OsProjectStatus = "draft" | "active" | "paused" | "completed" | "cancelled" | "archived";

export type OsProjectPriority = "low" | "medium" | "high" | "urgent";

/** Canonical os_projects row (UUID id). */
export interface OsCanonicalProject {
  id: string;
  workspace_id: number;
  client_id: string;
  name: string;
  description?: string | null;
  status: OsProjectStatus;
  priority: OsProjectPriority;
  start_date?: string | null;
  due_date?: string | null;
  budget?: string | number | null;
  metadata: Record<string, unknown>;
  archived_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OsProjectListResponse {
  items: OsCanonicalProject[];
  total: number;
  page: number;
  page_size: number;
}

export interface OsProjectCreateInput {
  client_id: string;
  name: string;
  description?: string;
  status?: OsProjectStatus;
  priority?: OsProjectPriority;
  start_date?: string;
  due_date?: string;
  budget?: number | string;
  metadata?: Record<string, unknown>;
}

export type OsProjectUpdateInput = Partial<OsProjectCreateInput>;

/** Linked task summary (read-only from os_tasks). */
export interface OsProjectLinkedTask {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
  due_date?: string | null;
}

/** Legacy nelvyon_projects — pipeline, tareas, documentos until OS-1-UI-05+. */
export interface OsLegacyProject {
  id: number;
  user_id: string;
  workspace_id: number | null;
  client_id: number;
  name: string;
  project_type: string;
  status?: string | null;
  progress?: number | null;
  brief?: string | null;
  deliverables?: string | null;
  deadline?: string | null;
  priority?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OsLegacyProjectListResponse {
  items: OsLegacyProject[];
  total: number;
  skip: number;
  limit: number;
}

export type OsLegacyProjectWriteInput = {
  client_id: number;
  name: string;
  project_type: string;
  status?: string;
  progress?: number;
  brief?: string;
  deliverables?: string;
  deadline?: string;
  priority?: string;
};

/** @deprecated Use OsLegacyProject in legacy pickers until OS-1-UI-05+. */
export type OsProject = OsLegacyProject;

/** @deprecated Use OsLegacyProjectWriteInput in legacy project forms. */
export type OsProjectWriteInput = OsLegacyProjectWriteInput;

export interface OsOutput {
  id: number;
  project_id: number;
  client_id?: number | null;
  output_type: string;
  title?: string | null;
  qa_status?: string | null;
  qa_score?: number | null;
  created_at?: string | null;
}

export interface OsOutputListResponse {
  items: OsOutput[];
  total: number;
  skip: number;
  limit: number;
}

export interface OsCampaign {
  id: number;
  project_id: number;
  client_id?: number | null;
  platform: string;
  campaign_type: string;
  name?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface OsCampaignListResponse {
  items: OsCampaign[];
  total: number;
  skip: number;
  limit: number;
}
