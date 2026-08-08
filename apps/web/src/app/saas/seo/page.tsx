"use client";

/**
 * /saas/seo sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: keywords -> `W3crmContentBox` + `W3crmDataTable` con cabeceras
 * ordenables; problemas -> `W3crmContentBox` + `W3crmDataTable`; alta de
 * keywords -> `W3crmModal`; metricas -> `W3crmKpiTile`. Sin componentes
 * nuevos.
 *
 * Inventario: sin `data-testid` y sin spec dedicado — lo cubre
 * `saas-nav-full-coverage`. Verificado que ningun spec hace aserciones de
 * texto sobre esta ruta, asi que no hay textos-contrato ni riesgo de strict
 * mode. Aun asi ningun titulo de caja repite el texto de un KPI o de un boton,
 * porque el toggle de `W3crmContentBox` expone `aria-label="Plegar <titulo>"`.
 *
 * Logica de NELVYON intacta: `GET /api/saas/seo` con su manejo diferenciado
 * del 503 y del modo `degraded` (que prioriza `error` sobre `message`), el
 * `POST` con `{ keywords: [...] }` partiendo por lineas, `configured`,
 * `trackingEnabled` que gobierna el alta, los tres criterios de orden
 * (posicion, volumen, dificultad), los umbrales de dificultad (>=70 / >=40) y
 * de posicion (<=3 / <=10), y el delta contra `previousPosition`.
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

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** `toLocaleString` sobre un no-numero producia "NaN". */
function miles(v: unknown): string {
  return num(v).toLocaleString("es-ES");
}
function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES");
}

