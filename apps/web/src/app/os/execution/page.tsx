"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics";

import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { ApiKeysPanel } from "@/components/dashboard/ApiKeysPanel";
import { UsagePanel } from "@/components/dashboard/UsagePanel";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader, NelvyonDsStatusDot } from "@/design-system/components";
import Link from "next/link";
import { OS_PREMIUM_SERVICE_IDS } from "@/lib/os/premiumServiceIds";

type OsJobStepState = {
  name: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  log?: string;
};

type OsJobSnapshot = {
  jobId: string;
  serviceId: string;
  clientId: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  steps: OsJobStepState[];
  error?: { message: string; step?: string };
};

const STORAGE_KEY = "nelvyon_os_execution_job_ids_v1";

type WsFeedEvent = {
  type: "job:created" | "job:progress" | "job:completed" | "job:failed";
  jobId: string;
  serviceId: string;
  clientId: string;
  progress: number;
  status: string;
  timestamp: string;
};

type OsWorkerStatus = {
  running: boolean;
  processed: number;
  failed: number;
  lastJobId: string | null;
};

function readStoredJobIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && x.length > 0);
  } catch {
    return [];
  }
}

function writeStoredJobIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function jobStatusTone(status: OsJobSnapshot["status"]): "neutral" | "primary" | "success" | "danger" {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "danger";
    case "running":
      return "primary";
    default:
      return "neutral";
  }
}

function jobStatusDot(status: OsJobSnapshot["status"]): "ok" | "warn" | "crit" | "pending" {
  switch (status) {
    case "completed":
      return "ok";
    case "failed":
      return "crit";
    case "running":
      return "warn";
    default:
      return "pending";
  }
}

function notifierBadgeTone(t: WsFeedEvent["type"]): "neutral" | "primary" | "danger" {
  switch (t) {
    case "job:completed":
      return "neutral";
    case "job:failed":
      return "danger";
    case "job:progress":
      return "primary";
    default:
      return "neutral";
  }
}

function notifierDot(t: WsFeedEvent["type"]): "ok" | "warn" | "crit" | "pending" {
  switch (t) {
    case "job:completed":
      return "ok";
    case "job:failed":
      return "crit";
    case "job:progress":
      return "warn";
    default:
      return "pending";
  }
}

function stepDot(status: OsJobStepState["status"]): "ok" | "warn" | "crit" | "pending" {
  switch (status) {
    case "completed":
      return "ok";
    case "failed":
      return "crit";
    case "running":
      return "warn";
    default:
      return "pending";
  }
}

