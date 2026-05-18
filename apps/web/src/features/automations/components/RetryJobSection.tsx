"use client";

import React from "react";

import { Button } from "@/core/ui/button";

interface RetryJobSectionProps {
  canSubmit: boolean;
  isSubmitting?: boolean;
  onRetry: () => Promise<void> | void;
}

export function RetryJobSection({ canSubmit, isSubmitting = false, onRetry }: RetryJobSectionProps) {
  return (
    <section className="space-y-2 rounded border p-4">
      <h3 className="font-medium">Retry</h3>
      <p className="text-sm text-muted-foreground">
        Calls <code className="rounded bg-muted px-1 text-xs">POST /api/v1/automation/retry/{"{id}"}</code> for
        this job (operator workspace).
      </p>
      {!canSubmit && (
        <p className="text-sm text-warning-foreground">Only operator/admin can trigger a retry.</p>
      )}
      <Button
        disabled={!canSubmit || isSubmitting}
        onClick={() => {
          void onRetry();
        }}
        type="button"
        variant="outline"
      >
        {isSubmitting ? "Retrying..." : "Retry job"}
      </Button>
    </section>
  );
}
