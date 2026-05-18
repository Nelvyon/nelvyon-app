"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { LOCAL_ACTIVATION_FIRST_TICKET } from "@/core/auth/sessionStorageKeys";
import { trackProductEvent } from "@/core/telemetry/productEvents";
import { toastError, toastSuccess } from "@/core/ui/toastFeedback";
import { ACTIVATION_LOCAL_QUERY_KEY } from "@/features/onboarding/activationQueryKeys";
import { inboxApi } from "@/features/inbox_helpdesk/api";
import { TicketCreateInput, TicketUpdateInput } from "@/features/inbox_helpdesk/types";

export function useTickets() {
  return useQuery({
    queryKey: ["inbox", "tickets"],
    queryFn: inboxApi.list,
  });
}

export function useTicket(id: number) {
  return useQuery({
    queryKey: ["inbox", "tickets", id],
    queryFn: () => inboxApi.getById(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TicketCreateInput) => inboxApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox", "tickets"] });
      queryClient.invalidateQueries({ queryKey: ACTIVATION_LOCAL_QUERY_KEY });
      try {
        localStorage.setItem(LOCAL_ACTIVATION_FIRST_TICKET, "1");
      } catch {
        /* ignore */
      }
      trackProductEvent("inbox_ticket_created", { module: "inbox" });
      toastSuccess("Ticket created.");
    },
    onError: () => {
      toastError("Could not create ticket.");
    },
  });
}

export function useUpdateTicketStatus(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TicketUpdateInput) => inboxApi.updateStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox", "tickets"] });
      queryClient.invalidateQueries({ queryKey: ["inbox", "tickets", id] });
      toastSuccess("Ticket status updated.");
    },
    onError: () => {
      toastError("Could not update ticket status.");
    },
  });
}
