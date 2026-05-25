import { apiClient } from "@/core/api";

export type BenchmarkComparison = {
  sector: string;
  sector_label: string;
  comparisons: Array<{
    metric: string;
    client_value: number;
    industry_average: number;
    diff_percent: number;
    verdict: "better" | "worse";
  }>;
  summary: { overall: string };
};

export type LeadRankingItem = {
  contact_id: string;
  name: string;
  email: string;
  company?: string;
  score: number;
  tier: string;
  next_action?: string;
  reasons?: string[];
};

export type ChurnRisk = {
  workspace_id: number;
  risk_score: number;
  risk_level: string;
  reasons: string[];
  preventive_actions: string[];
  alert_active?: boolean;
};

export const analyticsIntelligenceApi = {
  listSectors: () => apiClient.get<{ items: { id: string; label: string }[] }>("/api/saas/benchmarks/sectors"),
  industry: (sector: string) =>
    apiClient.get<{ sector: string; label: string; metrics: Record<string, number> }>(
      `/api/saas/benchmarks/industry/${encodeURIComponent(sector)}`,
    ),
  compare: (body: Record<string, unknown>) =>
    apiClient.post<BenchmarkComparison>("/api/saas/benchmarks/compare", { tenantScoped: true, body }),
  scoreLead: (contactId: string) =>
    apiClient.post("/api/saas/leads/score", { tenantScoped: true, body: { contact_id: contactId } }),
  leadRanking: (limit = 50) =>
    apiClient.get<{ total: number; items: LeadRankingItem[] }>(`/api/saas/leads/ranking?limit=${limit}`, {
      tenantScoped: true,
    }),
  churnRisk: (workspaceId: number) =>
    apiClient.get<ChurnRisk>(`/api/saas/churn/risk/${workspaceId}`, { tenantScoped: true }),
  churnAtRisk: (threshold = 60) =>
    apiClient.get<{ total: number; items: ChurnRisk[] }>(`/api/saas/churn/at-risk?threshold=${threshold}`, {
      tenantScoped: true,
    }),
};
