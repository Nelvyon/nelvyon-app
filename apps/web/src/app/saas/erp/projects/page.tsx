"use client";

/**
 * /saas/erp/projects sobre `(cms)/content` de W3CRM, con las piezas ya
 * portadas. Mapeo: alta y listados -> `W3crmContentBox` + `W3crmDataTable`;
 * el selector de modo -> `nav nav-tabs`; KPIs -> `W3crmKpiTile`. Sin
 * componentes nuevos.
 *
 * Inventario: sin `data-testid`, sin spec dedicado (solo
 * `saas-nav-full-coverage`) y sin textos-contrato. El modulo si traia ya un
 * `role="tablist"` con `aria-label="Modo alta"` y dos `role="tab"`: se
 * conservan tal cual, ahora sobre el `nav nav-tabs` de la plantilla.
 *
 * Logica de NELVYON intacta: `GET/POST /api/saas/erp/projects-fs` con sus dos
 * acciones (`create_project`, `create_timesheet`), la preseleccion del primer
 * proyecto al cargar, la fecha de hoy en formato ISO corto, el
 * `rateInternalCents: 0` y el aviso de exito de 3 s.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";

type Project = { id: string; name: string; status: string; createdAt: string; tasks: unknown[] };
type Timesheet = {
  id: string;
  projectId: string;
  hours: number;
  date: string;
  status: string;
  rateInternalCents: number;
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function ErpProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [hours, setHours] = useState("1");
  const [projectId, setProjectId] = useState("");
  const [mode, setMode] = useState<"project" | "timesheet">("project");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/erp/projects-fs");
      const data = (await res.json().catch(() => ({}))) as {
        projects?: Project[]; timesheets?: Timesheet[]; note?: string; error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      const lista = Array.isArray(data.projects) ? data.projects : [];
      setProjects(lista);
      setTimesheets(Array.isArray(data.timesheets) ? data.timesheets : []);
      setNote(data.note ?? "");
      setProjectId((prev) => prev || lista[0]?.id || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body =
        mode === "project"
          ? { action: "create_project", name }
          : {
              action: "create_timesheet",
              projectId,
              hours: Number(hours),
              date: new Date().toISOString().slice(0, 10),
              rateInternalCents: 0,
            };
      const res = await fetch("/api/saas/erp/projects-fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setName("");
      setOk(mode === "project" ? "Proyecto creado" : "Timesheet añadido");
      window.setTimeout(() => setOk(null), 3000);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const totalHours = timesheets.reduce((s, t) => s + num(t.hours), 0);
  const nombrePorId = new Map(projects.map((p) => [p.id, p.name]));

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Proyectos & field service" parentTitle="Gestión" pageTitle="Proyectos" />
      <div className="container-fluid">
        <div className="row">
          {error && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setError(null)} />
              </div>
            </div>
          )}
          {ok && (
            <div className="col-xl-12">
              <div className="alert alert-success" role="status">{ok}</div>
            </div>
          )}

          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Proyectos" value={projects.length} /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Timesheets" value={timesheets.length} accent /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Horas" value={totalHours} /></div>

          <div className="col-xl-12">
            {/* `role="tablist"` y `aria-label="Modo alta"` venian del modulo original. */}
            <ul className="nav nav-tabs mb-3" role="tablist" aria-label="Modo alta">
              <li className="nav-item" role="presentation">
                <button type="button" role="tab" aria-selected={mode === "project"}
                  className={`nav-link ${mode === "project" ? "active" : ""}`}
                  onClick={() => setMode("project")}>
                  Nuevo proyecto
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button type="button" role="tab" aria-selected={mode === "timesheet"}
                  className={`nav-link ${mode === "timesheet" ? "active" : ""}`}
                  onClick={() => setMode("timesheet")}>
                  Timesheet
                </button>
              </li>
            </ul>

            <W3crmContentBox titulo={mode === "project" ? "Nuevo proyecto" : "Nuevo timesheet"} icono="fa-solid fa-diagram-project">
              {note ? <p className="fs-12 text-muted">{note}</p> : null}
              <form onSubmit={(e) => void onSubmit(e)}>
                <div className="row align-items-end">
                  {mode === "project" ? (
                    <div className="col-xl-8 col-sm-6">
                      <div className="form-group mb-3">
                        <label htmlFor="pr-nombre" className="text-black font-w600">Nombre proyecto <span className="required">*</span></label>
                        <input id="pr-nombre" className="form-control" required value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="col-xl-5 col-sm-6">
                        <div className="form-group mb-3">
                          <label htmlFor="pr-proyecto" className="text-black font-w600">Proyecto <span className="required">*</span></label>
                          <select id="pr-proyecto" className="form-control" required
                            value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                            <option value="">Proyecto…</option>
                            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="col-xl-3 col-sm-6">
                        <div className="form-group mb-3">
                          <label htmlFor="pr-horas" className="text-black font-w600">Horas</label>
                          <input id="pr-horas" className="form-control" type="number" min={0.25} step={0.25} required
                            value={hours} onChange={(e) => setHours(e.target.value)} />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-group mb-3">
                      <button type="submit" className="btn btn-primary w-100" disabled={saving}>
                        {saving ? "Guardando…" : mode === "project" ? "Crear proyecto" : "Añadir timesheet"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </W3crmContentBox>

            <W3crmContentBox titulo="Proyectos" icono="fa-solid fa-folder">
              {loading ? (
                <W3crmCargando texto="Cargando proyectos…" />
              ) : projects.length === 0 ? (
                <W3crmEmptyState title="Sin proyectos" />
              ) : (
                <W3crmDataTable
                  filas={projects}
                  etiqueta="proyectos"
                  wrapperId="projects_wrapper"
                  porPagina={10}
                  columnas={[{ titulo: "Proyecto" }, { titulo: "Tareas" }, { titulo: "Estado", alFinal: true }]}
                  render={(p) => (
                    <tr key={p.id}>
                      <td><span className="fw-bold">{p.name || "—"}</span></td>
                      <td>{Array.isArray(p.tasks) ? p.tasks.length : 0}</td>
                      <td className="text-end"><span className="badge badge-secondary">{p.status || "—"}</span></td>
                    </tr>
                  )}
                />
              )}
            </W3crmContentBox>

            <W3crmContentBox titulo="Timesheets" icono="fa-solid fa-clock">
              {timesheets.length === 0 ? (
                <W3crmEmptyState title="Sin timesheets" />
              ) : (
                <W3crmDataTable
                  filas={timesheets}
                  etiqueta="timesheets"
                  wrapperId="timesheets_wrapper"
                  porPagina={10}
                  columnas={[{ titulo: "Proyecto" }, { titulo: "Horas" }, { titulo: "Fecha" }, { titulo: "Estado", alFinal: true }]}
                  render={(t) => (
                    <tr key={t.id}>
                      <td><span className="fw-bold">{nombrePorId.get(t.projectId) ?? "—"}</span></td>
                      <td>{num(t.hours)} h</td>
                      <td>{t.date || "—"}</td>
                      <td className="text-end"><span className="badge badge-primary">{t.status || "—"}</span></td>
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
