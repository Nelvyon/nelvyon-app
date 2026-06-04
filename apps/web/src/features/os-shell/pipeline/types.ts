import type { EntityListResponse } from "@/features/os-shell/types";

export interface OsDeal {
  id: number;
  user_id: string;
  workspace_id?: number | null;
  title: string;
  status: string;
  client_id?: number | null;
  project_id?: number | null;
  estimated_value?: number | null;
  assignee?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type OsDealListResponse = EntityListResponse<OsDeal>;

export interface OsDealWriteInput {
  title: string;
  status: string;
  client_id?: number | null;
  project_id?: number | null;
  estimated_value?: number | null;
  assignee?: string | null;
  notes?: string | null;
}
