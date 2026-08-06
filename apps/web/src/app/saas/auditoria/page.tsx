"use client";

/**
 * /saas/auditoria sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: filtros y listado -> `W3crmContentBox` + `W3crmDataTable`;
 * contadores -> `W3crmKpiTile`. Sin componentes nuevos.
 *
 * Inventario: sin `data-testid` y sin spec dedicado — lo cubre
 * `saas-nav-full-coverage`. Verificado con grep que ningún spec hace
 * aserciones de texto ni de rol sobre esta ruta.
 *
 * PAGINACIÓN: es de SERVIDOR (`limit`/`offset` + `total`), no de cliente. Los
 * controles reales de página se conservan en la cabecera de la caja y
 * `W3crmDataTable` recibe `porPagina = PAGE_SIZE`, de modo que su paginador
 * interno nunca parte el lote que ya vino paginado del backend ni compite con
 * él. Sustituirla por la paginación de cliente habría roto el `offset`.
 *
 * Lógica de NELVYON intacta: `GET /api/saas/audit` con `credentials:
 * "same-origin"` y sus parámetros exactos (`limit`, `offset`, `module`,
 * `action_filter`, `from`, `to` con el `T23:59:59` del extremo superior); la
 * exportación CSV que reutiliza los mismos filtros añadiendo `format=csv` y
 * descarga vía blob; el PDF unificado de `/api/saas/audit/unified?format=pdf`;
 * el reseteo de página al cambiar cualquier filtro; y los nueve tipos de
 * acción con su etiqueta y su tono.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";

interface AuditEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  module: string;
  resourceId: string | null;
  resourceType: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_BADGE: Record<string, string> = {
  create: "badge-success", update: "badge-primary", delete: "badge-danger",
  login: "badge-success", export: "badge-warning", view: "badge-secondary",
  send: "badge-success", publish: "badge-success", purge: "badge-danger",
};
const ACTION_LABEL: Record<string, string> = {
  create: "Creación", update: "Edición", delete: "Eliminación",
  login: "Acceso", export: "Exportación", view: "Vista",
  send: "Envío", publish: "Publicación", purge: "Purga",
};

const MODULES = ["crm", "campanias", "workflows", "pipeline", "affiliates", "loyalty", "billing", "settings", "sso", "api-keys"];
const PAGE_SIZE = 50;

/** Una acción fuera de catálogo ya caía a su propio código; se conserva. */
function accionLabel(a: string): string { return ACTION_LABEL[a] ?? (a ? String(a) : "—"); }
function accionBadge(a: string): string { return ACTION_BADGE[a] ?? "badge-secondary"; }
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** Un `createdAt` corrupto pintaba "Invalid Date". */
function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-ES", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
}

