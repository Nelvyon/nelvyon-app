"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { saasCrmApi } from "./api";
import type { ContactListFilters, CreateActivityInput, CreateContactInput, UpdateContactInput } from "./types";

export const saasCrmQueryKeys = {
  all: ["saas-crm"] as const,
  contacts: (filters: ContactListFilters) => ["saas-crm", "contacts", filters] as const,
  contact: (id: string) => ["saas-crm", "contact", id] as const,
  pipeline: ["saas-crm", "pipeline"] as const,
  activities: (contactId: string) => ["saas-crm", "activities", contactId] as const,
};

async function invalidateCrm(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: saasCrmQueryKeys.all });
}

export function useSaasCrmContacts(filters: ContactListFilters = {}) {
  return useQuery({
    queryKey: saasCrmQueryKeys.contacts(filters),
    queryFn: () => saasCrmApi.listContacts(filters),
  });
}

export function useSaasCrmContact(contactId: string | null) {
  return useQuery({
    queryKey: saasCrmQueryKeys.contact(contactId ?? ""),
    queryFn: () => saasCrmApi.getContact(contactId!),
    enabled: Boolean(contactId),
  });
}

export function useSaasCrmPipeline() {
  return useQuery({
    queryKey: saasCrmQueryKeys.pipeline,
    queryFn: () => saasCrmApi.getPipelineSummary(),
  });
}

export function useSaasCrmActivities(contactId: string | null) {
  return useQuery({
    queryKey: saasCrmQueryKeys.activities(contactId ?? ""),
    queryFn: () => saasCrmApi.listActivities(contactId!),
    enabled: Boolean(contactId),
  });
}

export function useCreateSaasContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContactInput) => saasCrmApi.createContact(input),
    onSuccess: async () => {
      await invalidateCrm(queryClient);
    },
  });
}

export function useUpdateSaasContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, input }: { contactId: string; input: UpdateContactInput }) =>
      saasCrmApi.updateContact(contactId, input),
    onSuccess: async () => {
      await invalidateCrm(queryClient);
    },
  });
}

export function useDeleteSaasContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => saasCrmApi.deleteContact(contactId),
    onSuccess: async () => {
      await invalidateCrm(queryClient);
    },
  });
}

export function useAddSaasContactActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, input }: { contactId: string; input: CreateActivityInput }) =>
      saasCrmApi.addActivity(contactId, input),
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: saasCrmQueryKeys.activities(vars.contactId) });
      await queryClient.invalidateQueries({ queryKey: saasCrmQueryKeys.contact(vars.contactId) });
    },
  });
}
