"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/core/ui/toastFeedback";
import { ecommerceApi } from "@/features/ecommerce/api";

export function useEcommerceUnifiedReporting() {
  return useQuery({
    queryKey: ["ecommerce", "unified-reporting"],
    queryFn: () => ecommerceApi.unifiedReporting(),
    refetchInterval: 60_000,
  });
}

export function useStoresList() {
  return useQuery({
    queryKey: ["ecommerce", "list"],
    queryFn: () => ecommerceApi.list(),
  });
}

export function useStore(id: string) {
  return useQuery({
    queryKey: ["ecommerce", "detail", id],
    queryFn: () => ecommerceApi.get(id),
    enabled: Boolean(id),
  });
}

export function useStoreAnalytics(id: string) {
  return useQuery({
    queryKey: ["ecommerce", "analytics", id],
    queryFn: () => ecommerceApi.analytics(id),
    enabled: Boolean(id),
  });
}

export function useCreateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (store_info: Record<string, unknown>) => ecommerceApi.create(store_info),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ecommerce"] });
      toastSuccess("Tienda creada.");
    },
    onError: () => toastError("No se pudo crear la tienda."),
  });
}

export function usePublishStore(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ecommerceApi.publish(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ecommerce"] });
      toastSuccess("Tienda publicada.");
    },
    onError: () => toastError("No se pudo publicar la tienda."),
  });
}
