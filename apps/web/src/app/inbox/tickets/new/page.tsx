"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { getBrandMode } from "@/core/platform/brand";
import { isClientTicketCreateEnabled } from "@/core/platform/surfacePolicy";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { TicketForm } from "@/features/inbox_helpdesk/components/TicketForm";
import { useCreateTicket } from "@/features/inbox_helpdesk/hooks";
import { TicketCreateInput } from "@/features/inbox_helpdesk/types";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";

export default function CreateTicketPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isClientMode = getBrandMode() === "client";
  const mutation = useCreateTicket();
  const canCreateByRole = user ? canPerformAction(user.role, "inbox", "create") : false;
  const canCreate = isClientMode ? isClientTicketCreateEnabled() : canCreateByRole;

  const onSubmit = async (values: TicketCreateInput) => {
    const ticket = await mutation.mutateAsync(values);
    router.push(`/inbox/tickets/${ticket.id}`);
  };

  return (
    <ProtectedLayout module="inbox">
      <div className="space-y-5">
        {mutation.error instanceof ApiError && mutation.error.status === 403 && (
          <ForbiddenNotice>
            <p>
              {isClientMode
                ? "Request creation is not enabled for this portal."
                : "Your role cannot create tickets in this account."}
            </p>
          </ForbiddenNotice>
        )}
        {mutation.error && !(mutation.error instanceof ApiError && mutation.error.status === 403) && (
          <ErrorNotice>
            <p>We could not create the ticket. Review the form and try again.</p>
          </ErrorNotice>
        )}
        <TicketForm canSubmit={canCreate} isSubmitting={mutation.isPending} onSubmit={onSubmit} />
      </div>
    </ProtectedLayout>
  );
}
