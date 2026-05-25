import { apiClient } from "@/core/api";

export const instagramDmApi = {
  conversations: () =>
    apiClient.get<{ conversations: unknown[] }>("/api/instagram-dm/conversations", { tenantScoped: true }),
  send: (recipient_id: string, text: string, conversation_id?: string) =>
    apiClient.post("/api/instagram-dm/send", {
      tenantScoped: true,
      body: { recipient_id, text, conversation_id },
    }),
  setBot: (conversation_id: string, enabled: boolean) =>
    apiClient.post(`/api/instagram-dm/conversations/${conversation_id}/bot`, {
      tenantScoped: true,
      body: { enabled },
    }),
};
