import { apiClient } from "@/core/api";
import {
  Client,
  ClientCreateInput,
  ClientListResponse,
  ClientUpdateInput,
} from "@/features/crm/types";

const BASE = "/api/v1/entities/nelvyon_clients";

export const crmApi = {
  list: () => apiClient.get<ClientListResponse>(BASE, { tenantScoped: true }),
  getById: (id: number) => apiClient.get<Client>(`${BASE}/${id}`, { tenantScoped: true }),
  create: (payload: ClientCreateInput) =>
    apiClient.post<Client, ClientCreateInput>(BASE, { tenantScoped: true, body: payload }),
  update: (id: number, payload: ClientUpdateInput) =>
    apiClient.put<Client, ClientUpdateInput>(`${BASE}/${id}`, { tenantScoped: true, body: payload }),
};
