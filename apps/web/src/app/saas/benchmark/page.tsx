"use client";

/**
 * /saas/benchmark sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: gráfico y comparativa -> `W3crmContentBox`; tabla -> `W3crmDataTable`;
 * resumen -> `W3crmKpiTile`; valoraciones -> `badge` de la plantilla. Sin
 * componentes nuevos.
 *
 * CONTRATO — `saas-sector-benchmark.spec.ts`:
 *   - `getByText("Sector Benchmark")` ÚNICO. Va en `mainTitle`; el breadcrumb
 *     dice "Benchmark", que NO contiene esa cadena, así que no duplica.
 *   - `getByText("E-commerce")` ÚNICO: el badge del sector, una sola vez. No se
 *     añade selector de sector aunque el endpoint `/benchmarks/sectors` exista.
 *   - `getByRole("button", { name: /Actualizar/i })` ÚNICO: ninguna caja se
 *     titula con "Actualizar" (el toggle de `W3crmContentBox` expone
 *     `aria-label="Plegar <título>"` y sería un segundo botón con ese nombre).
 *     El "↻ Actualizar" del texto del estado vacío es copia, no botón.
 *   - `getByText("Puntuación global")` y `getByText("100%")` ÚNICOS: el valor
 *     del KPI va en su propio `<span>` para ser el elemento más pequeño que lo
 *     contiene, y su pista va en otro `<span>` hermano.
 *   - `getByRole("cell", { name: "Tasa de apertura email" })` con nombre
 *     EXACTO: la celda de métrica contiene el label y NADA más. El origen del
 *     dato no puede colarse ahí.
 *   - `getByText(/Fuentes:/)` y `getByText("Benchmark actualizado", { exact: true })`.
 *
 * Se conserva `nsafe()` de f89c198c tal cual: la API puede devolver texto o
 * ausencia y `.toFixed` sobre eso tumbaba la página al hidratar, igual que en
 * /saas/reportes (3fa35da1). `null` significa "sin dato" y se pinta "—".
 *
 * Lógica intacta: `GET /api/saas/benchmark`, `POST /api/saas/benchmark/refresh`
 * y el aviso de 3 s. El gráfico sigue siendo el mismo `BarChart` de recharts;
 * solo cambian los colores, que estaban calculados para el fondo oscuro y
 * serían invisibles sobre el claro de W3CRM.
 */
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import {
  W3crmCargando,
  W3crmContentBox,
  W3crmDataTable,
} from "@/features/saas-w3crm/components/W3crmContentBox";
import type { BenchmarkDashboard, BenchmarkComparison, BenchmarkRating } from "@nelvyon/saas";

// ── Rating display ──────────────────────────────────────────────────────────────

/** Mismos estados, con las clases de badge de la plantilla. */
const RATING_BADGE: Record<BenchmarkRating, string> = {
  excelente: "badge-success",
  bueno: "badge-primary",
  mejorable: "badge-warning",
  critico: "badge-danger",
  sin_dato: "badge-secondary",
};

const RATING_LABEL: Record<BenchmarkRating, string> = {
  excelente: "Excelente",
  bueno: "Bueno",
  mejorable: "Mejorable",
  critico: "Crítico",
  sin_dato: "Sin dato",
};

const COLOR_PRIMARIO = "#0D99FF";
const COLOR_AVISO = "#FF9F00";
const COLOR_INDUSTRIA = "#C8CDD6";
const COLOR_EJE = "rgba(0,0,0,0.45)";
const COLOR_REJILLA = "rgba(0,0,0,0.07)";

function nsafe(v: unknown): number | null {
  // La API puede devolver texto o ausencia: `.toFixed` sobre eso reventaba la
  // página entera al hidratar, igual que en /saas/reportes (3fa35da1).
  if (v === null || v === undefined) return null;
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : null;
}

