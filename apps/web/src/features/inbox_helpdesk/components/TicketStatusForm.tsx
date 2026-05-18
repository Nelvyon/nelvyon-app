"use client";

import React, { FormEvent, useState } from "react";

import { Button } from "@/core/ui/button";

interface TicketStatusFormProps {
  currentStatus?: string | null;
  canSubmit: boolean;
  isSubmitting?: boolean;
  onSubmit: (status: string) => Promise<void> | void;
}

export function TicketStatusForm({
  currentStatus,
  canSubmit,
  isSubmitting = false,
  onSubmit,
}: TicketStatusFormProps) {
  const [status, setStatus] = useState(currentStatus ?? "open");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(status);
  };

  return (
    <form className="space-y-3 rounded border p-4" onSubmit={handleSubmit}>
      <label className="block text-sm">
        Status
        <select
          className="mt-1 w-full rounded border px-2 py-1"
          onChange={(e) => setStatus(e.target.value)}
          value={status}
        >
          <option value="open">open</option>
          <option value="in_progress">in_progress</option>
          <option value="resolved">resolved</option>
          <option value="closed">closed</option>
        </select>
      </label>
      {!canSubmit && <p className="text-sm text-warning-foreground">Only operator/admin can update status.</p>}
      <Button disabled={!canSubmit || isSubmitting} type="submit">
        {isSubmitting ? "Updating..." : "Update status"}
      </Button>
    </form>
  );
}
