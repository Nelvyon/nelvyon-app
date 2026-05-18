"use client";

import { FormEvent, useState } from "react";

import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SimpleProjectDraft, SimpleProjectInput } from "@/features/client_portal_v1/types";

const INITIAL_VALUES: SimpleProjectInput = {
  name: "",
  goal: "",
  primaryChannel: "email",
};

export default function ClientProjectWizardPage() {
  const { user } = useAuth();
  const canCreate = user ? canPerformAction(user.role, "campaigns", "create") : false;
  const [values, setValues] = useState<SimpleProjectInput>(INITIAL_VALUES);
  const [phase, setPhase] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [draft, setDraft] = useState<SimpleProjectDraft | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPhase("loading");
    try {
      // v1 uses a controlled draft skeleton; no complex launch logic is executed here.
      await new Promise((resolve) => setTimeout(resolve, 600));
      setDraft({
        id: `draft-${Date.now()}`,
        name: values.name,
        goal: values.goal,
        primaryChannel: values.primaryChannel,
        status: "draft",
        createdAt: new Date().toISOString(),
      });
      setPhase("success");
    } catch {
      setPhase("error");
    }
  };

  return (
    <ProtectedLayout module="campaigns">
      <div className="space-y-5">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">First project wizard v1</h2>
          <p className="text-sm text-muted-foreground">
            Create one simple marketing project draft with minimal fields. Automated launches are intentionally out of
            scope for this v1.
          </p>
        </header>

        {!canCreate ? (
          <ForbiddenNotice>
            <p>Cause: your role cannot create projects in this workspace.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Next: ask a workspace owner/operator to create the first draft project.
            </p>
          </ForbiddenNotice>
        ) : (
          <form className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card" onSubmit={onSubmit}>
            <label className="block space-y-1 text-sm text-foreground">
              Project name
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
                required
                type="text"
                value={values.name}
              />
            </label>
            <label className="block space-y-1 text-sm text-foreground">
              Goal
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(event) => setValues((prev) => ({ ...prev, goal: event.target.value }))}
                required
                type="text"
                value={values.goal}
              />
            </label>
            <label className="block space-y-1 text-sm text-foreground">
              Primary channel
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(event) => setValues((prev) => ({ ...prev, primaryChannel: event.target.value }))}
                value={values.primaryChannel}
              >
                <option value="email">Email</option>
                <option value="social">Social</option>
                <option value="search">Search</option>
              </select>
            </label>
            <Button disabled={phase === "loading"} type="submit">
              {phase === "loading" ? "Creating draft…" : "Create draft project"}
            </Button>
            {phase === "loading" ? (
              <p className="text-xs text-muted-foreground">
                Saving minimal project draft for this workspace. No automations are triggered in this step.
              </p>
            ) : null}
          </form>
        )}

        {phase === "success" && draft ? (
          <section className="rounded-lg border border-border bg-card p-4 shadow-card">
            <h3 className="text-base font-semibold text-foreground">Project detail (read-only)</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Status is currently limited to draft in v1. Active launches are not enabled on this flow yet.
            </p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Project id</dt>
                <dd className="text-foreground">{draft.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-foreground">
                  <Badge tone="neutral">{draft.status}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="text-foreground">{draft.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Primary channel</dt>
                <dd className="text-foreground">{draft.primaryChannel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created at</dt>
                <dd className="text-foreground">{draft.createdAt}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Next: review this draft internally before enabling any active execution path.
            </p>
          </section>
        ) : null}

        {phase === "error" ? (
          <ErrorNotice>
            <p>Cause: draft project creation failed before confirmation.</p>
            <p className="mt-2 text-sm text-muted-foreground">Next: verify required fields, then retry once.</p>
          </ErrorNotice>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
