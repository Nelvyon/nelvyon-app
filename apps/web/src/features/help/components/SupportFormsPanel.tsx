"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/core/auth/AuthContext";
import { getBrandMode } from "@/core/platform/brand";
import { isClientTicketCreateEnabled } from "@/core/platform/surfacePolicy";
import { trackProductEvent } from "@/core/telemetry/productEvents";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { useCreateTicket } from "@/features/inbox_helpdesk/hooks";
import { TicketCreateInput } from "@/features/inbox_helpdesk/types";

type SupportKind = "bug" | "help" | "feedback";

const COPY: Record<SupportKind, { title: string; hint: string; category: string; priority: string }> = {
  bug: {
    title: "Report bug",
    hint: "Describe expected behavior, actual behavior, and affected module.",
    category: "bug",
    priority: "high",
  },
  help: {
    title: "Request help",
    hint: "Ask for product guidance to complete a workflow in-app.",
    category: "help_request",
    priority: "normal",
  },
  feedback: {
    title: "Send feedback",
    hint: "Share improvement ideas or friction points.",
    category: "feedback",
    priority: "normal",
  },
};

export function SupportFormsPanel() {
  const { user } = useAuth();
  const router = useRouter();
  const isClientMode = getBrandMode() === "client";
  const mutation = useCreateTicket();
  const [kind, setKind] = useState<SupportKind>("bug");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canCreateByRole = user ? canPerformAction(user.role, "inbox", "create") : false;
  const canCreate = isClientMode ? isClientTicketCreateEnabled() && canCreateByRole : canCreateByRole;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }
    if (!canCreate) {
      setError("Your role cannot submit this form in the current workspace.");
      return;
    }
    const payload: TicketCreateInput = {
      subject: `[${kind.toUpperCase()}] ${subject.trim()}`,
      description: description.trim() || COPY[kind].hint,
      status: "open",
      priority: COPY[kind].priority,
      category: COPY[kind].category,
      channel: "in_app_help_center",
    };
    const created = await mutation.mutateAsync(payload);
    trackProductEvent("help_form_submitted", { form_kind: kind, module: "help" });
    router.push(`/inbox/tickets/${created.id}`);
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-card" id="structured-forms">
      <h2 className="text-base font-semibold text-foreground">Structured forms</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {isClientMode
          ? "These forms create real support requests when request submission is enabled for your portal."
          : "These forms create real internal tickets in your workspace. No chatbot and no hidden human handoff flow."}
      </p>
      <form className="mt-3 space-y-3" onSubmit={submit}>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(COPY) as SupportKind[]).map((k) => (
            <Button key={k} onClick={() => setKind(k)} size="sm" type="button" variant={kind === k ? "default" : "outline"}>
              {COPY[k].title}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{COPY[kind].hint}</p>
        <div>
          <label className="mb-1 block text-sm" htmlFor="support-subject">
            Subject
          </label>
          <input
            className="w-full rounded-md border border-input bg-background px-2 py-1"
            id="support-subject"
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Short summary"
            value={subject}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm" htmlFor="support-description">
            Details
          </label>
          <textarea
            className="min-h-[96px] w-full rounded-md border border-input bg-background px-2 py-1"
            id="support-description"
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Steps, context, and impact"
            value={description}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!canCreate ? (
          <p className="text-xs text-warning-foreground">
            {isClientMode
              ? "Request submission is currently disabled for this portal access."
              : "Your current role is read-only for Inbox create actions. Ask an operator/admin for submit permission."}
          </p>
        ) : null}
        <Button disabled={mutation.isPending || !canCreate} type="submit">
          {mutation.isPending ? "Submitting..." : "Submit"}
        </Button>
      </form>
    </section>
  );
}
