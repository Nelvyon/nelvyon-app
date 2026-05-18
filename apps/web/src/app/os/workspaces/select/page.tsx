"use client";

import { useMemo, useState } from "react";

import { Button } from "@/core/ui/button";
import { EmptyState } from "@/core/ui/EmptyState";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { WorkspaceOption } from "@/features/client_portal_v1/types";

const WORKSPACE_OPTIONS: WorkspaceOption[] = [
  { id: "new", name: "Create new workspace", role: "owner" },
  { id: "sandbox", name: "Sandbox workspace", role: "owner" },
];

export default function WorkspaceSelectPage() {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("new");
  const [phase, setPhase] = useState<"idle" | "loading" | "success" | "error">("idle");

  const selected = useMemo(
    () => WORKSPACE_OPTIONS.find((workspace) => workspace.id === selectedWorkspace) ?? null,
    [selectedWorkspace],
  );

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">Workspace selection</h2>
        <p className="text-sm text-muted-foreground">
          Choose the workspace where you will operate as owner. This step is required before project and support
          flows.
        </p>
      </header>

      {WORKSPACE_OPTIONS.length === 0 ? (
        <EmptyState
          description="No workspace options are available yet. Next: contact support to provision your tenant."
          title="No workspace available"
        />
      ) : (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
          <label className="space-y-1 text-sm text-foreground">
            Select workspace
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              onChange={(event) => setSelectedWorkspace(event.target.value)}
              value={selectedWorkspace}
            >
              {WORKSPACE_OPTIONS.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">Role in this selection: {selected?.role ?? "unknown"}.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={phase === "loading"}
              onClick={async () => {
                setPhase("loading");
                try {
                  await new Promise((resolve) => setTimeout(resolve, 550));
                  setPhase("success");
                } catch {
                  setPhase("error");
                }
              }}
              type="button"
            >
              {phase === "loading" ? "Applying workspace…" : "Continue with workspace"}
            </Button>
          </div>
        </section>
      )}

      {phase === "success" ? (
        <p className="text-sm text-success-foreground">
          Workspace selected. Next: open project creation or support flow from the app area.
        </p>
      ) : null}
      {phase === "error" ? (
        <ErrorNotice>
          <p>Cause: workspace selection did not complete.</p>
          <p className="mt-2 text-sm text-muted-foreground">Next: retry once and confirm your session is still valid.</p>
        </ErrorNotice>
      ) : null}
    </main>
  );
}
