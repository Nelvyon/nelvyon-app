import { apiClient } from "@/core/api";

export type ReportPeriod = "weekly" | "monthly";

export type ExecutiveReportRecord = {
  id: string;
  workspace_id: number;
  period: ReportPeriod;
  generated_at?: string;
  sent_at?: string;
  pdf_path?: string;
  recommendations?: string[];
};

export type ReportSchedule = {
  workspace_id: number;
  weekly_enabled: boolean;
  monthly_enabled: boolean;
  send_day_of_week: number;
  send_hour: number;
  send_minute: number;
  timezone: string;
  recipient_emails: string[];
  last_weekly_sent_at?: string;
  last_monthly_sent_at?: string;
};

export type ExecutiveMetrics = {
  period: string;
  period_label?: string;
  email?: { current?: Record<string, number>; comparison?: Record<string, number | null> };
  crm?: { current?: Record<string, number>; comparison?: Record<string, number | null> };
  web?: { current?: Record<string, number>; comparison?: Record<string, number | null> };
  social?: { current?: Record<string, number> };
  chatbot?: { current?: Record<string, number> };
  lead_scoring?: { distribution?: Record<string, number> };
  churn?: { at_risk_count?: number };
  recommendations?: string[];
  workspace?: { name?: string };
};

const BASE = "/api/reports";

export const executiveReportsApi = {
  history: () =>
    apiClient.get<{ items: ExecutiveReportRecord[]; count: number }>(
      `${BASE}/history?source=executive`,
      { tenantScoped: true },
    ),

  generate: (period: ReportPeriod) =>
    apiClient.post<{ report_id: string; metrics: ExecutiveMetrics }>(`${BASE}/generate`, {
      tenantScoped: true,
      body: { period },
    }),

  downloadUrl: (reportId: string) => `${BASE}/${reportId}/download`,

  preview: (period: ReportPeriod = "weekly") =>
    apiClient.get<{ period: string; metrics: ExecutiveMetrics }>(
      `${BASE}/executive/preview?period=${period}`,
      { tenantScoped: true },
    ),

  getSchedule: () =>
    apiClient.get<ReportSchedule>(`${BASE}/schedule`, { tenantScoped: true }),

  updateSchedule: (body: Partial<ReportSchedule>) =>
    apiClient.put<ReportSchedule>(`${BASE}/schedule`, { tenantScoped: true, body }),

  sendNow: (period: ReportPeriod, reportId?: string) =>
    apiClient.post<{ report_id: string; sent_to: string[] }>(`${BASE}/send-now`, {
      tenantScoped: true,
      body: { period, report_id: reportId },
    }),
};
