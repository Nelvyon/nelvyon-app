import type {
  ContactActivity,
  ContactListFilters,
  CreateActivityInput,
  CreateContactInput,
  PipelineSummaryItem,
  SaasCrmApiError,
  SaasCrmContact,
  UpdateContactInput,
} from "./types";
import type { ContactDetailResponse } from "@/features/saas-deals/types";

const fetchOpts: RequestInit = { credentials: "same-origin" };

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & SaasCrmApiError;
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return body;
}

function buildContactParams(filters: ContactListFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const saasCrmApi = {
  listContacts: async (filters: ContactListFilters = {}): Promise<{ contacts: SaasCrmContact[] }> => {
    const res = await fetch(`/api/saas/crm/contacts${buildContactParams(filters)}`, fetchOpts);
    return parseJson<{ contacts: SaasCrmContact[] }>(res);
  },

  getContact: async (contactId: string): Promise<ContactDetailResponse> => {
    const res = await fetch(`/api/saas/crm/contacts/${contactId}`, fetchOpts);
    return parseJson<ContactDetailResponse>(res);
  },

  createContact: async (input: CreateContactInput): Promise<{ contact: SaasCrmContact }> => {
    const res = await fetch("/api/saas/crm/contacts", {
      ...fetchOpts,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return parseJson<{ contact: SaasCrmContact }>(res);
  },

  updateContact: async (
    contactId: string,
    input: UpdateContactInput,
  ): Promise<{ contact: SaasCrmContact }> => {
    const res = await fetch(`/api/saas/crm/contacts/${contactId}`, {
      ...fetchOpts,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return parseJson<{ contact: SaasCrmContact }>(res);
  },

  deleteContact: async (contactId: string): Promise<{ ok: boolean }> => {
    const res = await fetch(`/api/saas/crm/contacts/${contactId}`, { ...fetchOpts, method: "DELETE" });
    return parseJson<{ ok: boolean }>(res);
  },

  getPipelineSummary: async (): Promise<{ pipeline: PipelineSummaryItem[] }> => {
    const res = await fetch("/api/saas/crm/pipeline", fetchOpts);
    return parseJson<{ pipeline: PipelineSummaryItem[] }>(res);
  },

  listActivities: async (contactId: string): Promise<{ activity: ContactActivity[] }> => {
    const res = await fetch(`/api/saas/crm/contacts/${contactId}/activities`, fetchOpts);
    return parseJson<{ activity: ContactActivity[] }>(res);
  },

  addActivity: async (
    contactId: string,
    input: CreateActivityInput,
  ): Promise<{ activity: ContactActivity }> => {
    const res = await fetch(`/api/saas/crm/contacts/${contactId}/activities`, {
      ...fetchOpts,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activityType: input.activityType,
        description: input.description,
        scheduledAt: input.scheduledAt ?? null,
        completed: input.completed ?? false,
      }),
    });
    return parseJson<{ activity: ContactActivity }>(res);
  },
};
