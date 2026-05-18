"use client";

import React from "react";

import { EmptyState } from "@/core/ui/EmptyState";
import { WorkspaceMember } from "@/features/settings/types";

export function MembersList({ members }: { members: WorkspaceMember[] }) {
  if (members.length === 0) {
    return (
      <EmptyState
        description="Invitations and active collaborators will appear here. Operators and admins can invite teammates from the form below."
        title="No workspace members yet"
      />
    );
  }

  return (
    <ul className="divide-y rounded-lg border border-border bg-card shadow-card">
      {members.map((m) => (
        <li className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm" key={m.id}>
          <div>
            <p className="font-medium text-foreground">{m.email || m.user_id || "—"}</p>
            <p className="text-xs text-muted-foreground">
              {m.role} · {m.status}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
