"use client";

import React, { FormEvent, useState } from "react";

import { Button } from "@/core/ui/button";
import { webhookActiveSchema } from "@/features/automations/schema";

interface WebhookActiveFormProps {
  isActive: boolean;
  canSubmit: boolean;
  isSubmitting?: boolean;
  onSubmit: (isActive: boolean) => Promise<void> | void;
}

export function WebhookActiveForm({
  isActive: initialActive,
  canSubmit,
  isSubmitting = false,
  onSubmit,
}: WebhookActiveFormProps) {
  const [isActive, setIsActive] = useState(initialActive);

  React.useEffect(() => {
    setIsActive(initialActive);
  }, [initialActive]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = webhookActiveSchema.safeParse({ is_active: isActive });
    if (!parsed.success) return;
    await onSubmit(parsed.data.is_active);
  };

  return (
    <form className="space-y-3 rounded border p-4" onSubmit={handleSubmit}>
      <label className="flex items-center gap-2 text-sm">
        <input
          checked={isActive}
          disabled={!canSubmit}
          onChange={(e) => setIsActive(e.target.checked)}
          type="checkbox"
        />
        Webhook active
      </label>
      {!canSubmit && (
        <p className="text-sm text-warning-foreground">Only operator/admin can change webhook state.</p>
      )}
      <Button disabled={!canSubmit || isSubmitting} type="submit">
        {isSubmitting ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
