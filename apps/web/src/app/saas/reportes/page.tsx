"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface Report {
  id: string; name: string; type: string; status: "ready" | "generating" | "failed";
  createdAt: string; downloadUrl: string | null; sizeBytes: number | null;
}
interface UtmLink {
  id: string; name: string; utmSource: string; utmMedium: string; utmCampaign: string;
  clicks: number; fullUrl: string; createdAt: string;
}
interface RoasAlert {
  platform: string; roas: number; threshold: number; spend: number; dateStart: string; dateEnd: string;
}
interface ChannelBreakdown {
  utmSource: string; utmMedium: string | null;
  visits: number; formSubmits: number; conversions: number; contacts: number;
}
interface CampaignBreakdown {
  utmCampaign: string; utmSource: string | null;
  visits: number; formSubmits: number; conversions: number; contacts: number;
}
interface AttributionSummary {
  totalVisits: number; totalFormSubmits: number; totalConversions: number; totalContacts: number; topSource: string | null;
}

const REPORT_TYPES = [
  { id: "executive_summary", label: "Resumen ejecutivo", icon: "📊", desc: "KPIs generales del mes: contactos, campañas, workflows" },
  { id: "email_marketing", label: "Email Marketing", icon: "📧", desc: "Tasas de apertura, clics, conversiones por campaña" },
  { id: "crm_pipeline", label: "CRM & Pipeline", icon: "🎯", desc: "Estado del embudo, deals cerrados, nuevos contactos" },
  { id: "seo_ranking", label: "SEO & Posicionamiento", icon: "🔍", desc: "Evolución de keywords, posiciones, tráfico orgánico" },
  { id: "social_engagement", label: "Redes Sociales", icon: "📱", desc: "Engagement, alcance y publicaciones por plataforma" },
  { id: "ad_performance", label: "Publicidad Digital", icon: "💰", desc: "ROAS, CPC, impresiones y gasto por plataforma" },
];

const DAYS_OPTIONS = [7, 14, 30, 90] as const;

