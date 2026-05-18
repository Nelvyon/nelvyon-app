export interface AutomationJob {
  id: number;
  user_id: string;
  workspace_id?: number | null;
  client_id?: number | null;
  client_name?: string | null;
  job_type: string;
  status: string;
  input_data?: string | null;
  output_data?: string | null;
  output_id?: number | null;
  project_id?: number | null;
  source?: string | null;
  webhook_id?: string | null;
  priority?: string | null;
  error_message?: string | null;
  processing_time_ms?: number | null;
  delivered_at?: string | null;
  created_at?: string | null;
}

export interface AutomationJobListResponse {
  items: AutomationJob[];
  total: number;
  skip: number;
  limit: number;
}

export interface AutomationWebhook {
  id: number;
  user_id: string;
  workspace_id?: number | null;
  name: string;
  webhook_key: string;
  job_type?: string | null;
  is_active?: boolean | null;
  total_calls?: number | null;
  last_called_at?: string | null;
  created_at?: string | null;
}

export interface AutomationWebhookListResponse {
  items: AutomationWebhook[];
  total: number;
  skip: number;
  limit: number;
}

export interface AutomationWebhookUpdateInput {
  name?: string;
  job_type?: string;
  is_active?: boolean;
}

export interface RetryJobResponse {
  job_id: number;
  status: string;
  output_id?: number | null;
  content?: string | null;
  processing_time_ms: number;
}
