import type { EntityListResponse } from "@/features/os-shell/types";

export interface OsTask {
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

export type OsTaskListResponse = EntityListResponse<OsTask>;

export interface OsTaskWriteInput {
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  due_date?: string | null;
  client_id?: number | null;
  project_id?: number | null;
  assignee?: string | null;
}
