"use client";

import type { ReactNode } from "react";

import { AIDisclosureBadge } from "@/components/AIDisclosureBadge";
import { useAgentJob, type AgentJobStatus } from "@/hooks/useAgentJob";

/** OS sector dashboards — 8 agent tiles (mig 264). */
export const AGENT_OS_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";

export function AgentGrid({ children }: { children: ReactNode }) {
  return <div className={AGENT_OS_GRID_CLASS}>{children}</div>;
}

type AgentGridItemProps = {
  children: ReactNode;
  /** Muestra el badge EU AI Act cuando hay resultado (no en loading/idle). */
  hasResult?: boolean;
};

export function AgentGridItem({ children, hasResult = false }: AgentGridItemProps) {
  return (
    <div className="flex flex-col">
      {children}
      {hasResult ? <AIDisclosureBadge className="mt-2 border-t border-zinc-800/80 pt-2" /> : null}
    </div>
  );
}

type AgentJobProgressProps = {
  jobId: string | null;
  onRetry?: () => void;
};

function statusLabel(status: AgentJobStatus | null): string {
  switch (status) {
    case "pending":
      return "En cola…";
    case "processing":
      return "Procesando…";
    case "completed":
      return "Completado";
    case "failed":
      return "Error";
    default:
      return "";
  }
}

/** Progreso async de un job OS (polling MIG 282). */
export function AgentJobProgress({ jobId, onRetry }: AgentJobProgressProps) {
  const { status, result, error, isLoading } = useAgentJob(jobId);

  if (!jobId) return null;

  if (status === "processing" || (isLoading && status === "pending")) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-indigo-300" role="status">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
        Procesando…
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
        <p className="font-medium text-emerald-300">{statusLabel(status)}</p>
        {result !== null && result !== undefined ? (
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-emerald-100/90">
            {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
          </pre>
        ) : null}
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
        <p className="font-medium text-rose-300">No se pudo completar el agente</p>
        <p className="mt-1 text-xs text-rose-200/90">{error ?? "Error desconocido"}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
          >
            Reintentar
          </button>
        ) : null}
      </div>
    );
  }

  return null;
}
