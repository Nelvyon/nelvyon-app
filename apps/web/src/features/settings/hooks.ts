"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/core/ui/toastFeedback";
import { settingsApi } from "@/features/settings/api";
import { MemberInviteInput, TenantSettingsUpdateInput } from "@/features/settings/types";
import { SecurityEventsQuery } from "@/features/settings/securityTypes";

export function useTenantSettings() {
  return useQuery({
    queryKey: ["settings", "tenant"],
    queryFn: settingsApi.getTenantSettings,
  });
}

export function useUpdateTenantSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TenantSettingsUpdateInput) => settingsApi.updateTenantSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "tenant"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding", "progress"] });
      toastSuccess("Workspace settings saved.");
    },
    onError: () => {
      toastError("Could not save workspace settings.");
    },
  });
}

export function useWorkspaceMembers() {
  return useQuery({
    queryKey: ["settings", "members"],
    queryFn: settingsApi.listMembers,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MemberInviteInput) => settingsApi.inviteMember(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "members"] });
      toastSuccess("Invite sent.");
    },
    onError: () => {
      toastError("Could not send invite.");
    },
  });
}

export function useSecurityEvents(query: SecurityEventsQuery = {}) {
  return useQuery({
    queryKey: ["settings", "security-events", query],
    queryFn: () => settingsApi.listSecurityEvents(query),
  });
}
