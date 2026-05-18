import axios, { AxiosInstance } from 'axios';
import { getAPIBaseURL } from './config';
import { ACTIVE_WORKSPACE_STORAGE_KEY } from './workspaceStorage';

/** Tenant-scoped API paths: NelvyonAPI should send X-Workspace-Id when a real workspace is in storage. */
function urlNeedsTenantWorkspaceHeader(url: string): boolean {
  if (!url) return false;
  if (url.includes('/api/v1/workspace/list') || url.includes('/api/v1/workspace/create')) {
    return false;
  }
  const prefixes = [
    '/api/v1/entities/',
    '/api/v1/crm/',
    '/api/v1/pipeline/',
    '/api/v1/campaign-sender/',
    '/api/v1/workflow-engine/',
    '/api/v1/dashboard/',
    '/api/v1/onboarding/',
    '/api/v1/payment/',
    '/api/v1/billing/',
    '/api/v1/helpdesk/',
    '/api/v1/analytics/helpdesk',
  ];
  return prefixes.some((p) => url.includes(p));
}
import { createClient } from '@metagptx/web-sdk';

// ============ WEB SDK CLIENT ============
export const client = createClient();

// ============ TYPES ============

export interface NelvyonClient {
  id: number;
  user_id: string;
  business_name: string;
  sector: string;
  country?: string;
  city?: string;
  ideal_customer?: string;
  value_proposition?: string;
  differentiator?: string;
  services?: string;
  objectives?: string;
  brand_tone?: string;
  visual_style?: string;
  brand_colors?: string;
  logo_url?: string;
  competition?: string;
  testimonials?: string;
  case_studies?: string;
  budget?: string;
  language?: string;
  market?: string;
  website_url?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
  status?: string;
  created_at?: string;
}

export interface NelvyonProject {
  id: number;
  user_id: string;
  client_id: number;
  name: string;
  project_type: string;
  status?: string;
  progress?: number;
  brief?: string;
  deliverables?: string;
  deadline?: string;
  priority?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NelvyonOutput {
  id: number;
  user_id: string;
  project_id: number;
  client_id?: number;
  output_type: string;
  title?: string;
  content?: string;
  qa_score?: number;
  qa_status?: string;
  qa_feedback?: string;
  qa_attempts?: number;
  version?: number;
  extra_data?: string;
  created_at?: string;
}

export interface NelvyonAsset {
  id: number;
  user_id: string;
  client_id?: number;
  asset_type?: string;
  name?: string;
  url?: string;
  file_size?: number;
  metadata_json?: string;
  created_at?: string;
}

export interface NelvyonCampaign {
  id: number;
  user_id: string;
  client_id?: number;
  name?: string;
  campaign_type?: string;
  platform?: string;
  status?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  metrics_json?: string;
  content?: string;
  created_at?: string;
}

export interface NelvyonProduct {
  id: number;
  user_id: string;
  client_id?: number;
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  sku?: string;
  stock?: number;
  images_json?: string;
  created_at?: string;
}

// ============ NEW ENTITY TYPES ============

export interface PipelineDeal {
  id: number;
  user_id: string;
  name: string;
  company?: string;
  value?: number;
  probability?: number;
  stage: string;
  owner?: string;
  tags?: string;
  days_in_stage?: number;
  last_activity?: string;
  created_at?: string;
}

export interface CalendarEvent {
  id: number;
  user_id: string;
  title: string;
  client_name?: string;
  event_type?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  status?: string;
  channel?: string;
  notes?: string;
  created_at?: string;
}

export interface FormItem {
  id: number;
  user_id: string;
  name: string;
  form_type: string;
  status?: string;
  fields_count?: number;
  responses_count?: number;
  completion_rate?: number;
  conversion_rate?: number;
  avg_time_seconds?: number;
  fields_json?: string;
  ai_optimized?: boolean;
  created_at?: string;
}

export interface BlogPost {
  id: number;
  user_id: string;
  title: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  category?: string;
  tags?: string;
  status?: string;
  author?: string;
  featured_image?: string;
  seo_title?: string;
  seo_description?: string;
  views_count?: number;
  published_at?: string;
  created_at?: string;
}

export interface HelpdeskTicket {
  id: number;
  user_id: string;
  workspace_id?: number;
  subject: string;
  description?: string;
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: string;
  client_id?: number;
  client_name?: string;
  client_email?: string;
  channel?: string;
  resolution_notes?: string;
  satisfaction_score?: number;
  first_response_minutes?: number;
  created_at?: string;
  resolved_at?: string;
}

export interface ContractEntity {
  id: number;
  user_id: string;
  title: string;
  client_name?: string;
  client_email?: string;
  contract_type?: string;
  status?: string;
  content?: string;
  price?: string;
  currency?: string;
  duration?: string;
  start_date?: string;
  end_date?: string;
  language?: string;
  signature_data?: string;
  audit_trail?: string;
  project_id?: number;
  deal_id?: number;
  output_id?: number;
  template_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PartnerRecord {
  id: number;
  user_id: string;
  partner_name: string;
  company?: string;
  email?: string;
  tier?: string;
  status?: string;
  referrals_count?: number;
  conversions_count?: number;
  revenue_generated?: number;
  commission_rate?: number;
  commission_earned?: number;
  joined_at?: string;
  created_at?: string;
}

export interface FunnelItem {
  id: number;
  user_id: string;
  name: string;
  funnel_type?: string;
  status?: string;
  stages_count?: number;
  stages_json?: string;
  visitors?: number;
  leads?: number;
  conversions?: number;
  conversion_rate?: number;
  revenue?: number;
  created_at?: string;
}

export interface ReportItem {
  id: number;
  user_id: string;
  name: string;
  report_type?: string;
  status?: string;
  data_json?: string;
  metrics_json?: string;
  period?: string;
  generated_by?: string;
  created_at?: string;
}

export interface ConnectorConfig {
  id: number;
  user_id: string;
  connector_name: string;
  display_name?: string;
  status?: string;
  config_json?: string;
  last_sync_at?: string;
  sync_status?: string;
  events_count?: number;
  created_at?: string;
}

export interface SecurityEvent {
  id: number;
  user_id: string;
  event_type: string;
  severity?: string;
  source?: string;
  description?: string;
  status?: string;
  details_json?: string;
  created_at?: string;
}

export interface WebsiteItem {
  id: number;
  user_id: string;
  name: string;
  domain?: string;
  template?: string;
  status?: string;
  pages_count?: number;
  visits?: number;
  ssl_enabled?: boolean;
  seo_score?: number;
  performance_score?: number;
  created_at?: string;
}

export interface SalesRecord {
  id: number;
  user_id: string;
  client_name: string;
  product?: string;
  amount: number;
  currency?: string;
  status?: string;
  payment_method?: string;
  invoice_number?: string;
  notes?: string;
  closed_at?: string;
  created_at?: string;
}

// ============ EXISTING TYPES ============

export interface Deal {
  id: number;
  user_id: string;
  workspace_id?: number;
  contact_id?: number;
  title: string;
  value?: number;
  currency?: string;
  stage: string;
  pipeline?: string;
  probability?: number;
  expected_close?: string;
  assigned_to?: string;
  tags?: string;
  notes?: string;
  days_in_stage?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PipelineStageStats {
  stage: string;
  count: number;
  total_value: number;
  weighted_value: number;
  avg_days_in_stage: number;
}

export interface PipelineStatsResponse {
  stages: PipelineStageStats[];
  total_deals: number;
  total_value: number;
  weighted_value: number;
  win_rate: number;
}

export interface DealActivity {
  id: number;
  user_id: string;
  deal_id?: number;
  contact_id?: number;
  type: string;
  title: string;
  description?: string;
  is_completed?: boolean;
  due_date?: string;
  created_at?: string;
}

export interface StageChangeResponse {
  deal_id: number;
  old_stage: string;
  new_stage: string;
  activity_id: number;
  message: string;
}

export interface Conversation {
  id: number;
  user_id: string;
  workspace_id?: number;
  contact_id?: number;
  contact_name: string;
  channel: string;
  subject?: string;
  last_message?: string;
  last_message_at?: string;
  status?: string;
  unread_count?: number;
  priority?: string;
}

export interface Message {
  id: number;
  user_id: string;
  conversation_id: number;
  sender_type?: string;
  sender_name?: string;
  content: string;
  channel?: string;
  status?: string;
  created_at?: string;
}

export interface Workflow {
  id: number;
  user_id: string;
  workspace_id?: number;
  name: string;
  description?: string;
  trigger_type: string;
  nodes_json?: string;
  status?: string;
  runs_count?: number;
  last_run_at?: string;
  created_at?: string;
}

export interface Contact {
  id: number;
  user_id: string;
  workspace_id?: number;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  company_name?: string;
  tags?: string;
  status?: string;
  source?: string;
  score?: number;
  avatar_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Activity {
  id: number;
  user_id: string;
  workspace_id?: number;
  contact_id?: number;
  type: string;
  title: string;
  description?: string;
  is_completed?: boolean;
  due_date?: string;
  created_at?: string;
}

export interface Campaign {
  id: number;
  user_id: string;
  workspace_id?: number;
  name: string;
  type: string;
  status?: string;
  subject?: string;
  content?: string;
  recipients_count?: number;
  sent_count?: number;
  open_count?: number;
  click_count?: number;
  reply_count?: number;
  scheduled_at?: string;
  created_at?: string;
}

export interface CampaignRecipientSegmentFilters {
  status?: string;
  tags?: string;
  source?: string;
  score_min?: number;
  score_max?: number;
}

export interface QADashboardStats {
  total_outputs: number;
  passed: number;
  failed: number;
  pending: number;
  average_score: number;
  pass_rate: number;
}

export interface QAValidateResult {
  output_id: number;
  qa_score: number;
  qa_status: string;
  qa_feedback: string;
  qa_attempts: number;
  blocked: boolean;
  can_retry?: boolean;
  message?: string;
}

export interface GenerateResult {
  output_id: number;
  content: string;
  output_type: string;
  qa_status: string;
  qa_score?: number;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

// ============ DASHBOARD METRICS TYPES ============

export interface DashboardMetricsResponse {
  period: string;
  generated_at: string;
  source: string;
  error?: string;
  kpis: {
    contacts: { total: number; period: number };
    deals: {
      total: number; period: number;
      value_total: number; value_period: number;
      won: number; open: number;
      win_rate: number; avg_deal: number;
    };
    campaigns: {
      total: number; sent: number;
      opened: number; clicked: number;
      open_rate: number; click_rate: number;
    };
    conversations: { total: number; unread: number };
    helpdesk: {
      total: number; open: number;
      resolved: number; resolution_rate: number;
    };
    activities: { total: number; period: number };
    sales: {
      total_amount: number; period_amount: number;
      count: number; closed: number; avg_ticket: number;
    };
    funnels: {
      total: number; visitors: number;
      conversions: number; conversion_rate: number;
    };
    calendar: { upcoming: number };
    subscriptions: { active: number; mrr: number; arr: number };
  };
}

/** Resumen inicial del workspace (PRODUCT-ONBOARD-1 /api/v1/workspace/home-summary). */
export interface WorkspaceHomeSummaryResponse {
  workspace_id: number;
  workspace_name: string;
  generated_at: string;
  counts: {
    contacts: number;
    campaigns: number;
    deals_open: number;
    helpdesk_open: number;
  };
  first_steps: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    done: boolean;
  }>;
}

export interface ActivityFeedItem {
  id: number;
  type: string;
  title: string;
  description?: string;
  is_completed?: boolean;
  contact_id?: number;
  due_date?: string;
  created_at?: string;
}

export interface RevenueChartPoint {
  date: string;
  sales: number;
  deals: number;
  total: number;
}

export interface DealStageData {
  stage: string;
  count: number;
  value: number;
}

export interface RecentItem {
  type: string;
  title: string;
  subtitle?: string;
  status?: string;
  created_at?: string;
}

/** Resumen ejecutivo del workspace activo (/api/v1/global-dashboard/overview). */
export interface GlobalDashboardOverviewResponse {
  workspace_id: number | null;
  period: string;
  generated_at: string;
  revenue: {
    total_revenue: number;
    period_revenue: number;
    mrr: number;
    arr: number;
    avg_deal_value: number;
    revenue_growth_pct?: number;
  };
  pipeline: {
    total_deals: number;
    open_deals: number;
    won_deals: number;
    lost_deals: number;
    pipeline_value: number;
    win_rate: number;
  };
  tickets: {
    total_tickets: number;
    open_tickets: number;
    resolved_tickets: number;
  };
  campaigns: {
    total_campaigns: number;
    active_campaigns: number;
    total_sent: number;
    avg_open_rate: number;
    avg_click_rate: number;
  };
  contracts: {
    total_contracts: number;
    active_contracts: number;
    total_value: number;
  };
  account_health: {
    score: number;
    label: string;
    factors: Array<{ factor: string; score: number; status: string; tip?: string }>;
  };
  top_deals: Array<{
    title: string;
    value: number;
    stage: string;
    contact: string;
    created_at?: string | null;
  }>;
  recent_activities: Array<{
    type: string;
    description: string;
    entity_type: string;
    entity_id?: string | number;
    created_at?: string | null;
  }>;
  contracts_value_computable?: boolean;
  contracts_value_note?: string;
}

export interface GlobalDashboardModuleSummary {
  module: string;
  label: string;
  icon: string;
  primary_metric: string;
  primary_value: number;
  secondary_metric: string;
  secondary_value: number;
  status: string;
  scope?: string | null;
  scope_note?: string | null;
}

// ============ API CLIENT ============

class NelvyonAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    });
    this.client.interceptors.request.use((config) => {
      const url = config.url || '';
      if (!urlNeedsTenantWorkspaceHeader(url)) {
        return config;
      }
      if (typeof window === 'undefined') {
        return config;
      }
      try {
        const raw = window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
        if (!raw) {
          return config;
        }
        const id = parseInt(raw, 10);
        if (!Number.isFinite(id) || id <= 0) {
          return config;
        }
        const headers = (config.headers ?? {}) as Record<string, string>;
        if (!headers['X-Workspace-Id']) {
          headers['X-Workspace-Id'] = String(id);
        }
        config.headers = headers as typeof config.headers;
      } catch {
        /* ignore */
      }
      return config;
    });
  }

