"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SimpleCampaignForm } from "@/features/campaigns/components/SimpleCampaignForm";
import { useCreateCampaign } from "@/features/campaigns/hooks";
import type { CampaignCreateInput } from "@/features/campaigns/types";

export default function CreateCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();
  const mutation = useCreateCampaign();
  const canCreate = user ? canPerformAction(user.role, "campaigns", "create") : false;

  const onSubmit = async (values: CampaignCreateInput) => {
    const created = await mutation.mutateAsync(values);
    router.push(`/campaigns/${created.id}`);
  };

  return (
    <ProtectedLayout module="campaigns">
      <div className="space-y-5">
        {mutation.error instanceof ApiError && mutation.error.status === 403 && (
          <ForbiddenNotice>
            <p>Tu rol no puede crear campañas. Pide ayuda a un administrador.</p>
          </ForbiddenNotice>
        )}
        {mutation.error && !(mutation.error instanceof ApiError && mutation.error.status === 403) && (
          <ErrorNotice>
            <p>No pudimos crear la campaña. Revisa los campos e inténtalo de nuevo.</p>
          </ErrorNotice>
        )}
        <SimpleCampaignForm canSubmit={canCreate} isSubmitting={mutation.isPending} onSubmit={onSubmit} />
      </div>
    </ProtectedLayout>
  );
}
