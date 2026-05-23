"use client";

import { ChevronDown, ChevronRight, Phone, PhoneCall, PhoneOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { DashboardTabs, MetricGrid, DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable } from "@/features/dashboard/components/DashboardTabs";
import { dashboardDialerApi } from "@/features/dashboard/api";

type Row = Record<string, unknown>;

function str(v: unknown, fb = "—"): string {
  if (v == null || v === "") return fb;
  return String(v);
}

export default function DialerPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [history, setHistory] = useState<Row[]>([]);
  const [number, setNumber] = useState("");
  const [activeSid, setActiveSid] = useState("");
  const [callStatus, setCallStatus] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
    const [s, h] = await Promise.all([dashboardDialerApi.stats(), dashboardDialerApi.history()]);
    setStats(s);
    setHistory(h.items ?? []);
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    if (!activeSid) return;
    const poll = () => {
      dashboardDialerApi
        .status(activeSid)
        .then((r) => setCallStatus(str(r.status, "unknown")))
        .catch(() => undefined);
    };
    poll();
    const t = setInterval(poll, 2000);
    return () => clearInterval(t);
  }, [activeSid]);

  async function dial() {
    const res = await dashboardDialerApi.call({ to_number: number });
    if (res.pending_auth) {
      setCallStatus("pending_auth");
      return;
    }
    const sid = str(res.call_sid);
    if (sid) setActiveSid(sid);
    setCallStatus(str(res.status, "queued"));
    load();
  }

  async function hangup() {
    if (!activeSid) return;
    await dashboardDialerApi.end(activeSid);
    setActiveSid("");
    setCallStatus("completed");
    load();
  }

  const metrics = [
    { label: "Llamadas hoy", value: str(stats.calls_today, "0") },
    { label: "Duración media", value: `${str(stats.avg_duration_seconds, "0")}s` },
    { label: "Tasa contacto", value: `${str(stats.contact_rate_percent, "0")}%` },
    { label: "Pendientes", value: str(stats.pending_calls, "0") },
  ];

  const twilioOk = stats.twilio_configured !== false;

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Phone className="h-7 w-7 text-primary" aria-hidden />
            Dialer VoIP
          </h1>
          <p className="text-sm text-muted-foreground">Marcación Twilio con grabación y transcripción</p>
        </div>

        {!twilioOk ? (
          <p className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200">
            Twilio no está configurado. Las llamadas quedarán en estado pending_auth.
          </p>
        ) : null}

        <MetricGrid items={metrics} loading={loading} />

        <div className="rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">Panel de marcación</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-sm">
              Número
              <input
                className="mt-1 w-48 rounded border px-3 py-2 text-sm"
                placeholder="+34600111222"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </label>
            <Button onClick={dial} disabled={!number.trim() || Boolean(activeSid)}>
              <PhoneCall className="mr-2 h-4 w-4" /> Llamar
            </Button>
            {activeSid ? (
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={hangup}>
                <PhoneOff className="mr-2 h-4 w-4" /> Colgar
              </Button>
            ) : null}
          </div>
          {callStatus ? (
            <p className="mt-3 text-sm">
              Estado: <span className="font-medium capitalize">{callStatus}</span>
            </p>
          ) : null}
        </div>

        <DashboardListShell
          empty={!loading && history.length === 0}
          emptyDescription="Realiza tu primera llamada desde el panel de marcación."
          emptyTitle="Sin historial de llamadas"
          loading={loading}
          skeleton={<SkeletonTable />}
        >
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">Contacto</th>
                  <th className="px-4 py-3 text-left">Número</th>
                  <th className="px-4 py-3 text-left">Duración</th>
                  <th className="px-4 py-3 text-left">Resultado</th>
                  <th className="px-4 py-3 text-left">Transcripción</th>
                </tr>
              </thead>
              <tbody>
                {history.map((c) => {
                  const id = str(c.id);
                  const open = expanded[id];
                  return (
                    <tr key={id} className="border-t transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">{str(c.contact_name || c.contact_email, "—")}</td>
                    <td className="px-4 py-3">{str(c.to_number)}</td>
                    <td className="px-4 py-3">{str(c.duration_seconds, "0")}s</td>
                    <td className="px-4 py-3 capitalize">{str(c.outcome || c.status, "—")}</td>
                    <td className="px-4 py-3">
                      {c.transcript ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 text-left text-primary"
                          onClick={() => setExpanded({ ...expanded, [id]: !open })}
                        >
                          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                          <span className="text-xs">{open ? str(c.transcript) : "Ver"}</span>
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </DashboardListShell>
      </DashboardPageTransition>
    </ProtectedLayout>
  );
}