export default function SaasAuditoriaPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterModule, setFilterModule] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String((page - 1) * PAGE_SIZE));
    if (filterModule) p.set("module", filterModule);
    if (filterAction) p.set("action_filter", filterAction);
    // Fechas del usuario: si el navegador entrega algo inválido, no se manda.
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) p.set("from", d.toISOString());
    }
    if (to) {
      const d = new Date(`${to}T23:59:59`);
      if (!Number.isNaN(d.getTime())) p.set("to", d.toISOString());
    }
    return p;
  }, [page, filterModule, filterAction, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/saas/audit?${buildParams()}`, { credentials: "same-origin" });
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { entries?: AuditEntry[]; total?: number };
        setEntries(Array.isArray(d.entries) ? d.entries : []);
        setTotal(num(d.total));
      } else {
        setEntries([]);
        setTotal(0);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { void load(); }, [load]);

  function applyFilters() {
    if (page !== 1) setPage(1);
    else void load();
  }

  function setFilterAndResetPage(setter: (v: string) => void, value: string) {
    setPage(1);
    setter(value);
  }

  async function exportCsv() {
    const p = buildParams();
    p.set("format", "csv");
    const res = await fetch(`/api/saas/audit?${p}`, { credentials: "same-origin" });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const stats = {
    creates: entries.filter((e) => e.action === "create").length,
    deletes: entries.filter((e) => e.action === "delete").length,
    modules: new Set(entries.map((e) => e.module).filter(Boolean)).size,
  };

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Registros de Auditoría" parentTitle="Cuenta" pageTitle="Auditoría" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Total (página)" value={total} accent /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Creaciones" value={stats.creates} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Eliminaciones" value={stats.deletes} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Módulos activos" value={stats.modules} /></div>

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Historial completo de acciones, cambios y accesos en tu cuenta
            </p>

            <W3crmContentBox titulo="Filtros" icono="fa-solid fa-filter">
              <div className="row align-items-end">
                <div className="col-xl-3 col-sm-6">
                  <div className="form-group mb-3">
                    <label htmlFor="aud-modulo" className="text-black font-w600">Módulo</label>
                    <select id="aud-modulo" className="form-control" value={filterModule}
                      onChange={(e) => setFilterAndResetPage(setFilterModule, e.target.value)}>
                      <option value="">Todos los módulos</option>
                      {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="col-xl-3 col-sm-6">
                  <div className="form-group mb-3">
                    <label htmlFor="aud-accion" className="text-black font-w600">Acción</label>
                    <select id="aud-accion" className="form-control" value={filterAction}
                      onChange={(e) => setFilterAndResetPage(setFilterAction, e.target.value)}>
                      <option value="">Todas las acciones</option>
                      {Object.keys(ACTION_LABEL).map((a) => (
                        <option key={a} value={a}>{ACTION_LABEL[a]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-xl-2 col-sm-6">
                  <div className="form-group mb-3">
                    <label htmlFor="aud-desde" className="text-black font-w600">Desde</label>
                    <input id="aud-desde" className="form-control" type="date" value={from}
                      onChange={(e) => setFilterAndResetPage(setFrom, e.target.value)} />
                  </div>
                </div>
                <div className="col-xl-2 col-sm-6">
                  <div className="form-group mb-3">
                    <label htmlFor="aud-hasta" className="text-black font-w600">Hasta</label>
                    <input id="aud-hasta" className="form-control" type="date" value={to}
                      onChange={(e) => setFilterAndResetPage(setTo, e.target.value)} />
                  </div>
                </div>
                <div className="col-xl-2 col-sm-6">
                  <div className="form-group mb-3">
                    <button type="button" className="btn btn-primary w-100" onClick={applyFilters}>Filtrar</button>
                  </div>
                </div>
              </div>
              <div className="text-end">
                <button type="button" className="btn btn-primary light btn-sm me-1" onClick={() => void load()}>
                  Actualizar
                </button>
                <button type="button" className="btn btn-primary light btn-sm me-1" onClick={() => void exportCsv()}>
                  Exportar CSV
                </button>
                <button type="button" className="btn btn-primary light btn-sm"
                  onClick={() => { window.location.href = "/api/saas/audit/unified?format=pdf"; }}>
                  Audit unificado PDF
                </button>
              </div>
            </W3crmContentBox>

            <W3crmContentBox
              titulo="Eventos"
              icono="fa-solid fa-clipboard-list"
              acciones={
                <span className="d-inline-flex align-items-center gap-2 me-2">
                  <span className="text-muted fs-12">
                    {total} eventos · página {page} de {totalPages}
                  </span>
                  <button type="button" className="btn btn-primary light btn-sm" disabled={page === 1}
                    aria-label="Página anterior de eventos"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    ← Anterior
                  </button>
                  <button type="button" className="btn btn-primary light btn-sm" disabled={page >= totalPages}
                    aria-label="Página siguiente de eventos"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    Siguiente →
                  </button>
                </span>
              }
            >
              {loading ? (
                <W3crmCargando texto="Cargando eventos…" />
              ) : entries.length === 0 ? (
                <W3crmEmptyState title="Sin eventos" description="No hay registros que coincidan con los filtros." />
              ) : (
                <W3crmDataTable
                  filas={entries}
                  etiqueta="eventos"
                  wrapperId="audit_wrapper"
                  porPagina={PAGE_SIZE}
                  reiniciarEn={page}
                  columnas={[
                    { titulo: "Fecha" },
                    { titulo: "Usuario" },
                    { titulo: "Acción" },
                    { titulo: "Módulo" },
                    { titulo: "Recurso" },
                    { titulo: "IP", alFinal: true },
                  ]}
                  render={(e) => (
                    <tr key={e.id}>
                      <td className="text-nowrap">{fmt(e.createdAt)}</td>
                      {/* Un evento sin actor ya caía a "—"; se conserva. */}
                      <td className="text-muted">{e.userEmail ?? e.userId ?? "—"}</td>
                      <td><span className={`badge ${accionBadge(e.action)}`}>{accionLabel(e.action)}</span></td>
                      <td>{e.module || "—"}</td>
                      <td className="text-muted fs-12 text-break">
                        {e.resourceType ? `${e.resourceType}:${e.resourceId ?? ""}` : e.resourceId ?? "—"}
                      </td>
                      <td className="text-end text-muted fs-12">{e.ipAddress ?? "—"}</td>
                    </tr>
                  )}
                />
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
