import type {
  ContactDetailResponse,
  CreateDealInput,
  DealListFilters,
  DealListResponse,
  DealMetricsResponse,
  DealResponse,
  SaasDealsApiError,
  UpdateDealInput,
} from "./types";
import type { DealStage } from "./types";

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & SaasDealsApiError;
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return body;
}

function buildListParams(filters: DealListFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.contact_id) params.set("contact_id", filters.contact_id);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.open_only) params.set("open_only", "true");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

const fetchOpts: RequestInit = { credentials: "same-origin" };

export const saasDealsApi = {
  list: async (filters: DealListFilters = {}): Promise<DealListResponse> => {
    const res = await fetch(`/api/saas/deals${buildListParams(filters)}`, fetchOpts);
    return parseJson<DealListResponse>(res);
  },

  getById: async (dealId: string): Promise<DealResponse> => {
    const res = await fetch(`/api/saas/deals/${dealId}`, fetchOpts);
    return parseJson<DealResponse>(res);
  },

  create: async (input: CreateDealInput): Promise<DealResponse> => {
    const res = await fetch("/api/saas/deals", {
      ...fetchOpts,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return parseJson<DealResponse>(res);
  },

  update: async (dealId: string, input: UpdateDealInput): Promise<DealResponse> => {
    const res = await fetch(`/api/saas/deals/${dealId}`, {
      ...fetchOpts,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return parseJson<DealResponse>(res);
  },

  delete: async (dealId: string): Promise<{ ok: boolean; id: string }> => {
    const res = await fetch(`/api/saas/deals/${dealId}`, { ...fetchOpts, method: "DELETE" });
    return parseJson<{ ok: boolean; id: string }>(res);
  },

  changeStage: async (dealId: string, stage: DealStage, probability?: number): Promise<DealResponse> => {
    const res = await fetch(`/api/saas/deals/${dealId}/stage`, {
      ...fetchOpts,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, ...(probability !== undefined ? { probability } : {}) }),
    });
    return parseJson<DealResponse>(res);
  },

  metrics: async (): Promise<DealMetricsResponse> => {
    const res = await fetch("/api/saas/deals/metrics", fetchOpts);
    return parseJson<DealMetricsResponse>(res);
  },

  getContactDetail: async (contactId: string): Promise<ContactDetailResponse> => {
    const res = await fetch(`/api/saas/crm/contacts/${contactId}`, fetchOpts);
    return parseJson<ContactDetailResponse>(res);
  },
};
