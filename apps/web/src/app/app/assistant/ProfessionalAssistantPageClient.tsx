"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import type { UserRole } from "@/core/auth/types";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { inboxApi } from "@/features/inbox_helpdesk/api";
import { useCreateProject, useProjects } from "@/features/projects/hooks";

type AssistantRole = "sales" | "onboarding" | "support";
type SalesStep = 1 | 2 | 3 | 4 | 5;
type OnboardingStep = 1 | 2 | 3;

const ROLE_LABEL: Record<UserRole, string> = {
  member: "Member",
  operator: "Operator",
  admin: "Admin",
  super_admin: "Super admin",
};

function formatWorkspaceTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  try {
    return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function parseRole(raw: string | null): AssistantRole {
  if (raw === "onboarding" || raw === "support" || raw === "sales") return raw;
  return "sales";
}

function nextSalesStep(current: SalesStep): SalesStep {
  if (current === 1) return 2;
  if (current === 2) return 3;
  if (current === 3) return 4;
  if (current === 4) return 5;
  return 5;
}

function previousSalesStep(current: SalesStep): SalesStep {
  if (current === 5) return 4;
  if (current === 4) return 3;
  if (current === 3) return 2;
  if (current === 2) return 1;
  return 1;
}

export function ProfessionalAssistantPageClient() {
  const searchParams = useSearchParams();
  const role = parseRole(searchParams?.get("role") ?? null);

  const { user } = useAuth();
  const canCreateProject = user ? canPerformAction(user.role, "campaigns", "create") : false;
  const canCreateTicket = user ? canPerformAction(user.role, "inbox", "create") : false;
  const canRegisterRequest = canCreateProject || canCreateTicket;

  const [businessNeed, setBusinessNeed] = useState("");
  const [budget, setBudget] = useState("");
  const [timing, setTiming] = useState("");
  const [channel, setChannel] = useState("");
  const [salesStep, setSalesStep] = useState<SalesStep>(1);
  const [salesIntakeMessage, setSalesIntakeMessage] = useState<string | null>(null);
  const [salesIntakePhase, setSalesIntakePhase] = useState<"idle" | "loading" | "success" | "error">("idle");

  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(1);
  const [engagementObjective, setEngagementObjective] = useState("");

  const [supportHandoffSubject, setSupportHandoffSubject] = useState("");
  const [supportHandoffDescription, setSupportHandoffDescription] = useState("");
  const [supportHandoffPhase, setSupportHandoffPhase] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [supportHandoffMessage, setSupportHandoffMessage] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const projectsQuery = useProjects();
  const createProject = useCreateProject();

  const ticketsQuery = useQuery({
    queryKey: ["assistant", "tickets"],
    queryFn: inboxApi.list,
  });

  const createSupportTicket = useMutation({
    mutationFn: (payload: { subject: string; description: string; channel?: string }) =>
      inboxApi.create({
        subject: payload.subject,
        description: payload.description,
        status: "open",
        priority: "normal",
        category: "support",
        channel: payload.channel ?? "assistant_v1",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-support", "tickets"] });
      await queryClient.invalidateQueries({ queryKey: ["assistant", "tickets"] });
    },
  });

  const defaultClientId = useMemo(() => {
    const firstWithClient = projectsQuery.data?.items.find((item) => Number.isFinite(item.client_id));
    return firstWithClient?.client_id ?? null;
  }, [projectsQuery.data]);

  const snapshotProject = useMemo(() => {
    const items = projectsQuery.data?.items ?? [];
    if (items.length === 0) return null;
    const drafts = items.filter((p) => (p.status ?? "").toLowerCase() === "draft");
    const pool = drafts.length > 0 ? drafts : items;
    const byRecent = [...pool].sort((a, b) => {
      const ta = a.updated_at ?? a.created_at ?? "";
      const tb = b.updated_at ?? b.created_at ?? "";
      return tb.localeCompare(ta);
    });
    return byRecent[0] ?? null;
  }, [projectsQuery.data]);

  const supportProjectsPreview = useMemo(() => {
    const items = projectsQuery.data?.items ?? [];
    return [...items]
      .sort((a, b) => {
        const ta = a.updated_at ?? a.created_at ?? "";
        const tb = b.updated_at ?? b.created_at ?? "";
        return tb.localeCompare(ta);
      })
      .slice(0, 10);
  }, [projectsQuery.data]);

  const supportTicketsPreview = useMemo(() => {
    const items = ticketsQuery.data?.items ?? [];
    return [...items]
      .sort((a, b) => {
        const ta = a.created_at ?? "";
        const tb = b.created_at ?? "";
        return tb.localeCompare(ta);
      })
      .slice(0, 10);
  }, [ticketsQuery.data]);

  const salesSummaryText = useMemo(
    () =>
      [
        `Business need: ${businessNeed}`,
        `Approximate budget: ${budget}`,
        `Timing: ${timing}`,
        `Preferred channel: ${channel}`,
      ].join("\n"),
    [businessNeed, budget, timing, channel],
  );

  const salesLoading = createProject.isPending || createSupportTicket.isPending;

  const salesTimeline = [
    { key: 1 as const, label: "Business need" },
    { key: 2 as const, label: "Approximate budget" },
    { key: 3 as const, label: "Timing" },
    { key: 4 as const, label: "Preferred channel" },
    { key: 5 as const, label: "Resumen para el equipo" },
  ] as const;

  const onFinalizeSales = async () => {
    setSalesIntakeMessage(null);
    setSalesIntakePhase("idle");

    if (!canRegisterRequest) {
      setSalesIntakePhase("error");
      setSalesIntakeMessage("Your access can view updates but cannot register a new commercial request.");
      return;
    }

    setSalesIntakePhase("loading");
    try {
      const summaryLine = [businessNeed, budget, timing, channel].join(" | ");

      if (canCreateProject && defaultClientId) {
        await createProject.mutateAsync({
          client_id: defaultClientId,
          name: businessNeed.slice(0, 80) || "Commercial request",
          project_type: channel || "general",
          status: "draft",
          brief: summaryLine,
        });
        setSalesIntakeMessage("We have registered your request. Our specialists are preparing your project.");
        setSalesIntakePhase("success");
        return;
      }

      if (canCreateTicket) {
        await createSupportTicket.mutateAsync({
          subject: `Commercial request: ${businessNeed.slice(0, 50) || "New request"}`,
          description: summaryLine,
        });
        setSalesIntakeMessage("We have registered your request and shared it with our team for review.");
        setSalesIntakePhase("success");
        return;
      }

      setSalesIntakePhase("error");
      setSalesIntakeMessage("We received your details but could not attach them to a workspace record. Please contact your workspace owner.");
    } catch {
      setSalesIntakePhase("error");
      setSalesIntakeMessage("We could not complete registration. Please retry once.");
    }
  };

  const onSupportHandoff = async () => {
    setSupportHandoffMessage(null);
    if (!canCreateTicket) {
      setSupportHandoffPhase("error");
      setSupportHandoffMessage("Your access can view updates but cannot open a new tracked request here.");
      return;
    }
    const subject = supportHandoffSubject.trim();
    const description = supportHandoffDescription.trim();
    if (!subject || !description) {
      setSupportHandoffPhase("error");
      setSupportHandoffMessage("Add a short topic and enough detail so your team can act on it.");
      return;
    }
    setSupportHandoffPhase("loading");
    try {
      await createSupportTicket.mutateAsync({
        subject: subject.slice(0, 120),
        description,
        channel: "assistant_support_v1",
      });
      setSupportHandoffPhase("success");
      setSupportHandoffMessage("Your team can see this alongside your existing requests.");
      setSupportHandoffSubject("");
      setSupportHandoffDescription("");
      await ticketsQuery.refetch();
    } catch {
      setSupportHandoffPhase("error");
      setSupportHandoffMessage("We could not log that request. Retry once or use the full support area.");
    }
  };

  if (role === "onboarding") {
    const onboardingTimeline = [
      { key: 1 as const, label: "Confirm objective" },
      { key: 2 as const, label: "Workspace snapshot" },
      { key: 3 as const, label: "You and your team" },
    ] as const;

    return (
      <ProtectedLayout module="help">
        <div className="space-y-5">
          <header className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Onboarding coordinator</h2>
            <p className="text-sm text-muted-foreground">
              A short first-pass so you know what happens next. One project path, no heavy setup on this screen.
            </p>
          </header>

          <p className="text-xs text-muted-foreground">
            Honest scope: we confirm your objective, show a minimal snapshot from data already in your workspace, and point you
            to your project draft. Provisioning and full delivery planning stay with your team.
          </p>

          <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card">
            <ul className="space-y-2">
              {onboardingTimeline.map((row) => (
                <li className="flex items-center gap-2 text-sm" key={row.key}>
                  <Badge tone={onboardingStep === row.key ? "warning" : onboardingStep > row.key ? "success" : "neutral"}>{row.key}</Badge>
                  <span className={onboardingStep === row.key ? "font-medium text-foreground" : "text-muted-foreground"}>{row.label}</span>
                </li>
              ))}
            </ul>

            {onboardingStep === 1 ? (
              <label className="block space-y-1 text-sm text-foreground">
                What is the main outcome you want from this engagement?
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  onChange={(event) => setEngagementObjective(event.target.value)}
                  rows={4}
                  value={engagementObjective}
                />
                <span className="text-xs text-muted-foreground">This is only stored in your browser for this visit so you can review it in the next step.</span>
              </label>
            ) : null}

            {onboardingStep === 2 ? (
              <div className="space-y-3">
                <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                  <p className="font-medium text-foreground">Your stated objective</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{engagementObjective.trim() || "—"}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                  <p className="font-medium text-foreground">From your workspace (read-only)</p>
                  {user ? (
                    <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                      <li>Signed in as {user.email}</li>
                      <li>Access level: {ROLE_LABEL[user.role]}</li>
                    </ul>
                  ) : (
                    <p className="mt-2 text-muted-foreground">Session details are not available.</p>
                  )}
                  {projectsQuery.isLoading ? <p className="mt-2 text-xs text-muted-foreground">Loading project list…</p> : null}
                  {projectsQuery.isError ? (
                    <ErrorNotice>
                      <p>We could not load your project list from the workspace.</p>
                      <p className="mt-2 text-sm text-muted-foreground">You can still open the project draft flow using the button in the next step.</p>
                    </ErrorNotice>
                  ) : null}
                  {!projectsQuery.isLoading && !projectsQuery.isError ? (
                    snapshotProject ? (
                      <p className="mt-2 text-muted-foreground">
                        Project highlighted for drafts: <span className="font-medium text-foreground">{snapshotProject.name}</span>
                        {snapshotProject.status ? (
                          <span className="text-muted-foreground"> ({snapshotProject.status})</span>
                        ) : null}
                      </p>
                    ) : (
                      <p className="mt-2 text-muted-foreground">No projects returned yet. Your team may still be preparing the first record.</p>
                    )
                  ) : null}
                </div>
              </div>
            ) : null}

            {onboardingStep === 3 ? (
              <div className="space-y-4 text-sm">
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <p className="font-medium text-foreground">What you can do now</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                    <li>Open your project draft to add details your specialists will see.</li>
                    <li>Use support from the workspace menu if something blocks you.</li>
                    <li>Keep your objective clear when you speak with your team.</li>
                  </ul>
                </div>
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <p className="font-medium text-foreground">What your team does behind the scenes</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                    <li>Reviews scope, assigns ownership, and aligns delivery steps.</li>
                    <li>Confirms timelines and deliverables outside this short guide.</li>
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="default">
                    <Link href="/app/projects/new">Ver borrador del proyecto</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/app/support">Open support</Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/app/assistant?role=sales">Commercial specialist</Link>
                  </Button>
                </div>
              </div>
            ) : null}

            {onboardingStep < 3 ? (
              <div className="flex flex-wrap gap-2">
                <Button disabled={onboardingStep === 1} onClick={() => setOnboardingStep((s) => (s > 1 ? ((s - 1) as OnboardingStep) : s))} type="button" variant="outline">
                  Back
                </Button>
                <Button
                  disabled={onboardingStep === 1 && !engagementObjective.trim()}
                  onClick={() => setOnboardingStep((s) => (s < 3 ? ((s + 1) as OnboardingStep) : s))}
                  type="button"
                >
                  Continue
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setOnboardingStep(2)} type="button" variant="outline">
                  Back
                </Button>
                <Button
                  onClick={() => {
                    setEngagementObjective("");
                    setOnboardingStep(1);
                  }}
                  type="button"
                  variant="ghost"
                >
                  Start again
                </Button>
              </div>
            )}
          </section>
        </div>
      </ProtectedLayout>
    );
  }

  if (role === "support") {
    const openTicketCount = supportTicketsPreview.filter((t) => {
      const v = (t.status ?? "").toLowerCase();
      return v === "open" || v === "new" || v === "pending" || v === "in_progress";
    }).length;
    const draftProjectCount = supportProjectsPreview.filter((p) => (p.status ?? "").toLowerCase() === "draft").length;
    const listsReady = !projectsQuery.isLoading && !ticketsQuery.isLoading && !projectsQuery.isError && !ticketsQuery.isError;
    const listsEmpty = listsReady && supportProjectsPreview.length === 0 && supportTicketsPreview.length === 0;

    return (
      <ProtectedLayout module="help">
        <div className="space-y-5">
          <header className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Client support executive</h2>
            <p className="text-sm text-muted-foreground">
              A calm read of what your workspace shows today. Status values come from live records here—no scripted replies and
              no turnaround promises on this screen.
            </p>
          </header>

          <p className="text-xs text-muted-foreground">
            Honest scope: you see projects and tracked requests your account can access. If something is missing, your owner may
            restrict visibility or records may still be landing in the system.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                void projectsQuery.refetch();
                void ticketsQuery.refetch();
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              Refresh status
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/app/support">Open full support</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/app/assistant?role=sales">Commercial specialist</Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">Projects</h3>
                {projectsQuery.isLoading ? (
                  <span className="text-xs text-muted-foreground">Loading…</span>
                ) : (
                  <span className="text-xs text-muted-foreground">{projectsQuery.data?.total ?? supportProjectsPreview.length} total</span>
                )}
              </div>
              {projectsQuery.isError ? (
                <ErrorNotice>
                  <p>We could not load project status from your workspace.</p>
                  <p className="mt-2 text-sm text-muted-foreground">Next: retry refresh or continue from the full support area.</p>
                </ErrorNotice>
              ) : null}
              {!projectsQuery.isLoading && !projectsQuery.isError && supportProjectsPreview.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects returned for your access yet.</p>
              ) : null}
              {!projectsQuery.isLoading && !projectsQuery.isError && supportProjectsPreview.length > 0 ? (
                <ul className="max-h-64 space-y-2 overflow-auto text-sm">
                  {supportProjectsPreview.map((p) => (
                    <li className="rounded-md border border-border bg-muted/30 px-3 py-2" key={p.id}>
                      <div className="font-medium text-foreground">{p.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Status: {p.status?.trim() || "—"} · Updated {formatWorkspaceTimestamp(p.updated_at ?? p.created_at)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">Tracked requests</h3>
                {ticketsQuery.isLoading ? (
                  <span className="text-xs text-muted-foreground">Loading…</span>
                ) : (
                  <span className="text-xs text-muted-foreground">{ticketsQuery.data?.total ?? supportTicketsPreview.length} total</span>
                )}
              </div>
              {ticketsQuery.isError ? (
                <ErrorNotice>
                  <p>We could not load tracked requests from your workspace.</p>
                  <p className="mt-2 text-sm text-muted-foreground">Next: retry refresh or use the full support area.</p>
                </ErrorNotice>
              ) : null}
              {!ticketsQuery.isLoading && !ticketsQuery.isError && supportTicketsPreview.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tracked requests returned for your access yet.</p>
              ) : null}
              {!ticketsQuery.isLoading && !ticketsQuery.isError && supportTicketsPreview.length > 0 ? (
                <ul className="max-h-64 space-y-2 overflow-auto text-sm">
                  {supportTicketsPreview.map((t) => (
                    <li className="rounded-md border border-border bg-muted/30 px-3 py-2" key={t.id}>
                      <div className="font-medium text-foreground">{t.subject}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Status: {t.status?.trim() || "—"} · Logged {formatWorkspaceTimestamp(t.created_at)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </div>

          <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
            <h3 className="text-sm font-semibold text-foreground">Próximos pasos claros</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>
                Use the full support area when you need threads, attachments, or a longer history—this view is a snapshot only.
              </li>
              {draftProjectCount > 0 ? (
                <li>
                  You have {draftProjectCount} project{draftProjectCount === 1 ? "" : "s"} in draft—align with your team before
                  moving work forward.
                </li>
              ) : null}
              {openTicketCount > 0 ? (
                <li>
                  {openTicketCount} open or in-progress request{openTicketCount === 1 ? "" : "s"}—watch status on each line
                  above; your team updates those records when they act.
                </li>
              ) : null}
              {listsEmpty ? (
                <li>
                  Nothing listed yet: if you expected activity, open a request below or ask your workspace owner to confirm your
                  access.
                </li>
              ) : null}
              <li>We do not publish response-time targets from this screen—your team sets expectations directly.</li>
            </ul>
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
            <h3 className="text-sm font-semibold text-foreground">Log a new request for your team</h3>
            <p className="text-xs text-muted-foreground">
              One clear handoff when you need something recorded. This creates a tracked item your specialists can see with the
              rest—your workspace rules decide what happens next.
            </p>
            <label className="block space-y-1 text-sm text-foreground">
              Topic
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(e) => setSupportHandoffSubject(e.target.value)}
                type="text"
                value={supportHandoffSubject}
              />
            </label>
            <label className="block space-y-1 text-sm text-foreground">
              What should your team know?
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(e) => setSupportHandoffDescription(e.target.value)}
                rows={4}
                value={supportHandoffDescription}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={supportHandoffPhase === "loading" || createSupportTicket.isPending || !canCreateTicket}
                onClick={() => void onSupportHandoff()}
                type="button"
              >
                {supportHandoffPhase === "loading" || createSupportTicket.isPending ? "Logging…" : "Log request"}
              </Button>
            </div>
            {createSupportTicket.error instanceof ApiError ? (
              <ErrorNotice>
                <p>We could not log that request through this handoff form.</p>
                <p className="mt-2 text-sm text-muted-foreground">Next: retry once or use the full support area.</p>
              </ErrorNotice>
            ) : null}
            {supportHandoffPhase === "success" && supportHandoffMessage ? (
              <p className="text-sm text-success-foreground">{supportHandoffMessage}</p>
            ) : null}
            {supportHandoffPhase === "error" && supportHandoffMessage ? (
              <ErrorNotice>
                <p>{supportHandoffMessage}</p>
              </ErrorNotice>
            ) : null}
            {!canCreateTicket ? (
              <ForbiddenNotice>
                <p>Your role can read status but cannot log a new tracked request here.</p>
                <p className="mt-2 text-sm text-muted-foreground">Next: ask your workspace owner to adjust access or use a channel your team provides.</p>
              </ForbiddenNotice>
            ) : null}
          </section>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout module="help">
      <div className="space-y-5">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">Sales Executive</h2>
          <p className="text-sm text-muted-foreground">
            Your commercial specialist captures a short brief so our team can prepare the next step. This screen does not run
            automated scoring or outbound calls.
          </p>
        </header>

        <p className="text-xs text-muted-foreground">
          Honest scope: we register a draft project or a support handoff from what you share. Final scope and delivery plan are
          confirmed by your team after review.
        </p>

        <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card">
          <ul className="space-y-2">
            {salesTimeline.map((row) => (
              <li className="flex items-center gap-2 text-sm" key={row.key}>
                <Badge tone={salesStep === row.key ? "warning" : salesStep > row.key ? "success" : "neutral"}>{row.key}</Badge>
                <span className={salesStep === row.key ? "font-medium text-foreground" : "text-muted-foreground"}>{row.label}</span>
              </li>
            ))}
          </ul>

          {salesStep === 1 ? (
            <label className="block space-y-1 text-sm text-foreground">
              What does your business need right now?
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(event) => setBusinessNeed(event.target.value)}
                rows={4}
                value={businessNeed}
              />
            </label>
          ) : null}
          {salesStep === 2 ? (
            <label className="block space-y-1 text-sm text-foreground">
              Approximate budget range
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(event) => setBudget(event.target.value)}
                type="text"
                value={budget}
              />
            </label>
          ) : null}
          {salesStep === 3 ? (
            <label className="block space-y-1 text-sm text-foreground">
              Desired timing
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(event) => setTiming(event.target.value)}
                type="text"
                value={timing}
              />
            </label>
          ) : null}
          {salesStep === 4 ? (
            <label className="block space-y-1 text-sm text-foreground">
              Preferred channel (for example email, social, search)
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(event) => setChannel(event.target.value)}
                type="text"
                value={channel}
              />
            </label>
          ) : null}
          {salesStep === 5 ? (
            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
              <p className="text-sm font-medium text-foreground">Resumen para el equipo</p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{salesSummaryText}</pre>
              <p className="text-xs text-muted-foreground">
                Next: confirm below so our specialists can register this brief in your workspace.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button disabled={salesStep === 1 || salesLoading} onClick={() => setSalesStep((prev) => previousSalesStep(prev))} type="button" variant="outline">
              Back
            </Button>
            {salesStep < 5 ? (
              <Button
                disabled={
                  salesLoading ||
                  (salesStep === 1 && !businessNeed.trim()) ||
                  (salesStep === 2 && !budget.trim()) ||
                  (salesStep === 3 && !timing.trim()) ||
                  (salesStep === 4 && !channel.trim())
                }
                onClick={() => setSalesStep((prev) => nextSalesStep(prev))}
                type="button"
              >
                Continue
              </Button>
            ) : (
              <Button disabled={salesLoading || !canRegisterRequest} onClick={onFinalizeSales} type="button">
                {salesLoading ? "Registering with your team…" : "Confirm and register"}
              </Button>
            )}
          </div>

          {salesStep === 5 && salesLoading ? (
            <p className="text-xs text-muted-foreground">Registering your brief with your workspace…</p>
          ) : null}

          {createProject.error instanceof ApiError ? (
            <ErrorNotice>
              <p>Cause: we could not register your project draft right now.</p>
              <p className="mt-2 text-sm text-muted-foreground">Next: retry once or send the request through support.</p>
            </ErrorNotice>
          ) : null}
          {createSupportTicket.error instanceof ApiError ? (
            <ErrorNotice>
              <p>Cause: we could not hand this to your team through support right now.</p>
              <p className="mt-2 text-sm text-muted-foreground">Next: retry once and keep the summary concise.</p>
            </ErrorNotice>
          ) : null}

          {salesIntakePhase === "success" && salesIntakeMessage ? <p className="text-sm text-success-foreground">{salesIntakeMessage}</p> : null}
          {salesIntakePhase === "error" && salesIntakeMessage ? (
            <ErrorNotice>
              <p>{salesIntakeMessage}</p>
              <p className="mt-2 text-sm text-muted-foreground">Next: verify permissions or open support from your workspace menu.</p>
            </ErrorNotice>
          ) : null}

          {!canRegisterRequest ? (
            <ForbiddenNotice>
              <p>Cause: your role can read updates but cannot register a new commercial request.</p>
              <p className="mt-2 text-sm text-muted-foreground">Next: ask your workspace owner to enable request permissions.</p>
            </ForbiddenNotice>
          ) : null}

          {salesIntakePhase === "success" ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/app/projects/new">Review project draft flow</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/app/support">Open support</Link>
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </ProtectedLayout>
  );
}
