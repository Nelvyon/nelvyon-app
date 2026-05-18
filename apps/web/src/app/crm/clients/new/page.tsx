"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { ClientForm } from "@/features/crm/components/ClientForm";
import { useCreateClient } from "@/features/crm/hooks";
import { ClientCreateInput } from "@/features/crm/types";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";

export default function CreateClientPage() {
  const { user } = useAuth();
  const router = useRouter();
  const mutation = useCreateClient();
  const canCreate = user ? canPerformAction(user.role, "crm", "create") : false;

  const onSubmit = async (values: ClientCreateInput) => {
    const created = await mutation.mutateAsync(values);
    router.push(`/crm/clients/${created.id}`);
  };

  return (
    <ProtectedLayout module="crm">
      <div className="space-y-5">
        {mutation.error instanceof ApiError && mutation.error.status === 403 && (
          <ForbiddenNotice>
            <p>Your role cannot create clients in this NELVYON workspace. Ask an operator or admin.</p>
          </ForbiddenNotice>
        )}
        {mutation.error && !(mutation.error instanceof ApiError && mutation.error.status === 403) && (
          <ErrorNotice>
            <p>We could not create the client. Check required fields and try again.</p>
          </ErrorNotice>
        )}
        <ClientForm canSubmit={canCreate} isSubmitting={mutation.isPending} onSubmit={onSubmit} />
      </div>
    </ProtectedLayout>
  );
}
