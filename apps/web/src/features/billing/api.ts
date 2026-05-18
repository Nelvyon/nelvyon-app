import { apiClient } from "@/core/api";
import {
  ActiveSubscription,
  BillingInvoices,
  BillingPlansResponse,
  BillingSummary,
  BillingUsage,
  CreatePaymentSessionInput,
  CreatePaymentSessionResponse,
  VerifyPaymentResponse,
} from "@/features/billing/types";

export const billingApi = {
  summary: () => apiClient.get<BillingSummary>("/api/v1/billing/summary", { tenantScoped: true }),
  usage: () => apiClient.get<BillingUsage>("/api/v1/billing/usage", { tenantScoped: true }),
  invoices: () => apiClient.get<BillingInvoices>("/api/v1/billing/invoices", { tenantScoped: true }),
  plans: () => apiClient.get<BillingPlansResponse>("/api/v1/payment/plans"),
  createPaymentSession: (body: CreatePaymentSessionInput) =>
    apiClient.post<CreatePaymentSessionResponse, CreatePaymentSessionInput>("/api/v1/payment/create_payment_session", {
      tenantScoped: true,
      body,
    }),
  verifyPayment: (sessionId: string) =>
    apiClient.post<VerifyPaymentResponse, { session_id: string }>("/api/v1/payment/verify_payment", {
      tenantScoped: true,
      body: { session_id: sessionId },
    }),
  activeSubscription: () => apiClient.get<ActiveSubscription>("/api/v1/payment/active_subscription", { tenantScoped: true }),
};
