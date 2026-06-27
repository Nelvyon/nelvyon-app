"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";

type Recent = {
  id: string;
  domain: string;
  provider: "semrush" | "dataforseo" | "mock";
  queryType: string;
  keywordCount: number;
  fetchedAt: string;
  expired: boolean;
};

type Summary = {
  totalCached: number;
  semrushIntegrations: number;
  dataforseoConfigured: boolean;
  fetches24h: number;
  topDomains: Array<{ domain: string; count: number }>;
};

export default function OsAgentDataPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) { setNotice(msg); setTimeout(() => setNotice(null), 5000); }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/os/agent-data");
      if (!res.ok) { setError(`Error ${res.status} al cargar agent data`); return; }
      const d = (await res.json()) as { summary: Summary; recent: Recent[] };
      setSummary(d.summary);
      setRecent(d.recent ?? []);
    } catch {
      setError("Error de red al cargar agent data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function refresh() {
    if (!domain.trim()) { flash("Introduce un dominio"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/os/agent-data/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() }),
      });
      const d = (await res.json().catch(() => ({}))) as { provider?: string; counts?: Record<string, number>; error?: string };
      if (res.ok) {
        const kw = d.counts?.keywords ?? 0;
        flash(d.provider === "none" ? "Sin proveedor SEO configurado — 0 keywords" : `${kw} keywords vía ${d.provider}`);
        void load();
      } else {
        flash(d.error ?? "Error al refrescar");
      }
    } finally {
      setBusy(false);
    }
  }

  const noProvider = summary && summary.semrushIntegrations === 0 && !summary.dataforseoConfigured;

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Agent Data</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Datos SEO reales (Semrush / DataForSEO) inyectados en los briefs de los packs OS.{" "}
              <Link href="/os/agents" className="text-primary hover:underline">Ver runs de agentes →</Link>
            </p>
          </div>
        </div>

        {notice && <div className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm">{notice}</div>}
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

        {noProvider && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-700 dark:text-yellow-300">
            Sin integración Semrush ni DataForSEO — los packs usan LLM sin datos externos.
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Semrush activas</p><p className="text-2xl font-bold mt-1">{summary.semrushIntegrations}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">DataForSEO</p><p className="text-2xl font-bold mt-1">{summary.dataforseoConfigured ? "✅" : "—"}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Cache entries</p><p className="text-2xl font-bold mt-1">{summary.totalCached}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Fetches 24h</p><p className="text-2xl font-bold mt-1">{summary.fetches24h}</p></div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="ejemplo.com"
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-64"
          />
          <Button disabled={busy} onClick={() => void refresh()}>
            {busy ? "Refrescando…" : "Refrescar datos"}
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm py-12 text-center">Cargando…</p>
        ) : recent.length === 0 ? (
          <div className="rounded-xl border border-border p-10 text-center">
            <p className="text-muted-foreground text-sm">Sin datos en cache. Refresca un dominio o lanza un pack con SEO.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase">
                <th className="px-4 py-3 text-left">Dominio</th><th className="px-4 py-3 text-left">Proveedor</th>
                <th className="px-4 py-3 text-left">Tipo</th><th className="px-4 py-3 text-right">Resultados</th>
                <th className="px-4 py-3 text-left">Estado</th><th className="px-4 py-3 text-left">Fetched</th>
              </tr></thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="px-4 py-3 text-xs">{r.domain}</td>
                    <td className="px-4 py-3"><Badge tone={r.provider === "semrush" ? "success" : r.provider === "dataforseo" ? "warning" : "neutral"}>{r.provider}</Badge></td>
                    <td className="px-4 py-3 text-xs">{r.queryType}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{r.keywordCount}</td>
                    <td className="px-4 py-3"><Badge tone={r.expired ? "neutral" : "success"}>{r.expired ? "expirado" : "cache"}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.fetchedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
