"use client";

import Link from "next/link";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { ApiError } from "@/core/api/types";
import { useCommunicationsSummary, useSignupConfirmation } from "@/features/communications/hooks";

export default function CommunicationsV1Page() {
  const summaryQuery = useCommunicationsSummary();
  const signupMutation = useSignupConfirmation();
  const summary = summaryQuery.data;

  return (
    <ProtectedLayout module="help">
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Channels and communications</h2>
            <Badge tone="neutral">NELVYON v1</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Outbound email your workspace can rely on today: confirmations and activity notices. This version does not send
            mass campaigns or voice calls—those ship only when the platform exposes them as real capabilities.
          </p>
        </header>

        <p className="max-w-3xl text-xs text-muted-foreground">
          Honest scope: delivery uses the same transactional email path as the rest of the product. Without a provider key,
          messages are still recorded in the queue for audit.
        </p>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
            <h3 className="text-sm font-semibold text-foreground">1 · Access confirmation</h3>
            <p className="text-sm text-muted-foreground">
              Send a short transactional email confirming workspace access is active. Defaults to your account email.
            </p>
            <Button
              disabled={signupMutation.isPending}
              onClick={() => {
                void signupMutation.mutateAsync({});
              }}
              type="button"
            >
              {signupMutation.isPending ? "Sending…" : "Send confirmation email"}
            </Button>
            {signupMutation.data ? (
              <p className="text-xs text-muted-foreground">
                Status: <span className="font-medium text-foreground">{signupMutation.data.status}</span> —{" "}
                {signupMutation.data.message}
              </p>
            ) : null}
            {signupMutation.error instanceof ApiError ? (
              <ErrorNotice>
                <p>Could not send confirmation right now.</p>
              </ErrorNotice>
            ) : null}
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card md:col-span-2">
            <h3 className="text-sm font-semibold text-foreground">2 · New ticket and project notices</h3>
            <p className="text-sm text-muted-foreground">
              When a tracked request or project draft is created through the workspace APIs, the system sends a transactional
              notice: client email on the ticket when it is valid, otherwise the operator who created the record. Project
              creation notifies the creator so delivery stays aligned.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/inbox/tickets">Open requests queue</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/app/projects/new">New project draft</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">3 · Simple day summary</h3>
            <Button onClick={() => void summaryQuery.refetch()} size="sm" type="button" variant="outline">
              Refresh summary
            </Button>
          </div>
          {summaryQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading summary…</p> : null}
          {summaryQuery.error instanceof ApiError ? (
            <ErrorNotice>
              <p>Could not load communications summary.</p>
            </ErrorNotice>
          ) : null}
          {summary ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                UTC day <span className="font-medium text-foreground">{summary.period_utc_date}</span> · Tracked requests
                created: <span className="font-medium text-foreground">{summary.tickets_created_today}</span> · Project drafts
                created: <span className="font-medium text-foreground">{summary.projects_created_today}</span>
              </p>
              <p>
                Email queue (this workspace): total {summary.email.total}, sent {summary.email.sent}, pending{" "}
                {summary.email.pending}, failed {summary.email.failed}. Provider configured:{" "}
                {summary.email.sendgrid_configured ? "yes" : "no"}.
              </p>
              <p className="text-xs">{summary.scope_note}</p>
              {summary.recent_email_events.length > 0 ? (
                <ul className="max-h-48 space-y-2 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
                  {summary.recent_email_events.map((row) => (
                    <li className="border-b border-border pb-2 last:border-0 last:pb-0" key={row.id}>
                      <span className="font-medium text-foreground">#{row.id}</span> {row.subject} → {row.to_email} (
                      {row.status}
                      {row.email_type ? ` · ${row.email_type}` : ""})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs">No email queue rows for this workspace yet.</p>
              )}
            </div>
          ) : null}
        </section>

        <section className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/app/support">Open support</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/billing">Billing</Link>
          </Button>
        </section>
      </div>
    </ProtectedLayout>
  );
}
