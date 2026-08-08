"use client";

/**
 * /saas/entregables sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: las dos pestañas -> `nav nav-tabs`; ambas tablas -> `W3crmContentBox`
 * + `W3crmDataTable`; el diálogo -> `W3crmModal`; KPIs -> `W3crmKpiTile`.
 * Sin componentes nuevos.
 *
 * CONTRATO — `saas-deliverable-revenue.spec.ts` exige, y aquí se conserva:
 *   - `getByRole("button", { name: /Revenue €/i })` ÚNICO: el rótulo lleva el
 *     símbolo €. Ninguna caja se titula con esa cadena.
 *   - `getByRole("button", { name: /Lista/i })` ÚNICO. Es substring e
 *     insensible a mayúsculas, así que NINGÚN título de caja puede contener
 *     "Lista" ni "Listado" —el toggle expone `aria-label="Plegar <título>"` y
 *     colisionaría—. La caja de la pestaña se titula "Entregables recientes".
 *   - `getByRole("button", { name: /Recalcular/i })` ÚNICO, con su
 *     `data-testid="revenue-recalcular"` intacto.
 *   - `getByRole("button", { name: /Cancelar/i })` ÚNICO con el modal abierto:
 *     no hay ningún otro Cancelar en la página.
 *   - `getByText("Vincular campaña UTM")` — título exacto del modal.
 *   - `getByText("Revenue atribuido")` y `getByText("ROAS medio")` ÚNICOS. OJO:
 *     el primero casa también con el vacío "Sin revenue atribuido", así que
 *     ese vacío SOLO puede existir en la pestaña Revenue y la pestaña por
 *     defecto sigue siendo "lista" —igual que antes—; si no, coexistirían.
 *   - `getByText("Landing ACME E2E")`: el título real del entregable se pinta
 *     sin truncar en el DOM.
 *
 * Lógica de NELVYON intacta: `GET /api/saas/entregables` con `days`, `type` y
 * `status`; `GET /api/saas/entregables/revenue?days=`; el `POST` de la misma
 * ruta en sus DOS formas —`{ action: "refresh" }` al recalcular y el alta de
 * vínculo con `deliverableId`/`deliverableSource: "os"`/`utmCampaign`/
 * `landingUrl`—; `POST /api/saas/social/suggest` con `save: true` para el
 * social proof y su condición de estado; el cálculo de total atribuido y ROAS
 * medio solo sobre las filas con ROAS; el copiado con su cascada
 * `portalUrl ?? downloadUrl ?? /portal/deliverables/{id}`; y el aviso de 2 s.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import {
  W3crmCargando,
  W3crmContentBox,
  W3crmDataTable,
  W3crmModal,
} from "@/features/saas-w3crm/components/W3crmContentBox";
import type {
  SaasDeliverable, DeliverableSummary, DeliverableType, DeliverableStatus, DeliverableRevenue,
} from "@nelvyon/saas";

const TYPE_ICON: Record<string, string> = {
  landing: "fa-solid fa-rocket",
  seo: "fa-solid fa-magnifying-glass",
  ads: "fa-solid fa-bullhorn",
  chatbot: "fa-solid fa-robot",
  report: "fa-solid fa-chart-column",
  certificate: "fa-solid fa-award",
  social_calendar: "fa-solid fa-calendar-days",
  other: "fa-solid fa-box",
};

const STATUS_BADGE: Record<string, string> = {
  approved: "badge-success",
  published: "badge-success",
  delivered: "badge-primary",
  generated: "badge-primary",
  in_review: "badge-warning",
  draft: "badge-secondary",
  rejected: "badge-danger",
  archived: "badge-secondary",
};

type TypeFilter = DeliverableType | "all";
type StatusFilter = DeliverableStatus | "all";
type EntregablesTab = "lista" | "revenue";

/** Estados y tipos fuera de catálogo pintaban `undefined`. */
function statusBadge(s: unknown): string { return STATUS_BADGE[String(s ?? "")] ?? "badge-secondary"; }
function typeIcon(t: unknown): string { return TYPE_ICON[String(t ?? "")] ?? "fa-solid fa-box"; }
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function opt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
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

