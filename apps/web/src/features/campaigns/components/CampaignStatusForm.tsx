"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/core/ui/button";

const DEFAULT_OPTIONS = ["draft", "active", "paused", "completed"] as const;

interface CampaignStatusFormProps {
  currentStatus?: string | null;
  canSubmit: boolean;
  isSubmitting?: boolean;
  onSubmit: (status: string) => Promise<void> | void;
}

export function CampaignStatusForm({
  currentStatus,
  canSubmit,
  isSubmitting = false,
  onSubmit,
}: CampaignStatusFormProps) {
  const options = useMemo(() => {
    const s = currentStatus?.trim();
    if (s && !DEFAULT_OPTIONS.includes(s as (typeof DEFAULT_OPTIONS)[number])) {
      return [...DEFAULT_OPTIONS, s];
    }
    return [...DEFAULT_OPTIONS];
  }, [currentStatus]);

  const [status, setStatus] = useState(() => {
    const s = currentStatus?.trim();
    if (s && options.includes(s)) return s;
    return "draft";
  });

  useEffect(() => {
    const s = currentStatus?.trim();
    if (s) setStatus(s);
  }, [currentStatus]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(status);
  };

  return (
    <form className="space-y-3 rounded border p-4" onSubmit={handleSubmit}>
      <p className="text-sm text-muted-foreground">
        Set lifecycle status (treat <strong>active</strong> as launched when your workspace uses that convention).
      </p>
      <label className="block text-sm">
        Status
        <select
          className="mt-1 w-full rounded border px-2 py-1"
          onChange={(e) => setStatus(e.target.value)}
          value={options.includes(status) ? status : options[0]}
        >
          {options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      {!canSubmit && (
        <p className="text-sm text-warning-foreground">Only operator/admin can change status or launch.</p>
      )}
      <Button disabled={!canSubmit || isSubmitting} type="submit">
        {isSubmitting ? "Updating..." : "Update status"}
      </Button>
    </form>
  );
}
