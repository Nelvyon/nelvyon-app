"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { dialerAdvancedApi, type DialerQueueItem } from "@/features/dialer-advanced/api";

const CLIENT_ID = "ws-client-1";

const DEFAULT_QUEUE: DialerQueueItem[] = [
  { phone: "+34600111222", contact_id: null },
  { phone: "+34600333444", contact_id: null },
  { phone: "+34600555666", contact_id: null },
];

export default function SaasDialerAdvancedPage() {
  const [queue, setQueue] = useState<DialerQueueItem[]>(DEFAULT_QUEUE);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string>("");

  const refresh = useCallback(async () => {
    try {
      const [h, s] = await Promise.all([
        dialerAdvancedApi.calls(CLIENT_ID),
        sessionId ? dialerAdvancedApi.sessionStats(sessionId) : Promise.resolve({ stats: {} }),
      ]);
      setHistory(h.items ?? []);
      if (sessionId && s.stats) setStats(s.stats as Record<string, unknown>);
      const last = (h.items ?? []).find((row) => row.transcript);
      if (last?.transcript) setLastTranscript(String(last.transcript));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const runPower = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await dialerAdvancedApi.powerDial({
        client_id: CLIENT_ID,
        queue,
        voicemail_url: "https://demo.nelvyon.com/voicemail.mp3",
      });
      setSessionId(String(res.session_id ?? ""));
      setStats((res.stats as Record<string, unknown>) ?? {});
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Power dial failed");
    } finally {
      setBusy(false);
    }
  };

  const runParallel = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await dialerAdvancedApi.parallelDial({
        client_id: CLIENT_ID,
        queue,
        parallel_limit: 3,
      });
      setSessionId(String(res.session_id ?? ""));
      setStats((res.stats as Record<string, unknown>) ?? {});
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parallel dial failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Dialer avanzado</h1>
        <p className="text-sm text-slate-500">Power dial, parallel dial, AMD, voicemail y scoring IA (F62)</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-800">Cola de llamadas</h2>
          <ul className="space-y-2 text-sm">
            {queue.map((q, i) => (
              <li className="flex justify-between rounded-lg border border-slate-100 px-3 py-2" key={i}>
                <span>{q.phone}</span>
                <span className="text-slate-400">#{i + 1}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg bg-[#0066FF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={busy}
              onClick={runPower}
              type="button"
            >
              Power Dial
            </button>
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
              disabled={busy}
              onClick={runParallel}
              type="button"
            >
              Parallel Dial
            </button>
          </div>
          {sessionId ? <p className="text-xs text-slate-500">Sesión: {sessionId}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["Realizadas", stats.calls_made ?? 0],
                ["Contactados", stats.connected ?? 0],
                ["Tasa conexión", `${stats.connection_rate_percent ?? 0}%`],
                ["Duración media", `${stats.avg_duration_seconds ?? 0}s`],
              ] as [string, string | number][]
            ).map(([label, value]) => (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={String(label)}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-xl font-semibold text-slate-900">{String(value)}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">Transcripción (última)</h3>
            <p className="mt-2 max-h-32 overflow-y-auto text-sm text-slate-600 whitespace-pre-wrap">
              {lastTranscript || "Sin transcripción aún — ejecuta Power Dial en modo mock"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">Historial</h3>
            <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-sm">
              {history.length === 0 ? (
                <li className="text-slate-400">Vacío</li>
              ) : (
                history.map((row) => (
                  <li className="border-b border-slate-50 pb-2" key={String(row.id)}>
                    {String(row.to_number)} — {String(row.outcome ?? row.status)} — score {String(row.call_score ?? "—")}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
