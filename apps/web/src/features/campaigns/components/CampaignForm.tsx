"use client";

import React, { FormEvent, useId, useState } from "react";

import { Button } from "@/core/ui/button";
import { campaignFormSchema } from "@/features/campaigns/schema";
import { CampaignCreateInput } from "@/features/campaigns/types";

type FormState = {
  project_id: string;
  client_id: string;
  platform: string;
  campaign_type: string;
  name: string;
  content: string;
  target_audience: string;
  status: string;
};

interface CampaignFormProps {
  canSubmit: boolean;
  isSubmitting?: boolean;
  initialValues?: Partial<CampaignCreateInput> & { project_id?: number };
  submitLabel?: string;
  onSubmit: (values: CampaignCreateInput) => Promise<void> | void;
}

function toFormState(initial?: Partial<CampaignCreateInput> & { project_id?: number }): FormState {
  return {
    project_id: initial?.project_id != null ? String(initial.project_id) : "",
    client_id: initial?.client_id != null ? String(initial.client_id) : "",
    platform: initial?.platform ?? "",
    campaign_type: initial?.campaign_type ?? "",
    name: initial?.name ?? "",
    content: initial?.content ?? "",
    target_audience: initial?.target_audience ?? "",
    status: initial?.status ?? "",
  };
}

export function CampaignForm({
  canSubmit,
  isSubmitting = false,
  initialValues,
  submitLabel = "Save campaign",
  onSubmit,
}: CampaignFormProps) {
  const id = useId();
  const [values, setValues] = useState<FormState>(() => toFormState(initialValues));
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialValues) setValues(toFormState(initialValues));
  }, [initialValues]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = campaignFormSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    const out = parsed.data;
    const payload: CampaignCreateInput = {
      project_id: out.project_id,
      platform: out.platform,
      campaign_type: out.campaign_type,
      ...(out.client_id !== undefined ? { client_id: out.client_id } : {}),
      ...(out.name ? { name: out.name } : {}),
      ...(out.content ? { content: out.content } : {}),
      ...(out.target_audience ? { target_audience: out.target_audience } : {}),
      ...(out.status ? { status: out.status } : {}),
    };
    await onSubmit(payload);
  };

  return (
    <form className="space-y-3 rounded border p-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm" htmlFor={`${id}-project_id`}>
            Project id
          </label>
          <input
            className="w-full rounded border px-2 py-1"
            id={`${id}-project_id`}
            onChange={(e) => setValues((prev) => ({ ...prev, project_id: e.target.value }))}
            value={values.project_id}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm" htmlFor={`${id}-client_id`}>
            Client id (optional)
          </label>
          <input
            className="w-full rounded border px-2 py-1"
            id={`${id}-client_id`}
            onChange={(e) => setValues((prev) => ({ ...prev, client_id: e.target.value }))}
            value={values.client_id}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm" htmlFor={`${id}-platform`}>
            Platform
          </label>
          <input
            className="w-full rounded border px-2 py-1"
            id={`${id}-platform`}
            onChange={(e) => setValues((prev) => ({ ...prev, platform: e.target.value }))}
            value={values.platform}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm" htmlFor={`${id}-campaign_type`}>
            Campaign type
          </label>
          <input
            className="w-full rounded border px-2 py-1"
            id={`${id}-campaign_type`}
            onChange={(e) => setValues((prev) => ({ ...prev, campaign_type: e.target.value }))}
            value={values.campaign_type}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm" htmlFor={`${id}-name`}>
          Name
        </label>
        <input
          className="w-full rounded border px-2 py-1"
          id={`${id}-name`}
          onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
          value={values.name}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm" htmlFor={`${id}-target_audience`}>
          Target audience
        </label>
        <input
          className="w-full rounded border px-2 py-1"
          id={`${id}-target_audience`}
          onChange={(e) => setValues((prev) => ({ ...prev, target_audience: e.target.value }))}
          value={values.target_audience}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm" htmlFor={`${id}-content`}>
          Content
        </label>
        <textarea
          className="min-h-[100px] w-full rounded border px-2 py-1"
          id={`${id}-content`}
          onChange={(e) => setValues((prev) => ({ ...prev, content: e.target.value }))}
          value={values.content}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm" htmlFor={`${id}-status`}>
          Status (optional on create)
        </label>
        <input
          className="w-full rounded border px-2 py-1"
          id={`${id}-status`}
          onChange={(e) => setValues((prev) => ({ ...prev, status: e.target.value }))}
          placeholder="e.g. draft"
          value={values.status}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!canSubmit && <p className="text-sm text-warning-foreground">You do not have permission for this action.</p>}
      <Button disabled={!canSubmit || isSubmitting} type="submit">
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
