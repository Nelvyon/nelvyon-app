"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/core/ui/toastFeedback";
import { trackProductEvent } from "@/core/telemetry/productEvents";
import { useAuth } from "@/core/auth/AuthContext";
import { useWorkspace } from "@/core/workspace/WorkspaceContext";
import { crmApi } from "@/features/crm/api";
import { ClientCreateInput, ClientUpdateInput } from "@/features/crm/types";

export function useClients() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["crm", "clients", workspaceId],
    queryFn: crmApi.list,
    enabled: isAuthenticated && !isBootstrapping,
  });
}

export function useClient(id: number) {
  return useQuery({
    queryKey: ["crm", "clients", id],
    queryFn: () => crmApi.getById(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClientCreateInput) => crmApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "clients"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding", "progress"] });
      trackProductEvent("crm_client_created", { module: "crm" });
      toastSuccess("Cliente creado.");
    },
    onError: () => {
      toastError("No se pudo crear el cliente.");
    },
  });
}

export function useUpdateClient(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClientUpdateInput) => crmApi.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm", "clients"] });
      await queryClient.refetchQueries({ queryKey: ["crm", "clients", id] });
      toastSuccess("Client updated.");
    },
    onError: () => {
      toastError("Could not save client.");
    },
  });
}
