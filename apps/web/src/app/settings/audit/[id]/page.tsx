"use client";

import Link from "next/link";
import React from "react";
import { useParams } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonDetailCard } from "@/core/ui/Skeleton";
import { useSecurityEvents } from "@/features/settings/hooks";

function asPrettyJson(value?: string | null) {
  if (!value) return "—";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default function SettingsAuditEventDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const invalidId = !Number.isFinite(id) || id <= 0;
  const query = useSecurityEvents({ limit: 200, sort: "-created_at" });
  const event = query.data?.items.find((row) => row.id === id) ?? null;

  return (
    <ProtectedLayout module="settings">
      <div className="space-y-5">
        <Link className="text-sm text-link underline" href="/settings/audit">
          Back to Audit & security
        </Link>

        {invalidId ? (
          <ErrorNotice title="Invalid event id">
            <p>Cause: this route does not include a valid numeric security event identifier.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: return to Settings → Audit & security and open a valid row.
            </p>
          </ErrorNotice>
        ) : null}

        {query.isLoading && (
          <>
            <p className="text-sm text-muted-foreground">Loading security event for current workspace…</p>
            <SkeletonDetailCard />
          </>
        )}

        {query.isFetching && query.data ? (
          <p className="text-xs text-muted-foreground">Refreshing event detail from workspace feed…</p>
        ) : null}

        {query.error instanceof ApiError && query.error.status === 403 && (
          <ForbiddenNotice>
            <p>Cause: your role/workspace does not allow viewing this security event.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: switch workspace or ask an admin for audit visibility in this tenant.
            </p>
          </ForbiddenNotice>
        )}

        {query.error && !(query.error instanceof ApiError && query.error.status === 403) && (
          <ErrorNotice>
            <p>Cause: event detail could not be resolved because the security events request failed.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: refresh once; if it persists, confirm API/session health and retry.
            </p>
          </ErrorNotice>
        )}

        {!query.isLoading && !query.error && !event && !invalidId ? (
          <ErrorNotice title="Event not found">
            <p>Cause: this event id is not in the current workspace sample returned by the API.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: open the row from Audit & security list to avoid stale links or cross-workspace ids.
            </p>
          </ErrorNotice>
        ) : null}

        {event ? (
          <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
            <h2 className="text-base font-semibold text-foreground">
              {event.event_type} (event #{event.id})
            </h2>
            <p className="text-xs text-muted-foreground">
              Workspace-scoped trust view: data reflects the active header workspace and this API response only — not
              legal hold or long-term retention guarantees.
            </p>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Actor</dt>
                <dd>{event.user_id || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Source</dt>
                <dd>{event.source ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Result</dt>
                <dd>{event.status ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Severity</dt>
                <dd>{event.severity ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">When</dt>
                <dd>{event.created_at ?? "—"}</dd>
              </div>
            </dl>
            {event.description ? <p className="text-sm text-foreground">{event.description}</p> : null}
            <div>
              <p className="text-xs text-muted-foreground">Details payload</p>
              <pre className="mt-1 max-h-80 overflow-auto rounded bg-muted p-2 text-xs">{asPrettyJson(event.details_json)}</pre>
            </div>
          </section>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
