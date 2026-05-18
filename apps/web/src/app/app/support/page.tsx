"use client";

import { FormEvent, useMemo, useState } from "react";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";
import { EmptyState } from "@/core/ui/EmptyState";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { inboxApi } from "@/features/inbox_helpdesk/api";
import { Ticket } from "@/features/inbox_helpdesk/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function ClientSupportPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const canCreate = user ? canPerformAction(user.role, "inbox", "create") : false;

  const ticketsQuery = useQuery({
    queryKey: ["client-support", "tickets"],
    queryFn: inboxApi.list,
  });

  const createTicket = useMutation({
    mutationFn: () =>
      inboxApi.create({
        subject,
        description,
        status: "open",
        priority: "normal",
        category: "support",
        channel: "portal_v1",
      }),
    onSuccess: async () => {
      setSubject("");
      setDescription("");
      await queryClient.invalidateQueries({ queryKey: ["client-support", "tickets"] });
    },
  });

  const rows = useMemo(() => ticketsQuery.data?.items ?? [], [ticketsQuery.data]);
  const simpleRows = useMemo(
    () =>
      rows.map((ticket: Ticket) => ({
        ...ticket,
        simpleStatus: (ticket.status ?? "open").toLowerCase().includes("closed") ? "closed" : "open",
      })),
    [rows],
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createTicket.mutateAsync();
  };

  return (
    <ProtectedLayout module="inbox">
      <div className="space-y-5">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">Client help &amp; ticket entry v1</h2>
          <p className="text-sm text-muted-foreground">
            Use this form for basic support requests. Response times depend on workspace plan and team hours.
          </p>
        </header>

        {!canCreate ? (
          <ForbiddenNotice>
            <p>Cause: your current role cannot create support tickets in this workspace.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: ask the workspace owner to enable support request permissions.
            </p>
          </ForbiddenNotice>
        ) : (
          <form className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card" onSubmit={onSubmit}>
            <label className="block space-y-1 text-sm text-foreground">
              Subject
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(event) => setSubject(event.target.value)}
                required
                type="text"
                value={subject}
              />
            </label>
            <label className="block space-y-1 text-sm text-foreground">
              Description
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(event) => setDescription(event.target.value)}
                required
                rows={4}
                value={description}
              />
            </label>
            <Button disabled={createTicket.isPending} type="submit">
              {createTicket.isPending ? "Sending request…" : "Create support ticket"}
            </Button>
            {createTicket.isPending ? (
              <p className="text-xs text-muted-foreground">
                Sending ticket to workspace queue. No automatic closure or macro actions run in this v1 flow.
              </p>
            ) : null}
          </form>
        )}

        {createTicket.isSuccess ? (
          <p className="text-sm text-success-foreground">
            Ticket created successfully. Next: track updates from the workspace ticket list below.
          </p>
        ) : null}
        {createTicket.error instanceof ApiError && createTicket.error.status === 403 ? (
          <ForbiddenNotice>
            <p>Cause: API denied ticket creation for this role/workspace pair.</p>
            <p className="mt-2 text-sm text-muted-foreground">Next: verify workspace and role permissions.</p>
          </ForbiddenNotice>
        ) : null}
        {createTicket.error && !(createTicket.error instanceof ApiError && createTicket.error.status === 403) ? (
          <ErrorNotice>
            <p>Cause: support request could not be created.</p>
            <p className="mt-2 text-sm text-muted-foreground">Next: retry once and keep the subject concise.</p>
          </ErrorNotice>
        ) : null}

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Your workspace tickets</h3>
          {ticketsQuery.isLoading ? <SkeletonListRows aria-label="Loading support tickets" rows={6} /> : null}
          {ticketsQuery.isFetching && ticketsQuery.data ? (
            <p className="text-xs text-muted-foreground">Refreshing ticket list for current workspace…</p>
          ) : null}
          {ticketsQuery.error instanceof ApiError && ticketsQuery.error.status === 403 ? (
            <ForbiddenNotice>
              <p>Cause: this ticket list is blocked for your role in the active workspace.</p>
              <p className="mt-2 text-sm text-muted-foreground">Next: ask owner/admin for support list visibility.</p>
            </ForbiddenNotice>
          ) : null}
          {ticketsQuery.error && !(ticketsQuery.error instanceof ApiError && ticketsQuery.error.status === 403) ? (
            <ErrorNotice>
              <p>Cause: ticket list request failed unexpectedly.</p>
              <p className="mt-2 text-sm text-muted-foreground">Next: refresh once and verify your session token.</p>
            </ErrorNotice>
          ) : null}
          {ticketsQuery.data && simpleRows.length === 0 ? (
            <EmptyState
              description="No tickets yet in this workspace. Create one request above to start support tracking."
              title="No support tickets"
            />
          ) : null}
          {simpleRows.length > 0 ? (
            <ul className="divide-y rounded-lg border border-border bg-card shadow-card">
              {simpleRows.map((ticket) => (
                <li className="p-3 text-sm" key={ticket.id}>
                  <p className="font-medium text-foreground">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    Status: <Badge tone={ticket.simpleStatus === "closed" ? "success" : "warning"}>{ticket.simpleStatus}</Badge>{" "}
                    · Workspace: {ticket.workspace_id ?? "—"} · Ticket #{ticket.id}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <p className="text-xs text-muted-foreground">
          Honest scope: v1 supports basic support intake only (open/closed visibility). No macros, no automated routing,
          and no destructive controls from this surface.
        </p>
      </div>
    </ProtectedLayout>
  );
}
