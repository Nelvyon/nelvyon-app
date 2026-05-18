"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  AIAnalysisResult,
  FunnelAnalysis,
  HeatmapAlert,
  HeatmapPoint,
  SessionRow,
  SiteConfig,
} from "@nelvyon/saas";

type Tab = "heatmap" | "sessions" | "funnel" | "analyze" | "alerts" | "install";

export default function HeatmapDashboard() {
  const [tab, setTab] = useState<Tab>("heatmap");
  const [status, setStatus] = useState("");
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [domainDraft, setDomainDraft] = useState("https://mi-sitio.com");

  const [page, setPage] = useState("/");
  const [heatType, setHeatType] = useState<"click" | "move" | "scroll">("click");
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [funnelSteps, setFunnelSteps] = useState("");
  const [funnelResult, setFunnelResult] = useState<FunnelAnalysis | null>(null);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [alerts, setAlerts] = useState<HeatmapAlert[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/saas/heatmap/site");
    if (!res.ok) return;
    const data = (await res.json()) as { config: SiteConfig | null };
    setConfig(data.config);
  }, []);

  useEffect(() => {
    loadConfig().catch(() => setStatus("No se pudo cargar el sitio"));
  }, [loadConfig]);

  const loadHeatmap = useCallback(async () => {
    if (!config?.siteId) return;
    const q = new URLSearchParams({ siteId: config.siteId, page, type: heatType });
    const res = await fetch(`/api/saas/heatmap/data?${q}`);
    if (!res.ok) throw new Error("fail");
    const data = (await res.json()) as { points: HeatmapPoint[] };
    setPoints(data.points ?? []);
  }, [config?.siteId, page, heatType]);

  useEffect(() => {
    if (tab === "heatmap" && config?.siteId) loadHeatmap().catch(() => setStatus("Error heatmap"));
  }, [tab, config?.siteId, loadHeatmap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#334155";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#475569";
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px sans-serif";
    ctx.fillText("Vista simulada de página", 16, 28);
    for (const p of points) {
      const px = (p.x / 100) * (w - 32) + 16;
      const py = (p.y / 100) * (h - 48) + 40;
      const r = 28 + (p.value / 100) * 36;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      const alpha = 0.15 + (p.value / 100) * 0.55;
      g.addColorStop(0, `rgba(248,113,113,${alpha})`);
      g.addColorStop(0.5, `rgba(251,146,60,${alpha * 0.6})`);
      g.addColorStop(1, "rgba(248,113,113,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [points]);

  async function createSite(): Promise<void> {
    setStatus("");
    const res = await fetch("/api/saas/heatmap/site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: domainDraft.trim() }),
    });
    if (!res.ok) {
      setStatus("Error al crear sitio");
      return;
    }
    const data = (await res.json()) as { config: SiteConfig };
    setConfig(data.config);
    setStatus("Sitio creado");
  }

  async function loadSessions(): Promise<void> {
    if (!config?.siteId) return;
    const res = await fetch(`/api/saas/heatmap/sessions?siteId=${encodeURIComponent(config.siteId)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { sessions: SessionRow[] };
    setSessions(data.sessions ?? []);
  }

  useEffect(() => {
    if (tab === "sessions" && config?.siteId) void loadSessions();
  }, [tab, config?.siteId]);

  async function runFunnel(): Promise<void> {
    if (!config?.siteId) return;
    const steps = funnelSteps
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch("/api/saas/heatmap/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: config.siteId, steps }),
    });
    if (!res.ok) {
      setStatus("Error funnel");
      return;
    }
    const data = (await res.json()) as { analysis: FunnelAnalysis };
    setFunnelResult(data.analysis);
  }

  async function runAi(): Promise<void> {
    if (!config?.siteId) return;
    setAiLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/saas/heatmap/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: config.siteId }),
      });
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as { analysis: AIAnalysisResult };
      setAiResult(data.analysis);
    } catch {
      setStatus("Error análisis IA");
    } finally {
      setAiLoading(false);
    }
  }

  async function loadAlerts(refresh?: boolean): Promise<void> {
    if (!config?.siteId) return;
    const q = new URLSearchParams({ siteId: config.siteId });
    if (refresh) q.set("refresh", "1");
    const res = await fetch(`/api/saas/heatmap/alerts?${q}`);
    if (!res.ok) return;
    const data = (await res.json()) as { alerts: HeatmapAlert[] };
    setAlerts(data.alerts ?? []);
  }

  useEffect(() => {
    if (tab === "alerts" && config?.siteId) void loadAlerts(true);
  }, [tab, config?.siteId]);

  async function copyScript(): Promise<void> {
    if (!config?.trackingScript) return;
    await navigator.clipboard.writeText(config.trackingScript);
    setStatus("Script copiado");
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "heatmap", label: "Heatmap" },
    { id: "sessions", label: "Sesiones" },
    { id: "funnel", label: "Funnel" },
    { id: "analyze", label: "Análisis IA" },
    { id: "alerts", label: "Alertas" },
    { id: "install", label: "Instalar" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Heatmaps & session analytics</h1>
          <p className="mt-2 text-sm text-slate-400">
            Mapas de calor, embudos y alertas con interpretación IA.
          </p>
        </header>

        {!config && (
          <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <p className="mb-3 text-sm text-slate-400">Crea un sitio para empezar a trackear.</p>
            <div className="flex flex-wrap gap-3">
              <input
                className="min-w-[200px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                value={domainDraft}
                onChange={(e) => setDomainDraft(e.target.value)}
                placeholder="https://tu-dominio.com"
              />
              <button
                type="button"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
                onClick={() => void createSite()}
              >
                Crear sitio
              </button>
            </div>
          </div>
        )}

        {config && (
          <>
            <p className="mb-4 text-xs text-slate-500">
              Site ID: <code className="text-indigo-300">{config.siteId}</code> · {config.domain}
            </p>
            <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    tab === t.id ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                  }`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </>
        )}

        {status && <p className="mb-4 text-center text-sm text-amber-200/90">{status}</p>}

        {config && tab === "heatmap" && (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <label className="text-sm">
                <span className="text-slate-500">Página</span>
                <input
                  className="ml-2 rounded border border-slate-700 bg-slate-950 px-2 py-1"
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="text-slate-500">Tipo</span>
                <select
                  className="ml-2 rounded border border-slate-700 bg-slate-950 px-2 py-1"
                  value={heatType}
                  onChange={(e) => setHeatType(e.target.value as typeof heatType)}
                >
                  <option value="click">Clicks</option>
                  <option value="move">Movimiento</option>
                  <option value="scroll">Scroll</option>
                </select>
              </label>
              <button
                type="button"
                className="rounded-lg bg-slate-800 px-3 py-1 text-sm"
                onClick={() => void loadHeatmap()}
              >
                Actualizar
              </button>
            </div>
            <canvas ref={canvasRef} width={640} height={400} className="w-full max-w-3xl rounded-xl border border-slate-700" />
            <p className="text-xs text-slate-500">
              Coordenadas normalizadas 0–100. Rojo = mayor densidad de eventos.
            </p>
          </section>
        )}

        {config && tab === "sessions" && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <ul className="space-y-2 text-sm">
              {sessions.length === 0 ? (
                <li className="text-slate-500">No hay sesiones aún.</li>
              ) : (
                sessions.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                  >
                    <div>
                      <span className="text-slate-400">{s.device}</span>
                      <span className="mx-2 text-slate-600">·</span>
                      <span>{s.duration}s</span>
                      <span className="mx-2 text-slate-600">·</span>
                      <span>{s.pagesViewed} pág.</span>
                      <span className="mx-2 text-slate-600">·</span>
                      <span>scroll {s.scrollDepth}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.hasRageClick && (
                        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">rage_click</span>
                      )}
                      <span className="max-w-xs truncate text-xs text-slate-500">{s.page}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>
        )}

        {config && tab === "funnel" && (
          <section className="space-y-4">
            <label className="block text-sm">
              <span className="text-slate-400">Pasos (URL o path, uno por línea)</span>
              <textarea
                className="mt-1 min-h-[100px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm"
                value={funnelSteps}
                onChange={(e) => setFunnelSteps(e.target.value)}
                placeholder={"/\n/pricing\n/checkout"}
              />
            </label>
            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white"
              onClick={() => void runFunnel()}
            >
              Calcular embudo
            </button>
            {funnelResult && funnelResult.steps.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">
                  Conversión global: <strong className="text-white">{funnelResult.overallConversion}%</strong>
                </p>
                {funnelResult.steps.map((step, i) => (
                  <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                    <div className="flex justify-between text-sm">
                      <span className="truncate font-medium text-white">{step.page}</span>
                      <span className="text-slate-400">{step.sessions} sesiones</span>
                    </div>
                    {i > 0 && (
                      <p className="mt-1 text-xs text-amber-200/80">Drop-off vs anterior: {step.dropoffRate}%</p>
                    )}
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full bg-indigo-500 transition-all"
                        style={{
                          width: `${funnelResult.steps[0]?.sessions ? (step.sessions / funnelResult.steps[0].sessions) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {config && tab === "analyze" && (
          <section className="space-y-4">
            <button
              type="button"
              disabled={aiLoading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={() => void runAi()}
            >
              {aiLoading ? "Analizando…" : "Analizar con IA"}
            </button>
            {aiResult && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <p className="text-xs uppercase text-slate-500">Priority score</p>
                  <p className="text-3xl font-bold text-indigo-400">{aiResult.priorityScore}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 md:col-span-2">
                  <p className="mb-2 text-sm font-medium text-emerald-400">Insights</p>
                  <ul className="list-inside list-disc text-sm text-slate-300">
                    {aiResult.insights.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4">
                  <p className="mb-2 text-sm font-medium text-red-300">Problemas críticos</p>
                  <ul className="list-inside list-disc text-sm text-slate-300">
                    {aiResult.criticalIssues.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <p className="mb-2 text-sm font-medium text-sky-300">Recomendaciones</p>
                  <ul className="list-inside list-disc text-sm text-slate-300">
                    {aiResult.recommendations.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        )}

        {config && tab === "alerts" && (
          <section className="space-y-3">
            <button
              type="button"
              className="text-sm text-indigo-400 hover:text-indigo-300"
              onClick={() => void loadAlerts(true)}
            >
              Refrescar y evaluar umbrales
            </button>
            <ul className="space-y-2">
              {alerts.length === 0 ? (
                <li className="text-sm text-slate-500">Sin alertas.</li>
              ) : (
                alerts.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm"
                  >
                    <span
                      className={`mr-2 rounded px-2 py-0.5 text-xs uppercase ${
                        a.severity === "high" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-200"
                      }`}
                    >
                      {a.severity}
                    </span>
                    <span className="text-slate-500">{a.type}</span>
                    <p className="mt-1 text-slate-200">{a.message}</p>
                    <p className="mt-1 text-xs text-slate-600">{new Date(a.createdAt).toLocaleString()}</p>
                  </li>
                ))
              )}
            </ul>
          </section>
        )}

        {config && tab === "install" && (
          <section className="space-y-4">
            <p className="text-sm text-slate-400">
              Pega este snippet antes de <code className="text-indigo-300">&lt;/body&gt;</code> en tu web.
            </p>
            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white"
              onClick={() => void copyScript()}
            >
              Copiar script
            </button>
            <pre className="max-h-[320px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300">
              {config.trackingScript}
            </pre>
          </section>
        )}
      </div>
    </div>
  );
}
