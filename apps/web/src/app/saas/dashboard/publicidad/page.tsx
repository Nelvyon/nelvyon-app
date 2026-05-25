"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { publicidadApi, type AdsBriefingPayload } from "@/features/publicidad/api";

type CampaignRow = {
  campaign_id?: string;
  campaign_name?: string;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cost?: number;
  spend?: number;
  roas?: number;
  cpm?: number;
};

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function MiniChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-24 items-end gap-1">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t"
          style={{ height: `${(v / max) * 100}%`, backgroundColor: color, minHeight: v > 0 ? 4 : 0 }}
        />
      ))}
    </div>
  );
}

export default function PublicidadDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleSummary, setGoogleSummary] = useState<Record<string, number>>({});
  const [metaSummary, setMetaSummary] = useState<Record<string, number>>({});
  const [googleCampaigns, setGoogleCampaigns] = useState<CampaignRow[]>([]);
  const [metaCampaigns, setMetaCampaigns] = useState<CampaignRow[]>([]);
  const [alerts, setAlerts] = useState<Array<{ platform: string; message: string; severity: string }>>([]);
  const [blended, setBlended] = useState({ spend: 0, roas: 0 });
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [briefing, setBriefing] = useState<AdsBriefingPayload>({
    product: "NELVYON",
    audience: "CMOs y founders SaaS en España",
    goal: "conversions",
    daily_budget_eur: 120,
    launch: true,
    notes: "",
  });
  const [lastRun, setLastRun] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [unified, alertRes] = await Promise.all([
        publicidadApi.unifiedReporting(),
        publicidadApi.roasAlerts(1.5),
      ]);
      setGoogleSummary(unified.google?.summary ?? {});
      setMetaSummary(unified.meta?.summary ?? {});
      setGoogleCampaigns((unified.google?.campaigns ?? []) as CampaignRow[]);
      setMetaCampaigns((unified.meta?.campaigns ?? []) as CampaignRow[]);
      setBlended({
        spend: unified.unified?.total_spend ?? 0,
        roas: unified.unified?.blended_roas ?? 0,
      });
      setAlerts(alertRes.alerts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar publicidad");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [load]);

  const chartGoogle = useMemo(
    () => googleCampaigns.map((c) => Number(c.cost ?? 0)),
    [googleCampaigns],
  );
  const chartMeta = useMemo(
    () => metaCampaigns.map((c) => Number(c.spend ?? 0)),
    [metaCampaigns],
  );

  async function handleLaunch() {
    setBusy(true);
    setError(null);
    try {
      const res = await publicidadApi.runBriefing(briefing);
      setLastRun(res.run_id);
      setBriefingOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al lanzar campaña");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Publicidad IA</h1>
            <p className="mt-2 text-slate-600">
              Google Ads + Meta Ads unificados — briefing, lanzamiento automático y optimización 24h.
            </p>
          </div>
          <button
            className="rounded-full bg-[#0066FF] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0052cc] disabled:opacity-50"
            disabled={busy}
            onClick={() => setBriefingOpen(true)}
            type="button"
          >
            Crear campaña con IA
          </button>
        </header>

        {alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div
                key={`${a.platform}-${a.message}`}
                className={`rounded-lg border px-4 py-3 text-sm ${
                  a.severity === "critical"
                    ? "border-red-300 bg-red-50 text-red-900"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                }`}
              >
                <strong className="uppercase">{a.platform}</strong> — {a.message}
              </div>
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-500">Cargando métricas…</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Spend total" value={`${blended.spend.toFixed(2)} €`} sub="Google + Meta" />
              <MetricCard label="ROAS combinado" value={blended.roas.toFixed(2)} sub="Umbral alerta: 1.5" />
              <MetricCard
                label="Google CTR"
                value={`${(googleSummary.ctr ?? 0).toFixed(2)}%`}
                sub={`CPC ${(googleSummary.cpc ?? 0).toFixed(2)} €`}
              />
              <MetricCard
                label="Meta CPM"
                value={`${(metaSummary.cpm ?? 0).toFixed(2)} €`}
                sub={`ROAS ${(metaSummary.roas ?? 0).toFixed(2)}`}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-slate-900">Google Ads</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {googleSummary.impressions ?? 0} imp · {googleSummary.clicks ?? 0} clics
                </p>
                <div className="mt-4">
                  <MiniChart color="#0066FF" values={chartGoogle.length ? chartGoogle : [1, 2, 3]} />
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {googleCampaigns.slice(0, 5).map((c) => (
                    <li className="flex justify-between border-b border-slate-100 pb-2" key={c.campaign_id}>
                      <span>{c.campaign_name}</span>
                      <span className="text-slate-500">{c.cost?.toFixed(2)} €</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-slate-900">Meta Ads</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Alcance {metaSummary.reach ?? 0} · {metaSummary.impressions ?? 0} imp
                </p>
                <div className="mt-4">
                  <MiniChart color="#1877F2" values={chartMeta.length ? chartMeta : [2, 3, 2]} />
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {metaCampaigns.slice(0, 5).map((c) => (
                    <li className="flex justify-between border-b border-slate-100 pb-2" key={c.campaign_id}>
                      <span>{c.campaign_name}</span>
                      <span className="text-slate-500">ROAS {c.roas?.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}

        {lastRun ? (
          <p className="text-xs text-slate-500">
            Último lanzamiento IA: <code>{lastRun}</code>
          </p>
        ) : null}
      </div>

      {briefingOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-slate-900">Briefing — campaña con IA</h3>
            <p className="mt-1 text-sm text-slate-500">
              GPT-4o genera estrategia y lanza en Google y Meta a la vez.
            </p>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                onChange={(e) => setBriefing((b) => ({ ...b, product: e.target.value }))}
                placeholder="Producto / marca"
                value={briefing.product}
              />
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                onChange={(e) => setBriefing((b) => ({ ...b, audience: e.target.value }))}
                placeholder="Audiencia"
                value={briefing.audience}
              />
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                onChange={(e) => setBriefing((b) => ({ ...b, daily_budget_eur: Number(e.target.value) }))}
                placeholder="Presupuesto diario (€)"
                type="number"
                value={briefing.daily_budget_eur}
              />
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                onChange={(e) => setBriefing((b) => ({ ...b, notes: e.target.value }))}
                placeholder="Notas adicionales"
                rows={3}
                value={briefing.notes ?? ""}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
                onClick={() => setBriefingOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-lg bg-[#0066FF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={busy}
                onClick={() => void handleLaunch()}
                type="button"
              >
                {busy ? "Lanzando…" : "Lanzar en Google + Meta"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
