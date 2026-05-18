export interface Project {
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

export interface ProjectListResponse {
  items: Project[];
  total: number;
  skip: number;
  limit: number;
}

export interface ProjectCreateInput {
  client_id: number;
  name: string;
  project_type: string;
  status?: string;
  brief?: string;
}
