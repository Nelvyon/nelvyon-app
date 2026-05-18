"use client";

import { useEffect, useState } from "react";

export type AgentJobStatus = "pending" | "processing" | "completed" | "failed";

type JobPollResponse = {
  status: AgentJobStatus;
  result?: unknown;
  error?: string;
};

export function useAgentJob(jobId: string | null) {
  const [status, setStatus] = useState<AgentJobStatus | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setStatus(null);
      setResult(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const activeJobId = jobId;
    let cancelled = false;

    async function poll() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/os/jobs/${encodeURIComponent(activeJobId)}`, {
          credentials: "same-origin",
        });
        if (!res.ok) {
          if (!cancelled) {
            setError(res.status === 404 ? "Job no encontrado" : "No se pudo obtener el estado del job");
            setIsLoading(false);
          }
          return;
        }
        const body = (await res.json()) as JobPollResponse;
        if (cancelled) return;
        setStatus(body.status);
        setResult(body.result ?? null);
        setError(typeof body.error === "string" ? body.error : null);
        setIsLoading(body.status === "pending" || body.status === "processing");

        if (body.status === "completed" || body.status === "failed") {
          clearInterval(intervalId);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Error de conexión al consultar el job");
          setIsLoading(false);
        }
      }
    }

    const intervalId = setInterval(() => {
      void poll();
    }, 2000);
    void poll();

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [jobId]);

  return { status, result, error, isLoading };
}
