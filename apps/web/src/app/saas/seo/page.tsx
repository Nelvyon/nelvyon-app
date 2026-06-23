"use client";

import { useCallback, useEffect, useState } from "react";

import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Keyword {
  id: string;
  keyword: string;
  position: number;
  previousPosition: number | null;
  searchVolume: number;
  difficulty: number;
  cpc: number;
  url: string | null;
  updatedAt: string;
}

interface SeoIssue {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  description: string;
  affectedUrls: string[];
  count: number;
}

interface SeoSummary {
  domainAuthority: number;
  organicTraffic: number;
  keywords: number;
  backlinks: number;
  crawledAt: string | null;
}

// ─── Keyword row ──────────────────────────────────────────────────────────────

function KeywordRow({ kw }: { kw: Keyword }) {
  const delta = kw.previousPosition !== null ? kw.previousPosition - kw.position : null;
  const diffColor = kw.difficulty >= 70 ? "text-red-400" : kw.difficulty >= 40 ? "text-yellow-400" : "text-green-400";

  return (
    <div className="grid grid-cols-[minmax(0,2fr)_60px_80px_80px_80px_80px] items-center gap-3 border-b border-border py-3 last:border-none text-sm">
      <div>
        <p className="font-medium text-foreground">{kw.keyword}</p>
        {kw.url && <p className="truncate text-xs text-muted-foreground">{kw.url}</p>}
      </div>
      <div className="text-center">
        <span className={`font-semibold ${kw.position <= 3 ? "text-green-400" : kw.position <= 10 ? "text-yellow-400" : "text-foreground"}`}>
          #{kw.position}
        </span>
        {delta !== null && (
          <p className={`text-xs ${delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-muted-foreground"}`}>
            {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${Math.abs(delta)}` : "—"}
          </p>
        )}
      </div>
      <p className="text-center text-muted-foreground">{kw.searchVolume.toLocaleString("es-ES")}</p>
      <p className={`text-center font-medium ${diffColor}`}>{kw.difficulty}</p>
      <p className="text-center text-muted-foreground">{kw.cpc.toFixed(2)} €</p>
      <p className="text-center text-xs text-muted-foreground">{new Date(kw.updatedAt).toLocaleDateString("es-ES")}</p>
    </div>
  );
}

// ─── Add keyword modal ────────────────────────────────────────────────────────

function AddKeywordModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [keywords, setKeywords] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const kws = keywords.split("\n").map((k) => k.trim()).filter(Boolean);
    if (kws.length === 0) { setError("Introduce al menos una keyword"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/seo/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: kws }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(j.detail ?? "Error al añadir keywords");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Añadir keywords</h2>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Keywords (una por línea)</label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={8}
              placeholder={"agencia marketing digital\nposicionamiento seo madrid\ngestión redes sociales empresa"}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Añadiendo…" : "Añadir keywords"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaasSeoPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [issues, setIssues] = useState<SeoIssue[]>([]);
  const [summary, setSummary] = useState<SeoSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<"keywords" | "issues">("keywords");
  const [sort, setSort] = useState<"position" | "volume" | "difficulty">("position");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kwRes, issRes, sumRes] = await Promise.allSettled([
        fetch("/api/v1/seo/keywords"),
        fetch("/api/v1/seo/issues"),
        fetch("/api/v1/seo/summary"),
      ]);
      if (kwRes.status === "fulfilled" && kwRes.value.ok) {
        const d = (await kwRes.value.json().catch(() => ({ keywords: [] }))) as { keywords: Keyword[] };
        setKeywords(d.keywords ?? []);
      }
      if (issRes.status === "fulfilled" && issRes.value.ok) {
        const d = (await issRes.value.json().catch(() => ({ issues: [] }))) as { issues: SeoIssue[] };
        setIssues(d.issues ?? []);
      }
      if (sumRes.status === "fulfilled" && sumRes.value.ok) {
        const d = (await sumRes.value.json().catch(() => null)) as SeoSummary | null;
        setSummary(d);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sorted = [...keywords].sort((a, b) => {
    if (sort === "position") return a.position - b.position;
    if (sort === "volume") return b.searchVolume - a.searchVolume;
    return b.difficulty - a.difficulty;
  });

  const top3 = keywords.filter((k) => k.position <= 3).length;
  const top10 = keywords.filter((k) => k.position <= 10).length;
  const errors = issues.filter((i) => i.type === "error").length;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SaasSidebar activeId="campanias" />
          <main className="space-y-6">
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader
            title="SEO"
            subtitle="Monitoriza posiciones, audita errores y optimiza tu presencia orgánica"
          />
          <NelvyonDsButton onClick={() => setShowAdd(true)}>+ Añadir keywords</NelvyonDsButton>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { label: "Keywords rastreadas", value: keywords.length },
            { label: "Top 3", value: top3 },
            { label: "Top 10", value: top10 },
            { label: "Errores SEO", value: errors },
            ...(summary ? [
              { label: "Tráfico orgánico", value: summary.organicTraffic.toLocaleString("es-ES") },
              { label: "Backlinks", value: summary.backlinks.toLocaleString("es-ES") },
            ] : []),
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* GSC hint */}
        <NelvyonDsCard className="border-blue-500/20 bg-blue-500/5 p-4">
          <p className="text-sm font-medium text-blue-400">💡 Conecta Google Search Console</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Añade <code className="rounded bg-muted px-1 text-xs">GOOGLE_SEARCH_CONSOLE_*</code> en Railway para importar datos reales de GSC automáticamente.
          </p>
        </NelvyonDsCard>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {(["keywords", "issues"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t === "keywords" ? `Keywords (${keywords.length})` : `Problemas SEO (${issues.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/30" />)}
          </div>
        ) : tab === "keywords" ? (
          keywords.length === 0 ? (
            <NelvyonDsCard className="p-16 text-center">
              <p className="text-5xl">🔍</p>
              <p className="mt-4 text-lg font-semibold text-foreground">Sin keywords rastreadas</p>
              <p className="mt-2 text-sm text-muted-foreground">Añade las palabras clave que quieres posicionar</p>
              <NelvyonDsButton className="mt-5" onClick={() => setShowAdd(true)}>+ Añadir keywords</NelvyonDsButton>
            </NelvyonDsCard>
          ) : (
            <NelvyonDsCard className="overflow-hidden p-0">
              {/* Table header */}
              <div className="grid grid-cols-[minmax(0,2fr)_60px_80px_80px_80px_80px] items-center gap-3 border-b border-border bg-muted/20 px-5 py-3 text-xs font-medium text-muted-foreground">
                <span>Keyword</span>
                <button className={`text-center hover:text-foreground ${sort === "position" ? "text-primary" : ""}`} onClick={() => setSort("position")}>Pos. ▾</button>
                <button className={`text-center hover:text-foreground ${sort === "volume" ? "text-primary" : ""}`} onClick={() => setSort("volume")}>Búsq/mes</button>
                <button className={`text-center hover:text-foreground ${sort === "difficulty" ? "text-primary" : ""}`} onClick={() => setSort("difficulty")}>KD</button>
                <span className="text-center">CPC</span>
                <span className="text-center">Actualiz.</span>
              </div>
              <div className="px-5">
                {sorted.map((kw) => <KeywordRow key={kw.id} kw={kw} />)}
              </div>
            </NelvyonDsCard>
          )
        ) : (
          issues.length === 0 ? (
            <NelvyonDsCard className="p-16 text-center">
              <p className="text-5xl">✅</p>
              <p className="mt-4 text-lg font-semibold text-foreground">Sin problemas SEO detectados</p>
              <p className="mt-2 text-sm text-muted-foreground">Ejecuta un crawler para detectar problemas on-page</p>
            </NelvyonDsCard>
          ) : (
            <div className="flex flex-col gap-3">
              {issues.map((issue) => (
                <NelvyonDsCard key={issue.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{issue.type === "error" ? "❌" : issue.type === "warning" ? "⚠️" : "ℹ️"}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{issue.title}</p>
                        <NelvyonDsBadge tone={issue.type === "error" ? "danger" : issue.type === "warning" ? "warning" : "primary"}>
                          {issue.count} páginas
                        </NelvyonDsBadge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{issue.description}</p>
                      {issue.affectedUrls.slice(0, 2).map((url) => (
                        <p key={url} className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{url}</p>
                      ))}
                    </div>
                  </div>
                </NelvyonDsCard>
              ))}
            </div>
          )
        )}
      </div>

      {showAdd && <AddKeywordModal onClose={() => setShowAdd(false)} onSaved={load} />}
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}
