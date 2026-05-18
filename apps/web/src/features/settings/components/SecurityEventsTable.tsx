"use client";

import React, { useMemo, useState } from "react";

import { SecurityEvent } from "@/features/settings/securityTypes";

function actorFromDetails(event: SecurityEvent): string {
  try {
    const parsed = event.details_json ? (JSON.parse(event.details_json) as Record<string, unknown>) : null;
    const actorEmail = typeof parsed?.actor_email === "string" ? parsed.actor_email : "";
    const actorUserId = typeof parsed?.actor_user_id === "string" ? parsed.actor_user_id : "";
    return actorEmail || actorUserId || event.user_id;
  } catch {
    return event.user_id;
  }
}

function formatTs(value?: string | null): string {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString();
}

interface SecurityEventsTableProps {
  events: SecurityEvent[];
  detailBasePath?: string;
}

export function SecurityEventsTable({ events, detailBasePath = "/settings/audit" }: SecurityEventsTableProps) {
  const [term, setTerm] = useState("");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return events.filter((e) => {
      if (severity !== "all" && (e.severity ?? "") !== severity) return false;
      if (status !== "all" && (e.status ?? "") !== status) return false;
      if (!q) return true;
      const blob = [e.event_type, e.source, e.description, e.status, actorFromDetails(e)].join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [events, severity, status, term]);

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label="Search security events"
          className="w-56 rounded-md border border-input bg-background px-2 py-1 text-sm"
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search event type / actor"
          value={term}
        />
        <select
          aria-label="Filter severity"
          className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          onChange={(e) => setSeverity(e.target.value)}
          value={severity}
        >
          <option value="all">All severities</option>
          <option value="critical">critical</option>
          <option value="warning">warning</option>
          <option value="info">info</option>
        </select>
        <select
          aria-label="Filter result"
          className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          onChange={(e) => setStatus(e.target.value)}
          value={status}
        >
          <option value="all">All results</option>
          <option value="ok">ok</option>
          <option value="denied">denied</option>
          <option value="error">error</option>
          <option value="logged">logged</option>
        </select>
      </div>
      {events.length > 0 ? (
        <p aria-live="polite" className="text-xs text-muted-foreground">
          Showing {filtered.length} of {events.length} events in this workspace batch.
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">Event</th>
              <th className="py-2 pr-3">Actor</th>
              <th className="py-2 pr-3">When</th>
              <th className="py-2 pr-3">Result</th>
              <th className="py-2 pr-3">Severity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((event) => (
              <tr className="border-b border-border/70" key={event.id}>
                <td className="py-2 pr-3">
                  <a className="font-medium text-link underline-offset-2 hover:underline" href={`${detailBasePath}/${event.id}`}>
                    {event.event_type}
                  </a>
                  {event.description ? <p className="text-xs text-muted-foreground">{event.description}</p> : null}
                </td>
                <td className="py-2 pr-3 text-foreground">{actorFromDetails(event)}</td>
                <td className="py-2 pr-3 text-muted-foreground">{formatTs(event.created_at)}</td>
                <td className="py-2 pr-3 text-foreground">{event.status ?? "—"}</td>
                <td className="py-2 pr-3 text-foreground">{event.severity ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {events.length === 0
            ? "No audit/security events returned for this workspace yet. Why: nothing has been logged in this feed for the selected window, or the tenant is new. Next: perform a sign-in or protected action, then refresh; confirm you are on the correct workspace."
            : "No rows match these filters. Next: set severity and result to “All”, or clear search to see the full list again."}
        </p>
      ) : null}
    </section>
  );
}
