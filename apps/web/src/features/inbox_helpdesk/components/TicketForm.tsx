"use client";

import React, { FormEvent, useId, useState } from "react";

import { Button } from "@/core/ui/button";
import { ticketCreateSchema } from "@/features/inbox_helpdesk/schema";
import { TicketCreateInput } from "@/features/inbox_helpdesk/types";

interface TicketFormProps {
  canSubmit: boolean;
  isSubmitting?: boolean;
  onSubmit: (payload: TicketCreateInput) => Promise<void> | void;
}

export function TicketForm({ canSubmit, isSubmitting = false, onSubmit }: TicketFormProps) {
  const id = useId();
  const [values, setValues] = useState<TicketCreateInput>({
    subject: "",
    description: "",
    status: "open",
    priority: "normal",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = ticketCreateSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    await onSubmit(parsed.data);
  };

  return (
    <form className="space-y-3 rounded border p-4" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-sm" htmlFor={`${id}-subject`}>
          Subject
        </label>
        <input
          className="w-full rounded border px-2 py-1"
          id={`${id}-subject`}
          onChange={(e) => setValues((p) => ({ ...p, subject: e.target.value }))}
          value={values.subject}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm" htmlFor={`${id}-description`}>
          Description
        </label>
        <textarea
          className="w-full rounded border px-2 py-1"
          id={`${id}-description`}
          onChange={(e) => setValues((p) => ({ ...p, description: e.target.value }))}
          rows={3}
          value={values.description}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!canSubmit && <p className="text-sm text-warning-foreground">You do not have permission for this action.</p>}
      <Button disabled={!canSubmit || isSubmitting} type="submit">
        {isSubmitting ? "Saving..." : "Create ticket"}
      </Button>
    </form>
  );
}