const ISSUE_BADGE: Record<string, string> = {
  error: "badge-danger",
  warning: "badge-warning",
  info: "badge-primary",
};
/** Un tipo fuera de catalogo pintaba `undefined`. */
function issueBadge(t: string): string {
  return ISSUE_BADGE[t] ?? "badge-secondary";
}

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
      const res = await fetch("/api/saas/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: kws }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
        throw new Error(j.error ?? j.detail ?? "Error al añadir keywords");
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
    <W3crmModal titulo="Añadir keywords" onClose={onClose} error={error}>
      <form onSubmit={(e) => void submit(e)}>
        <div className="form-group mb-3">
          <label htmlFor="seo-kws" className="text-black font-w600">Keywords (una por línea)</label>
          <textarea id="seo-kws" className="form-control" rows={8}
            placeholder={"agencia marketing digital\nposicionamiento seo madrid\ngestión redes sociales empresa"}
            value={keywords} onChange={(e) => setKeywords(e.target.value)} />
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Añadiendo…" : "Añadir keywords"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

export default function SaasSeoPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [issues, setIssues] = useState<SeoIssue[]>([]);
  const [summary, setSummary] = useState<SeoSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<"keywords" | "issues">("keywords");
  const [sort, setSort] = useState<"position" | "volume" | "difficulty">("position");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const seoRes = await fetch("/api/saas/seo");
      const d = (await seoRes.json().catch(() => ({}))) as {
        keywords?: Keyword[]; issues?: SeoIssue[]; summary?: SeoSummary;
        configured?: boolean; trackingEnabled?: boolean; degraded?: boolean; message?: string; error?: string;
      };
      if (seoRes.ok) {
        setConfigured(d.configured ?? false);
        setTrackingEnabled(d.trackingEnabled ?? true);
        setConfigMessage(
          d.degraded
            ? (d.error ?? d.message ?? "Proveedor SEO temporalmente no disponible.")
            : (d.message ?? null),
        );
        // Colecciones no-array reventaban `.filter`/`.map`.
        setKeywords(Array.isArray(d.keywords) ? d.keywords : []);
        setIssues(Array.isArray(d.issues) ? d.issues : []);
        if (d.summary && typeof d.summary === "object") setSummary(d.summary);
      } else if (seoRes.status === 503) {
        setConfigured(false);
        setConfigMessage(d.error ?? d.message ?? "Proveedor SEO no disponible.");
        setKeywords([]);
        setIssues([]);
        setSummary(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sorted = [...keywords].sort((a, b) => {
    if (sort === "position") return num(a.position) - num(b.position);
    if (sort === "volume") return num(b.searchVolume) - num(a.searchVolume);
    return num(b.difficulty) - num(a.difficulty);
  });

  const top3 = keywords.filter((k) => num(k.position) <= 3).length;
  const top10 = keywords.filter((k) => num(k.position) <= 10).length;
  const errors = issues.filter((i) => i.type === "error").length;

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="SEO" parentTitle="Captación" pageTitle="SEO" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Keywords rastreadas" value={keywords.length} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Top 3" value={top3} accent /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Top 10" value={top10} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Errores SEO" value={errors} /></div>
          {summary && (
            <>
              <div className="col-xl-3 col-sm-6">
                <W3crmKpiTile label="Tráfico orgánico" value={miles(summary.organicTraffic)} />
              </div>
              <div className="col-xl-3 col-sm-6">
                <W3crmKpiTile label="Backlinks" value={miles(summary.backlinks)} />
              </div>
            </>
          )}

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Monitoriza posiciones, audita errores y optimiza tu presencia orgánica
            </p>

            {configured === false ? (
              <div className="alert alert-warning" role="alert">
                <strong>SEMrush no configurado:</strong>{" "}
                {configMessage ?? "Configura SEMRUSH_API_KEY y SEO_DOMAIN en Railway para posiciones en vivo. Puedes añadir keywords manualmente."}
              </div>
            ) : null}

            <div className="alert alert-primary" role="note">
              <strong>Conecta Google Search Console.</strong> Añade <code>GOOGLE_SEARCH_CONSOLE_*</code> en
              Railway para importar datos reales de GSC automáticamente.
            </div>

            <ul className="nav nav-tabs mb-3">
              {(["keywords", "issues"] as const).map((t) => (
                <li className="nav-item" key={t}>
                  <button type="button" className={`nav-link ${tab === t ? "active" : ""}`}
                    aria-pressed={tab === t} onClick={() => setTab(t)}>
                    {t === "keywords" ? `Keywords (${keywords.length})` : `Problemas SEO (${issues.length})`}
                  </button>
                </li>
              ))}
            </ul>

            {tab === "keywords" && (
              <W3crmContentBox
                titulo="Posiciones rastreadas"
                icono="fa-solid fa-key"
                acciones={
                  <button type="button" className="btn btn-primary btn-sm me-2" disabled={!trackingEnabled}
                    onClick={() => setShowAdd(true)}>
                    + Añadir keywords
                  </button>
                }
              >
                {loading ? (
                  <W3crmCargando texto="Cargando keywords…" />
                ) : keywords.length === 0 ? (
                  <W3crmEmptyState
                    title="Sin keywords rastreadas"
                    description="Añade las palabras clave que quieres posicionar."
                  />
                ) : (
                  <>
                    <div className="mb-2" role="group" aria-label="Ordenar keywords">
                      {([
                        ["position", "Posición"],
                        ["volume", "Búsquedas/mes"],
                        ["difficulty", "Dificultad"],
                      ] as const).map(([k, label]) => (
                        <button key={k} type="button" aria-pressed={sort === k}
                          className={`btn btn-sm me-1 mb-1 ${sort === k ? "btn-primary" : "btn-primary light"}`}
                          onClick={() => setSort(k)}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <W3crmDataTable
                      filas={sorted}
                      etiqueta="keywords"
                      wrapperId="seo_keywords_wrapper"
                      porPagina={10}
                      reiniciarEn={sort}
                      columnas={[
                        { titulo: "Keyword" },
                        { titulo: "Pos." },
                        { titulo: "Búsq/mes" },
                        { titulo: "KD" },
                        { titulo: "CPC" },
                        { titulo: "Actualiz.", alFinal: true },
                      ]}
                      render={(kw) => {
                        const pos = num(kw.position);
                        const kd = num(kw.difficulty);
                        const delta = kw.previousPosition !== null && kw.previousPosition !== undefined
                          ? num(kw.previousPosition) - pos
                          : null;
                        return (
                          <tr key={kw.id}>
                            <td>
                              <span className="fw-bold">{kw.keyword || "—"}</span>
                              {kw.url ? <div className="text-muted fs-12 text-break">{kw.url}</div> : null}
                            </td>
                            <td>
                              <span className={`fw-bold ${pos <= 3 ? "text-success" : pos <= 10 ? "text-warning" : ""}`}>
                                #{pos}
                              </span>
                              {delta !== null && (
                                <div className={`fs-12 ${delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-muted"}`}>
                                  {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${Math.abs(delta)}` : "—"}
                                </div>
                              )}
                            </td>
                            <td>{miles(kw.searchVolume)}</td>
                            <td className={kd >= 70 ? "text-danger" : kd >= 40 ? "text-warning" : "text-success"}>{kd}</td>
                            <td>{num(kw.cpc).toFixed(2)} €</td>
                            <td className="text-end">{fecha(kw.updatedAt)}</td>
                          </tr>
                        );
                      }}
                    />
                  </>
                )}
              </W3crmContentBox>
            )}

            {tab === "issues" && (
              <W3crmContentBox titulo="Auditoría on-page" icono="fa-solid fa-triangle-exclamation">
                {loading ? (
                  <W3crmCargando texto="Cargando auditoría…" />
                ) : issues.length === 0 ? (
                  <W3crmEmptyState
                    title="Sin problemas SEO detectados"
                    description="Ejecuta un crawler para detectar problemas on-page."
                  />
                ) : (
                  <W3crmDataTable
                    filas={issues}
                    etiqueta="problemas"
                    wrapperId="seo_issues_wrapper"
                    porPagina={10}
                    columnas={[{ titulo: "Problema" }, { titulo: "URLs afectadas" }, { titulo: "Alcance", alFinal: true }]}
                    render={(issue) => {
                      // `affectedUrls` podia no ser array y reventaba el `slice`.
                      const urls = Array.isArray(issue.affectedUrls) ? issue.affectedUrls : [];
                      return (
                        <tr key={issue.id}>
                          <td>
                            <span className="fw-bold">{issue.title || "—"}</span>
                            <div className="text-muted fs-12">{issue.description}</div>
                          </td>
                          <td className="text-muted fs-12">
                            {urls.length === 0
                              ? "—"
                              : urls.slice(0, 2).map((url) => <div key={url} className="text-break">{url}</div>)}
                          </td>
                          <td className="text-end">
                            <span className={`badge ${issueBadge(issue.type)}`}>{num(issue.count)} páginas</span>
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

      {showAdd && <AddKeywordModal onClose={() => setShowAdd(false)} onSaved={load} />}
    </SaasW3crmShell>
  );
}
