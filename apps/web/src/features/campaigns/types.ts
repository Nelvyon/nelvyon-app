export interface Campaign {
  id: number;
  user_id: string;
  workspace_id: number | null;
  project_id: number;
  client_id?: number | null;
  platform: string;
  campaign_type: string;
  name?: string | null;
  content?: string | null;
  variants_count?: number | null;
  budget_suggested?: number | null;
  target_audience?: string | null;
  qa_score?: number | null;
  status?: string | null;
  created_at?: string | null;
}

export interface CampaignListResponse {
  items: Campaign[];
  total: number;
  skip: number;
  limit: number;
}

export interface CampaignCreateInput {
  project_id: number;
  client_id?: number;
  platform: string;
  campaign_type: string;
  name?: string;
  content?: string;
  variants_count?: number;
  budget_suggested?: number;
  target_audience?: string;
  qa_score?: number;
  status?: string;
}

export interface CampaignUpdateInput {
  project_id?: number;
  client_id?: number;
  platform?: string;
  campaign_type?: string;
  name?: string;
  content?: string;
  variants_count?: number;
  budget_suggested?: number;
  target_audience?: string;
  qa_score?: number;
  status?: string;
}
