import { apiClient } from "@/core/api";

export type PublicScope =
  | "contacts"
  | "campaigns"
  | "chatbot"
  | "forms"
  | "analytics"
  | "workflows"
  | "read"
  | "write"
  | "admin"
  | "webhooks"
  | "crm";

export type ApiKeyRecord = {
  id: string;
  workspace_id: number;
  name: string;
  key_prefix: string;
  scopes: string[];
  expires_at?: string;
  revoked_at?: string;
  last_used_at?: string;
  created_at?: string;
};

export type WebhookEndpoint = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at?: string;
};

export type WebhookDelivery = {
  id: string;
  endpoint_id: string;
  event: string;
  status: string;
  attempts: number;
  response_code?: number;
  created_at?: string;
};

const DEV = "/api/developer";
const WH = "/api/webhooks";
const PUB = "/api/public/v1";

export const publicApiClient = {
  scopes: () => apiClient.get<{ scopes: string[] }>(`${DEV}/scopes`, { tenantScoped: true }),

  listKeys: () =>
    apiClient.get<{ api_keys: ApiKeyRecord[]; count: number }>(`${DEV}/api-keys`, { tenantScoped: true }),

  createKey: (name: string, scopes: string[]) =>
    apiClient.post<{ api_key: string } & ApiKeyRecord>(`${DEV}/api-keys`, {
      tenantScoped: true,
      body: { name, scopes },
    }),

  revokeKey: (id: string) =>
    apiClient.delete(`${DEV}/api-keys/${id}`, { tenantScoped: true }),

  listWebhooks: () =>
    apiClient.get<{ endpoints: WebhookEndpoint[] }>(`${WH}/endpoints`, { tenantScoped: true }),

  createWebhook: (url: string, events: string[]) =>
    apiClient.post<WebhookEndpoint>(`${WH}/endpoints`, {
      tenantScoped: true,
      body: { url, events },
    }),

  deleteWebhook: (id: string) =>
    apiClient.delete(`${WH}/endpoints/${id}`, { tenantScoped: true }),

  listDeliveries: () =>
    apiClient.get<{ deliveries: WebhookDelivery[] }>(`${WH}/deliveries`, { tenantScoped: true }),

  webhookEvents: () => apiClient.get<{ events: string[] }>(`${WH}/events`, { tenantScoped: true }),

  /** Playground — calls public API with user's key */
  playground: (apiKey: string, method: string, path: string, body?: unknown) =>
    fetch(`${PUB}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    }).then(async (r) => ({ status: r.status, data: await r.json().catch(() => ({})) })),
};

export const PUBLIC_ENDPOINTS = [
  {
    method: "POST",
    path: "/contacts",
    scope: "contacts",
    body: { name: "Jane Doe", email: "jane@example.com" },
  },
  {
    method: "GET",
    path: "/contacts?limit=10",
    scope: "contacts",
  },
  {
    method: "POST",
    path: "/campaigns/send",
    scope: "campaigns",
    body: { campaign_id: 1 },
  },
  {
    method: "POST",
    path: "/chatbot/message",
    scope: "chatbot",
    body: { chatbot_id: "uuid", message: "Hola" },
  },
  {
    method: "POST",
    path: "/forms/submit",
    scope: "forms",
    body: { form_id: "uuid", responses: { email: "a@b.com" } },
  },
  {
    method: "POST",
    path: "/events",
    scope: "analytics",
    body: { event: "page_view", properties: { page: "/home" } },
  },
  {
    method: "GET",
    path: "/analytics/summary",
    scope: "analytics",
  },
  {
    method: "POST",
    path: "/workflows/trigger",
    scope: "workflows",
    body: { trigger_type: "contact_created", trigger_data: { email: "a@b.com" } },
  },
] as const;
