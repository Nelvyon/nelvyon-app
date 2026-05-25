import { apiClient } from "@/core/api";

export const fbMessengerApi = {
  conversations: () =>
    apiClient.get<{ conversations: unknown[] }>("/api/fb-messenger/conversations", { tenantScoped: true }),
  send: (psid: string, text: string, conversation_id?: string) =>
    apiClient.post("/api/fb-messenger/send", {
      tenantScoped: true,
      body: { psid, text, conversation_id },
    }),
  setBot: (conversation_id: string, enabled: boolean) =>
    apiClient.post(`/api/fb-messenger/conversations/${conversation_id}/bot`, {
      tenantScoped: true,
      body: { enabled },
    }),
};
