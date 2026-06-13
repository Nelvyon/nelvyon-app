"use client";

import React from "react";
import Link from "next/link";

import { EmptyState } from "@/core/ui/EmptyState";
import { AutomationJob } from "@/features/automations/types";

export function JobList({ items }: { items: AutomationJob[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        description={
          <>
            Los jobs aparecen cuando NELVYON ejecuta automatizaciones (manual, reintentos o webhooks). Abre{" "}
            <Link className="text-link hover:text-link-hover hover:underline" href="/os">
              Operaciones
            </Link>{" "}
            para ver el pulso del workspace, o inicia flujos desde Revenue y entregas.
          </>
        }
        title="Aún no hay jobs de automatización"
      />
    );
  }

  return (
    <ul className="divide-y rounded-lg border border-border bg-card shadow-card">
      {items.map((job) => (
        <li className="p-3" key={job.id}>
          <Link className="font-medium text-link transition-colors hover:text-link-hover hover:underline" href={`/automations/jobs/${job.id}`}>
            Job #{job.id} · {job.job_type}
          </Link>
          <p className="text-xs text-muted-foreground">
            Status: {job.status}
            {job.client_name ? ` · ${job.client_name}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
