"use client";

import React from "react";
import Link from "next/link";

import { EmptyState } from "@/core/ui/EmptyState";
import { AutomationWebhook } from "@/features/automations/types";

export function WebhookList({ items }: { items: AutomationWebhook[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        description="Los webhooks permiten que sistemas externos disparen automatizaciones de NELVYON. Cuando los configures, aparecerán aquí con sus claves y actividad."
        title="Aún no hay webhooks"
      />
    );
  }

  return (
    <ul className="divide-y rounded-lg border border-border bg-card shadow-card">
      {items.map((hook) => (
        <li className="p-3" key={hook.id}>
          <Link className="font-medium text-link transition-colors hover:text-link-hover hover:underline" href={`/automations/webhooks/${hook.id}`}>
            {hook.name}
          </Link>
          <p className="text-xs text-muted-foreground">
            Key: <span className="font-mono">{hook.webhook_key}</span>
            {hook.is_active === false ? " · inactive" : " · active"}
            {hook.job_type ? ` · ${hook.job_type}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