function fmt(raw: number | null, unit: string): string {
  const value = nsafe(raw);
  if (value === null) return "—";
  if (unit === "%") return `${(value * 100).toFixed(1)}%`;
  if (unit === "x") return `${value.toFixed(2)}x`;
  if (unit === "€") return `${value.toFixed(2)}€`;
  return `${value.toFixed(0)}`;
}

/** Entero para los KPIs de recuento: sin dato se pinta "—", nunca 0. */
function ent(v: unknown): string {
  const n = nsafe(v);
  return n === null ? "—" : n.toLocaleString("es-ES");
}

function txt(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Normalize values for a comparable bar chart (% → ×100, others raw). */
function chartValue(value: number | null, unit: string): number {
  const n = nsafe(value);
  if (n === null) return 0;
  return unit === "%" ? n * 100 : n;
}

// ── KPI del resumen ─────────────────────────────────────────────────────────────

/**
 * El valor va en su propio `<span>` a propósito: así es el elemento más pequeño
 * que contiene "100%" y `getByText` resuelve a uno solo. La pista, hermana.
 */
function KpiValor({ valor, pista }: { valor: string; pista?: string }) {
  return (
    <>
      <span>{valor}</span>
      {pista ? <span className="d-block fs-12 fw-normal text-muted">{pista}</span> : null}
    </>
  );
}

// ── Comparison chart ────────────────────────────────────────────────────────────

function ComparisonChart({ comparisons }: { comparisons: BenchmarkComparison[] }) {
  const data = comparisons
    .filter((c) => c.clientValue !== null && c.industryValue !== null)
    .map((c) => ({
      name: txt(c.label),
      Tú: chartValue(c.clientValue, c.unit),
      Industria: chartValue(c.industryValue, c.unit),
      rating: c.rating,
    }));

  if (data.length === 0) return null;

  return (
    <W3crmContentBox titulo="Comparativa con la industria" icono="fa-solid fa-chart-column">
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLOR_REJILLA} />
            <XAxis dataKey="name" tick={{ fill: COLOR_EJE, fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fill: COLOR_EJE, fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#2C2C2C" }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Industria" fill={COLOR_INDUSTRIA} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Tú" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.rating === "critico" || d.rating === "mejorable" ? COLOR_AVISO : COLOR_PRIMARIO} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </W3crmContentBox>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────────

export default function BenchmarkPage() {
  const [dashboard, setDashboard] = useState<BenchmarkDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/benchmark");
      if (res.ok) {
        const d = (await res.json()) as { dashboard: BenchmarkDashboard };
        setDashboard(d.dashboard);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/saas/benchmark/refresh", { method: "POST" });
      if (res.ok) {
        const d = (await res.json()) as { dashboard: BenchmarkDashboard };
        setDashboard(d.dashboard);
        showToast("Benchmark actualizado");
      }
    } finally {
      setRefreshing(false);
    }
  }

  const summary = dashboard?.summary;
  const hasData = !!dashboard && (nsafe(summary?.metricsTracked) ?? 0) > 0;
  const comparaciones = dashboard && Array.isArray(dashboard.comparisons) ? dashboard.comparisons : [];
  const fuentes = dashboard && Array.isArray(dashboard.dataSources) ? dashboard.dataSources : [];
  const dias = nsafe(dashboard?.periodDays) ?? 30;
  const puntuacion = nsafe(summary?.overallScore);

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Sector Benchmark" parentTitle="Analítica" pageTitle="Benchmark" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <div>
                <p className="mb-1 fs-14 text-muted">
                  Tus KPIs comparados con las medias de tu industria (últimos {dias} días)
                </p>
                {/* Único sitio donde aparece el sector: ver contrato. */}
                {dashboard ? <span className="badge badge-primary">{txt(dashboard.sectorLabel) || "—"}</span> : null}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={refreshing || loading}
                onClick={() => { void handleRefresh(); }}
              >
                {refreshing ? "Actualizando…" : "↻ Actualizar"}
              </button>
            </div>

            {loading ? (
              <W3crmCargando texto="Cargando benchmark…" />
            ) : !hasData ? (
              <W3crmContentBox titulo="Benchmark de sector" icono="fa-solid fa-chart-simple">
                <W3crmEmptyState title="Aún no hay datos suficientes para comparar" />
                <p className="text-muted fs-14 text-center mb-0 mx-auto" style={{ maxWidth: 460 }}>
                  El benchmark se calcula automáticamente a partir de tus campañas de email,
                  atribución de leads, métricas de ads y entregables. Lanza una campaña o
                  conecta tus cuentas de publicidad y pulsa{" "}
                  <strong className="text-black">↻ Actualizar</strong>.
                </p>
              </W3crmContentBox>
            ) : (
              <>
                <div className="row">
                  <div className="col-xl-3 col-sm-6">
                    <W3crmKpiTile
                      label="Puntuación global"
                      value={<KpiValor valor={puntuacion === null ? "—" : `${puntuacion}%`} pista="métricas ≥ industria" />}
                      accent
                    />
                  </div>
                  <div className="col-xl-3 col-sm-6">
                    <W3crmKpiTile label="Métricas comparadas" value={<KpiValor valor={ent(summary?.metricsCompared)} />} />
                  </div>
                  <div className="col-xl-3 col-sm-6">
                    <W3crmKpiTile label="Sobre la media" value={<KpiValor valor={ent(summary?.aboveIndustry)} pista="industria" />} />
                  </div>
                  <div className="col-xl-3 col-sm-6">
                    <W3crmKpiTile label="Bajo la media" value={<KpiValor valor={ent(summary?.belowIndustry)} pista="industria" />} />
                  </div>
                </div>

                {dashboard?.degraded ? (
                  <div className="alert alert-warning py-2 fs-14" role="status">
                    Datos parciales — algunas métricas no tienen origen conectado todavía.
                  </div>
                ) : null}

                <ComparisonChart comparisons={comparaciones} />

                <W3crmContentBox titulo="Detalle por métrica" icono="fa-solid fa-table-list">
                  {comparaciones.length === 0 ? (
                    <W3crmEmptyState title="Sin métricas comparables" />
                  ) : (
                    <W3crmDataTable
                      filas={comparaciones}
                      etiqueta="métricas"
                      wrapperId="bm_comparativa_wrapper"
                      porPagina={10}
                      columnas={[
                        { titulo: "Métrica" },
                        { titulo: "Tú", alFinal: true },
                        { titulo: "Industria", alFinal: true },
                        { titulo: "Δ", alFinal: true },
                        { titulo: "Valoración" },
                      ]}
                      render={(c) => {
                        const delta = nsafe(c.deltaPct);
                        const aFavor = delta === null ? false : c.higherBetter ? delta >= 0 : delta <= 0;
                        return (
                          <tr key={c.key}>
                            {/* Nombre accesible EXACTO: aquí no cabe nada más. */}
                            <td>{txt(c.label)}</td>
                            <td className="text-end fw-bold">{fmt(c.clientValue, c.unit)}</td>
                            <td className="text-end text-muted">{fmt(c.industryValue, c.unit)}</td>
                            <td className="text-end">
                              {delta === null ? (
                                <span className="text-muted">—</span>
                              ) : (
                                <span className={aFavor ? "text-success" : "text-warning"}>
                                  {delta >= 0 ? "+" : ""}{delta.toFixed(0)}%
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${RATING_BADGE[c.rating] ?? "badge-secondary"}`}>
                                {RATING_LABEL[c.rating] ?? "Sin dato"}
                              </span>
                            </td>
                          </tr>
                        );
                      }}
                    />
                  )}
                </W3crmContentBox>

                {fuentes.length > 0 ? (
                  <p className="text-muted fs-12">Fuentes: {fuentes.join(" · ")}</p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {toast ? (
        <div
          className="alert alert-primary position-fixed shadow"
          style={{ bottom: 24, right: 24, zIndex: 1050, marginBottom: 0 }}
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </SaasW3crmShell>
  );
}
