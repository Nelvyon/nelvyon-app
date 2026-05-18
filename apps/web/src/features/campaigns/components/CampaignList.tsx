"use client";

import React from "react";
import Link from "next/link";

import { getBrandMode } from "@/core/platform/brand";
import { Button } from "@/core/ui/button";
import { EmptyState } from "@/core/ui/EmptyState";
import { Campaign } from "@/features/campaigns/types";

export function CampaignList({ items, showCreateCta }: { items: Campaign[]; showCreateCta?: boolean }) {
  const isClientMode = getBrandMode() === "client";
  if (items.length === 0) {
    return (
      <EmptyState
        action={
          showCreateCta ? (
            <Button asChild>
              <Link href="/campaigns/new">Create a campaign</Link>
            </Button>
          ) : undefined
        }
        description={
          isClientMode
            ? "No projects are currently published to your portal."
            : showCreateCta
              ? "Launch your first campaign to align creative, delivery, and status in this workspace."
              : "No campaigns are visible yet. Why: your role can view this list but cannot create campaigns. Next: ask an admin/operator to create the first campaign."
        }
        title={isClientMode ? "No projects yet" : "No campaigns yet"}
      />
    );
  }

  return (
    <ul className="divide-y rounded-lg border border-border bg-card shadow-card">
      {items.map((campaign) => (
        <li className="p-3" key={campaign.id}>
          <Link className="font-medium text-link transition-colors hover:text-link-hover hover:underline" href={`/campaigns/${campaign.id}`}>
            {campaign.name?.trim() || `${isClientMode ? "Project" : "Campaign"} #${campaign.id}`}
          </Link>
          <p className="text-xs text-muted-foreground">
            {campaign.platform} · {campaign.campaign_type}
            {campaign.status ? ` · ${campaign.status}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