export default function OsExecutionPage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? "";
  const [serviceId, setServiceId] = useState<string>("web_premium");
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [jobs, setJobs] = useState<Record<string, OsJobSnapshot | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [executeBanner, setExecuteBanner] = useState<{
    message: string;
    action?: string;
    actionUrl?: string;
    variant?: "error" | "warning";
  } | null>(null);
  const [wsEvents, setWsEvents] = useState<WsFeedEvent[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState(false);
  const [workerStatus, setWorkerStatus] = useState<OsWorkerStatus | null>(null);
  const [workerForbidden, setWorkerForbidden] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);

  useEffect(() => {
    setJobIds(readStoredJobIds());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const p = q.get("payment");
    if (p === "success") {
      setPaymentNotice("Pago recibido. Tu suscripción Paddle activará el acceso a los servicios OS.");
    } else if (p === "cancelled") {
      setPaymentNotice("Pago cancelado.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/os/worker", { method: "GET", cache: "no-store", credentials: "same-origin" });
        if (cancelled) return;
        if (res.status === 403) {
          setWorkerForbidden(true);
          setWorkerStatus(null);
          return;
        }
        setWorkerForbidden(false);
        if (!res.ok) return;
        const data = (await res.json()) as OsWorkerStatus;
        if (!cancelled && data && typeof data.running === "boolean") {
          setWorkerStatus(data);
        }
      } catch {
        if (!cancelled) setWorkerStatus(null);
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    const socketRef: { current: WebSocket | null } = { current: null };
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${proto}://${window.location.host}/api/os/ws?clientId=${encodeURIComponent(tenantId)}`;

    void (async () => {
      try {
        await fetch("/api/os/ws?_warmup=1", { method: "GET", cache: "no-store", credentials: "same-origin" });
      } catch {
        if (!cancelled) setWsError(true);
      }
      if (cancelled) return;
      socketRef.current = new WebSocket(wsUrl);
      const socket = socketRef.current;
      socket.onopen = () => {
        if (!cancelled) {
          setWsConnected(true);
          setWsError(false);
        }
      };
      socket.onmessage = (ev) => {
        try {
          const data = JSON.parse(String(ev.data)) as WsFeedEvent;
          if (!cancelled && data && typeof data.type === "string" && typeof data.jobId === "string") {
            setWsEvents((prev) => [data, ...prev].slice(0, 80));
          }
        } catch {
          /* ignore malformed */
        }
      };
      socket.onerror = () => {
        if (!cancelled) setWsError(true);
      };
      socket.onclose = () => {
        if (!cancelled) setWsConnected(false);
      };
    })();

    return () => {
      cancelled = true;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [tenantId]);

  const persistIds = useCallback((next: string[]) => {
    writeStoredJobIds(next);
    setJobIds(next);
  }, []);

  const refreshJob = useCallback(async (jobId: string) => {
    const res = await fetch(`/api/os/jobs/${encodeURIComponent(jobId)}`, { method: "GET", credentials: "same-origin" });
    if (!res.ok) return;
    const data = (await res.json()) as OsJobSnapshot;
    setJobs((prev) => ({ ...prev, [jobId]: data }));
  }, []);

  useEffect(() => {
    if (jobIds.length === 0) return;
    const t = window.setInterval(() => {
      void Promise.all(jobIds.map((id) => refreshJob(id)));
    }, 1500);
    void Promise.all(jobIds.map((id) => refreshJob(id)));
    return () => window.clearInterval(t);
  }, [jobIds, refreshJob]);

  const orderedJobs = useMemo(() => {
    return jobIds.map((id) => jobs[id]).filter((j): j is OsJobSnapshot => Boolean(j));
  }, [jobIds, jobs]);

  const trackedAgentJobsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const job of Object.values(jobs)) {
      if (!job) continue;
      if (job.status !== "completed" && job.status !== "failed") continue;
      if (trackedAgentJobsRef.current.has(job.jobId)) continue;
      trackedAgentJobsRef.current.add(job.jobId);
      trackEvent("agent_executed", {
        sector: job.serviceId,
        agentName: job.serviceId,
        success: job.status === "completed",
      });
    }
  }, [jobs]);

  const runExecute = useCallback(async () => {
    setBusy(true);
    setExecuteBanner(null);
    try {
      const res = await fetch("/api/os/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          serviceId,
          payload: { source: "os_execution_ui", requestedAt: new Date().toISOString() },
        }),
      });
      const body = (await res.json()) as {
        jobId?: string;
        status?: string;
        message?: string;
        error?: string;
        action?: string;
        actionUrl?: string;
      };
      if (!res.ok) {
        const message =
          typeof body.message === "string" && body.message.length > 0
            ? body.message
            : "No se pudo encolar el servicio. Inténtalo de nuevo.";
        const action = typeof body.action === "string" ? body.action : undefined;
        const actionUrl = typeof body.actionUrl === "string" ? body.actionUrl : undefined;
        setExecuteBanner({
          message,
          action,
          actionUrl,
          variant: res.status === 429 ? "warning" : "error",
        });
        return;
      }
      const jid = body.jobId;
      if (typeof jid === "string" && jid.length > 0) {
        const next = [jid, ...jobIds.filter((x) => x !== jid)];
        persistIds(next);
        await refreshJob(jid);
      }
    } catch {
      setExecuteBanner({
        message: "No se pudo conectar con el servidor. Inténtalo más tarde.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }, [jobIds, persistIds, refreshJob, serviceId]);

  return (
    <ProtectedLayout module="os">
      <div className="space-y-8 text-foreground">
        <NelvyonDsSectionHeader
          eyebrow="Operations"
          title="OS Agents — ejecución v1"
          subtitle="Jobs multi-tenant: el clientId del job es tu tenantId (sesión JWT). WebSocket y polling usan la misma cookie de sesión."
        />

        {paymentNotice ? (
          <NelvyonDsBadge tone="primary" className="w-fit max-w-full whitespace-normal">
            {paymentNotice}
          </NelvyonDsBadge>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <UsagePanel />
          <ApiKeysPanel />
        </div>

        <NelvyonDsCard title="Gestionar plan">
          <p className="mb-4 text-sm text-zinc-400">Actualiza o cambia tu plan de NELVYON.</p>
          <Link
            href="/pricing"
            className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Ver planes →
          </Link>
        </NelvyonDsCard>

        <NelvyonDsCard title="Estado del Worker">
          <NelvyonDsSectionHeader
            eyebrow="NELVYON OS"
            title="Cola en background"
            subtitle="Worker v1: jobs encolados vía POST /api/os/execute y procesados fuera del hilo HTTP. Polling cada 5s."
          />
          {workerForbidden ? (
            <p className="text-sm text-muted-foreground">Estado del worker solo disponible para plan <span className="font-medium text-foreground">admin</span>.</p>
          ) : workerStatus === null ? (
            <p className="text-sm text-muted-foreground">No se pudo cargar el estado del worker.</p>
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 text-foreground shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <NelvyonDsStatusDot status={workerStatus.running ? "warn" : "pending"} label="Worker" />
                <NelvyonDsBadge tone={workerStatus.running ? "primary" : "warning"}>
                  {workerStatus.running ? "En ejecución" : "Detenido"}
                </NelvyonDsBadge>
              </div>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Procesados OK</dt>
                  <dd className="font-mono tabular-nums text-foreground">{workerStatus.processed}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fallidos (worker)</dt>
                  <dd className="font-mono tabular-nums text-foreground">{workerStatus.failed}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Último jobId</dt>
                  <dd className="font-mono text-xs text-foreground">{workerStatus.lastJobId ?? "—"}</dd>
                </div>
              </dl>
            </div>
          )}
        </NelvyonDsCard>

        <NelvyonDsCard title="Notificaciones en tiempo real">
          <NelvyonDsSectionHeader
            eyebrow="NELVYON OS"
            title="Bus de eventos → WebSocket"
            subtitle="Eventos job:created / job:progress / job:completed / job:failed. Warm-up GET y upgrade viven en src/pages/api/os/ws.ts (misma URL /api/os/ws)."
          />
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {!wsConnected ? (
              <NelvyonDsBadge tone="warning">Sin conexión en tiempo real</NelvyonDsBadge>
            ) : (
              <NelvyonDsBadge tone="success">WebSocket activo</NelvyonDsBadge>
            )}
            {wsError ? <NelvyonDsBadge tone="warning">Fallo al conectar / warm-up</NelvyonDsBadge> : null}
            <span className="text-xs text-muted-foreground">tenantId WS: {tenantId || "—"}</span>
          </div>
          {wsEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay eventos. Ejecuta un job con tu tenant para verlos aquí.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border bg-card p-2 shadow-card">
              {wsEvents.map((ev, idx) => (
                <li key={`${ev.jobId}-${ev.timestamp}-${idx}`} className="flex flex-wrap items-start gap-2 border-b border-border pb-2 text-sm last:border-0">
                  <NelvyonDsStatusDot status={notifierDot(ev.type)} label={ev.type} />
                  <NelvyonDsBadge tone={notifierBadgeTone(ev.type)}>{ev.type}</NelvyonDsBadge>
                  <span className="font-mono text-xs text-foreground">{ev.jobId}</span>
                  <span className="tabular-nums text-foreground">{ev.progress}%</span>
                  <span className="text-xs text-muted-foreground">{ev.timestamp}</span>
                </li>
              ))}
            </ul>
          )}
        </NelvyonDsCard>

        <NelvyonDsCard title="Ejecutar servicio">
          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm text-foreground" htmlFor="os-exec-service-id">
              <span className="font-medium">serviceId</span>
              <select
                id="os-exec-service-id"
                className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground shadow-card"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                {OS_PREMIUM_SERVICE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm text-foreground">
              <span className="font-medium">Tenant (clientId)</span>
              <span className="h-10 rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground shadow-inner">
                {tenantId || "—"}
              </span>
            </div>
            <NelvyonDsButton type="button" disabled={busy || !tenantId} onClick={() => void runExecute()}>
              {busy ? "Encolando…" : "Encolar servicio"}
            </NelvyonDsButton>
          </div>
          {executeBanner ? (
            <div className="mt-4">
              <ErrorBanner
                message={executeBanner.message}
                action={executeBanner.action}
                actionUrl={executeBanner.actionUrl}
                variant={executeBanner.variant ?? "error"}
                onDismiss={() => setExecuteBanner(null)}
              />
            </div>
          ) : null}
        </NelvyonDsCard>

        <NelvyonDsCard title="Jobs activos y recientes">
          {orderedJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay jobs en esta sesión. Ejecuta un servicio para ver el pipeline.</p>
          ) : (
            <ul className="space-y-4">
              {orderedJobs.map((job) => (
                <li
                  key={job.jobId}
                  className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-card"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <NelvyonDsStatusDot status={jobStatusDot(job.status)} label={`Job ${job.status}`} />
                    <span className="font-mono text-xs text-foreground">{job.jobId}</span>
                    <NelvyonDsBadge tone={jobStatusTone(job.status)}>{job.status}</NelvyonDsBadge>
                    <NelvyonDsBadge tone="neutral">{job.serviceId}</NelvyonDsBadge>
                    <span className="text-sm text-muted-foreground">client: {job.clientId}</span>
                    <span className="ml-auto text-sm font-medium tabular-nums text-foreground">{job.progress}%</span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-[width] duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  {job.error ? (
                    <p className="mt-2 text-sm text-destructive">
                      {job.error.message}
                      {job.error.step ? ` · step: ${job.error.step}` : ""}
                    </p>
                  ) : null}
                  <div className="mt-4 space-y-2 border-t border-border pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logs por paso</p>
                    <ol className="space-y-2">
                      {job.steps.map((s) => (
                        <li key={s.name} className="flex flex-wrap items-start gap-2 text-sm">
                          <NelvyonDsStatusDot status={stepDot(s.status)} label={`Step ${s.name}: ${s.status}`} />
                          <span className="font-medium text-foreground">{s.name}</span>
                          <span className="text-muted-foreground">— {s.description}</span>
                          {s.log ? (
                            <span className="block w-full pl-6 font-mono text-xs text-muted-foreground">{s.log}</span>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </NelvyonDsCard>
      </div>
    </ProtectedLayout>
  );
}
