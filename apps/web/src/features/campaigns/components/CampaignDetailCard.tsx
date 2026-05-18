"use client";

import React from "react";

import { getBrandMode } from "@/core/platform/brand";
import { Campaign } from "@/features/campaigns/types";

export function CampaignDetailCard({ campaign }: { campaign: Campaign }) {
  const isClientMode = getBrandMode() === "client";
  return (
    <section className="space-y-2 rounded border p-4">
      <h2 className="text-lg font-semibold">{campaign.name?.trim() || `${isClientMode ? "Project" : "Campaign"} #${campaign.id}`}</h2>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd>{campaign.status ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">QA score</dt>
          <dd>{campaign.qa_score ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Platform</dt>
          <dd>{campaign.platform}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Type</dt>
          <dd>{campaign.campaign_type}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Project</dt>
          <dd>{campaign.project_id}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Client</dt>
          <dd>{campaign.client_id ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Variants</dt>
          <dd>{campaign.variants_count ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Budget (suggested)</dt>
          <dd>{campaign.budget_suggested ?? "—"}</dd>
        </div>
      </dl>
      {campaign.target_audience && (
        <div className="text-sm">
          <p className="text-muted-foreground">Audience</p>
          <p>{campaign.target_audience}</p>
        </div>
      )}
      {campaign.content && (
        <div className="text-sm">
          <p className="text-muted-foreground">Content</p>
          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">
            {campaign.content}
          </pre>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {isClientMode
          ? "Account-scoped view: only projects shared with your portal access appear here."
          : "Execution view is limited to stored status and metrics on this record (no separate runner UI yet)."}
      </p>
    </section>
  );
}
