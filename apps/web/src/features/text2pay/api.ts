import { apiClient } from "@/core/api";

export const text2payApi = {
  create: (body: {
    client_id?: string;
    lead_phone: string;
    amount: number;
    currency?: string;
    description: string;
    channel: "sms" | "whatsapp";
  }) => apiClient.post("/api/text2pay/create", { tenantScoped: true, body }),
  payments: (clientId?: string) =>
    apiClient.get<{ payments: unknown[]; stats: Record<string, number>; mock: boolean }>(
      `/api/text2pay/payments${clientId ? `?client_id=${encodeURIComponent(clientId)}` : ""}`,
      { tenantScoped: true },
    ),
  get: (paymentId: string) =>
    apiClient.get(`/api/text2pay/payments/${paymentId}`, { tenantScoped: true }),
};
