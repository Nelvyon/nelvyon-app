export type DealStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

export type ActivityType = "note" | "call" | "email" | "meeting" | "task";

export interface SaasDeal {
  id: string;
  tenantId: string;
  contactId: string | null;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expectedCloseDate: string | null;
  source: string | null;
  ownerUserId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealListFilters {
  stage?: DealStage;
  contact_id?: string;
  search?: string;
  open_only?: boolean;
}

export interface CreateDealInput {
  title: string;
  contact_id?: string | null;
  value?: number;
  currency?: string;
  stage?: DealStage;
  probability?: number;
  expected_close_date?: string | null;
  source?: string | null;
  owner_user_id?: string | null;
  notes?: string | null;
}

export type UpdateDealInput = Partial<CreateDealInput>;

export interface StageMetricsItem {
  stage: DealStage;
  count: number;
  totalValue: number;
  conversionToWonPct: number | null;
}

export interface SaasDealsMetrics {
  openCount: number;
  wonCount: number;
  lostCount: number;
  pipelineValue: number;
  wonValue: number;
  forecastValue: number;
  currency: string;
  byStage: StageMetricsItem[];
}

export interface ContactActivity {
  id: string;
  contactId: string;
  tenantId: string;
  activityType: ActivityType;
  description: string;
  scheduledAt: string | null;
  completed: boolean;
  createdAt: string;
}

export interface ContactDealsContext {
  deals: SaasDeal[];
  dealCount: number;
  totalValue: number;
  primaryStage: DealStage | null;
  recentActivities: ContactActivity[];
}

export type ContactStatus = "lead" | "prospect" | "client" | "churned";

export interface SaasContactDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  status: ContactStatus;
  pipelineStage: DealStage;
  value: number;
  notes: string | null;
  tags?: string[];
}

export interface DealListResponse {
  deals: SaasDeal[];
  total: number;
}

export interface DealResponse {
  deal: SaasDeal;
}

export interface DealMetricsResponse {
  metrics: SaasDealsMetrics;
}

export interface ContactDetailResponse {
  contact: SaasContactDetail;
  dealsContext: ContactDealsContext | null;
}

export interface SaasDealsApiError {
  error: string;
  code?: string;
}
