import { apiClient } from "@/core/api";
import {
  ActivityListResponse,
  CreateDealInput,
  CreateFollowUpInput,
  Deal,
  DealListResponse,
  DealUpdateInput,
  PipelineSummary,
} from "@/features/deals/types";

interface ListDealsQuery {
  stage?: string;
  owner?: string;
  clientId?: number;
  sort?: string;
  limit?: number;
}

function encodeQuery(query: Record<string, unknown>) {
  return encodeURIComponent(JSON.stringify(query));
}

const BASE = "/api/platform/crm/deals";

export const dealsApi = {
  list: (query: ListDealsQuery = {}) => {
    const params = new URLSearchParams();
    params.set("limit", String(query.limit ?? 100));
    params.set("sort", query.sort ?? "-updated_at");
    const q: Record<string, unknown> = {};
    if (query.stage && query.stage !== "all") q.stage = query.stage;
    if (query.owner && query.owner !== "all") q.assigned_to = query.owner;
    if (query.clientId != null && query.clientId > 0) q.client_id = query.clientId;
    if (Object.keys(q).length > 0) params.set("query", encodeQuery(q));
    return apiClient.get<DealListResponse>(`${BASE}?${params.toString()}`, { tenantScoped: true });
  },
  getById: (id: number) => apiClient.get<Deal>(`${BASE}/${id}`, { tenantScoped: true }),
  create: (body: CreateDealInput) =>
    apiClient.post<Deal, CreateDealInput>(BASE, { body, tenantScoped: true }),
  update: (id: number, body: DealUpdateInput) =>
    apiClient.put<Deal, DealUpdateInput>(`${BASE}/${id}`, { tenantScoped: true, body }),
  listFollowUps: (dealId: number) => {
    const query = encodeQuery({ deal_id: dealId });
    return apiClient.get<ActivityListResponse>(`/api/v1/entities/activities?query=${query}&sort=-created_at&limit=50`, {
      tenantScoped: true,
    });
  },
  createFollowUp: (dealId: number, payload: CreateFollowUpInput) =>
    apiClient.post<{ id: number }, Record<string, unknown>>("/api/v1/entities/activities", {
      tenantScoped: true,
      body: {
        deal_id: dealId,
        type: "follow_up",
        title: payload.title,
        due_date: payload.due_date,
        description: payload.description,
        is_completed: false,
      },
    }),
  pipelineSummary: () => apiClient.get<PipelineSummary>("/api/platform/crm/pipeline", { tenantScoped: true }),
};
