"use client";

import { useState } from "react";

import { Button } from "@/core/ui/button";
import { canReviewDeliverable } from "@/features/client_portal_v1/constants";
import {
  usePortalApproveDeliverable,
  usePortalRejectDeliverable,
} from "@/features/client_portal_v1/hooks";
import type { PortalDeliverable } from "@/features/client_portal_v1/types";

export function PortalDeliverableReviewPanel({ deliverable }: { deliverable: PortalDeliverable }) {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const approve = usePortalApproveDeliverable(deliverable.id);
  const reject = usePortalRejectDeliverable(deliverable.id);

  if (!canReviewDeliverable(deliverable.status)) {
    if (deliverable.client_feedback) {
      return (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <p className="font-medium text-foreground">Your feedback</p>
          <p className="mt-1 text-muted-foreground">{deliverable.client_feedback}</p>
          {deliverable.client_reviewed_at ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Reviewed {new Date(deliverable.client_reviewed_at).toLocaleString()}
            </p>
          ) : null}
        </div>
      );
    }
    return null;
  }

  async function handleApprove() {
    setError(null);
    try {
      await approve.mutateAsync(feedback.trim() || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed");
    }
  }

  async function handleReject() {
    const text = feedback.trim();
    if (!text) {
      setError("Please describe what needs to change before rejecting.");
      return;
    }
    setError(null);
    try {
      await reject.mutateAsync(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rejection failed");
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card">
      <div>
        <h2 className="text-base font-semibold text-foreground">Review this deliverable</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve when it meets your expectations, or reject with feedback so the team can revise.
        </p>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-foreground">Comments (required for reject)</span>
        <textarea
          className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Optional for approval; required if you request changes."
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={approve.isPending || reject.isPending} onClick={() => void handleApprove()}>
          {approve.isPending ? "Approving…" : "Approve"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={approve.isPending || reject.isPending}
          onClick={() => void handleReject()}
        >
          {reject.isPending ? "Sending…" : "Request changes"}
        </Button>
      </div>
    </section>
  );
}
