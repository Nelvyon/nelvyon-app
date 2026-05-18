export interface Deal {
  id: number;
  user_id: string;
  workspace_id: number | null;
  title: string;
  value?: number | null;
  currency?: string | null;
  stage?: string | null;
  pipeline?: string | null;
  probability?: number | null;
  expected_close?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
  days_in_stage?: number | null;
  client_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DealListResponse {
  items: Deal[];
  total: number;
  skip: number;
  limit: number;
}

export interface DealUpdateInput {
  stage?: string;
  assigned_to?: string;
  notes?: string;
}

export interface Activity {
  id: number;
  deal_id?: number | null;
  type: string;
  title: string;
  description?: string | null;
  is_completed?: boolean | null;
  due_date?: string | null;
  created_at?: string | null;
}

export interface ActivityListResponse {
  items: Activity[];
  total: number;
  skip: number;
  limit: number;
}

export interface CreateFollowUpInput {
  title: string;
  due_date?: string;
  description?: string;
}

export interface PipelineStageMetric {
  stage?: string;
  count?: number;
  value?: number;
  weighted_value?: number;
}

export interface PipelineSummary {
  items?: PipelineStageMetric[];
  by_stage?: PipelineStageMetric[];
  stages?: PipelineStageMetric[];
  total_count?: number;
  total_value?: number;
}
