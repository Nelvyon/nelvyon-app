"use client";

/**
 * /saas/erp/sectors sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: catalogo de sectores -> `W3crmContentBox` + `W3crmDataTable`; KPIs ->
 * `W3crmKpiTile`. Sin componentes nuevos.
 *
 * Inventario: sin `data-testid`, sin spec dedicado (solo
 * `saas-nav-full-coverage`) y sin textos-contrato.
 *
 * Logica de NELVYON intacta: `GET /api/saas/erp/sectors`, las cuatro familias
 * de estado, la nota del catalogo, el recuento de bloqueados y el reintento
 * tras error.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";

type Sector = {
  id: string;
  title: string;
  status: string;
  mappedModules: string[];
  playbookPaths: string[];
  note: string;
  regulatedNote?: string;
};

/** Mismas familias de estado que antes, ahora sobre badges de W3CRM. */
function statusBadge(s: string): string {
  const v = String(s ?? "");
  if (v.includes("READY") || v.includes("LIVE")) return "badge-success";
  if (v.includes("BLOCKED")) return "badge-danger";
  if (v.includes("PREPARED") || v.includes("OFF")) return "badge-warning";
  return "badge-secondary";
}
/** `mappedModules` y `playbookPaths` pueden llegar nulos o no-array. */
function lista(v: unknown): string {
  return Array.isArray(v) && v.length > 0 ? v.join(", ") : "—";
}

export default function ErpSectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/erp/sectors");
      const data = (await res.json().catch(() => ({}))) as { sectors?: Sector[]; note?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setSectors(Array.isArray(data.sectors) ? data.sectors : []);
      setNote(data.note ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const blocked = sectors.filter((s) => String(s.status ?? "").includes("BLOCKED")).length;

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Taxonomía de sectores" parentTitle="Gestión" pageTitle="Sectores" />
      <div className="container-fluid">
        <div className="row">
          {error && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error}
                <button type="button" className="btn-close" aria-label="Cerrar"
                  onClick={() => { setError(null); void load(); }} />
              </div>
            </div>
          )}

          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Sectores" value={sectors.length} accent /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Bloqueados" value={blocked} /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Activos catálogo" value={sectors.length - blocked} /></div>

          <div className="col-xl-12">
            <W3crmContentBox titulo="Catálogo de sectores" icono="fa-solid fa-sitemap">
              {note ? <p className="fs-12 text-muted">{note}</p> : null}
              {loading ? (
                <W3crmCargando texto="Cargando sectores…" />
              ) : sectors.length === 0 ? (
                <W3crmEmptyState title="Sin sectores en el catálogo" />
              ) : (
                <W3crmDataTable
                  filas={sectors}
                  etiqueta="sectores"
                  wrapperId="sectors_wrapper"
                  porPagina={10}
                  columnas={[{ titulo: "Sector" }, { titulo: "Módulos" }, { titulo: "Playbooks" }, { titulo: "Estado", alFinal: true }]}
                  render={(s) => (
                    <tr key={s.id}>
                      <td>
                        <span className="fw-bold">{s.title || "—"}</span>
                        {s.note ? <div className="text-muted fs-12">{s.note}</div> : null}
                        {s.regulatedNote ? <div className="text-warning fs-12">{s.regulatedNote}</div> : null}
                      </td>
                      <td><span className="text-muted fs-12">{lista(s.mappedModules)}</span></td>
                      <td><span className="text-muted fs-12">{lista(s.playbookPaths)}</span></td>
                      <td className="text-end"><span className={`badge ${statusBadge(s.status)}`}>{s.status || "—"}</span></td>
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
