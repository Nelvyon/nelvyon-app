export const OS_JOB_PREVIEW_LIMIT = 8;

export interface AutomationStats {
  total_jobs: number;
  completed: number;
  pending: number;
  failed: number;
  average_processing_ms: number;
  success_rate: number;
}

export interface AutomationJobSummary {
  id: number;
  client_id?: number | null;
  client_name?: string;
  job_type: string;
  status: string;
  source?: string;
  priority?: string;
  processing_time_ms?: number;
  error_message?: string;
  output_id?: number | null;
  created_at?: string;
  delivered_at?: string;
}

export interface AutomationJobList {
  items: AutomationJobSummary[];
  total: number;
  skip: number;
  limit: number;
}
