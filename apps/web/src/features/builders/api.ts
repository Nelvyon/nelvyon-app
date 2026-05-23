import { apiClient } from "@/core/api";
import type { ChatConversation, Funnel, LandingPage, StoreProject, WebProject } from "@/features/builders/types";

export const osWebApi = {
  list: () => apiClient.get<{ items: WebProject[] }>("/api/os/web/projects", { tenantScoped: true }),
  get: (id: string) => apiClient.get<WebProject>(`/api/os/web/projects/${id}`, { tenantScoped: true }),
  create: (business_info: Record<string, unknown>) =>
    apiClient.post<WebProject>("/api/os/web/projects", { tenantScoped: true, body: { business_info } }),
  generate: (id: string) =>
    apiClient.post<{ status: string }>(`/api/os/web/projects/${id}/generate`, { tenantScoped: true }),
  publish: (id: string) =>
    apiClient.post<WebProject>(`/api/os/web/projects/${id}/publish`, { tenantScoped: true }),
  templates: () =>
    apiClient.get<{ templates: { id: string; name: string; category: string; thumbnail_url?: string }[] }>(
      "/api/os/web/templates",
      { tenantScoped: true },
    ),
  fromTemplate: (templateId: string, business_info?: Record<string, unknown>) =>
    apiClient.post<WebProject>(`/api/os/web/projects/from-template/${templateId}`, {
      tenantScoped: true,
      body: { business_info },
    }),
  updatePage: (projectId: string, pageId: string, new_content: Record<string, unknown>) =>
    apiClient.put<WebProject>(`/api/os/web/projects/${projectId}/pages/${pageId}`, {
      tenantScoped: true,
      body: { new_content },
    }),
  addPage: (projectId: string, page_type: string) =>
    apiClient.post<WebProject>(`/api/os/web/projects/${projectId}/pages`, {
      tenantScoped: true,
      body: { page_type },
    }),
};

export const osStoreApi = {
  list: () => apiClient.get<{ items: StoreProject[] }>("/api/os/store/projects", { tenantScoped: true }),
  get: (id: string) => apiClient.get<StoreProject>(`/api/os/store/projects/${id}`, { tenantScoped: true }),
  create: (store_info: Record<string, unknown>) =>
    apiClient.post<StoreProject>("/api/os/store/projects", { tenantScoped: true, body: { store_info } }),
  generate: (id: string) =>
    apiClient.post<{ status: string }>(`/api/os/store/projects/${id}/generate`, { tenantScoped: true }),
  publish: (id: string) =>
    apiClient.post<StoreProject>(`/api/os/store/projects/${id}/publish`, { tenantScoped: true }),
  templates: () =>
    apiClient.get<{ templates: { id: string; name: string; category: string }[] }>("/api/os/store/templates", {
      tenantScoped: true,
    }),
  addProduct: (projectId: string, product: Record<string, unknown>) =>
    apiClient.post(`/api/os/store/projects/${projectId}/products`, { tenantScoped: true, body: product }),
  updateProduct: (projectId: string, productId: string, updates: Record<string, unknown>) =>
    apiClient.put(`/api/os/store/projects/${projectId}/products/${productId}`, {
      tenantScoped: true,
      body: updates,
    }),
  deleteProduct: (projectId: string, productId: string) =>
    apiClient.delete(`/api/os/store/projects/${projectId}/products/${productId}`, { tenantScoped: true }),
  analytics: (projectId: string) =>
    apiClient.get<Record<string, unknown>>(`/api/os/store/projects/${projectId}/analytics`, { tenantScoped: true }),
  discount: (projectId: string, discount: Record<string, unknown>) =>
    apiClient.post(`/api/os/store/projects/${projectId}/discounts`, { tenantScoped: true, body: discount }),
};

export const landingApi = {
  list: (status?: string) =>
    apiClient.get<{ items: LandingPage[] }>(`/api/landing/pages${status ? `?status=${status}` : ""}`, {
      tenantScoped: true,
    }),
  get: (id: string) => apiClient.get<LandingPage>(`/api/landing/pages/${id}`, { tenantScoped: true }),
  create: (body: Record<string, unknown>) =>
    apiClient.post<LandingPage>("/api/landing/pages", { tenantScoped: true, body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiClient.put<LandingPage>(`/api/landing/pages/${id}`, { tenantScoped: true, body }),
  publish: (id: string) =>
    apiClient.post<LandingPage>(`/api/landing/pages/${id}/publish`, { tenantScoped: true }),
  templates: () =>
    apiClient.get<{ templates: { id: string; name: string; category: string; thumbnail_url?: string }[] }>(
      "/api/landing/templates",
      { tenantScoped: true },
    ),
  fromTemplate: (templateId: string, name?: string) =>
    apiClient.post<LandingPage>(`/api/landing/pages/from-template/${templateId}`, {
      tenantScoped: true,
      body: { name },
    }),
  analytics: (id: string) =>
    apiClient.get<Record<string, unknown>>(`/api/landing/pages/${id}/analytics`, { tenantScoped: true }),
  variant: (id: string, variant_name: string) =>
    apiClient.post(`/api/landing/pages/${id}/variants`, { tenantScoped: true, body: { variant_name } }),
};

export const funnelApi = {
  list: () => apiClient.get<{ items: Funnel[] }>("/api/funnels", { tenantScoped: true }),
  create: (body: Record<string, unknown>) =>
    apiClient.post<Funnel>("/api/funnels", { tenantScoped: true, body }),
  get: (id: string) => apiClient.get<Funnel>(`/api/funnels/${id}`, { tenantScoped: true }),
  analytics: (id: string) =>
    apiClient.get<Record<string, unknown>>(`/api/funnels/${id}/analytics`, { tenantScoped: true }),
};

export const livechatApi = {
  conversations: () =>
    apiClient.get<{ items: ChatConversation[] }>("/api/chat/conversations", { tenantScoped: true }),
  messages: (id: string) =>
    apiClient.get<{ items: { id: string; content: string; sender_type: string; created_at: string }[] }>(
      `/api/chat/conversations/${id}/messages`,
      { tenantScoped: true },
    ),
  send: (id: string, content: string) =>
    apiClient.post(`/api/chat/conversations/${id}/messages`, {
      tenantScoped: true,
      body: { sender_type: "agent", content },
    }),
  stats: () => apiClient.get<{ unread?: number }>("/api/chat/stats", { tenantScoped: true }),
  widgetConfig: () => apiClient.get<Record<string, unknown>>("/api/chat/widget-config", { tenantScoped: true }),
};

export const socialApi = {
  accounts: () => apiClient.get<{ accounts: unknown[] }>("/api/social/accounts", { tenantScoped: true }),
  posts: (params?: string) =>
    apiClient.get<{ items: unknown[] }>(`/api/social/posts${params ? `?${params}` : ""}`, { tenantScoped: true }),
  createPost: (body: Record<string, unknown>) =>
    apiClient.post("/api/social/posts", { tenantScoped: true, body }),
  calendar: (year: number, month: number) =>
    apiClient.get<{ days: Record<string, unknown[]> }>(`/api/social/calendar?year=${year}&month=${month}`, {
      tenantScoped: true,
    }),
  oauthUrl: (platform: string, redirect_uri: string) =>
    apiClient.get<{ url?: string; configured?: boolean; message?: string }>(
      `/api/social/oauth/${platform}/url?redirect_uri=${encodeURIComponent(redirect_uri)}`,
      { tenantScoped: true },
    ),
  uploadMedia: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiClient.postMultipart<{ url: string }>("/api/social/media/upload", fd, { tenantScoped: true });
  },
};
