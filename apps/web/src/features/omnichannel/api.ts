import { apiClient } from "@/core/api";

export type OmnichannelChannel = "email" | "whatsapp" | "sms" | "chat" | "voice";
export type OmnichannelStatus = "open" | "pending" | "resolved";

export type OmnichannelConversation = {
  id: string;
  workspace_id: number;
  contact_id?: string;
  channel: OmnichannelChannel;
  status: OmnichannelStatus;
  subject?: string;
  participant_name?: string;
  participant_email?: string;
  participant_phone?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  auto_reply_enabled?: boolean;
  created_at?: string;
};

export type OmnichannelMessage = {
  id: string;
  conversation_id: string;
  direction: "in" | "out";
  content: string;
  channel: OmnichannelChannel;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

export type OmnichannelStats = {
  total: number;
  open_count: number;
  pending_count: number;
  resolved_count: number;
  unread_count: number;
  channels: Record<string, number>;
  avg_response_seconds: number;
  resolution_rate: number;
};

export type ContactContext = {
  conversation: OmnichannelConversation;
  contact: Record<string, unknown> | null;
  interactions: unknown[];
  score?: number;
};

const BASE = "/api/omnichannel";

export const omnichannelApi = {
  inbox: (params?: { channel?: string; status?: string; search?: string; skip?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.channel) q.set("channel", params.channel);
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.skip != null) q.set("skip", String(params.skip));
    if (params?.limit != null) q.set("limit", String(params.limit));
    const qs = q.toString();
    return apiClient.get<{ items: OmnichannelConversation[]; total: number }>(
      `${BASE}/inbox${qs ? `?${qs}` : ""}`,
      { tenantScoped: true },
    );
  },

  messages: (conversationId: string) =>
    apiClient.get<{ items: OmnichannelMessage[] }>(`${BASE}/conversations/${conversationId}/messages`, {
      tenantScoped: true,
    }),

  context: (conversationId: string) =>
    apiClient.get<ContactContext>(`${BASE}/conversations/${conversationId}/context`, { tenantScoped: true }),

  reply: (conversationId: string, content: string, channel?: string) =>
    apiClient.post(`${BASE}/conversations/${conversationId}/reply`, {
      tenantScoped: true,
      body: { content, channel },
    }),

  suggest: (conversationId: string) =>
    apiClient.post<{ suggestion: string }>(`${BASE}/conversations/${conversationId}/suggest`, {
      tenantScoped: true,
    }),

  updateStatus: (conversationId: string, status: OmnichannelStatus) =>
    apiClient.put(`${BASE}/conversations/${conversationId}/status`, {
      tenantScoped: true,
      body: { status },
    }),

  toggleAutoReply: (conversationId: string, enabled: boolean) =>
    apiClient.put(`${BASE}/conversations/${conversationId}/auto-reply`, {
      tenantScoped: true,
      body: { enabled },
    }),

  stats: () => apiClient.get<OmnichannelStats>(`${BASE}/stats`, { tenantScoped: true }),
};

export const CHANNEL_COLORS: Record<OmnichannelChannel, string> = {
  email: "bg-sky-500",
  whatsapp: "bg-emerald-500",
  sms: "bg-amber-400",
  chat: "bg-violet-500",
  voice: "bg-orange-500",
};

export const CHANNEL_LABELS: Record<OmnichannelChannel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
  chat: "Chat",
  voice: "Voz",
};
