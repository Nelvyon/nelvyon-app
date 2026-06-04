export interface OsProject {
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

export interface OsProjectListResponse {
  items: OsProject[];
  total: number;
  skip: number;
  limit: number;
}

export type OsProjectWriteInput = {
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
