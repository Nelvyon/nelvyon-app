"use client";

import { useEffect, useState } from "react";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { NelvyonDsBadge } from "@/design-system/components";
import type { SaasDeliverable, DeliverableSummary, DeliverableType, DeliverableStatus, DeliverableRevenue } from "@nelvyon/saas";

// ── Icons ─────────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  landing: "🚀",
  seo: "🔍",
  ads: "📣",
  chatbot: "🤖",
  report: "📊",
  certificate: "🏆",
  social_calendar: "📅",
  other: "📦",
};

const STATUS_TONE: Record<string, "success" | "primary" | "warning" | "neutral" | "danger"> = {
  approved: "success",
  published: "success",
  delivered: "primary",
  generated: "primary",
  in_review: "warning",
  draft: "neutral",
  rejected: "danger",
  archived: "neutral",
};

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type TypeFilter = DeliverableType | "all";
type StatusFilter = DeliverableStatus | "all";
type EntregablesTab = "lista" | "revenue";

// ── Link modal ────────────────────────────────────────────────────────────────

function LinkModal({
  deliverableId,
  onClose,
  onSaved,
}: {
  deliverableId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [utmCampaign, setUtmCampaign] = useState("");
  const [landingUrl, setLandingUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/saas/entregables/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliverableId,
          deliverableSource: "os",
          utmCampaign: utmCampaign || undefined,
          landingUrl: landingUrl || undefined,
        }),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="rounded-xl border border-white/10 bg-[#0d1929] p-6 w-full max-w-md space-y-4">
        <h2 className="text-white font-semibold">Vincular campaña UTM</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 block mb-1">UTM Campaign</label>
            <input
              type="text"
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              placeholder="ej: local-business-q2"
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white text-sm px-3 py-2 placeholder:text-white/20"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1">Landing URL (opcional)</label>
            <input
              type="text"
              value={landingUrl}
              onChange={(e) => setLandingUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white text-sm px-3 py-2 placeholder:text-white/20"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-white/50 hover:text-white"
          >
            Cancelar
          </button>
          <button
            disabled={saving}
            onClick={() => { void save(); }}
            className="rounded-lg bg-[#0084ff] px-4 py-2 text-sm text-white font-medium disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EntregablesPage() {
  const [deliverables, setDeliverables] = useState<SaasDeliverable[]>([]);
  const [summary, setSummary] = useState<DeliverableSummary | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EntregablesTab>("lista");
  const [revenueItems, setRevenueItems] = useState<DeliverableRevenue[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueTotal, setRevenueTotal] = useState(0);
  const [avgRoas, setAvgRoas] = useState<number | null>(null);
  const [linkModalId, setLinkModalId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/saas/entregables?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as { deliverables: SaasDeliverable[]; summary: DeliverableSummary };
      setDeliverables(data.deliverables);
      setSummary(data.summary);
    } catch {
      setError("Error al cargar entregables. Reintenta en un momento.");
    } finally {
      setLoading(false);
    }
  }

  async function loadRevenue() {
    setRevenueLoading(true);
    try {
      const res = await fetch(`/api/saas/entregables/revenue?days=${days}`);
      if (res.ok) {
        const d = await res.json() as { items: DeliverableRevenue[] };
        const items = d.items ?? [];
        setRevenueItems(items);
        const total = items.reduce((s, r) => s + r.attributedRevenue, 0);
        setRevenueTotal(total);
        const roasRows = items.filter((r) => r.roas !== null);
        setAvgRoas(roasRows.length > 0 ? roasRows.reduce((s, r) => s + (r.roas ?? 0), 0) / roasRows.length : null);
      }
    } catch { /* silent */ } finally {
      setRevenueLoading(false);
    }
  }

  useEffect(() => { void load(); void loadRevenue(); }, [typeFilter, statusFilter, days]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRefreshRevenue() {
    await fetch("/api/saas/entregables/revenue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh" }),
    });
    void loadRevenue();
  }

  function copyLink(d: SaasDeliverable) {
    const url = d.portalUrl ?? d.downloadUrl ?? `${window.location.origin}/portal/deliverables/${d.id}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopyMsg("Link copiado");
      setTimeout(() => setCopyMsg(null), 2000);
    });
  }

  const sidebar = <SaasSidebar activeId="entregables" />;

  return (
    <SaasShellLayout sidebar={sidebar}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">📦 Entregables</h1>
            <p className="text-sm text-white/50 mt-0.5">
              Resultados de packs OS, servicios recurrentes y entregables manuales
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-white/5 text-white text-sm px-3 py-1.5"
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
              <option value={365}>Último año</option>
            </select>
          </div>
        </div>

        {/* KPI Strip */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard label="Total" value={summary.total} />
            <KpiCard label="Pendientes revisión" value={summary.pendingReview} />
            <KpiCard label="Aprobados" value={summary.approved} />
            <KpiCard label="QA media" value={summary.avgQaScore !== null ? `${summary.avgQaScore}%` : "—"} />
            <KpiCard label="Revenue atribuido" value={`€${revenueTotal.toFixed(0)}`} />
            <KpiCard label="ROAS medio" value={avgRoas !== null ? `${avgRoas.toFixed(1)}x` : "—"} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-white/5 p-1 w-fit">
          {(["lista", "revenue"] as EntregablesTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-[#0084ff] text-white"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {tab === "lista" ? "Lista" : "Revenue €"}
            </button>
          ))}
        </div>

        {/* ── Revenue tab ─────────────────────────────────────────────────── */}
        {activeTab === "revenue" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => { void handleRefreshRevenue(); }}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
              >
                ↻ Recalcular
              </button>
            </div>
            {revenueLoading ? (
              <div className="text-white/40 text-sm py-12 text-center">Calculando revenue…</div>
            ) : revenueItems.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-12 text-center space-y-3">
                <div className="text-4xl">💰</div>
                <p className="text-white font-semibold">Sin revenue atribuido</p>
                <p className="text-white/40 text-sm max-w-md mx-auto">
                  Vincula una campaña UTM a tus entregables usando el botón "Vincular campaña" en la pestaña Lista.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Entregable</th>
                      <th className="px-4 py-3 text-left">Pack / Campaña</th>
                      <th className="px-4 py-3 text-right">Conv.</th>
                      <th className="px-4 py-3 text-right">Spend</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueItems.map((r) => (
                      <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-white/60 text-xs font-mono">{r.deliverableId.slice(0, 8)}…</td>
                        <td className="px-4 py-3">
                          <p className="text-white/70 text-xs">{r.packId ?? <span className="text-white/30">—</span>}</p>
                          {r.utmCampaign && <p className="text-white/40 text-xs">{r.utmCampaign}</p>}
                        </td>
                        <td className="px-4 py-3 text-right text-white/70">{r.conversions}</td>
                        <td className="px-4 py-3 text-right text-white/70">€{r.adsSpend.toFixed(0)}</td>
                        <td className="px-4 py-3 text-right text-white font-semibold">€{r.attributedRevenue.toFixed(0)}</td>
                        <td className="px-4 py-3 text-right">
                          {r.roas !== null ? (
                            <span className={r.roas >= 2 ? "text-green-400 font-semibold" : "text-yellow-400"}>
                              {r.roas.toFixed(1)}x
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
        )}

        {/* ── Lista tab ────────────────────────────────────────────────────── */}
        {activeTab === "lista" && <>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="rounded-lg border border-white/10 bg-white/5 text-white text-sm px-3 py-1.5"
          >
            <option value="all">Todos los tipos</option>
            <option value="landing">Landing</option>
            <option value="seo">SEO</option>
            <option value="ads">Ads</option>
            <option value="report">Reporte</option>
            <option value="chatbot">Chatbot</option>
            <option value="certificate">Certificado</option>
            <option value="social_calendar">Calendario Social</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-white/10 bg-white/5 text-white text-sm px-3 py-1.5"
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="in_review">En revisión</option>
            <option value="delivered">Entregado</option>
            <option value="approved">Aprobado</option>
            <option value="published">Publicado</option>
            <option value="rejected">Rechazado</option>
          </select>
        </div>

        {/* Copy flash */}
        {copyMsg && (
          <div className="text-xs text-[#0084ff] font-medium">{copyMsg}</div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-white/40 text-sm py-12 text-center">Cargando entregables…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-red-300 text-sm">{error}</div>
        ) : deliverables.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-12 text-center space-y-3">
            <div className="text-4xl">📦</div>
            <p className="text-white font-semibold">Sin entregables aún</p>
            <p className="text-white/40 text-sm max-w-md mx-auto">
              Ejecuta un pack OS desde Brief-to-Launch o espera el próximo ciclo de servicios recurrentes
              (SEO mensual, calendario social, snapshot de ads).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Título</th>
                  <th className="px-4 py-3 text-left">Pack</th>
                  <th className="px-4 py-3 text-left">QA</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-lg" title={d.type}>
                        {TYPE_ICON[d.type] ?? "📦"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-medium max-w-[220px] truncate">
                      {d.title}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs">
                      {d.packId ?? <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {d.qaScore !== null ? (
                        <span
                          className={`font-semibold text-xs ${
                            d.qaScore >= 85 ? "text-green-400" : "text-yellow-400"
                          }`}
                        >
                          {d.qaScore}%
                        </span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <NelvyonDsBadge tone={STATUS_TONE[d.status] ?? "neutral"}>
                        {d.status}
                      </NelvyonDsBadge>
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">
                      {new Date(d.createdAt).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <a
                          href={`/portal/deliverables/${d.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0084ff] text-xs hover:underline"
                        >
                          Ver portal
                        </a>
                        {d.downloadUrl && (
                          <a
                            href={d.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/50 text-xs hover:text-white"
                          >
                            Descargar
                          </a>
                        )}
                        <button
                          onClick={() => copyLink(d)}
                          className="text-white/30 text-xs hover:text-white/70"
                        >
                          Copiar link
                        </button>
                        <button
                          onClick={() => setLinkModalId(d.id)}
                          className="text-white/30 text-xs hover:text-[#0084ff]"
                        >
                          Vincular campaña
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </>}

        {/* Link modal */}
        {linkModalId && (
          <LinkModal
            deliverableId={linkModalId}
            onClose={() => setLinkModalId(null)}
            onSaved={() => { void loadRevenue(); }}
          />
        )}
      </div>
    </SaasShellLayout>
  );
}
