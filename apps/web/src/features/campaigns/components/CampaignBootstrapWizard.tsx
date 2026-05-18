"use client";

import Link from "next/link";
import React, { FormEvent, useMemo, useState } from "react";

import { Button } from "@/core/ui/button";
import { useClients } from "@/features/crm/hooks";
import { useCreateProject } from "@/features/projects/hooks";
import { CampaignCreateInput } from "@/features/campaigns/types";

type CampaignDraft = {
  platform: string;
  campaign_type: string;
  name: string;
  content: string;
  target_audience: string;
  status: string;
};

const INITIAL_CAMPAIGN: CampaignDraft = {
  platform: "meta_ads",
  campaign_type: "lead_gen",
  name: "",
  content: "",
  target_audience: "",
  status: "draft",
};

interface CampaignBootstrapWizardProps {
  canSubmit: boolean;
  isCreatingCampaign: boolean;
  onCreateCampaign: (payload: CampaignCreateInput) => Promise<void>;
}

export function CampaignBootstrapWizard({
  canSubmit,
  isCreatingCampaign,
  onCreateCampaign,
}: CampaignBootstrapWizardProps) {
  const clientsQuery = useClients();
  const projectMutation = useCreateProject();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("marketing");
  const [campaign, setCampaign] = useState<CampaignDraft>(INITIAL_CAMPAIGN);
  const [error, setError] = useState<string | null>(null);

  const clients = useMemo(() => clientsQuery.data?.items ?? [], [clientsQuery.data?.items]);
  const selectedClient = useMemo(
    () => clients.find((c) => String(c.id) === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const onCreateProject = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!selectedClientId) {
      setError("Select a client first.");
      return;
    }
    const name = projectName.trim();
    if (!name) {
      setError("Project name is required.");
      return;
    }

    const created = await projectMutation.mutateAsync({
      client_id: Number(selectedClientId),
      name,
      project_type: projectType.trim() || "marketing",
      status: "active",
    });
    setProjectId(created.id);
  };

  const onCreateFirstCampaign = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!projectId) {
      setError("Create a project before creating the campaign.");
      return;
    }
    if (!campaign.platform.trim() || !campaign.campaign_type.trim()) {
      setError("Platform and campaign type are required.");
      return;
    }

    await onCreateCampaign({
      project_id: projectId,
      ...(selectedClient ? { client_id: selectedClient.id } : {}),
      platform: campaign.platform.trim(),
      campaign_type: campaign.campaign_type.trim(),
      ...(campaign.name.trim() ? { name: campaign.name.trim() } : {}),
      ...(campaign.content.trim() ? { content: campaign.content.trim() } : {}),
      ...(campaign.target_audience.trim() ? { target_audience: campaign.target_audience.trim() } : {}),
      ...(campaign.status.trim() ? { status: campaign.status.trim() } : {}),
    });
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">First campaign assistant</h2>
        <p className="text-xs text-muted-foreground">
          Real flow: create a minimal project first, then create your first campaign linked to that project.
        </p>
      </header>

      {!canSubmit ? (
        <p className="text-sm text-warning-foreground">You do not have permission to create projects or campaigns.</p>
      ) : null}

      {!clientsQuery.isLoading && clients.length === 0 ? (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          <p>You need at least one CRM client before creating a project.</p>
          <Link className="text-link underline" href="/crm/clients/new">
            Create first client
          </Link>
        </div>
      ) : null}

      <form className="space-y-3 rounded-md border border-border p-3" onSubmit={onCreateProject}>
        <h3 className="text-sm font-medium text-foreground">Step 1 — Create project</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Client</span>
            <select
              className="w-full rounded-md border border-input bg-background px-2 py-1"
              disabled={!canSubmit || clientsQuery.isLoading || clients.length === 0 || Boolean(projectId)}
              onChange={(e) => setSelectedClientId(e.target.value)}
              value={selectedClientId}
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={String(client.id)}>
                  {client.business_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Project type</span>
            <input
              className="w-full rounded-md border border-input bg-background px-2 py-1"
              disabled={!canSubmit || Boolean(projectId)}
              onChange={(e) => setProjectType(e.target.value)}
              value={projectType}
            />
          </label>
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Project name</span>
          <input
            className="w-full rounded-md border border-input bg-background px-2 py-1"
            disabled={!canSubmit || Boolean(projectId)}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Q2 Launch Project"
            value={projectName}
          />
        </label>
        <div className="flex items-center gap-2">
          <Button
            disabled={!canSubmit || projectMutation.isPending || Boolean(projectId) || clients.length === 0}
            type="submit"
            variant="secondary"
          >
            {projectId ? "Project created" : projectMutation.isPending ? "Creating..." : "Create project"}
          </Button>
          {projectId ? <span className="text-xs text-success">Project ID {projectId}</span> : null}
        </div>
      </form>

      <form className="space-y-3 rounded-md border border-border p-3" onSubmit={onCreateFirstCampaign}>
        <h3 className="text-sm font-medium text-foreground">Step 2 — Create campaign</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Platform</span>
            <input
              className="w-full rounded-md border border-input bg-background px-2 py-1"
              disabled={!canSubmit || !projectId}
              onChange={(e) => setCampaign((prev) => ({ ...prev, platform: e.target.value }))}
              value={campaign.platform}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Campaign type</span>
            <input
              className="w-full rounded-md border border-input bg-background px-2 py-1"
              disabled={!canSubmit || !projectId}
              onChange={(e) => setCampaign((prev) => ({ ...prev, campaign_type: e.target.value }))}
              value={campaign.campaign_type}
            />
          </label>
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Campaign name (optional)</span>
          <input
            className="w-full rounded-md border border-input bg-background px-2 py-1"
            disabled={!canSubmit || !projectId}
            onChange={(e) => setCampaign((prev) => ({ ...prev, name: e.target.value }))}
            value={campaign.name}
          />
        </label>
        <Button disabled={!canSubmit || !projectId || isCreatingCampaign} type="submit">
          {isCreatingCampaign ? "Creating..." : "Create first campaign"}
        </Button>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
