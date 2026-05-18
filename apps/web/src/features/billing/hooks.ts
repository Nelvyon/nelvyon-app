"use client";

import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { billingApi } from "@/features/billing/api";

export function useBillingSummary() {
  return useQuery({
    queryKey: ["billing", "summary"],
    queryFn: billingApi.summary,
  });
}

export function useBillingUsage() {
  return useQuery({
    queryKey: ["billing", "usage"],
    queryFn: billingApi.usage,
  });
}

export function useBillingInvoices() {
  return useQuery({
    queryKey: ["billing", "invoices"],
    queryFn: billingApi.invoices,
  });
}

export function useBillingPlans() {
  return useQuery({
    queryKey: ["billing", "plans"],
    queryFn: billingApi.plans,
  });
}

export function useActiveSubscription() {
  return useQuery({
    queryKey: ["billing", "active-subscription"],
    queryFn: billingApi.activeSubscription,
  });
}

export function useCreatePaymentSession() {
  return useMutation({
    mutationFn: billingApi.createPaymentSession,
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingApi.verifyPayment,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing", "active-subscription"] }),
        queryClient.invalidateQueries({ queryKey: ["billing", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["billing", "usage"] }),
        queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] }),
      ]);
    },
  });
}
