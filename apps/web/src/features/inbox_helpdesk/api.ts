import { apiClient } from "@/core/api";
import {
  Ticket,
  TicketCreateInput,
  TicketListResponse,
  TicketUpdateInput,
} from "@/features/inbox_helpdesk/types";

const BASE = "/api/platform/inbox/tickets";

export const inboxApi = {
  list: () => apiClient.get<TicketListResponse>(BASE, { tenantScoped: true }),
  getById: (id: number) => apiClient.get<Ticket>(`${BASE}/${id}`, { tenantScoped: true }),
  create: (payload: TicketCreateInput) =>
    apiClient.post<Ticket, TicketCreateInput>(BASE, { tenantScoped: true, body: payload }),
  updateStatus: (id: number, payload: TicketUpdateInput) =>
    apiClient.put<Ticket, TicketUpdateInput>(`${BASE}/${id}`, { tenantScoped: true, body: payload }),
};
