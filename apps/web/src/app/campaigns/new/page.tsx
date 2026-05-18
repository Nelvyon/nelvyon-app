"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { HelpContextLink } from "@/features/help/components/HelpContextLink";
import { CampaignBootstrapWizard } from "@/features/campaigns/components/CampaignBootstrapWizard";
import { useCreateCampaign } from "@/features/campaigns/hooks";
import { CampaignCreateInput } from "@/features/campaigns/types";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";

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
        <HelpContextLink href="/help/campaigns" label="Campaign setup guide" />
        {mutation.error instanceof ApiError && mutation.error.status === 403 && (
          <ForbiddenNotice>
            <p>Your role cannot create campaigns in this NELVYON workspace. Ask an operator or admin.</p>
          </ForbiddenNotice>
        )}
        {mutation.error && !(mutation.error instanceof ApiError && mutation.error.status === 403) && (
          <ErrorNotice>
            <p>We could not create the campaign. Review required fields and try again.</p>
          </ErrorNotice>
        )}
        <CampaignBootstrapWizard canSubmit={canCreate} isCreatingCampaign={mutation.isPending} onCreateCampaign={onSubmit} />
      </div>
    </ProtectedLayout>
  );
}
