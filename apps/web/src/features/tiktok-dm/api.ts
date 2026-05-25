import { apiClient } from "@/core/api";

export const tiktokDmApi = {
  conversations: () =>
    apiClient.get<{ conversations: unknown[] }>("/api/tiktok-dm/conversations", { tenantScoped: true }),
  send: (open_id: string, text: string, conversation_id?: string) =>
    apiClient.post("/api/tiktok-dm/send", {
      tenantScoped: true,
      body: { open_id, text, conversation_id },
    }),
  setBot: (conversation_id: string, enabled: boolean) =>
    apiClient.post(`/api/tiktok-dm/conversations/${conversation_id}/bot`, {
      tenantScoped: true,
      body: { enabled },
    }),
};
