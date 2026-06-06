export type OsTaskStatus = "pending" | "in_progress" | "blocked" | "completed" | "archived";

export type OsTaskPriority = "low" | "medium" | "high" | "urgent";

/** Canonical os_tasks row (UUID id). */
export interface OsCanonicalTask {
  id: string;
  workspace_id: number;
  project_id?: string | null;
  client_id?: string | null;
  title: string;
  description?: string | null;
  status: OsTaskStatus;
  priority: OsTaskPriority;
  assignee?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  metadata: Record<string, unknown>;
  archived_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OsTaskListResponse {
  items: OsCanonicalTask[];
  total: number;
  page: number;
  page_size: number;
}

export interface OsTaskCreateInput {
  title: string;
  description?: string;
  status?: OsTaskStatus;
  priority?: OsTaskPriority;
  project_id?: string;
  client_id?: string;
  assignee?: string;
  due_date?: string;
  metadata?: Record<string, unknown>;
}

export type OsTaskUpdateInput = Partial<OsTaskCreateInput>;

/** Legacy entity os_tasks — OsRelatedOpsSection until migrated. */
export interface OsLegacyTask {
  id: number;
  user_id: string;
  workspace_id?: number | null;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  due_date?: string | null;
  client_id?: number | null;
  project_id?: number | null;
  assignee?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OsLegacyTaskListResponse {
  items: OsLegacyTask[];
  total: number;
  skip: number;
  limit: number;
}

export interface OsLegacyTaskWriteInput {
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  due_date?: string | null;
  client_id?: number | null;
  project_id?: number | null;
  assignee?: string | null;
}

/** @deprecated Use OsLegacyTask in legacy modules. */
export type OsTask = OsLegacyTask;

/** @deprecated Use OsLegacyTaskWriteInput in legacy forms. */
export type OsTaskWriteInput = OsLegacyTaskWriteInput;
