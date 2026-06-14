import { apiClient } from "@/core/api";

import type { StoreAnalytics, StoreProject, UnifiedEcommerceReporting } from "@/features/ecommerce/types";

const BFF = "/api/platform/ecommerce";

export const ecommerceApi = {
  list: () => apiClient.get<{ items: StoreProject[] }>(`${BFF}/projects`, { tenantScoped: true }),
  create: (store_info: Record<string, unknown>) =>
    apiClient.post<StoreProject>(`${BFF}/projects`, { tenantScoped: true, body: { store_info } }),
  get: (id: string) => apiClient.get<StoreProject>(`${BFF}/projects/${id}`, { tenantScoped: true }),
  generate: (id: string) =>
    apiClient.post<{ status: string }>(`${BFF}/projects/${id}/generate`, { tenantScoped: true }),
  publish: (id: string) =>
    apiClient.post<StoreProject>(`${BFF}/projects/${id}/publish`, { tenantScoped: true }),
  analytics: (id: string) =>
    apiClient.get<StoreAnalytics>(`${BFF}/projects/${id}/analytics`, { tenantScoped: true }),
  addProduct: (projectId: string, product: Record<string, unknown>) =>
    apiClient.post(`${BFF}/projects/${projectId}/products`, { tenantScoped: true, body: product }),
  deleteProduct: (projectId: string, productId: string) =>
    apiClient.delete(`${BFF}/projects/${projectId}/products/${productId}`, { tenantScoped: true }),
  unifiedReporting: () =>
    apiClient.get<UnifiedEcommerceReporting>(`${BFF}/reporting/unified`, { tenantScoped: true }),
};