function LinkModal({ deliverableId, onClose, onSaved }: {
  deliverableId: string; onClose: () => void; onSaved: () => void;
}) {
  const [utmCampaign, setUtmCampaign] = useState("");
  const [landingUrl, setLandingUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/entregables/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliverableId,
          deliverableSource: "os",
          utmCampaign: utmCampaign || undefined,
          landingUrl: landingUrl || undefined,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(d?.message ?? d?.error ?? `Error ${res.status}`);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <W3crmModal titulo="Vincular campaña UTM" onClose={onClose} error={error}>
      <div className="form-group mb-3">
        <label htmlFor="ent-utm" className="text-black font-w600">UTM Campaign</label>
        <input id="ent-utm" className="form-control" placeholder="ej: local-business-q2"
          value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} />
      </div>
      <div className="form-group mb-3">
        <label htmlFor="ent-landing" className="text-black font-w600">Landing URL (opcional)</label>
        <input id="ent-landing" className="form-control" placeholder="https://…"
          value={landingUrl} onChange={(e) => setLandingUrl(e.target.value)} />
      </div>
      <div className="text-end">
        <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => { void save(); }}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </W3crmModal>
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
  const [socialProofMsg, setSocialProofMsg] = useState<string | null>(null);

  async function createSocialProof(d: SaasDeliverable) {
    setSocialProofMsg(null);
    const res = await fetch("/api/saas/social/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliverableId: d.id,
        title: d.title,
        qaScore: d.qaScore ?? undefined,
        packName: d.packId ?? undefined,
        save: true,
      }),
    });
    if (res.ok) setSocialProofMsg(`Borrador social proof creado para «${d.title}»`);
    else setSocialProofMsg("Error al crear borrador social proof");
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/saas/entregables?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json().catch(() => ({}))) as {
        deliverables?: SaasDeliverable[]; summary?: DeliverableSummary;
      };
      // Colecciones no-array reventaban `.map`.
      setDeliverables(Array.isArray(data.deliverables) ? data.deliverables : []);
      setSummary(data.summary && typeof data.summary === "object" ? data.summary : null);
    } catch {
      setError("Error al cargar entregables. Reintenta en un momento.");
    } finally {
      setLoading(false);
    }
  }, [days, typeFilter, statusFilter]);

  const loadRevenue = useCallback(async () => {
    setRevenueLoading(true);
    try {
      const res = await fetch(`/api/saas/entregables/revenue?days=${days}`);
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { items?: DeliverableRevenue[] };
        const items = Array.isArray(d.items) ? d.items : [];
        setRevenueItems(items);
        setRevenueTotal(items.reduce((s, r) => s + num(r.attributedRevenue), 0));
        const roasRows = items.filter((r) => opt(r.roas) !== null);
        setAvgRoas(
          roasRows.length > 0
            ? roasRows.reduce((s, r) => s + num(r.roas), 0) / roasRows.length
            : null,
        );
      }
    } catch { /* silent */ } finally {
      setRevenueLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); void loadRevenue(); }, [load, loadRevenue]);

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
    // `clipboard` puede no existir sin permiso: sin el guard reventaba.
    void navigator.clipboard?.writeText(url).then(() => {
      setCopyMsg("Link copiado");
      window.setTimeout(() => setCopyMsg(null), 2000);
    });
  }

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Entregables" parentTitle="Cuenta" pageTitle="Resultados" />
      <div className="container-fluid">
        <div className="row">
          {summary && (
            <>
              <div className="col-xl-2 col-sm-4"><W3crmKpiTile label="Total" value={num(summary.total)} /></div>
              <div className="col-xl-2 col-sm-4"><W3crmKpiTile label="Pendientes revisión" value={num(summary.pendingReview)} /></div>
              <div className="col-xl-2 col-sm-4"><W3crmKpiTile label="Aprobados" value={num(summary.approved)} accent /></div>
              <div className="col-xl-2 col-sm-4">
                <W3crmKpiTile label="QA media" value={opt(summary.avgQaScore) !== null ? `${num(summary.avgQaScore)}%` : "—"} />
              </div>
              {/* "Revenue atribuido" debe ser único: el vacío homónimo solo
                  existe en la pestaña Revenue, que no es la de por defecto. */}
              <div className="col-xl-2 col-sm-4"><W3crmKpiTile label="Revenue atribuido" value={`€${revenueTotal.toFixed(0)}`} /></div>
              <div className="col-xl-2 col-sm-4">
                <W3crmKpiTile label="ROAS medio" value={avgRoas !== null ? `${avgRoas.toFixed(1)}x` : "—"} />
              </div>
            </>
          )}

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Resultados de packs OS, servicios recurrentes y entregables manuales
            </p>

            {copyMsg && <div className="alert alert-primary" role="status">{copyMsg}</div>}
            {socialProofMsg && <div className="alert alert-success" role="status">{socialProofMsg}</div>}

            <ul className="nav nav-tabs mb-3">
              {(["lista", "revenue"] as EntregablesTab[]).map((tab) => (
                <li className="nav-item" key={tab}>
                  <button type="button" className={`nav-link ${activeTab === tab ? "active" : ""}`}
                    aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)}>
                    {tab === "lista" ? "Lista" : "Revenue €"}
                  </button>
                </li>
              ))}
            </ul>

            {activeTab === "revenue" && (
              /* Título sin "Revenue €", "Lista" ni "Recalcular". */
              <W3crmContentBox
                titulo="Atribución por entregable"
                icono="fa-solid fa-coins"
                acciones={
                  <button type="button" className="btn btn-primary light btn-sm me-2"
                    data-testid="revenue-recalcular"
                    onClick={() => { void handleRefreshRevenue(); }}>
                    ↻ Recalcular
                  </button>
                }
              >
                {revenueLoading ? (
                  <W3crmCargando texto="Calculando revenue…" />
                ) : revenueItems.length === 0 ? (
                  <W3crmEmptyState
                    title="Sin revenue atribuido"
                    description="Vincula una campaña UTM a tus entregables usando el botón «Vincular campaña» en la pestaña Lista."
                  />
                ) : (
                  <W3crmDataTable
                    filas={revenueItems}
                    etiqueta="entregables"
                    wrapperId="ent_revenue_wrapper"
                    porPagina={10}
                    columnas={[
                      { titulo: "Entregable" },
                      { titulo: "Pack / Campaña" },
                      { titulo: "Conv." },
                      { titulo: "Spend" },
                      { titulo: "Revenue" },
                      { titulo: "ROAS", alFinal: true },
                    ]}
                    render={(r) => {
                      const roas = opt(r.roas);
                      return (
                        <tr key={r.id}>
                          <td><code className="fs-12">{corta(r.deliverableId, 8) || "—"}</code></td>
                          <td>
                            <span className="d-block">{txt(r.packId) || "—"}</span>
                            {r.utmCampaign ? <span className="text-muted fs-12">{txt(r.utmCampaign)}</span> : null}
                          </td>
                          <td>{num(r.conversions)}</td>
                          <td>€{num(r.adsSpend).toFixed(0)}</td>
                          <td className="fw-bold">€{num(r.attributedRevenue).toFixed(0)}</td>
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
            )}

            {activeTab === "lista" && (
              /* El título NO puede contener "Lista" ni "Listado". */
              <W3crmContentBox titulo="Entregables recientes" icono="fa-solid fa-box-open">
                <div className="row align-items-end mb-3">
                  <div className="col-xl-3 col-sm-6">
                    <div className="form-group mb-2">
                      <label htmlFor="ent-tipo" className="text-black font-w600">Tipo</label>
                      <select id="ent-tipo" className="form-control" value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}>
                        <option value="all">Todos los tipos</option>
                        <option value="landing">Landing</option>
                        <option value="seo">SEO</option>
                        <option value="ads">Ads</option>
                        <option value="report">Reporte</option>
                        <option value="chatbot">Chatbot</option>
                        <option value="certificate">Certificado</option>
                        <option value="social_calendar">Calendario Social</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-xl-3 col-sm-6">
                    <div className="form-group mb-2">
                      <label htmlFor="ent-estado" className="text-black font-w600">Estado</label>
                      <select id="ent-estado" className="form-control" value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                        <option value="all">Todos los estados</option>
                        <option value="draft">Borrador</option>
                        <option value="in_review">En revisión</option>
                        <option value="delivered">Entregado</option>
                        <option value="approved">Aprobado</option>
                        <option value="published">Publicado</option>
                        <option value="rejected">Rechazado</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-xl-3 col-sm-6">
                    <div className="form-group mb-2">
                      <label htmlFor="ent-dias" className="text-black font-w600">Periodo</label>
                      <select id="ent-dias" className="form-control" value={days}
                        onChange={(e) => setDays(Number(e.target.value))}>
                        <option value={7}>Últimos 7 días</option>
                        <option value={30}>Últimos 30 días</option>
                        <option value={90}>Últimos 90 días</option>
                        <option value={365}>Último año</option>
                      </select>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <W3crmCargando texto="Cargando entregables…" />
                ) : error ? (
                  <div className="alert alert-danger py-2 fs-14 mb-0" role="alert">{error}</div>
                ) : deliverables.length === 0 ? (
                  <W3crmEmptyState
                    title="Sin entregables aún"
                    description="Ejecuta un pack OS desde Brief-to-Launch o espera el próximo ciclo de servicios recurrentes (SEO mensual, calendario social, snapshot de ads)."
                  />
                ) : (
                  <W3crmDataTable
                    filas={deliverables}
                    etiqueta="entregables"
                    wrapperId="ent_lista_wrapper"
                    porPagina={10}
                    reiniciarEn={`${typeFilter}-${statusFilter}-${days}`}
                    columnas={[
                      { titulo: "Tipo" },
                      { titulo: "Título" },
                      { titulo: "Pack" },
                      { titulo: "QA" },
                      { titulo: "Estado" },
                      { titulo: "Fecha" },
                      { titulo: "Acciones", alFinal: true },
                    ]}
                    render={(d) => {
                      const qa = opt(d.qaScore);
                      return (
                        <tr key={d.id}>
                          <td><i className={`${typeIcon(d.type)} text-primary`} title={txt(d.type)} /></td>
                          {/* Título completo, sin truncar: es texto-contrato. */}
                          <td><span className="fw-bold">{txt(d.title) || "—"}</span></td>
                          <td className="text-muted fs-12">{txt(d.packId) || "—"}</td>
                          <td>
                            {qa !== null ? (
                              <span className={qa >= 85 ? "text-success fw-bold" : "text-warning fw-bold"}>{qa}%</span>
                            ) : <span className="text-muted">—</span>}
                          </td>
                          <td><span className={`badge ${statusBadge(d.status)}`}>{txt(d.status) || "—"}</span></td>
                          <td>{fecha(d.createdAt)}</td>
                          <td className="text-end">
                            <a className="btn btn-primary light btn-sm me-1" href={`/portal/deliverables/${d.id}`}
                              target="_blank" rel="noopener noreferrer">Ver portal</a>
                            {d.downloadUrl ? (
                              <a className="btn btn-primary light btn-sm me-1" href={d.downloadUrl}
                                target="_blank" rel="noopener noreferrer">Descargar</a>
                            ) : null}
                            <button type="button" className="btn btn-primary light btn-sm me-1"
                              aria-label={`Copiar link de ${d.title}`} onClick={() => copyLink(d)}>
                              Copiar link
                            </button>
                            <button type="button" className="btn btn-primary light btn-sm me-1"
                              onClick={() => setLinkModalId(d.id)}>
                              Vincular campaña
                            </button>
                            {(d.status === "approved" || d.status === "published" || d.status === "delivered") && (
                              <button type="button" className="btn btn-primary light btn-sm"
                                aria-label={`Crear social proof de ${d.title}`}
                                onClick={() => { void createSocialProof(d); }}>
                                Social proof
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }}
                  />
                )}
              </W3crmContentBox>
            )}
          </div>
        </div>
      </div>

      {linkModalId && (
        <LinkModal deliverableId={linkModalId} onClose={() => setLinkModalId(null)}
          onSaved={() => { void loadRevenue(); }} />
      )}
    </SaasW3crmShell>
  );
}