  private get base() {
    return getAPIBaseURL();
  }

  // --- Clients ---
  async getClients(skip = 0, limit = 50): Promise<ListResponse<NelvyonClient>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/nelvyon_clients`, { params: { skip, limit } });
    return data;
  }

  async getClient(id: number): Promise<NelvyonClient> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/nelvyon_clients/${id}`);
    return data;
  }

  async createClient(payload: Partial<NelvyonClient>): Promise<NelvyonClient> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/nelvyon_clients`, payload);
    return data;
  }

  async updateClient(id: number, payload: Partial<NelvyonClient>): Promise<NelvyonClient> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/nelvyon_clients/${id}`, payload);
    return data;
  }

  async deleteClient(id: number): Promise<void> {
    await this.client.delete(`${this.base}/api/v1/entities/nelvyon_clients/${id}`);
  }

  // --- Projects ---
  async getProjects(skip = 0, limit = 50): Promise<ListResponse<NelvyonProject>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/nelvyon_projects`, { params: { skip, limit } });
    return data;
  }

  async getProject(id: number): Promise<NelvyonProject> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/nelvyon_projects/${id}`);
    return data;
  }

  async createProject(payload: Partial<NelvyonProject>): Promise<NelvyonProject> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/nelvyon_projects`, payload);
    return data;
  }

  async updateProject(id: number, payload: Partial<NelvyonProject>): Promise<NelvyonProject> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/nelvyon_projects/${id}`, payload);
    return data;
  }

  async deleteProject(id: number): Promise<void> {
    await this.client.delete(`${this.base}/api/v1/entities/nelvyon_projects/${id}`);
  }

  // --- Outputs ---
  async getOutputs(skip = 0, limit = 100): Promise<ListResponse<NelvyonOutput>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/nelvyon_outputs`, { params: { skip, limit } });
    return data;
  }

  async getOutput(id: number): Promise<NelvyonOutput> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/nelvyon_outputs/${id}`);
    return data;
  }

  // --- Assets ---
  async getAssets(skip = 0, limit = 50): Promise<ListResponse<NelvyonAsset>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/nelvyon_assets`, { params: { skip, limit } });
    return data;
  }

  async createAsset(payload: Partial<NelvyonAsset>): Promise<NelvyonAsset> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/nelvyon_assets`, payload);
    return data;
  }

  async deleteAsset(id: number): Promise<void> {
    await this.client.delete(`${this.base}/api/v1/entities/nelvyon_assets/${id}`);
  }

  // --- Legacy Nelvyon Campaigns (non-official in Fase 1) ---
  /** @deprecated Use campaigns domain (`getEmailCampaigns`) as official operational path. */
  async getCampaigns(skip = 0, limit = 50): Promise<ListResponse<NelvyonCampaign>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/nelvyon_campaigns`, { params: { skip, limit } });
    return data;
  }

  /** @deprecated Use campaigns domain (`createEmailCampaign`) as official operational path. */
  async createCampaign(payload: Partial<NelvyonCampaign>): Promise<NelvyonCampaign> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/nelvyon_campaigns`, payload);
    return data;
  }

  /** @deprecated Use campaigns domain (`updateEmailCampaign`) as official operational path. */
  async updateCampaign(id: number, payload: Partial<NelvyonCampaign>): Promise<NelvyonCampaign> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/nelvyon_campaigns/${id}`, payload);
    return data;
  }

  /** @deprecated Use campaigns domain (`deleteEmailCampaign`) as official operational path. */
  async deleteCampaign(id: number): Promise<void> {
    await this.client.delete(`${this.base}/api/v1/entities/nelvyon_campaigns/${id}`);
  }

  // --- Official operational campaigns (campaigns entity) ---
  async getEmailCampaigns(skip = 0, limit = 50): Promise<ListResponse<Campaign>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/campaigns`, { params: { skip, limit } });
    return data;
  }

  async createEmailCampaign(payload: Partial<Campaign>): Promise<Campaign> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/campaigns`, payload);
    return data;
  }

  async updateEmailCampaign(id: number, payload: Partial<Campaign>): Promise<Campaign> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/campaigns/${id}`, payload);
    return data;
  }

  async deleteEmailCampaign(id: number): Promise<void> {
    await this.client.delete(`${this.base}/api/v1/entities/campaigns/${id}`);
  }

  // --- Workflows (entities) — workspace-scoped definitions ---
  async getWorkflows(skip = 0, limit = 100): Promise<ListResponse<Workflow>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/workflows`, { params: { skip, limit } });
    return data;
  }

  async getWorkflow(id: number): Promise<Workflow> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/workflows/${id}`);
    return data;
  }

  async createWorkflow(payload: {
    name: string;
    trigger_type: string;
    description?: string;
    trigger_config?: string;
    actions?: string;
    status?: string;
  }): Promise<Workflow> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/workflows`, payload);
    return data;
  }

  async updateWorkflow(id: number, payload: Partial<Workflow>): Promise<Workflow> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/workflows/${id}`, payload);
    return data;
  }

  // --- Products ---
  async getProducts(skip = 0, limit = 50): Promise<ListResponse<NelvyonProduct>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/nelvyon_products`, { params: { skip, limit } });
    return data;
  }

  async createProduct(payload: Partial<NelvyonProduct>): Promise<NelvyonProduct> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/nelvyon_products`, payload);
    return data;
  }

  // --- Orchestrator: ALL Generators ---
  async generateWeb(projectId: number): Promise<GenerateResult> {
    const { data } = await this.client.post(`${this.base}/api/v1/orchestrator/generate-web`, { project_id: projectId });
    return data;
  }

  async generateEcommerce(projectId: number): Promise<GenerateResult> {
    const { data } = await this.client.post(`${this.base}/api/v1/orchestrator/generate-ecommerce`, { project_id: projectId });
    return data;
  }

  async generateSocial(projectId: number, platforms?: string): Promise<GenerateResult> {
    const { data } = await this.client.post(`${this.base}/api/v1/orchestrator/generate-social`, { project_id: projectId, platforms });
    return data;
  }

  async generateAds(projectId: number, platforms?: string): Promise<GenerateResult> {
    const { data } = await this.client.post(`${this.base}/api/v1/orchestrator/generate-ads`, { project_id: projectId, platforms });
    return data;
  }

  async generateEmailMarketing(projectId: number): Promise<GenerateResult> {
    const { data } = await this.client.post(`${this.base}/api/v1/orchestrator/generate-email-marketing`, { project_id: projectId });
    return data;
  }

  async generateWorkflows(projectId: number): Promise<GenerateResult> {
    const { data } = await this.client.post(`${this.base}/api/v1/orchestrator/generate-workflows`, { project_id: projectId });
    return data;
  }

  async generateFunnel(projectId: number): Promise<GenerateResult> {
    const { data } = await this.client.post(`${this.base}/api/v1/orchestrator/generate-funnel`, { project_id: projectId });
    return data;
  }

  async generateBranding(projectId: number): Promise<GenerateResult> {
    const { data } = await this.client.post(`${this.base}/api/v1/orchestrator/generate-branding`, { project_id: projectId });
    return data;
  }

  async generateAudit(projectId: number): Promise<GenerateResult> {
    const { data } = await this.client.post(`${this.base}/api/v1/orchestrator/generate-audit`, { project_id: projectId });
    return data;
  }

  async generateProposal(projectId: number): Promise<GenerateResult> {
    const { data } = await this.client.post(`${this.base}/api/v1/orchestrator/generate-proposal`, { project_id: projectId });
    return data;
  }

  // --- QA Engine ---
  async validateOutput(outputId: number): Promise<QAValidateResult> {
    const { data } = await this.client.post(`${this.base}/api/v1/qa/validate`, { output_id: outputId });
    return data;
  }

  async getQADashboard(): Promise<QADashboardStats> {
    const { data } = await this.client.get(`${this.base}/api/v1/qa/dashboard`);
    return data;
  }

  // --- Agents (backend) ---
  async getAgents(skip = 0, limit = 50): Promise<ListResponse<Record<string, unknown>>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/nelvyon_agents`, { params: { skip, limit } });
    return data;
  }

  async createAgent(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/nelvyon_agents`, payload);
    return data;
  }

  async updateAgent(id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/nelvyon_agents/${id}`, payload);
    return data;
  }

  async deleteAgent(id: number): Promise<void> {
    await this.client.delete(`${this.base}/api/v1/entities/nelvyon_agents/${id}`);
  }

  // --- Bot Templates (backend) ---
  async getBotTemplates(skip = 0, limit = 50): Promise<ListResponse<Record<string, unknown>>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/nelvyon_bot_templates`, { params: { skip, limit } });
    return data;
  }

  async createBotTemplate(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/nelvyon_bot_templates`, payload);
    return data;
  }

  async updateBotTemplate(id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/nelvyon_bot_templates/${id}`, payload);
    return data;
  }

  // --- User Settings (backend) ---
  async getUserSettings(skip = 0, limit = 10): Promise<ListResponse<Record<string, unknown>>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/nelvyon_user_settings`, { params: { skip, limit } });
    return data;
  }

  async createUserSettings(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/nelvyon_user_settings`, payload);
    return data;
  }

  async updateUserSettings(id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/nelvyon_user_settings/${id}`, payload);
    return data;
  }

  // --- Quality Metrics (backend) ---
  async getQualityMetrics(skip = 0, limit = 100): Promise<ListResponse<Record<string, unknown>>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/nelvyon_quality_metrics`, { params: { skip, limit } });
    return data;
  }

  async updateQualityMetric(id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/nelvyon_quality_metrics/${id}`, payload);
    return data;
  }

  // --- Platform Metrics (backend) ---
  async getPlatformMetrics(skip = 0, limit = 200): Promise<ListResponse<Record<string, unknown>>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/platform_metrics`, { params: { skip, limit } });
    return data;
  }

  async createPlatformMetric(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/platform_metrics`, payload);
    return data;
  }

  // --- System Health (comprehensive) ---
  async getSystemHealth(): Promise<SystemHealthResponse> {
    const { data } = await this.client.get(`${this.base}/api/v1/system/health`);
    return data;
  }

  async trackMetric(payload: MetricTrackPayload): Promise<{ ok: boolean }> {
    try {
      const { data } = await this.client.post(`${this.base}/api/v1/system/metrics/track`, null, { params: payload });
      return data;
    } catch {
      return { ok: false };
    }
  }

  // --- Revenue Records (backend) ---
  async getRevenueRecords(skip = 0, limit = 100): Promise<ListResponse<Record<string, unknown>>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/revenue_records`, { params: { skip, limit } });
    return data;
  }

  async createRevenueRecord(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/revenue_records`, payload);
    return data;
  }

  // --- Presentation History (backend) ---
  async getPresentationHistory(skip = 0, limit = 50): Promise<ListResponse<Record<string, unknown>>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/presentation_history`, { params: { skip, limit } });
    return data;
  }

  async createPresentationHistory(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/presentation_history`, payload);
    return data;
  }

  // --- Segment Results (backend) ---
  async getSegmentResults(skip = 0, limit = 50): Promise<ListResponse<Record<string, unknown>>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/segment_results`, { params: { skip, limit } });
    return data;
  }

  async createSegmentResult(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/segment_results`, payload);
    return data;
  }

  // --- Partner Records (backend) ---
  async getPartnerRecords(skip = 0, limit = 100): Promise<ListResponse<PartnerRecord>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/partner_records`, { params: { skip, limit } });
    return data;
  }

  async createPartnerRecord(payload: Partial<PartnerRecord>): Promise<PartnerRecord> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/partner_records`, payload);
    return data;
  }

  // --- Sales Records (backend) ---
  async getSalesRecords(skip = 0, limit = 100): Promise<ListResponse<SalesRecord>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/sales_records`, { params: { skip, limit } });
    return data;
  }

  // --- Subscriptions (backend) ---
  async getSubscriptions(skip = 0, limit = 100): Promise<ListResponse<Record<string, unknown>>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/subscriptions`, { params: { skip, limit } });
    return data;
  }

  // --- Helpdesk SLA / lifecycle (X-Workspace-Id via interceptor; backend require_workspace) ---
  async helpdeskAssign(ticketId: number, assignedTo: string): Promise<Record<string, unknown>> {
    const { data } = await this.client.post(`${this.base}/api/v1/helpdesk/assign`, {
      ticket_id: ticketId,
      assigned_to: assignedTo,
    });
    return data;
  }

  async helpdeskTransition(
    ticketId: number,
    newStatus: string,
    resolutionNotes = "",
  ): Promise<Record<string, unknown>> {
    const { data } = await this.client.post(`${this.base}/api/v1/helpdesk/transition`, {
      ticket_id: ticketId,
      new_status: newStatus,
      resolution_notes: resolutionNotes,
    });
    return data;
  }

  async getHelpdeskSlaBreaches(): Promise<{
    total_open_tickets: number;
    breaches: Array<{
      ticket_id: number;
      subject?: string;
      type: string;
      priority: string;
      target_minutes: number;
      elapsed_minutes: number;
    }>;
    warnings: Array<{
      ticket_id: number;
      subject?: string;
      type: string;
      priority: string;
      target_minutes: number;
      elapsed_minutes: number;
    }>;
    breach_count: number;
    warning_count: number;
    checked_at: string;
  }> {
    const { data } = await this.client.get(`${this.base}/api/v1/helpdesk/sla-breaches`);
    return data;
  }

  // --- Helpdesk Tickets ---
  async getHelpdeskTickets(skip = 0, limit = 100): Promise<ListResponse<HelpdeskTicket>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/helpdesk_tickets`, { params: { skip, limit } });
    return data;
  }

  async createHelpdeskTicket(payload: Partial<HelpdeskTicket>): Promise<HelpdeskTicket> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/helpdesk_tickets`, payload);
    return data;
  }

  async updateHelpdeskTicket(id: number, payload: Partial<HelpdeskTicket>): Promise<HelpdeskTicket> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/helpdesk_tickets/${id}`, payload);
    return data;
  }

  async deleteHelpdeskTicket(id: number): Promise<void> {
    await this.client.delete(`${this.base}/api/v1/entities/helpdesk_tickets/${id}`);
  }

  // --- E2E Orchestrator v3 ---

  async propagateProjectStatus(projectId: number, newStatus: string): Promise<{
    project_id: number; new_status: string;
    effects: Array<{ module: string; action: string; affected_count: number; description: string }>;
    timestamp: string;
  }> {
    const { data } = await this.client.post(`${this.base}/api/v1/e2e/propagate-status`, {
      project_id: projectId, new_status: newStatus,
    });
    return data;
  }

  async createContractFromProject(projectId: number, opts?: {
    output_id?: number; title?: string; contract_type?: string;
    price?: string; duration?: string; language?: string;
  }): Promise<{
    contract_id: number; title: string; status: string;
    e2e_context: { client_id?: number; client_name?: string; project_id?: number; project_name?: string; output_id?: number };
    message: string;
  }> {
    const { data } = await this.client.post(`${this.base}/api/v1/e2e/contract-from-project`, {
      project_id: projectId,
      output_id: opts?.output_id,
      title: opts?.title,
      contract_type: opts?.contract_type || "servicio",
      price: opts?.price,
      duration: opts?.duration,
      language: opts?.language || "es",
    });
    return data;
  }

  async createSocialFromContract(contractId: number, opts?: {
    platform?: string; content?: string; campaign_name?: string; scheduled_at?: string;
  }): Promise<{
    social_post_id: number; contract_id: number; platform: string; status: string;
    e2e_context: { client_id?: number; project_id?: number; contract_id?: number; campaign_name?: string };
    message: string;
  }> {
    const { data } = await this.client.post(`${this.base}/api/v1/e2e/social-from-contract`, {
      contract_id: contractId,
      platform: opts?.platform || "instagram",
      content: opts?.content,
      campaign_name: opts?.campaign_name,
      scheduled_at: opts?.scheduled_at,
    });
    return data;
  }

  async createTicketFromSocial(socialPostId: number, opts?: {
    subject?: string; priority?: string; category?: string;
  }): Promise<{
    ticket_id: number; social_post_id: number; subject: string; status: string;
    e2e_context: { client_id?: number; client_name?: string; project_id?: number; campaign_name?: string };
    message: string;
  }> {
    const { data } = await this.client.post(`${this.base}/api/v1/e2e/social-to-ticket`, {
      social_post_id: socialPostId,
      subject: opts?.subject,
      priority: opts?.priority || "medium",
      category: opts?.category || "Técnico",
    });
    return data;
  }

  async createDealFromProject(projectId: number, opts?: {
    title?: string; value?: number; stage?: string;
  }): Promise<{
    deal_id: number; title: string; stage: string;
    e2e_context: { client_id?: number; project_id?: number; project_name?: string };
    message: string;
  }> {
    const { data } = await this.client.post(`${this.base}/api/v1/e2e/deal-from-project`, {
      project_id: projectId,
      title: opts?.title,
      value: opts?.value,
      stage: opts?.stage || "proposal",
    });
    return data;
  }

  async linkCrmClient(contactId: number, clientId: number): Promise<{
    contact_id: number; client_id: number;
    contact_name: string; client_name: string;
    message: string;
  }> {
    const { data } = await this.client.post(`${this.base}/api/v1/e2e/link-crm-client`, {
      contact_id: contactId, client_id: clientId,
    });
    return data;
  }

  async getProjectRelationships(projectId: number): Promise<{
    client_id?: number; client_name?: string;
    project_id?: number; project_name?: string; project_status?: string;
    outputs_count: number; assets_count: number; contracts_count: number;
    social_posts_count: number; tickets_count: number;
    deals_count: number; campaigns_count: number;
  }> {
    const { data } = await this.client.get(`${this.base}/api/v1/e2e/relationships/${projectId}`);
    return data;
  }

  async getFullChain(clientId: number): Promise<{
    client: Record<string, unknown> | null;
    projects: Array<Record<string, unknown>>;
    outputs: Array<Record<string, unknown>>;
    assets: Array<Record<string, unknown>>;
    contracts: Array<Record<string, unknown>>;
    social_posts: Array<Record<string, unknown>>;
    tickets: Array<Record<string, unknown>>;
    deals: Array<Record<string, unknown>>;
    campaigns: Array<Record<string, unknown>>;
    total_entities: number;
  }> {
    const { data } = await this.client.get(`${this.base}/api/v1/e2e/full-chain/${clientId}`);
    return data;
  }

  // --- Forms ---
  async getForms(skip = 0, limit = 100): Promise<ListResponse<FormItem>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/form_items`, { params: { skip, limit } });
    return data;
  }

  async createForm(payload: Partial<FormItem>): Promise<FormItem> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/form_items`, payload);
    return data;
  }

  async updateForm(id: number, payload: Partial<FormItem>): Promise<FormItem> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/form_items/${id}`, payload);
    return data;
  }

  async deleteForm(id: number): Promise<void> {
    await this.client.delete(`${this.base}/api/v1/entities/form_items/${id}`);
  }

  // --- Blog Posts ---
  async getBlogPosts(skip = 0, limit = 100): Promise<ListResponse<BlogPost>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/blog_posts`, { params: { skip, limit } });
    return data;
  }

  async createBlogPost(payload: Partial<BlogPost>): Promise<BlogPost> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/blog_posts`, payload);
    return data;
  }

  async updateBlogPost(id: number, payload: Partial<BlogPost>): Promise<BlogPost> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/blog_posts/${id}`, payload);
    return data;
  }

  async deleteBlogPost(id: number): Promise<void> {
    await this.client.delete(`${this.base}/api/v1/entities/blog_posts/${id}`);
  }

  // --- Security Events ---
  async getSecurityEvents(skip = 0, limit = 100): Promise<ListResponse<SecurityEvent>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/security_events`, { params: { skip, limit } });
    return data;
  }

  async createSecurityEvent(payload: Partial<SecurityEvent>): Promise<SecurityEvent> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/security_events`, payload);
    return data;
  }

  // --- Connector Configs ---
  async getConnectorConfigs(skip = 0, limit = 100): Promise<ListResponse<ConnectorConfig>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/connector_configs`, { params: { skip, limit } });
    return data;
  }

  async createConnectorConfig(payload: Partial<ConnectorConfig>): Promise<ConnectorConfig> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/connector_configs`, payload);
    return data;
  }

  async updateConnectorConfig(id: number, payload: Partial<ConnectorConfig>): Promise<ConnectorConfig> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/connector_configs/${id}`, payload);
    return data;
  }

  async deleteConnectorConfig(id: number): Promise<void> {
    await this.client.delete(`${this.base}/api/v1/entities/connector_configs/${id}`);
  }

  // --- Calendar Events ---
  async getCalendarEvents(skip = 0, limit = 200): Promise<ListResponse<CalendarEvent>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/calendar_events`, { params: { skip, limit } });
    return data;
  }

  async createCalendarEvent(payload: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/calendar_events`, payload);
    return data;
  }

  async updateCalendarEvent(id: number, payload: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/calendar_events/${id}`, payload);
    return data;
  }

  async deleteCalendarEvent(id: number): Promise<void> {
    await this.client.delete(`${this.base}/api/v1/entities/calendar_events/${id}`);
  }

  // --- User Roles (RBAC) ---
  async getUserRoles(skip = 0, limit = 100): Promise<ListResponse<Record<string, unknown>>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/user_roles`, { params: { skip, limit } });
    return data;
  }

  async getUserRoleByUserId(userId: string): Promise<Record<string, unknown> | null> {
    try {
      const { data } = await this.client.get(`${this.base}/api/v1/entities/user_roles`, {
        params: { skip: 0, limit: 1, user_id: userId },
      });
      return data.items?.[0] || null;
    } catch (err) { if (import.meta.env.DEV) console.warn("[api] Error:", err); return null; }
  }

  async createUserRole(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/user_roles`, payload);
    return data;
  }

  async updateUserRole(id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/user_roles/${id}`, payload);
    return data;
  }

  async deleteUserRole(id: number): Promise<void> {
    await this.client.delete(`${this.base}/api/v1/entities/user_roles/${id}`);
  }

  // ─── Workflow Engine ───

  async getWorkflowRules(skip = 0, limit = 50): Promise<{ items: WorkflowRule[]; total: number }> {
    const { data } = await this.client.get(`${this.base}/api/v1/workflow-engine/rules`, { params: { skip, limit } });
    return data;
  }

  async getWorkflowRule(id: number): Promise<WorkflowRule> {
    const { data } = await this.client.get(`${this.base}/api/v1/workflow-engine/rules/${id}`);
    return data;
  }

  async createWorkflowRule(payload: Omit<WorkflowRule, 'id' | 'user_id' | 'runs_count' | 'last_run_at' | 'created_at' | 'updated_at'>): Promise<WorkflowRule> {
    const { data } = await this.client.post(`${this.base}/api/v1/workflow-engine/rules`, payload);
    return data;
  }

  async updateWorkflowRule(id: number, payload: Partial<WorkflowRule>): Promise<WorkflowRule> {
    const { data } = await this.client.put(`${this.base}/api/v1/workflow-engine/rules/${id}`, payload);
    return data;
  }

  async deleteWorkflowRule(id: number): Promise<void> {
    await this.client.delete(`${this.base}/api/v1/workflow-engine/rules/${id}`);
  }

  async triggerWorkflow(triggerType: string, triggerData: Record<string, unknown> = {}): Promise<WorkflowTriggerResponse> {
    const { data } = await this.client.post(`${this.base}/api/v1/workflow-engine/trigger`, {
      trigger_type: triggerType, trigger_data: triggerData,
    });
    return data;
  }

  async executeWorkflowRule(ruleId: number, triggerData: Record<string, unknown> = {}): Promise<WorkflowExecutionResult> {
    const { data } = await this.client.post(`${this.base}/api/v1/workflow-engine/execute/${ruleId}`, triggerData);
    return data;
  }

  async getWorkflowExecutions(skip = 0, limit = 50): Promise<{ items: WorkflowExecution[]; total: number }> {
    const { data } = await this.client.get(`${this.base}/api/v1/workflow-engine/executions`, { params: { skip, limit } });
    return data;
  }

  async getCampaignWorkflowSummary(): Promise<CampaignWorkflowSummary> {
    const [rulesRes, execRes] = await Promise.all([
      this.getWorkflowRules(0, 200),
      this.getWorkflowExecutions(0, 100),
    ]);
    const rules = rulesRes.items || [];
    const campaignRelated = rules.filter(
      (r) =>
        r.action_type === "send_email" ||
        r.trigger_type === "contact_created" ||
        r.trigger_type === "deal_stage_changed"
    );
    const campaignRuleIds = new Set(campaignRelated.map((r) => r.id));
    const recentCampaignExecutions = (execRes.items || []).filter((e) =>
      campaignRuleIds.has(e.rule_id)
    );
    return {
      total_rules: rules.length,
      active_rules: rules.filter((r) => r.is_active).length,
      campaign_related_rules: campaignRelated.length,
      recent_campaign_related_executions: recentCampaignExecutions.length,
    };
  }

  // ─── Agent Actions ───

  async executeAgentAction(action: string, params: Record<string, unknown> = {}): Promise<AgentActionResponse> {
    const { data } = await this.client.post(`${this.base}/api/v1/agent-actions`, { action, params });
    return data;
  }

  // ─── Email Service ───

  async sendEmail(payload: { to_email: string; subject: string; body_html: string; to_name?: string; body_text?: string; email_type?: string }): Promise<{ email_id: number; status: string; to: string; message: string }> {
    const { data } = await this.client.post(`${this.base}/api/v1/email/send`, payload);
    return data;
  }

  async getEmailStats(): Promise<{ total: number; sent: number; pending: number; failed: number; sendgrid_configured: boolean }> {
    const { data } = await this.client.get(`${this.base}/api/v1/email/stats`);
    return data;
  }

  // ─── Campaign Sender ───
  async sendCampaignEmail(
    campaignId: number,
    segmentFilters?: CampaignRecipientSegmentFilters,
  ): Promise<{ campaign_id: number; status: string; recipients_count: number; sent_count: number; failed_count: number; sendgrid_configured: boolean; applied_filters?: CampaignRecipientSegmentFilters; error?: string }> {
    const { data } = await this.client.post(`${this.base}/api/v1/campaign-sender/send`, {
      campaign_id: campaignId,
      segment_filters: segmentFilters,
    });
    return data;
  }

  async previewCampaignRecipients(
    segmentFilters?: CampaignRecipientSegmentFilters,
  ): Promise<{
    total_recipients: number;
    applied_filters?: CampaignRecipientSegmentFilters;
    preview: { name: string; email: string; status?: string; source?: string; tags?: string; score?: number }[];
  }> {
    const { data } = await this.client.get(`${this.base}/api/v1/campaign-sender/preview-recipients`, {
      params: segmentFilters,
    });
    return data;
  }

  async getCampaignSendStats(campaignId: number): Promise<{ campaign_id: number; name: string; status: string; recipients_count: number; sent_count: number; open_count: number; click_count: number; open_rate: number; click_rate: number; reply_count: number }> {
    const { data } = await this.client.get(`${this.base}/api/v1/campaign-sender/stats/${campaignId}`);
    return data;
  }

  // ─── Conversation Realtime ───
  async sendConversationMessage(conversationId: number, content: string, senderType: string = "agent", senderName?: string): Promise<ConversationMessage> {
    const { data } = await this.client.post(`${this.base}/api/v1/conversations/${conversationId}/messages`, {
      content, sender_type: senderType, sender_name: senderName,
    });
    return data;
  }

  async getConversationMessages(conversationId: number, skip = 0, limit = 50): Promise<{ items: ConversationMessage[]; total: number; conversation_id: number }> {
    const { data } = await this.client.get(`${this.base}/api/v1/conversations/${conversationId}/messages`, { params: { skip, limit } });
    return data;
  }

  async markConversationRead(conversationId: number): Promise<void> {
    await this.client.post(`${this.base}/api/v1/conversations/${conversationId}/mark-read`);
  }

  async createConversationStreamToken(
    conversationId: number,
  ): Promise<{ stream_token: string; expires_in_seconds: number }> {
    const { data } = await this.client.post(
      `${this.base}/api/v1/conversations/${conversationId}/stream-token`,
    );
    return data;
  }

  getConversationStreamUrl(conversationId: number, streamToken: string): string {
    return `${this.base}/api/v1/conversations/${conversationId}/stream?stream_token=${encodeURIComponent(streamToken)}`;
  }

  // --- Funnel Publisher ---
  async publishFunnel(funnelId: number): Promise<{ funnel_id: number; status: string; pages_count: number; preview_url: string; public_url: string; published_at: string }> {
    const { data } = await this.client.post(`${this.base}/api/v1/funnels/publish`, { funnel_id: funnelId });
    return data;
  }

  getFunnelPreviewUrl(funnelId: number): string {
    return `${this.base}/api/v1/funnels/${funnelId}/preview`;
  }

  getFunnelPublicUrl(funnelId: number): string {
    return `${this.base}/api/v1/funnels/${funnelId}/public`;
  }

  async getFunnelData(funnelId: number): Promise<{ funnel_id: number; name: string; funnel_type?: string; status?: string; pages: any[]; published_at?: string }> {
    const { data } = await this.client.get(`${this.base}/api/v1/funnels/${funnelId}/data`);
    return data;
  }

  // ─── Dashboard Metrics (Real Aggregated Data) ───

  async getDashboardMetrics(period: string = "30d"): Promise<DashboardMetricsResponse> {
    const { data } = await this.client.get(`${this.base}/api/v1/dashboard/metrics`, { params: { period } });
    return data;
  }

  async getWorkspaceHomeSummary(): Promise<WorkspaceHomeSummaryResponse> {
    const { data } = await this.client.get(`${this.base}/api/v1/workspace/home-summary`);
    return data;
  }

  async getActivityFeed(limit: number = 20): Promise<{ items: ActivityFeedItem[]; total: number }> {
    const { data } = await this.client.get(`${this.base}/api/v1/dashboard/activity-feed`, { params: { limit } });
    return data;
  }

  async getRevenueChart(period: string = "30d"): Promise<{ period: string; data: RevenueChartPoint[] }> {
    const { data } = await this.client.get(`${this.base}/api/v1/dashboard/revenue-chart`, { params: { period } });
    return data;
  }

  async getDealsByStage(): Promise<{ stages: DealStageData[] }> {
    const { data } = await this.client.get(`${this.base}/api/v1/dashboard/deals-by-stage`);
    return data;
  }

  async getRecentItems(limit: number = 10): Promise<{ items: RecentItem[]; total: number }> {
    const { data } = await this.client.get(`${this.base}/api/v1/dashboard/recent-items`, { params: { limit } });
    return data;
  }

  /** Resumen ejecutivo del workspace seleccionado (X-Workspace-Id). */
  async getGlobalDashboardOverview(
    period: string = "30d",
  ): Promise<GlobalDashboardOverviewResponse> {
    const { data } = await this.client.get(`${this.base}/api/v1/global-dashboard/overview`, {
      params: { period },
    });
    return data;
  }

  async getGlobalDashboardModulesSummary(): Promise<GlobalDashboardModuleSummary[]> {
    const { data } = await this.client.get(`${this.base}/api/v1/global-dashboard/modules-summary`);
    return data;
  }

  // ─── Module Analytics (Real PostgreSQL) ───

  async getCRMAnalytics(period: string = "30d"): Promise<ModuleAnalyticsCRM> {
    const { data } = await this.client.get(`${this.base}/api/v1/analytics/crm`, { params: { period } });
    return data;
  }

  async getContractsAnalytics(period: string = "30d"): Promise<ModuleAnalyticsContracts> {
    const { data } = await this.client.get(`${this.base}/api/v1/analytics/contracts`, { params: { period } });
    return data;
  }

  async getSocialAnalytics(period: string = "30d"): Promise<ModuleAnalyticsSocial> {
    const { data } = await this.client.get(`${this.base}/api/v1/analytics/social`, { params: { period } });
    return data;
  }

  async getHelpdeskAnalytics(period: string = "30d"): Promise<ModuleAnalyticsHelpdesk> {
    const { data } = await this.client.get(`${this.base}/api/v1/analytics/helpdesk`, { params: { period } });
    return data;
  }

  async getAgentsAnalytics(): Promise<ModuleAnalyticsAgents> {
    const { data } = await this.client.get(`${this.base}/api/v1/analytics/agents`);
    return data;
  }

  // ─── CRM Advanced (Sprint 3) ───

  async crmSearch(params: {
    q?: string;
    /** Alias de `q` (búsqueda texto) para el UI de listas. */
    search?: string;
    status?: string; source?: string; company_name?: string;
    tags?: string; score_min?: number; score_max?: number;
    sort?: string; skip?: number; limit?: number;
  }): Promise<{ items: Contact[]; total: number; skip: number; limit: number }> {
    const { search, q, ...rest } = params;
    const query = { ...rest, q: q ?? search };
    const { data } = await this.client.get(`${this.base}/api/v1/crm/search`, { params: query });
    return data;
  }

  async crmImportCSV(rows: Record<string, unknown>[], skip_duplicates = true): Promise<{
    total_rows: number; imported: number; skipped_duplicates: number; errors: { row: number; error: string; data: unknown }[];
  }> {
    const { data } = await this.client.post(`${this.base}/api/v1/crm/import-csv`, { rows, skip_duplicates });
    return data;
  }

  async crmExport(params?: {
    status?: string; source?: string; company_name?: string; tags?: string; search?: string;
  }): Promise<{ items: Contact[]; total: number }> {
    const { data } = await this.client.get(`${this.base}/api/v1/crm/export`, { params });
    return data;
  }

  async crmFindDuplicates(): Promise<{
    email: string; count: number; contacts: Record<string, unknown>[];
  }[]> {
    const { data } = await this.client.get(`${this.base}/api/v1/crm/duplicates`);
    return data;
  }

  async crmMerge(primary_id: number, secondary_ids: number[]): Promise<{
    merged_contact_id: number; contacts_merged: number;
    deals_reassigned: number; activities_reassigned: number; conversations_reassigned: number;
  }> {
    const { data } = await this.client.post(`${this.base}/api/v1/crm/merge`, { primary_id, secondary_ids });
    return data;
  }

  async crmTimeline(contact_id: number): Promise<{
    contact_id: number; contact_name: string; contact_email: string;
    events: { id: number; event_type: string; title: string; description?: string; status?: string; value?: number; created_at?: string; extra?: Record<string, unknown> }[];
    total_events: number; deals_count: number; deals_total_value: number;
    activities_count: number; conversations_count: number;
  }> {
    const { data } = await this.client.get(`${this.base}/api/v1/crm/timeline/${contact_id}`);
    return data;
  }

  // ─── Contacts CRUD ───

  async getContacts(skip = 0, limit = 50): Promise<{ items: Contact[]; total: number }> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/contacts`, { params: { skip, limit } });
    return data;
  }

  async getContact(id: number): Promise<Contact> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/contacts/${id}`);
    return data;
  }

  async createContact(payload: Partial<Contact>): Promise<Contact> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/contacts`, payload);
    return data;
  }

  async updateContact(id: number, payload: Partial<Contact>): Promise<Contact> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/contacts/${id}`, payload);
    return data;
  }

  async deleteContact(id: number): Promise<void> {
    await this.client.delete(`${this.base}/api/v1/entities/contacts/${id}`);
  }

  // ─── Activities CRUD ───

  async getActivities(skip = 0, limit = 50): Promise<{ items: Activity[]; total: number }> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/activities`, { params: { skip, limit } });
    return data;
  }

  async createActivity(payload: Partial<Activity>): Promise<Activity> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/activities`, payload);
    return data;
  }

  // ─── Deals CRUD ───

  async getDeals(skip = 0, limit = 200, query?: Record<string, unknown>, sort?: string): Promise<{ items: Deal[]; total: number }> {
    const params: Record<string, unknown> = { skip, limit };
    if (query) params.query = JSON.stringify(query);
    if (sort) params.sort = sort;
    const { data } = await this.client.get(`${this.base}/api/v1/entities/deals`, { params });
    return data;
  }

  async getDeal(id: number): Promise<Deal> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/deals/${id}`);
    return data;
  }

  async createDeal(payload: Partial<Deal>): Promise<Deal> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/deals`, payload);
    return data;
  }

  async updateDeal(id: number, payload: Partial<Deal>): Promise<Deal> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/deals/${id}`, payload);
    return data;
  }

  async deleteDeal(id: number): Promise<void> {
    await this.client.delete(`${this.base}/api/v1/entities/deals/${id}`);
  }

  // ─── Pipeline Pro (Sprint 4) ───

  async getPipelineStats(): Promise<PipelineStatsResponse> {
    const { data } = await this.client.get(`${this.base}/api/v1/pipeline/stats`);
    return data;
  }

  async getDealActivities(dealId: number, skip = 0, limit = 50): Promise<{ items: DealActivity[]; total: number }> {
    const { data } = await this.client.get(`${this.base}/api/v1/pipeline/deals/${dealId}/activities`, { params: { skip, limit } });
    return data;
  }

  async createDealActivity(dealId: number, payload: { type: string; title: string; description?: string; due_date?: string; is_completed?: boolean; contact_id?: number }): Promise<DealActivity> {
    const { data } = await this.client.post(`${this.base}/api/v1/pipeline/deals/${dealId}/activities`, payload);
    return data;
  }

  async changeDealStage(dealId: number, newStage: string, notes?: string): Promise<StageChangeResponse> {
    const { data } = await this.client.post(`${this.base}/api/v1/pipeline/deals/${dealId}/stage-change`, { new_stage: newStage, notes });
    return data;
  }

  async toggleDealActivity(activityId: number): Promise<DealActivity> {
    const { data } = await this.client.put(`${this.base}/api/v1/pipeline/activities/${activityId}/toggle`);
    return data;
  }

  // ─── Unified Audit Log ───

  async createAuditEntry(entry: {
    event_type: string;
    severity?: string;
    source?: string;
    description?: string;
    details_json?: string;
  }): Promise<AuditLogEntry> {
    const { data } = await this.client.post(`${this.base}/api/v1/audit/log`, entry);
    return data;
  }

  async getAuditLogs(params?: {
    source?: string;
    severity?: string;
    event_type?: string;
    skip?: number;
    limit?: number;
  }): Promise<ListResponse<AuditLogEntry>> {
    const { data } = await this.client.get(`${this.base}/api/v1/audit/logs`, { params });
    return data;
  }

  async getAuditStats(): Promise<AuditStatsResponse> {
    const { data } = await this.client.get(`${this.base}/api/v1/audit/stats`);
    return data;
  }

  // ─── RBAC Management ───

  async getRBACRoleDefinitions(): Promise<RoleDefinitionResponse[]> {
    const { data } = await this.client.get(`${this.base}/api/v1/rbac/roles`);
    return data;
  }

  async getMyRole(): Promise<MyRoleResponse> {
    const { data } = await this.client.get(`${this.base}/api/v1/rbac/my-role`);
    return data;
  }

  async getRBACAssignments(skip = 0, limit = 50): Promise<{ items: RBACAssignment[]; total: number }> {
    const { data } = await this.client.get(`${this.base}/api/v1/rbac/assignments`, { params: { skip, limit } });
    return data;
  }

  async assignRole(payload: {
    target_user_id: string;
    target_email?: string;
    role: string;
    permissions_json?: string;
  }): Promise<RBACAssignment> {
    const { data } = await this.client.post(`${this.base}/api/v1/rbac/assign`, payload);
    return data;
  }

  async revokeRole(targetUserId: string): Promise<{ message: string }> {
    const { data } = await this.client.delete(`${this.base}/api/v1/rbac/revoke/${targetUserId}`);
    return data;
  }

  // ─── Platform Settings ───

  async getPlatformSettings(): Promise<PlatformSettings> {
    const { data } = await this.client.get(`${this.base}/api/v1/platform-settings`);
    return data;
  }

  async updatePlatformSettings(payload: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const { data } = await this.client.put(`${this.base}/api/v1/platform-settings`, payload);
    return data;
  }

  // ─── Contracts CRUD (Real PostgreSQL) ───

  async getContracts(skip = 0, limit = 100): Promise<ListResponse<ContractEntity>> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/contracts`, { params: { skip, limit } });
    return data;
  }

  async getContract(id: number): Promise<ContractEntity> {
    const { data } = await this.client.get(`${this.base}/api/v1/entities/contracts/${id}`);
    return data;
  }

  async createContract(payload: Partial<ContractEntity>): Promise<ContractEntity> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/contracts`, payload);
    return data;
  }

  async updateContract(id: number, payload: Partial<ContractEntity>): Promise<ContractEntity> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/contracts/${id}`, payload);
    return data;
  }

  async deleteContract(id: number): Promise<void> {
    await this.client.delete(`${this.base}/api/v1/entities/contracts/${id}`);
  }

  async signContract(id: number, signatureData: string): Promise<ContractEntity> {
    const { data } = await this.client.put(`${this.base}/api/v1/entities/contracts/${id}`, {
      status: "signed",
      signature_data: signatureData,
      audit_trail: JSON.stringify([
        { action: "signed", timestamp: new Date().toISOString(), user: "current" },
      ]),
    });
    return data;
  }

  // ─── Contract Logs (Real PostgreSQL) ───

  async getContractLogs(contractId?: number, skip = 0, limit = 100): Promise<ListResponse<Record<string, unknown>>> {
    const params: Record<string, unknown> = { skip, limit };
    if (contractId) params.contract_id = contractId;
    const { data } = await this.client.get(`${this.base}/api/v1/entities/contract_logs`, { params });
    return data;
  }

  async createContractLog(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.client.post(`${this.base}/api/v1/entities/contract_logs`, payload);
    return data;
  }

  // ─── Notifications (Polling-based, SSE-ready) ───

  async getNotifications(params?: Record<string, string>): Promise<{ items: Array<{ id: string; type: string; title: string; message: string; read: boolean; timestamp: string; metadata?: Record<string, unknown> }> }> {
    try {
      const { data } = await this.client.get(`${this.base}/api/v1/notifications`, { params });
      return data;
    } catch {
      // Notifications endpoint may not exist yet — graceful fallback
      return { items: [] };
    }
  }

  async markNotificationRead(id: string): Promise<void> {
    try {
      await this.client.put(`${this.base}/api/v1/notifications/${id}/read`);
    } catch {
      // Silent fail
    }
  }

  async markAllNotificationsRead(): Promise<void> {
    try {
      await this.client.put(`${this.base}/api/v1/notifications/read-all`);
    } catch {
      // Silent fail
    }
  }

  // ─── Billing & Usage (Real backend) ───

  async getBillingUsage(): Promise<{ meters: BillingUsageMeter[]; updated_at: string; plan_id?: string; plan_label?: string }> {
    try {
      const { data } = await this.client.get(`${this.base}/api/v1/billing/usage`);
      return data;
    } catch {
      return { meters: [], updated_at: new Date().toISOString() };
    }
  }

  async getBillingInvoices(): Promise<{ invoices: BillingInvoice[]; total_paid: number; currency: string }> {
    try {
      const { data } = await this.client.get(`${this.base}/api/v1/billing/invoices`);
      return data;
    } catch {
      return { invoices: [], total_paid: 0, currency: "EUR" };
    }
  }

  async getBillingSummary(): Promise<BillingSummary> {
    try {
      const { data } = await this.client.get(`${this.base}/api/v1/billing/summary`);
      return data;
    } catch {
      return {
        plan_id: "free", plan_label: "Free", billing_cycle: "monthly",
        next_billing_date: null, monthly_cost: 0, usage_alerts: 0,
        meters_at_risk: [], total_paid_ytd: 0, currency: "EUR",
      };
    }
  }

  async configureUsageAlert(meterId: string, thresholdPct: number = 80): Promise<{ meter_id: string; threshold_pct: number; status: string; message: string }> {
    const { data } = await this.client.post(`${this.base}/api/v1/billing/alerts`, {
      meter_id: meterId, threshold_pct: thresholdPct,
    });
    return data;
  }

  /** Stripe Checkout (subscription); sends X-Workspace-Id via interceptor when workspace is selected. */
  async createPaymentSession(payload: {
    plan_id: string;
    billing_cycle: string;
    promo_code?: string;
    success_url: string;
    cancel_url: string;
  }): Promise<{ session_id: string; url: string; amount: number; currency: string }> {
    const { data } = await this.client.post(`${this.base}/api/v1/payment/create_payment_session`, payload);
    return data;
  }

  /** Active subscription for current billing workspace (requires X-Workspace-Id). */
  async getPaymentActiveSubscription(): Promise<{
    has_subscription: boolean;
    plan_id?: string;
    billing_cycle?: string;
    status?: string;
    amount_paid?: number;
    started_at?: string;
    expires_at?: string;
    current_period_start?: string;
    current_period_end?: string;
  }> {
    const { data } = await this.client.get(`${this.base}/api/v1/payment/active_subscription`);
    return data;
  }

  /** Verify Stripe Checkout session after redirect; workspace-scoped. */
  async verifyPaymentSession(sessionId: string): Promise<{
    status: string;
    plan_id?: string;
    billing_cycle?: string;
    payment_status: string;
    subscription_id?: number | null;
  }> {
    const { data } = await this.client.post(`${this.base}/api/v1/payment/verify_payment`, {
      session_id: sessionId,
    });
    return data;
  }

  // ─── Onboarding (X-Workspace-Id via interceptor for progress / complete / seed) ───

  async getOnboardingSteps(): Promise<{
    steps: Array<{
      key: string;
      title: string;
      description: string;
      icon: string;
      order: number;
      category: string;
    }>;
  }> {
    const { data } = await this.client.get(`${this.base}/api/v1/onboarding/steps`);
    return data;
  }

  async getOnboardingProgress(): Promise<{
    workspace_id: number;
    user_id: string;
    steps: Array<{
      key: string;
      title: string;
      description: string;
      icon: string;
      order: number;
      category: string;
      completed: boolean;
      completed_at: string | null;
    }>;
    completed_count: number;
    total_count: number;
    progress_percent: number;
    is_complete: boolean;
  }> {
    const { data } = await this.client.get(`${this.base}/api/v1/onboarding/progress`);
    return data;
  }

  async completeOnboardingStep(stepKey: string, extra?: Record<string, unknown>): Promise<unknown> {
    const body: { step_key: string; data?: Record<string, unknown> } = { step_key: stepKey };
    if (extra !== undefined) body.data = extra;
    const { data: res } = await this.client.post(`${this.base}/api/v1/onboarding/complete-step`, body);
    return res;
  }

  async seedOnboardingDemo(modules: string[] = ['contacts', 'deals', 'campaigns']): Promise<{
    message?: string;
    seeded?: Record<string, number>;
    workspace_id?: number;
  }> {
    const { data } = await this.client.post(`${this.base}/api/v1/onboarding/seed-demo`, { modules });
    return data;
  }
}

export interface ConversationMessage {
  id: number;
  conversation_id: number;
  sender_type?: string;
  sender_name?: string;
  content: string;
  channel?: string;
  status?: string;
  created_at?: string;
}

// ─── Workflow Engine Types ───

export interface WorkflowRule {
  id: number;
  user_id: string;
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config?: string;
  action_type: string;
  action_config?: string;
  is_active: boolean;
  runs_count: number;
  last_run_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowExecution {
  id: number;
  user_id: string;
  rule_id: number;
  rule_name?: string;
  trigger_type: string;
  trigger_data?: string;
  action_type: string;
  action_result?: string;
  status: string;
  error_message?: string;
  executed_at?: string;
}

export interface WorkflowExecutionResult {
  rule_id: number;
  rule_name: string;
  action_type: string;
  status: string;
  result: Record<string, unknown>;
  error?: string;
}

export interface WorkflowTriggerResponse {
  triggered: number;
  executions: WorkflowExecutionResult[];
}

export interface CampaignWorkflowSummary {
  total_rules: number;
  active_rules: number;
  campaign_related_rules: number;
  recent_campaign_related_executions: number;
}

export interface AgentActionResponse {
  success: boolean;
  action: string;
  message: string;
  data: Record<string, unknown>;
}

// ─── Audit Log Types ───

export interface AuditLogEntry {
  id: number;
  user_id: string;
  event_type: string;
  severity?: string;
  source?: string;
  description?: string;
  details_json?: string;
  created_at?: string;
}

export interface AuditStatsResponse {
  total_events: number;
  by_severity: Record<string, number>;
  by_source: Record<string, number>;
  by_event_type: Record<string, number>;
  recent_critical: AuditLogEntry[];
}

// ─── RBAC Management Types ───

export interface RoleDefinitionResponse {
  role: string;
  level: number;
  label: string;
  description: string;
  default_permissions: string[];
}

export interface MyRoleResponse {
  role: string;
  permissions: string[];
  role_record_id?: number;
  assigned_by?: string;
}

export interface RBACAssignment {
  id: number;
  user_id: string;
  email?: string;
  role: string;
  permissions_json?: string;
  assigned_by?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ─── Platform Settings Types ───

export interface PlatformSettings {
  company_name: string;
  company_logo_url: string;
  timezone: string;
  language: string;
  currency: string;
  session_timeout_minutes: number;
  enforce_2fa: boolean;
  ip_whitelist: string;
  max_login_attempts: number;
  default_role_new_users: string;
  notification_global_enabled: boolean;
  maintenance_mode: boolean;
  custom_branding_json: string;
}

// ─── Module Analytics Types ───

export interface DeltaMetric {
  current: number;
  previous: number;
  delta_pct: number;
}

export interface ModuleAnalyticsCRM {
  module: string;
  period: string;
  generated_at: string;
  source: string;
  error?: string;
  kpis: {
    contacts_total: number;
    contacts_new: DeltaMetric;
    avg_score: number;
    deals_total: number;
    deals_new: DeltaMetric;
    deals_value: DeltaMetric;
    win_rate: number;
    deals_won: number;
    deals_lost: number;
    activities: DeltaMetric;
  };
  charts: {
    contacts_by_source: { source: string; count: number }[];
    contacts_by_status: { status: string; count: number }[];
    deals_by_stage: { stage: string; count: number; value: number }[];
    contacts_trend: { date: string; count: number }[];
  };
}

export interface ModuleAnalyticsContracts {
  module: string;
  period: string;
  generated_at: string;
  source: string;
  error?: string;
  kpis: {
    total: number;
    new: DeltaMetric;
    active: number;
    draft: number;
    expired: number;
    unique_clients: number;
    active_rate: number;
  };
  charts: {
    by_type: { type: string; count: number }[];
    by_status: { status: string; count: number }[];
    trend: { date: string; count: number }[];
  };
}

export interface ModuleAnalyticsSocial {
  module: string;
  period: string;
  generated_at: string;
  source: string;
  error?: string;
  kpis: {
    total_posts: number;
    new_posts: DeltaMetric;
    published: number;
    scheduled: number;
    failed: number;
    impressions: DeltaMetric;
    impressions_total: number;
    clicks: number;
    likes: number;
    comments: number;
    shares: number;
    engagement_rate: number;
  };
  charts: {
    by_platform: { platform: string; count: number; impressions: number; likes: number; clicks: number }[];
    trend: { date: string; posts: number; impressions: number }[];
  };
}

export interface ModuleAnalyticsHelpdesk {
  module: string;
  period: string;
  workspace_id?: number;
  generated_at: string;
  source: string;
  error?: string;
  kpis: {
    total: number;
    new_tickets: DeltaMetric;
    open: number;
    resolved: DeltaMetric;
    resolved_total: number;
    resolution_rate: number;
    avg_satisfaction: number;
    avg_first_response_min: number;
  };
  charts: {
    by_priority: { priority: string; count: number }[];
    by_category: { category: string; count: number }[];
    by_channel: { channel: string; count: number }[];
    trend: { date: string; opened: number; resolved: number }[];
  };
}

export interface ModuleAnalyticsAgents {
  module: string;
  generated_at: string;
  source: string;
  error?: string;
  kpis: {
    total: number;
    active: number;
    idle: number;
    error: number;
    avg_success_rate: number;
    total_tasks_completed: number;
    tasks_today: number;
    uptime_rate: number;
  };
  charts: {
    by_status: { status: string; count: number }[];
    top_agents: { name: string; agent_id: string; status: string; tasks_completed: number; success_rate: number }[];
  };
}

// ─── System Health Types ───

export interface SystemHealthServiceTable {
  table: string;
  rows: number;
}

export interface SystemHealthService {
  name: string;
  route: string;
  status: "operational" | "degraded" | "error";
  tables: SystemHealthServiceTable[];
  endpoints: string[];
}

export interface SystemHealthLastHour {
  total_requests: number;
  successes: number;
  success_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  ai_calls: number;
}

export interface SystemHealthResponse {
  status: "healthy" | "degraded" | "critical";
  timestamp: string;
  uptime_seconds: number;
  database: {
    status: "connected" | "disconnected" | "unknown";
    latency_ms: number;
    tables: Record<string, number>;
    tables_ok: number;
    tables_error: number;
    error?: string;
  };
  services: SystemHealthService[];
  summary: {
    last_hour?: SystemHealthLastHour;
  };
  check_duration_ms: number;
}

export interface MetricTrackPayload {
  metric_type?: string;
  module_name?: string;
  endpoint?: string;
  latency_ms?: number;
  status?: string;
  status_code?: number;
  is_ai?: boolean;
  user_id?: string;
}

// ─── Billing Usage Types ───

export interface BillingUsageMeter {
  id: string;
  label: string;
  current: number;
  limit: number;
  unit: string;
  color: string;
  overage_rate: number | null;
  percentage?: number;
  status?: "normal" | "warning" | "critical" | "exceeded";
}

export interface BillingInvoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "overdue" | "draft";
  plan: string;
  period: string;
  pdf_url: string;
}

export interface BillingSummary {
  plan_id: string;
  plan_label: string;
  billing_cycle: string;
  next_billing_date: string | null;
  monthly_cost: number;
  usage_alerts: number;
  meters_at_risk: string[];
  total_paid_ytd: number;
  currency: string;
}

/**
 * Mensaje legible desde respuestas FastAPI (detail string o lista de validación).
 */
export function getApiErrorMessage(error: unknown, fallback = 'Error en la solicitud'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: unknown } | undefined;
    const d = data?.detail;
    if (typeof d === 'string' && d.trim()) return d.trim();
    if (Array.isArray(d)) {
      const parts = d.map((item: unknown) => {
        if (typeof item === 'object' && item !== null && 'msg' in item) {
          return String((item as { msg?: string }).msg ?? '');
        }
        return typeof item === 'string' ? item : JSON.stringify(item);
      }).filter(Boolean);
      if (parts.length) return parts.join('; ');
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export const api = new NelvyonAPI();