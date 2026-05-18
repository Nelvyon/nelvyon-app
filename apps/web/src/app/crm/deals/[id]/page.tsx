"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonDetailCard } from "@/core/ui/Skeleton";
import { useCreateFollowUp, useDeal, useDealFollowUps, useUpdateDeal } from "@/features/deals/hooks";

function toInputDate(value?: string | null) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const { user } = useAuth();
  const canEdit = user ? canPerformAction(user.role, "crm", "edit") : false;
  const dealQuery = useDeal(id);
  const followUpsQuery = useDealFollowUps(id);
  const updateMutation = useUpdateDeal(id);
  const createFollowUp = useCreateFollowUp(id);

  const [stage, setStage] = useState("lead");
  const [owner, setOwner] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  React.useEffect(() => {
    if (!dealQuery.data) return;
    setStage(dealQuery.data.stage ?? "lead");
    setOwner(dealQuery.data.assigned_to ?? "");
    setNextStep(dealQuery.data.notes ?? "");
  }, [dealQuery.data]);

  const riskState = useMemo(() => {
    if (!dealQuery.data) return "unknown";
    const closeDate = dealQuery.data.expected_close ? new Date(dealQuery.data.expected_close) : null;
    if ((dealQuery.data.days_in_stage ?? 0) > 14) return "at risk";
    if (closeDate && closeDate.getTime() < Date.now()) return "at risk";
    return "healthy";
  }, [dealQuery.data]);

  const invalidId = !Number.isFinite(id) || id <= 0;

  return (
    <ProtectedLayout module="crm">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link
              href={
                dealQuery.data?.client_id != null && dealQuery.data.client_id > 0
                  ? `/crm/deals?client_id=${dealQuery.data.client_id}`
                  : "/crm/deals"
              }
            >
              Back to deals
            </Link>
          </Button>
          {dealQuery.data?.client_id != null && dealQuery.data.client_id > 0 ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/crm/clients/${dealQuery.data.client_id}`}>Open client record</Link>
            </Button>
          ) : null}
        </div>

        {invalidId ? (
          <ErrorNotice title="Invalid deal id">
            <p>Cause: this route does not contain a valid numeric deal identifier.</p>
            <p className="mt-2 text-sm text-muted-foreground">Next: return to Revenue → Deals and open a valid row.</p>
          </ErrorNotice>
        ) : null}

        {dealQuery.isLoading && (
          <>
            <p className="text-sm text-muted-foreground">Loading deal summary, pipeline fields, and follow-up activity…</p>
            <SkeletonDetailCard />
          </>
        )}
        {dealQuery.error instanceof ApiError && dealQuery.error.status === 403 && (
          <ForbiddenNotice>
            <p>Cause: this deal is outside your allowed workspace or your role cannot read CRM deals.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: pick the correct workspace in the header, or ask an admin for CRM view on this tenant.
            </p>
          </ForbiddenNotice>
        )}
        {dealQuery.error instanceof ApiError && dealQuery.error.status === 404 && (
          <ErrorNotice title="Deal not found">
            <p>Cause: this deal id is not present in the current workspace scope (deleted/moved/wrong workspace).</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: open Revenue → Deals and navigate from the list; avoid stale links from other tenants.
            </p>
          </ErrorNotice>
        )}
        {dealQuery.error &&
          !(dealQuery.error instanceof ApiError && (dealQuery.error.status === 403 || dealQuery.error.status === 404)) && (
          <ErrorNotice>
            <p>Cause: the deal request failed or returned no row (deleted id, network, or server error).</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: use Revenue → Deals to find the deal again; if the id is wrong, go back to the list.
            </p>
          </ErrorNotice>
        )}

        {dealQuery.data && (
          <>
            <section className="space-y-2 rounded-lg border border-border bg-card p-4 shadow-card">
              <h2 className="text-base font-medium text-foreground">{dealQuery.data.title}</h2>
              <p className="text-sm text-muted-foreground">
                Stage: {dealQuery.data.stage ?? "—"} · Owner: {dealQuery.data.assigned_to ?? "unassigned"} · Risk: {riskState}
              </p>
              {dealQuery.data.client_id != null && dealQuery.data.client_id > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Client:{" "}
                  <Link className="font-medium text-link hover:text-link-hover hover:underline" href={`/crm/clients/${dealQuery.data.client_id}`}>
                    Open client #{dealQuery.data.client_id}
                  </Link>{" "}
                  (Revenue account for this opportunity).
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Client: not linked on this deal — assign in your CRM source if required.</p>
              )}
              <p className="text-sm text-muted-foreground">
                Expected close: {toInputDate(dealQuery.data.expected_close) || "—"} · Value:{" "}
                {dealQuery.data.value != null ? `${dealQuery.data.value} ${dealQuery.data.currency ?? ""}`.trim() : "—"}
              </p>
            </section>

            <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
              <h3 className="text-base font-medium text-foreground">Pipeline + accountability</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Stage</span>
                  <select
                    className="w-full rounded-md border border-input bg-background px-2 py-2"
                    disabled={!canEdit || updateMutation.isPending}
                    onChange={(e) => setStage(e.target.value)}
                    value={stage}
                  >
                    <option value="lead">lead</option>
                    <option value="qualified">qualified</option>
                    <option value="proposal">proposal</option>
                    <option value="negotiation">negotiation</option>
                    <option value="won">won</option>
                    <option value="lost">lost</option>
                  </select>
                  <p className="text-xs text-muted-foreground">v1 fixed stage set (lead→won/lost). No custom stage editor yet.</p>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Owner</span>
                  <input
                    className="w-full rounded-md border border-input bg-background px-2 py-2"
                    disabled={!canEdit || updateMutation.isPending}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="owner@workspace"
                    value={owner}
                  />
                  <p className="text-xs text-muted-foreground">Owner is free text in v1 (not directory-enforced yet).</p>
                </label>
                <label className="space-y-1 text-sm sm:col-span-1">
                  <span className="text-muted-foreground">Next step</span>
                  <input
                    className="w-full rounded-md border border-input bg-background px-2 py-2"
                    disabled={!canEdit || updateMutation.isPending}
                    onChange={(e) => setNextStep(e.target.value)}
                    placeholder="Call procurement and confirm decision date"
                    value={nextStep}
                  />
                  <p className="text-xs text-muted-foreground">Stored in deal notes for now; keep this as the immediate action line.</p>
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  disabled={!canEdit || updateMutation.isPending}
                  onClick={() => void updateMutation.mutateAsync({ stage, assigned_to: owner, notes: nextStep })}
                >
                  Save pipeline fields
                </Button>
                {updateMutation.isSuccess ? (
                  <p className="text-xs text-success-foreground">Saved and synced from persisted deal detail.</p>
                ) : null}
              </div>
              {!canEdit ? (
                <p className="text-sm text-warning-foreground">Only operator roles can edit stage, owner, and next step.</p>
              ) : null}
              {updateMutation.error instanceof ApiError && updateMutation.error.status === 403 ? (
                <p className="text-sm text-warning-foreground">
                  Mutation forbidden: your role can view this deal but cannot edit CRM fields (requires `crm.edit`).
                </p>
              ) : null}
              {updateMutation.error && !(updateMutation.error instanceof ApiError && updateMutation.error.status === 403) ? (
                <div className="space-y-1 text-sm text-destructive">
                  <p>Could not save pipeline fields.</p>
                  <p className="text-muted-foreground">Next: retry save; if it fails again, refresh this deal and try once more.</p>
                </div>
              ) : null}
            </section>

            <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
              <h3 className="text-base font-medium text-foreground">Follow-up activity</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="rounded-md border border-input bg-background px-2 py-2 text-sm"
                  disabled={!canEdit || createFollowUp.isPending}
                  onChange={(e) => setFollowUpTitle(e.target.value)}
                  placeholder="Follow-up title"
                  value={followUpTitle}
                />
                <input
                  className="rounded-md border border-input bg-background px-2 py-2 text-sm"
                  disabled={!canEdit || createFollowUp.isPending}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  type="date"
                  value={followUpDate}
                />
              </div>
              <Button
                disabled={!canEdit || !followUpTitle.trim() || createFollowUp.isPending}
                onClick={() =>
                  void createFollowUp.mutateAsync({
                    title: followUpTitle.trim(),
                    due_date: followUpDate ? new Date(followUpDate).toISOString() : undefined,
                  })
                }
              >
                Add follow-up
              </Button>
              {createFollowUp.error instanceof ApiError && createFollowUp.error.status === 403 ? (
                <p className="text-sm text-warning-foreground">
                  Mutation forbidden: your role can view follow-ups but cannot add new activity (requires `crm.edit`).
                </p>
              ) : null}
              {createFollowUp.error && !(createFollowUp.error instanceof ApiError && createFollowUp.error.status === 403) ? (
                <div className="space-y-1 text-sm text-destructive">
                  <p>Could not create follow-up.</p>
                  <p className="text-muted-foreground">
                    Next: verify title/date, then retry. If it persists, reload this deal and submit again.
                  </p>
                </div>
              ) : null}
              {followUpsQuery.error ? (
                <div className="space-y-1 text-sm text-destructive">
                  <p>Could not load follow-up history for this deal.</p>
                  <p className="text-muted-foreground">Next: refresh this page; history is scoped to this deal and current workspace.</p>
                </div>
              ) : null}
              <ul className="space-y-1 text-sm">
                {(followUpsQuery.data?.items ?? []).map((item) => (
                  <li className="rounded border border-border px-2 py-1" key={item.id}>
                    {item.title} · due {toInputDate(item.due_date) || "—"} · {item.is_completed ? "done" : "open"}
                  </li>
                ))}
                {!followUpsQuery.isLoading && (followUpsQuery.data?.items?.length ?? 0) === 0 ? (
                  <li className="text-muted-foreground">No follow-up activities linked to this deal yet.</li>
                ) : null}
              </ul>
            </section>
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
