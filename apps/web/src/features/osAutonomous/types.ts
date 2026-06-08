import { apiClient } from "@/core/api";

export interface LearningTemplateItem {
  template_id: string;
  sector: string;
  service: string;
  category: string;
  rank_position: number;
  final_template_score: number;
  conversion_score: number;
  quality_score: number;
  sample_size: number;
  qa_score: number;
  conversion_rate: number | null;
  lead_count: number;
  approved_by_client: boolean;
  approved_by_client_rate: number;
  revisions_count: number;
  cold_start: boolean;
}

export interface LearningGroupItem {
  sector: string | null;
  service: string | null;
  templates_count: number;
  top_template_id: string;
  top_final_score: number;
  avg_conversion_score: number;
  templates: LearningTemplateItem[];
}

export interface LearningTrendPoint {
  date: string;
  outcomes_count: number;
  conversion_rate_avg: number | null;
  lead_count_total: number;
}

export interface Ga4DashboardStatus {
  mode: string;
  real_enabled: boolean;
  mock_realistic: boolean;
  property_configured: boolean;
  credentials_configured: boolean;
  message: string;
}

export interface OsAutonomousLearningDashboard {
  computed_at: string | null;
  storage_mode: string;
  ga4: Ga4DashboardStatus;
  outcomes_count: number;
  enriched_count: number;
  autonomy_pct: number | null;
  top_templates: LearningTemplateItem[];
  by_sector: LearningGroupItem[];
  by_service: LearningGroupItem[];
  trend_30d: LearningTrendPoint[];
  has_rankings_file: boolean;
}

const BASE = "/api/v1/os/autonomous/learning";

export const osAutonomousLearningApi = {
  dashboard: () => apiClient.get<OsAutonomousLearningDashboard>(BASE, { tenantScoped: true }),
};