export default function SaasReportesPage() {
  const [reports, setReports]               = useState<Report[]>([]);
  const [loading, setLoading]               = useState(true);
  const [generating, setGenerating]         = useState<string | null>(null);
  const [error, setError]                   = useState<string | null>(null);
  const [utmLinks, setUtmLinks]             = useState<UtmLink[]>([]);
  const [roasAlerts, setRoasAlerts]         = useState<RoasAlert[]>([]);
  // attribution
  const [days, setDays]                     = useState<30 | 7 | 14 | 90>(30);
  const [attrSummary, setAttrSummary]       = useState<AttributionSummary | null>(null);
  const [channels, setChannels]             = useState<ChannelBreakdown[]>([]);
  const [campaigns, setCampaigns]           = useState<CampaignBreakdown[]>([]);
  const [attrTab, setAttrTab]               = useState<"channels" | "campaigns">("channels");
  const [attrLoading, setAttrLoading]       = useState(false);
  const [deliverableRevenue, setDeliverableRevenue] = useState<Array<{ deliverableId: string; packId: string | null; utmCampaign: string | null; conversions: number; adsSpend: number; attributedRevenue: number; roas: number | null }>>([]);
  const [revenueLoading, setRevenueLoading] = useState(false);

  const loadAttribution = useCallback(async (d: number) => {
    setAttrLoading(true);
    try {
      const [sumRes, chRes, camRes] = await Promise.all([
        fetch(`/api/saas/reportes?resource=summary&days=${d}`),
        fetch(`/api/saas/reportes?resource=channels&days=${d}`),
        fetch(`/api/saas/reportes?resource=campaigns&days=${d}`),
      ]);
      if (sumRes.ok)  { const s = await sumRes.json() as { summary?: AttributionSummary };  setAttrSummary(s.summary ?? null); }
      if (chRes.ok)   { const s = await chRes.json()  as { channels?: ChannelBreakdown[] }; setChannels(s.channels ?? []); }
      if (camRes.ok)  { const s = await camRes.json() as { campaigns?: CampaignBreakdown[] }; setCampaigns(s.campaigns ?? []); }
    } finally { setAttrLoading(false); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsRes, utmRes, alertsRes] = await Promise.all([
        fetch("/api/saas/reports"),
        fetch("/api/saas/utm?limit=5"),
        fetch("/api/saas/ads/alerts"),
      ]);
      const data = (await reportsRes.json().catch(() => ({ reports: [] }))) as { reports: Report[] };
      setReports(data.reports ?? []);
      const utmData = (await utmRes.json().catch(() => ({ links: [] }))) as { links: UtmLink[] };
      setUtmLinks(utmData.links ?? []);
      const alertsData = (await alertsRes.json().catch(() => ({ alerts: [] }))) as { alerts: RoasAlert[] };
      setRoasAlerts(alertsData.alerts ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    void loadAttribution(30);
    setRevenueLoading(true);
    fetch("/api/saas/entregables/revenue?days=30")
      .then(r => r.ok ? r.json() : { items: [] })
      .then((d: { items?: Array<{ deliverableId: string; packId: string | null; utmCampaign: string | null; conversions: number; adsSpend: number; attributedRevenue: number; roas: number | null }> }) => {
        setDeliverableRevenue((d.items ?? []).slice(0, 5));
      })
      .catch(() => null)
      .finally(() => setRevenueLoading(false));
  }, [load, loadAttribution]);

  async function generateReport(type: string) {
    setGenerating(type); setError(null);
    try {
      const res = await fetch("/api/saas/reports/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = (await res.json().catch(() => ({}))) as { downloadUrl?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Error generando reporte");
      if (data.downloadUrl) window.open(data.downloadUrl, "_blank");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando reporte");
    } finally { setGenerating(null); }
  }

  function fmtSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  const maxVisits = Math.max(1, ...channels.map(c => c.visits), ...campaigns.map(c => c.visits));

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="dashboard" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader title="Reportes" subtitle="Informes ejecutivos y atribución multi-touch por canal y campaña" />

        {error && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

        {/* ── Atribución multi-touch ───────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">🔗 Atribución multi-touch</p>
            <div className="flex gap-1">
              {DAYS_OPTIONS.map(d => (
                <button key={d} onClick={() => { setDays(d as 7|14|30|90); void loadAttribution(d); }}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${days === d ? "bg-primary text-white" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* KPIs */}
          {attrSummary && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([
                ["Visitas", attrSummary.totalVisits],
                ["Formularios", attrSummary.totalFormSubmits],
                ["Conversiones", attrSummary.totalConversions],
                ["Contactos únicos", attrSummary.totalContacts],
              ] as [string, number][]).map(([label, val]) => (
                <div key={label} className="rounded-xl bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-0.5 text-xl font-bold text-foreground">{val.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
          {attrSummary?.topSource && (
            <p className="mb-4 text-xs text-muted-foreground">Fuente principal: <span className="font-medium text-foreground">{attrSummary.topSource}</span></p>
          )}

          {/* Sub-tabs */}
          <div className="mb-3 flex gap-1 border-b border-border">
            {(["channels","campaigns"] as const).map(t => (
              <button key={t} onClick={() => setAttrTab(t)}
                className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors ${attrTab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {t === "channels" ? "Por canal" : "Por campaña"}
              </button>
            ))}
          </div>

          {attrLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/20" />)}</div>
          ) : attrTab === "channels" ? (
            channels.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Sin datos de atribución por canal en los últimos {days} días.</p>
            ) : (
              <div className="space-y-2">
                {channels.map((ch, i) => (
                  <div key={i} className="rounded-xl bg-muted/10 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-foreground">{ch.utmSource}</span>
                        {ch.utmMedium && <span className="ml-2 text-xs text-muted-foreground">/ {ch.utmMedium}</span>}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{ch.visits.toLocaleString()} visitas</span>
                        <span>{ch.formSubmits.toLocaleString()} forms</span>
                        <span className="text-primary font-medium">{ch.conversions.toLocaleString()} conv.</span>
                        <span>{ch.contacts.toLocaleString()} leads</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (ch.visits / maxVisits) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            campaigns.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Sin datos de campañas UTM en los últimos {days} días.</p>
            ) : (
              <div className="space-y-2">
                {campaigns.map((cam, i) => (
                  <div key={i} className="rounded-xl bg-muted/10 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-foreground">{cam.utmCampaign}</span>
                        {cam.utmSource && <span className="ml-2 text-xs text-muted-foreground">via {cam.utmSource}</span>}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{cam.visits.toLocaleString()} visitas</span>
                        <span>{cam.formSubmits.toLocaleString()} forms</span>
                        <span className="text-primary font-medium">{cam.conversions.toLocaleString()} conv.</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (cam.visits / maxVisits) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* ROAS alerts */}
        {roasAlerts.length > 0 && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-5 py-4">
            <p className="mb-3 text-sm font-semibold text-yellow-400">⚠️ Alertas ROAS ({roasAlerts.length})</p>
            <div className="flex flex-col gap-2">
              {roasAlerts.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{a.platform}</span>
                  <span className="text-yellow-400 font-medium">ROAS {a.roas.toFixed(2)}x (umbral: {a.threshold}x) — gasto {a.spend.toFixed(2)} EUR</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* UTM attribution */}
        {utmLinks.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">Atribución UTM — top enlaces</p>
            <div className="flex flex-col gap-2">
              {utmLinks.map(l => (
                <NelvyonDsCard key={l.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{l.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{l.utmSource} / {l.utmMedium} / {l.utmCampaign}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">{l.clicks.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">clics</p>
                  </div>
                </NelvyonDsCard>
              ))}
            </div>
          </div>
        )}

        {/* Generate report */}
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">Generar nuevo reporte</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REPORT_TYPES.map(rt => (
              <NelvyonDsCard key={rt.id} className="flex flex-col gap-3 p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{rt.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{rt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{rt.desc}</p>
                  </div>
                </div>
                <NelvyonDsButton onClick={() => void generateReport(rt.id)} disabled={generating === rt.id} className="w-full">
                  {generating === rt.id ? "Generando…" : "⬇ Generar PDF"}
                </NelvyonDsButton>
              </NelvyonDsCard>
            ))}
          </div>
        </div>

        {/* History */}
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">Historial de reportes</p>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/30" />)}</div>
          ) : reports.length === 0 ? (
            <NelvyonDsCard className="p-10 text-center">
              <p className="text-muted-foreground text-sm">Aún no has generado ningún reporte</p>
            </NelvyonDsCard>
          ) : (
            <div className="space-y-2">
              {reports.map(r => (
                <NelvyonDsCard key={r.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("es-ES")}{fmtSize(r.sizeBytes) ? ` · ${fmtSize(r.sizeBytes)}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <NelvyonDsBadge tone={r.status === "ready" ? "success" : r.status === "failed" ? "danger" : "primary"}>
                      {r.status === "ready" ? "Listo" : r.status === "failed" ? "Error" : "Generando…"}
                    </NelvyonDsBadge>
                    {r.status === "ready" && r.downloadUrl && (
                      <a href={r.downloadUrl} target="_blank" rel="noopener noreferrer">
                        <NelvyonDsButton size="sm" variant="ghost">⬇ Descargar</NelvyonDsButton>
                      </a>
                    )}
                  </div>
                </NelvyonDsCard>
              ))}
            </div>
          )}
        </div>

        {/* Revenue por entregable — top 5 */}
        <div className="space-y-3">
          <NelvyonDsSectionHeader title="Revenue por entregable (últimos 30 días)" />
          {revenueLoading ? (
            <NelvyonDsCard className="p-6 text-center text-muted-foreground text-sm">Cargando…</NelvyonDsCard>
          ) : deliverableRevenue.length === 0 ? (
            <NelvyonDsCard className="p-6 text-center">
              <p className="text-muted-foreground text-sm">Sin datos de revenue atribuido.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Vincula una campaña UTM a tus entregables desde{" "}
                <a href="/saas/entregables" className="text-primary hover:underline">Entregables →</a>
              </p>
            </NelvyonDsCard>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Entregable / Campaña</th>
                    <th className="px-4 py-3 text-right">Conv.</th>
                    <th className="px-4 py-3 text-right">Spend</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {deliverableRevenue.map((row) => (
                    <tr key={row.deliverableId} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <p className="text-white/70 text-xs font-mono truncate max-w-[180px]">{row.deliverableId.slice(0, 8)}…</p>
                        {row.utmCampaign && <p className="text-white/40 text-xs">{row.utmCampaign}</p>}
                      </td>
                      <td className="px-4 py-3 text-right text-white/70">{row.conversions}</td>
                      <td className="px-4 py-3 text-right text-white/70">€{row.adsSpend.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right text-white font-semibold">€{row.attributedRevenue.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right">
                        {row.roas !== null ? (
                          <span className={row.roas >= 2 ? "text-green-400 font-semibold" : "text-yellow-400"}>
                            {row.roas.toFixed(1)}x
                          </span>
                        ) : <span className="text-white/30">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </SaasShellLayout>
  );
}
