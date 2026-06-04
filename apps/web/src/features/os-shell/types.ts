export interface EntityListResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface NelvyonOutputRow {
  id: number;
  project_id: number;
  client_id?: number | null;
  output_type: string;
  title?: string | null;
  qa_status?: string | null;
  qa_score?: number | null;
  created_at?: string | null;
}

export interface QaDashboardStats {
  total_outputs: number;
  passed: number;
  failed: number;
  pending: number;
  average_score: number;
  pass_rate: number;
}

export type OsPlatformLoadState = "loading" | "ready" | "error" | "empty";

export interface OsPlatformDashboardData {
  clientsTotal: number | null;
  clientsActive: number | null;
  dealsOpen: number | null;
  dealsWon: number | null;
  tasksPending: number | null;
  tasksOverdue: number | null;
  projectsTotal: number | null;
  projectsActive: number | null;
  outputsTotal: number | null;
  outputsPending: number | null;
  qaPassRate: number | null;
  automationTotal: number | null;
  automationPending: number | null;
  automationFailed: number | null;
  billingPaidYtd: number | null;
  billingCurrency: string | null;
  invoiceCount: number | null;
  recentJobs: { id: number; job_type: string; status: string; created_at?: string }[];
  recentOutputs: { id: number; title: string; output_type: string; qa_status?: string; created_at?: string }[];
  errors: string[];
}
