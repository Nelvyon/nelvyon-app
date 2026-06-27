"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";

type Event = {
  id: string;
  packRunId: string;
  sku: string;
  agentId: string;
  stepOrder: number;
  inputArtifactVersions: Record<string, number>;
  outputArtifact: string;
  outputVersion: number;
  model: string;
  llmMode: "mock" | "real" | null;
  agentStatus: "success" | "failed";
  qaScore: number | null;
  recordedAt: string;
};

type Trail = { sku: string; events: Event[]; qaScore: number | null; qaPassed: boolean | null; agentCount: number };
type Summary = { totalEvents: number; packRuns: number; uniqueAgents: number; avgStepsPerSku: number; lastRecordedAt: string | null; topAgents: Array<{ agentId: string; count: number }> };

function AgentAuditInner() {
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packRunId, setPackRunId] = useState(searchParams?.get("packRunId") ?? "");
  const [sku, setSku] = useState("");
  const [agentId, setAgentId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (packRunId) qs.set("packRunId", packRunId);
      if (sku) qs.set("sku", sku);
      if (agentId) qs.set("agentId", agentId);
      const res = await fetch(`/api/os/agent-audit?${qs.toString()}`);
      if (!res.ok) { setError(`Error ${res.status} al cargar el trail`); return; }
      const d = (await res.json()) as { summary: Summary; events: Event[] };
      setSummary(d.summary);
      setEvents(d.events ?? []);
    } catch {
      setError("Error de red al cargar el trail");
    } finally {
      setLoading(false);
    }
  }, [packRunId, sku, agentId]);

  useEffect(() => { void load(); }, [load]);

  async function loadTimeline() {
    if (!packRunId) return;
    const res = await fetch(`/api/os/agent-audit/${encodeURIComponent(packRunId)}`);
    if (res.ok) {
      const d = (await res.json()) as { trails: Trail[] };
      setTrails(d.trails ?? []);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Agent Audit Trail</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Trazabilidad agente→input→output→QA por SKU de cada growth pack.{" "}
          <Link href="/os/certificates" className="text-primary hover:underline">Certificados</Link>
          {" · "}<Link href="/os/gate" className="text-primary hover:underline">Gate</Link>
          {" · "}<Link href="/os/shield" className="text-primary hover:underline">Shield</Link>
        </p>
        <p className="text-xs text-muted-foreground mt-1">Nota: distinto de <code>/os/agents/[id]/audit</code> (job runs OS legacy). Aquí es trail a nivel pack autónomo.</p>
      </div>

      {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Eventos</p><p className="text-2xl font-bold mt-1">{summary.totalEvents}</p></div>
          <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Pack runs</p><p className="text-2xl font-bold mt-1">{summary.packRuns}</p></div>
          <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Agentes únicos</p><p className="text-2xl font-bold mt-1">{summary.uniqueAgents}</p></div>
          <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Steps / SKU</p><p className="text-2xl font-bold mt-1">{summary.avgStepsPerSku}</p></div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input value={packRunId} onChange={(e) => setPackRunId(e.target.value)} placeholder="packRunId" className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-72" />
        <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="sku" className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-44" />
        <input value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agente" className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-40" />
        <Button variant="outline" onClick={() => void load()}>Filtrar</Button>
        {packRunId && <Button onClick={() => void loadTimeline()}>Ver timeline</Button>}
      </div>

      {trails.length > 0 && (
        <div className="space-y-4">
          {trails.map((t) => (
            <div key={t.sku} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{t.sku}</h3>
                <span className="text-xs text-muted-foreground">{t.agentCount} agentes · QA {t.qaScore ?? "—"} <Badge tone={t.qaPassed ? "success" : "warning"}>{t.qaPassed ? "pass" : "review"}</Badge></span>
              </div>
              <ol className="space-y-2 border-l border-border pl-4">
                {t.events.map((e) => (
                  <li key={e.id} className="text-xs">
                    <span className="font-mono font-semibold">{e.stepOrder}. {e.agentId}</span>
                    <span className="text-muted-foreground"> → {e.outputArtifact}@v{e.outputVersion} · {e.model}{e.llmMode ? ` (${e.llmMode})` : ""} · </span>
                    <Badge tone={e.agentStatus === "success" ? "success" : "destructive"}>{e.agentStatus}</Badge>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm py-12 text-center">Cargando…</p>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-border p-10 text-center">
          <p className="text-muted-foreground text-sm">Sin eventos de trail. Ejecuta un growth pack para generar trazabilidad.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase">
              <th className="px-3 py-3 text-left">Run</th><th className="px-3 py-3 text-left">SKU</th>
              <th className="px-3 py-3 text-left">Agente</th><th className="px-3 py-3 text-right">#</th>
              <th className="px-3 py-3 text-left">Output</th><th className="px-3 py-3 text-left">Modelo</th>
              <th className="px-3 py-3 text-right">QA</th><th className="px-3 py-3 text-left">Estado</th>
              <th className="px-3 py-3 text-left">Fecha</th>
            </tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-border/50">
                  <td className="px-3 py-2 text-xs font-mono">{e.packRunId.slice(0, 8)}…</td>
                  <td className="px-3 py-2 text-xs">{e.sku}</td>
                  <td className="px-3 py-2 text-xs">{e.agentId}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{e.stepOrder}</td>
                  <td className="px-3 py-2 text-xs font-mono">{e.outputArtifact}@v{e.outputVersion}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{e.model}{e.llmMode ? ` (${e.llmMode})` : ""}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{e.qaScore ?? "—"}</td>
                  <td className="px-3 py-2"><Badge tone={e.agentStatus === "success" ? "success" : "destructive"}>{e.agentStatus}</Badge></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(e.recordedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function OsAgentAuditPage() {
  return (
    <ProtectedLayout module="os">
      <Suspense fallback={<p className="text-muted-foreground text-sm p-6">Cargando…</p>}>
        <AgentAuditInner />
      </Suspense>
    </ProtectedLayout>
  );
}
