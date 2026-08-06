"use client";

/**
 * /saas/reportes sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: atribución, alertas ROAS, UTM, generación, historial y revenue ->
 * `W3crmContentBox`; tablas -> `W3crmDataTable`; KPIs -> `W3crmKpiTile`. Sin
 * componentes nuevos.
 *
 * CONTRATO — `saas-deliverable-revenue.spec.ts`:
 *   - `getByText(/Revenue por entregable/i)` ÚNICO. NO puede ser título de
 *     `W3crmContentBox`: el toggle expone `aria-label="Plegar <título>"` y el
 *     título aportaría además su propia coincidencia. Va como rótulo del
 *     cuerpo, dentro de la caja "Atribución de ingresos".
 *   - Sin `pageerror` al cargar.
 * Y `capture-marketing-shots.spec.ts:48` espera `/Report|Analít|leads|Canal/i`,
 * que satisface el título "Reportes". `pageTitle="Informes"` NO lo repite.
 *
 * SANEADO NUMÉRICO — se conserva el del arreglo `3fa35da1` y NO se revierte.
 * La página se caía entera al hidratar (`TypeError: ... reading
 * 'toLocaleString'`) cuando la API devolvía métricas ausentes: el error
 * boundary desmontaba el árbol y `main` quedaba en 68 caracteres. Aquí todo
 * formateo pasa por `num()` / `miles()`. `opt()` distingue "sin dato"
 * (null → "—") de valor corrupto, para no inventar ceros donde la API dice
 * "no lo sé".
 *
 * Lógica de NELVYON intacta: los cuatro recursos de `/api/saas/reportes`
 * (`summary`, `channels`, `campaigns`, `models` con su `model`), los tres GET
 * de `/api/saas/reports`, `/api/saas/utm?limit=5` y `/api/saas/ads/alerts`,
 * `POST /api/saas/reports/generate` que abre el ZIP en pestaña nueva, el PDF
 * por reporte, `/api/saas/entregables/revenue?days=30` recortado a 5 filas, el
 * banner de atribución parcial con su condición exacta, los cuatro periodos,
 * los cuatro modelos multi-touch y el scroll automático a la sección de
 * atribución cuando llega `?tab=attribution`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";

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
type RevenueRow = {
  deliverableId: string; packId: string | null; utmCampaign: string | null;
  conversions: number; adsSpend: number; attributedRevenue: number; roas: number | null;
};

const REPORT_TYPES = [
  { id: "executive_summary", label: "Resumen ejecutivo", icono: "fa-solid fa-chart-column", desc: "KPIs generales del mes: contactos, campañas, workflows" },
  { id: "email_marketing", label: "Email Marketing", icono: "fa-solid fa-envelope", desc: "Tasas de apertura, clics, conversiones por campaña" },
  { id: "crm_pipeline", label: "CRM & Pipeline", icono: "fa-solid fa-bullseye", desc: "Estado del embudo, deals cerrados, nuevos contactos" },
  { id: "seo_ranking", label: "SEO & Posicionamiento", icono: "fa-solid fa-magnifying-glass", desc: "Evolución de keywords, posiciones, tráfico orgánico" },
  { id: "social_engagement", label: "Redes Sociales", icono: "fa-solid fa-hashtag", desc: "Engagement, alcance y publicaciones por plataforma" },
  { id: "ad_performance", label: "Publicidad Digital", icono: "fa-solid fa-money-bill", desc: "ROAS, CPC, impresiones y gasto por plataforma" },
] as const;

const DAYS_OPTIONS = [7, 14, 30, 90] as const;

/** Saneado del arreglo 3fa35da1: sin esto la página crasheaba al hidratar. */
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** "Sin dato" (null) frente a valor corrupto: no se inventan ceros. */
function opt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function miles(v: unknown): string { return num(v).toLocaleString("es-ES"); }
function txt(v: unknown): string { return typeof v === "string" ? v : ""; }
function corta(v: unknown, n: number): string {
  const s = txt(v);
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES");
}
function pctBarra(v: unknown, max: number): number {
  const p = (num(v) / (max || 1)) * 100;
  return Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : 0;
}
function fmtSize(bytes: unknown): string {
  const b = num(bytes);
  if (!b) return "";
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)}KB`;
  return `${(b / (1024 * 1024)).toFixed(1)}MB`;
}

export default function SaasReportesPage() {
  const searchParams = useSearchParams();
  const attributionRef = useRef<HTMLDivElement | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [utmLinks, setUtmLinks] = useState<UtmLink[]>([]);
  const [roasAlerts, setRoasAlerts] = useState<RoasAlert[]>([]);
  const [days, setDays] = useState<30 | 7 | 14 | 90>(30);
  const [attrSummary, setAttrSummary] = useState<AttributionSummary | null>(null);
  const [channels, setChannels] = useState<ChannelBreakdown[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignBreakdown[]>([]);
  const [attrTab, setAttrTab] = useState<"channels" | "campaigns" | "models">("channels");
  const [attrModel, setAttrModel] = useState<"linear" | "first_touch" | "last_touch" | "time_decay">("linear");
  const [modelRows, setModelRows] = useState<Array<{ source: string; credit: number; conversions: number }>>([]);
  const [attrLoading, setAttrLoading] = useState(false);
  const [deliverableRevenue, setDeliverableRevenue] = useState<RevenueRow[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(false);

  const tabParam = searchParams?.get("tab");

  const loadAttribution = useCallback(async (d: number, model: typeof attrModel = "linear") => {
    setAttrLoading(true);
    try {
      const [sumRes, chRes, camRes, modRes] = await Promise.all([
        fetch(`/api/saas/reportes?resource=summary&days=${d}`),
        fetch(`/api/saas/reportes?resource=channels&days=${d}`),
        fetch(`/api/saas/reportes?resource=campaigns&days=${d}`),
        fetch(`/api/saas/reportes?resource=models&model=${model}&days=${d}`),
      ]);
      if (sumRes.ok) {
        const s = (await sumRes.json().catch(() => ({}))) as { summary?: AttributionSummary };
        setAttrSummary(s.summary && typeof s.summary === "object" ? s.summary : null);
      }
      if (chRes.ok) {
        const s = (await chRes.json().catch(() => ({}))) as { channels?: ChannelBreakdown[] };
        setChannels(Array.isArray(s.channels) ? s.channels : []);
      }
      if (camRes.ok) {
        const s = (await camRes.json().catch(() => ({}))) as { campaigns?: CampaignBreakdown[] };
        setCampaigns(Array.isArray(s.campaigns) ? s.campaigns : []);
      }
      if (modRes.ok) {
        const s = (await modRes.json().catch(() => ({}))) as {
          breakdown?: { channels?: Array<{ utmSource: string; credit: number; conversions: number }> };
        };
        const rows = Array.isArray(s.breakdown?.channels) ? s.breakdown.channels : [];
        setModelRows(rows.map((c) => ({ source: txt(c.utmSource), credit: num(c.credit), conversions: num(c.conversions) })));
      }
    } finally { setAttrLoading(false); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [reportsRes, utmRes, alertsRes] = await Promise.all([
        fetch("/api/saas/reports"),
        fetch("/api/saas/utm?limit=5"),
        fetch("/api/saas/ads/alerts"),
      ]);
      if (!reportsRes.ok && reportsRes.status !== 401) {
        setLoadError("No se pudo cargar el historial de reportes.");
      }
      const data = (await reportsRes.json().catch(() => ({}))) as { reports?: Report[] };
      setReports(Array.isArray(data.reports) ? data.reports : []);
      const utmData = (await utmRes.json().catch(() => ({}))) as { links?: UtmLink[] };
      setUtmLinks(Array.isArray(utmData.links) ? utmData.links : []);
      const alertsData = (await alertsRes.json().catch(() => ({}))) as { alerts?: RoasAlert[] };
      setRoasAlerts(Array.isArray(alertsData.alerts) ? alertsData.alerts : []);
    } catch {
      setLoadError("Error de red al cargar reportes.");
      setReports([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    void loadAttribution(30);
    setRevenueLoading(true);
    fetch("/api/saas/entregables/revenue?days=30")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items?: RevenueRow[] }) => {
        setDeliverableRevenue((Array.isArray(d?.items) ? d.items : []).slice(0, 5));
      })
      .catch(() => null)
      .finally(() => setRevenueLoading(false));
  }, [load, loadAttribution]);

  useEffect(() => {
    if (tabParam !== "attribution") return;
    const el = attributionRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [tabParam, loading, attrLoading]);

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

  const maxVisits = Math.max(1, ...channels.map((c) => num(c.visits)), ...campaigns.map((c) => num(c.visits)));

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Reportes" parentTitle="Cuenta" pageTitle="Informes" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Informes ejecutivos y atribución multi-touch por canal y campaña
            </p>

            {!loading && !attrLoading && num(attrSummary?.totalVisits) === 0 && roasAlerts.length === 0 && (
              <div className="alert alert-warning" role="alert">
                Atribución parcial — conecta publicidad (Meta/Google) y activa enlaces UTM para ver ROAS y
                canales en vivo.
              </div>
            )}

            {(error || loadError) && (
              <div className="alert alert-danger" role="alert">{error ?? loadError}</div>
            )}

            <div ref={attributionRef} id="attribution">
              <W3crmContentBox
                titulo="Atribución multi-touch"
                icono="fa-solid fa-diagram-project"
                acciones={
                  <span className="me-2">
                    {DAYS_OPTIONS.map((d) => (
                      <button key={d} type="button" aria-pressed={days === d}
                        className={`btn btn-sm me-1 ${days === d ? "btn-primary" : "btn-primary light"}`}
                        onClick={() => { setDays(d as 7 | 14 | 30 | 90); void loadAttribution(d); }}>
                        {d}d
                      </button>
                    ))}
                  </span>
                }
              >
                {attrSummary && (
                  <div className="row">
                    <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Visitas" value={miles(attrSummary.totalVisits)} /></div>
                    <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Formularios" value={miles(attrSummary.totalFormSubmits)} /></div>
                    <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Conversiones" value={miles(attrSummary.totalConversions)} accent /></div>
                    <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Contactos únicos" value={miles(attrSummary.totalContacts)} /></div>
                  </div>
                )}
                {attrSummary?.topSource ? (
                  <p className="fs-12 text-muted">
                    Fuente principal: <span className="fw-bold text-black">{txt(attrSummary.topSource)}</span>
                  </p>
                ) : null}

                <ul className="nav nav-tabs mb-3">
                  {(["channels", "campaigns", "models"] as const).map((t) => (
                    <li className="nav-item" key={t}>
                      <button type="button" className={`nav-link ${attrTab === t ? "active" : ""}`}
                        aria-pressed={attrTab === t} onClick={() => setAttrTab(t)}>
                        {t === "channels" ? "Por canal" : t === "campaigns" ? "Por campaña" : "Multi-touch"}
                      </button>
                    </li>
                  ))}
                </ul>

                {attrTab === "models" && (
                  <div className="mb-3" role="group" aria-label="Modelo de atribución">
                    {(["linear", "first_touch", "last_touch", "time_decay"] as const).map((m) => (
                      <button key={m} type="button" aria-pressed={attrModel === m}
                        className={`btn btn-sm me-1 mb-1 ${attrModel === m ? "btn-primary" : "btn-primary light"}`}
                        onClick={() => { setAttrModel(m); void loadAttribution(days, m); }}>
                        {m.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                )}

                {attrLoading ? (
                  <W3crmCargando texto="Cargando atribución…" />
                ) : attrTab === "models" ? (
                  modelRows.length === 0 ? (
                    <W3crmEmptyState title="Sin datos multi-touch"
                      description={`No hay datos (${attrModel}) en los últimos ${days} días.`} />
                  ) : (
                    <W3crmDataTable
                      filas={modelRows} etiqueta="fuentes" wrapperId="rep_models_wrapper"
                      porPagina={10} reiniciarEn={`${attrModel}-${days}`}
                      columnas={[{ titulo: "Fuente" }, { titulo: "Conversiones" }, { titulo: "Crédito", alFinal: true }]}
                      render={(row, i) => (
                        <tr key={`${row.source}-${i}`}>
                          <td><span className="fw-bold">{row.source || "—"}</span></td>
                          <td>{miles(row.conversions)}</td>
                          <td className="text-end">{(num(row.credit) * 100).toFixed(1)}%</td>
                        </tr>
                      )}
                    />
                  )
                ) : attrTab === "channels" ? (
                  channels.length === 0 ? (
                    <W3crmEmptyState title="Sin datos por canal"
                      description={`No hay atribución por canal en los últimos ${days} días.`} />
                  ) : (
                    <W3crmDataTable
                      filas={channels} etiqueta="canales" wrapperId="rep_channels_wrapper"
                      porPagina={10} reiniciarEn={days}
                      columnas={[
                        { titulo: "Canal" }, { titulo: "Visitas" }, { titulo: "Forms" },
                        { titulo: "Conversiones" }, { titulo: "Leads" }, { titulo: "Peso", alFinal: true },
                      ]}
                      render={(ch, i) => (
                        <tr key={`${ch.utmSource}-${i}`}>
                          <td>
                            <span className="fw-bold">{txt(ch.utmSource) || "—"}</span>
                            {ch.utmMedium ? <span className="text-muted fs-12"> / {txt(ch.utmMedium)}</span> : null}
                          </td>
                          <td>{miles(ch.visits)}</td>
                          <td>{miles(ch.formSubmits)}</td>
                          <td className="text-primary fw-bold">{miles(ch.conversions)}</td>
                          <td>{miles(ch.contacts)} leads</td>
                          <td className="text-end" style={{ minWidth: 90 }}>
                            <div className="progress" style={{ height: 6 }}>
                              <div className="progress-bar bg-primary" role="progressbar"
                                style={{ width: `${pctBarra(ch.visits, maxVisits)}%` }}
                                aria-valuenow={Math.round(pctBarra(ch.visits, maxVisits))}
                                aria-valuemin={0} aria-valuemax={100}
                                aria-label={`Peso de ${txt(ch.utmSource)}`} />
                            </div>
                          </td>
                        </tr>
                      )}
                    />
                  )
                ) : (
                  campaigns.length === 0 ? (
                    <W3crmEmptyState title="Sin campañas UTM"
                      description={`No hay datos de campañas en los últimos ${days} días.`} />
                  ) : (
                    <W3crmDataTable
                      filas={campaigns} etiqueta="campañas" wrapperId="rep_campaigns_wrapper"
                      porPagina={10} reiniciarEn={days}
                      columnas={[
                        { titulo: "Campaña" }, { titulo: "Visitas" }, { titulo: "Forms" },
                        { titulo: "Conversiones" }, { titulo: "Peso", alFinal: true },
                      ]}
                      render={(cam, i) => (
                        <tr key={`${cam.utmCampaign}-${i}`}>
                          <td>
                            <span className="fw-bold">{txt(cam.utmCampaign) || "—"}</span>
                            {cam.utmSource ? <span className="text-muted fs-12"> via {txt(cam.utmSource)}</span> : null}
                          </td>
                          <td>{miles(cam.visits)}</td>
                          <td>{miles(cam.formSubmits)}</td>
                          <td className="text-primary fw-bold">{miles(cam.conversions)}</td>
                          <td className="text-end" style={{ minWidth: 90 }}>
                            <div className="progress" style={{ height: 6 }}>
                              <div className="progress-bar bg-primary" role="progressbar"
                                style={{ width: `${pctBarra(cam.visits, maxVisits)}%` }}
                                aria-valuenow={Math.round(pctBarra(cam.visits, maxVisits))}
                                aria-valuemin={0} aria-valuemax={100}
                                aria-label={`Peso de ${txt(cam.utmCampaign)}`} />
                            </div>
                          </td>
                        </tr>
                      )}
                    />
                  )
                )}
              </W3crmContentBox>
            </div>

            {roasAlerts.length > 0 && (
              <W3crmContentBox titulo={`Alertas ROAS (${roasAlerts.length})`} icono="fa-solid fa-triangle-exclamation">
                <W3crmDataTable
                  filas={roasAlerts} etiqueta="alertas" wrapperId="rep_alerts_wrapper" porPagina={10}
                  columnas={[{ titulo: "Plataforma" }, { titulo: "ROAS" }, { titulo: "Gasto", alFinal: true }]}
                  render={(a, i) => (
                    <tr key={`${a.platform}-${i}`}>
                      <td className="text-capitalize">{txt(a.platform) || "—"}</td>
                      <td className="text-warning fw-bold">
                        {num(a.roas).toFixed(2)}x <span className="text-muted fs-12">(umbral: {num(a.threshold)}x)</span>
                      </td>
                      <td className="text-end">{num(a.spend).toFixed(2)} EUR</td>
                    </tr>
                  )}
                />
              </W3crmContentBox>
            )}

            {utmLinks.length > 0 && (
              <W3crmContentBox titulo="Atribución UTM — top enlaces" icono="fa-solid fa-link">
                <W3crmDataTable
                  filas={utmLinks} etiqueta="enlaces" wrapperId="rep_utm_wrapper" porPagina={10}
                  columnas={[{ titulo: "Enlace" }, { titulo: "Clics", alFinal: true }]}
                  render={(l) => (
                    <tr key={l.id}>
                      <td>
                        <span className="fw-bold d-block">{txt(l.name) || "—"}</span>
                        <span className="text-muted fs-12">
                          {txt(l.utmSource)} / {txt(l.utmMedium)} / {txt(l.utmCampaign)}
                        </span>
                      </td>
                      <td className="text-end fw-bold">{miles(l.clicks)}</td>
                    </tr>
                  )}
                />
              </W3crmContentBox>
            )}

            <W3crmContentBox titulo="Generar nuevo reporte" icono="fa-solid fa-file-arrow-down">
              <p className="fs-12 text-muted">
                Cada tipo etiqueta el informe en el historial. El ZIP se genera con las métricas reales del
                dashboard del tenant (ROI, tráfico, conversiones, MRR).
              </p>
              <div className="row">
                {REPORT_TYPES.map((rt) => (
                  <div className="col-xl-4 col-sm-6" key={rt.id}>
                    <div className="card border mb-3 h-100">
                      <div className="card-body d-flex flex-column">
                        <span className="fw-bold">
                          <i className={`${rt.icono} me-2 text-primary`} aria-hidden="true" />
                          {rt.label}
                        </span>
                        <p className="text-muted fs-12 mt-1 flex-grow-1">{rt.desc}</p>
                        <button type="button" className="btn btn-primary btn-sm w-100"
                          disabled={generating === rt.id}
                          aria-label={`Generar ZIP de ${rt.label}`}
                          onClick={() => void generateReport(rt.id)}>
                          {generating === rt.id ? "Generando…" : "Generar ZIP"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </W3crmContentBox>

            <W3crmContentBox titulo="Historial de reportes" icono="fa-solid fa-clock-rotate-left">
              {loading ? (
                <W3crmCargando texto="Cargando historial…" />
              ) : reports.length === 0 ? (
                <W3crmEmptyState
                  title="Aún no has generado ningún reporte"
                  description="Genera un informe arriba; quedará listado aquí para volver a descargarlo."
                />
              ) : (
                <W3crmDataTable
                  filas={reports} etiqueta="reportes" wrapperId="rep_historial_wrapper" porPagina={10}
                  columnas={[{ titulo: "Reporte" }, { titulo: "Estado" }, { titulo: "Descargas", alFinal: true }]}
                  render={(r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="fw-bold d-block">{txt(r.name) || "—"}</span>
                        <span className="text-muted fs-12">
                          {fecha(r.createdAt)}{fmtSize(r.sizeBytes) ? ` · ${fmtSize(r.sizeBytes)}` : ""}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          r.status === "ready" ? "badge-success"
                            : r.status === "failed" ? "badge-danger" : "badge-primary"
                        }`}>
                          {r.status === "ready" ? "Listo" : r.status === "failed" ? "Error" : "Generando…"}
                        </span>
                      </td>
                      <td className="text-end">
                        {r.status === "ready" && r.downloadUrl ? (
                          <a className="btn btn-primary light btn-sm me-1" href={r.downloadUrl}
                            target="_blank" rel="noopener noreferrer">Descargar</a>
                        ) : null}
                        {r.status === "ready" ? (
                          <a className="btn btn-primary light btn-sm" href={`/api/saas/reports/${r.id}/pdf`}
                            target="_blank" rel="noopener noreferrer">PDF</a>
                        ) : null}
                      </td>
                    </tr>
                  )}
                />
              )}
            </W3crmContentBox>

            {/* El título NO puede contener "Revenue por entregable": ese texto
                va en el cuerpo y debe ser una única coincidencia. */}
            <W3crmContentBox titulo="Atribución de ingresos" icono="fa-solid fa-sack-dollar">
              <p className="fw-bold text-black">Revenue por entregable (últimos 30 días)</p>
              {revenueLoading ? (
                <W3crmCargando texto="Cargando…" />
              ) : deliverableRevenue.length === 0 ? (
                <>
                  <W3crmEmptyState title="Sin datos de revenue atribuido" />
                  <div className="text-center">
                    <Link href="/saas/entregables" className="btn btn-primary light btn-sm">
                      Vincular una campaña UTM en Entregables
                    </Link>
                  </div>
                </>
              ) : (
                <W3crmDataTable
                  filas={deliverableRevenue} etiqueta="entregables" wrapperId="rep_revenue_wrapper" porPagina={5}
                  columnas={[
                    { titulo: "Entregable / Campaña" }, { titulo: "Conv." },
                    { titulo: "Spend" }, { titulo: "Revenue" }, { titulo: "ROAS", alFinal: true },
                  ]}
                  render={(row) => {
                    const roas = opt(row.roas);
                    return (
                      <tr key={row.deliverableId}>
                        <td>
                          <code className="fs-12">{corta(row.deliverableId, 8) || "—"}</code>
                          {row.utmCampaign ? (
                            <div className="text-muted fs-12">{txt(row.utmCampaign)}</div>
                          ) : null}
                        </td>
                        <td>{miles(row.conversions)}</td>
                        <td>€{num(row.adsSpend).toFixed(0)}</td>
                        <td className="fw-bold">€{num(row.attributedRevenue).toFixed(0)}</td>
                        <td className="text-end">
                          {roas !== null ? (
                            <span className={roas >= 2 ? "text-success fw-bold" : "text-warning"}>
                              {roas.toFixed(1)}x
                            </span>
                          ) : <span className="text-muted">—</span>}
                        </td>
                      </tr>
                    );
                  }}
                />
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
