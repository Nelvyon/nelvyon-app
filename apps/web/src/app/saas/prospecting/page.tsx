"use client";

/**
 * /saas/prospecting sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Las dos pestanas (listas / nueva busqueda) usan el `nav nav-tabs` de la
 * plantilla; la barra de enriquecimiento usa su `progress` de Bootstrap.
 *
 * Logica de NELVYON intacta: `GET /api/saas/prospecting` (con su bandera
 * `configured` y su mensaje), `GET ?listId=`, `POST
 * /api/saas/prospecting/search` y `POST /api/saas/prospecting/sync`; los tipos
 * `ProspectFilter`, `Prospect` y `ProspectingList`, `STATUS_CONFIG`,
 * `INDUSTRIES`, `COUNTRIES`, la carga perezosa de prospectos al seleccionar
 * lista y `addToCrm` individual y masivo.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmAvatar, W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";

interface ProspectFilter {
  industry: string; country: string; minEmployees: number; maxEmployees: number;
  jobTitle: string; keywords: string;
}

interface Prospect {
  id: string; name: string; title: string; company: string; industry: string;
  country: string; employees: number; email: string | null; linkedinUrl: string | null;
  phone: string | null; enriched: boolean; addedToCrm: boolean;
}

interface ProspectingList {
  id: string; name: string; filter: ProspectFilter; prospects: number;
  enriched: number; createdAt: string; status: "running" | "done" | "paused";
}

const STATUS_CONFIG: Record<ProspectingList["status"], { label: string; badge: string; icon: string }> = {
  running: { label: "Buscando…", badge: "badge-warning", icon: "⟳" },
  done: { label: "Completada", badge: "badge-success", icon: "✓" },
  paused: { label: "Pausada", badge: "badge-primary", icon: "‖" },
};

const INDUSTRIES = ["Todos", "Tecnología", "Marketing", "Retail", "Finanzas", "Salud", "Educación", "Inmobiliaria", "Turismo"];
const COUNTRIES = ["Todos", "ES", "MX", "AR", "CO", "US", "UK"];

/** Estado fuera de catalogo -> badge neutro con la etiqueta cruda. */
function estadoDe(s: ProspectingList["status"] | string) {
  return STATUS_CONFIG[s as ProspectingList["status"]] ?? { label: String(s || "—"), badge: "badge-secondary", icon: "•" };
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** El filtro puede llegar ausente en listas antiguas. */
const FILTRO_VACIO: ProspectFilter = { industry: "Todos", country: "Todos", minEmployees: 0, maxEmployees: 0, jobTitle: "", keywords: "" };
function filtroDe(f: ProspectFilter | null | undefined): ProspectFilter {
  return f ?? FILTRO_VACIO;
}

export default function SaasProspectingPage() {
  const [lists, setLists] = useState<ProspectingList[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<"lists" | "search">("lists");
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProspectFilter>({ industry: "Todos", country: "Todos", minEmployees: 1, maxEmployees: 10000, jobTitle: "", keywords: "" });
  const [searching, setSearching] = useState(false);
  const [listName, setListName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/prospecting");
      const d = (await res.json().catch(() => ({}))) as {
        lists?: ProspectingList[]; configured?: boolean; message?: string; error?: string;
      };
      if (!res.ok) {
        setConfigured(false);
        setConfigMessage(d.message ?? d.error ?? `Error ${res.status}`);
        setLists([]);
        return;
      }
      setConfigured(d.configured ?? false);
      setConfigMessage(d.message ?? null);
      setLists(Array.isArray(d.lists) ? d.lists : []);
    } catch (err) {
      setLists([]);
      setConfigured(false);
      setError(err instanceof Error ? err.message : "Error al cargar prospección");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProspects = useCallback(async (listId: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/saas/prospecting?listId=${encodeURIComponent(listId)}`);
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
        throw new Error(d?.message ?? d?.error ?? `Error ${res.status}`);
      }
      const d = (await res.json().catch(() => ({}))) as { prospects?: Prospect[] };
      setProspects(Array.isArray(d.prospects) ? d.prospects : []);
    } catch (err) {
      setProspects([]);
      setActionError(err instanceof Error ? err.message : "Error al cargar prospectos");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (selectedList) void loadProspects(selectedList);
  }, [selectedList, loadProspects]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!listName.trim() || configured !== true) return;
    setSearching(true);
    setActionError(null);
    try {
      const res = await fetch("/api/saas/prospecting/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: listName, filter }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
        throw new Error(d?.message ?? d?.error ?? `Error ${res.status}`);
      }
      const d = (await res.json().catch(() => ({}))) as { prospects?: Prospect[]; list?: ProspectingList };
      setProspects(Array.isArray(d.prospects) ? d.prospects : []);
      if (d.list) {
        setSelectedList(d.list.id);
        setLists((prev) => [d.list!, ...prev.filter((l) => l.id !== d.list!.id)]);
      }
      await load();
      setTab("lists");
    } catch (err) {
      setProspects([]);
      setActionError(err instanceof Error ? err.message : "Error en la búsqueda");
    } finally {
      setSearching(false);
    }
  }

  async function addToCrm(ids: string[]) {
    if (ids.length === 0) return;
    setSyncing(true);
    setActionError(null);
    try {
      const res = await fetch("/api/saas/prospecting/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectIds: ids }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
        throw new Error(d?.message ?? d?.error ?? `Error ${res.status}`);
      }
      setProspects((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, addedToCrm: true } : p)));
      if (selectedList) void loadProspects(selectedList);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al sincronizar con CRM");
    } finally {
      setSyncing(false);
    }
  }

  /** Tabla de prospectos, compartida por las dos pestañas. */
  const tablaProspectos = (
    <W3crmDataTable
      filas={prospects}
      etiqueta="prospectos"
      porPagina={10}
      columnas={[{ titulo: "Contacto" }, { titulo: "Empresa" }, { titulo: "Email" }, { titulo: "Teléfono" }, { titulo: "LinkedIn" }, { titulo: "Estado" }, { titulo: "Acciones", alFinal: true }]}
      render={(p) => (
        <tr key={p.id}>
          <td>
            <div className="d-flex align-items-center">
              <W3crmAvatar seed={p.id} label={p.name} />
              <div className="ms-2">
                <span className="fw-bold">{p.name || "—"}</span>
                <div className="text-muted fs-12">{p.title || "—"}</div>
              </div>
            </div>
          </td>
          <td>
            <span>{p.company || "—"}</span>
            <div className="text-muted fs-12">{num(p.employees)} emp.</div>
          </td>
          <td><span className="text-muted fs-12">{p.email ?? "—"}</span></td>
          <td><span className="text-muted fs-12">{p.phone ?? "—"}</span></td>
          <td>
            {p.linkedinUrl
              ? <a href={p.linkedinUrl} target="_blank" rel="noreferrer" className="btn btn-primary light btn-sm">Perfil</a>
              : <span className="text-muted">—</span>}
          </td>
          <td>{p.enriched ? <span className="badge badge-success">Enriquecido</span> : <span className="badge badge-secondary light">Sin enriquecer</span>}</td>
          <td className="text-end">
            {p.addedToCrm
              ? <span className="badge badge-success">En CRM</span>
              : (
                <button type="button" className="btn btn-primary btn-sm" disabled={syncing} onClick={() => void addToCrm([p.id])}>
                  + CRM
                </button>
              )}
          </td>
        </tr>
      )}
    />
  );

  const botonSincronizarTodos = (
    <button type="button" className="btn btn-primary btn-sm me-2" disabled={syncing}
      onClick={() => void addToCrm(prospects.filter((p) => !p.addedToCrm).map((p) => p.id))}>
      {syncing ? "Sincronizando…" : "Añadir todos al CRM"}
    </button>
  );

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Prospección" parentTitle="Gestión" pageTitle="Prospección" />
      <div className="container-fluid">
        <div className="row">
          {configured === false && (
            <div className="col-xl-12">
              <div className="alert alert-warning" role="alert">
                <strong>Prospección no configurada:</strong>{" "}
                {configMessage ?? "Define APOLLO_API_KEY en Railway para activar búsqueda B2B real."}
              </div>
            </div>
          )}
          {(error || actionError) && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error ?? actionError}
                <button type="button" className="btn-close" aria-label="Cerrar"
                  onClick={() => { const habiaError = !!error; setError(null); setActionError(null); if (habiaError) void load(); }} />
              </div>
            </div>
          )}

          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Total prospectos" value={lists.reduce((s, l) => s + num(l.prospects), 0).toLocaleString("es-ES")} accent /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Enriquecidos" value={lists.reduce((s, l) => s + num(l.enriched), 0).toLocaleString("es-ES")} /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Listas activas" value={lists.filter((l) => l.status !== "paused").length} /></div>

          <div className="col-xl-12">
            <ul className="nav nav-tabs mb-3" role="tablist">
              {(["lists", "search"] as const).map((t) => (
                <li className="nav-item" key={t} role="presentation">
                  <button type="button" role="tab" aria-selected={tab === t}
                    className={`nav-link ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                    {t === "lists" ? "Mis listas" : "Nueva búsqueda"}
                  </button>
                </li>
              ))}
            </ul>

            {tab === "lists" ? (
              loading ? (
                <W3crmContentBox titulo="Listas" icono="fa-solid fa-users">
                  <W3crmCargando texto="Cargando listas…" />
                </W3crmContentBox>
              ) : lists.length === 0 ? (
                <W3crmContentBox titulo="Listas" icono="fa-solid fa-users">
                  <W3crmEmptyState title="Sin listas de prospección" description="Crea una búsqueda para empezar." />
                </W3crmContentBox>
              ) : (
                lists.map((list) => {
                  const st = estadoDe(list.status);
                  const f = filtroDe(list.filter);
                  const total = num(list.prospects);
                  const enrichedPct = total > 0 ? Math.round((num(list.enriched) / total) * 100) : 0;
                  return (
                    <W3crmContentBox
                      key={list.id}
                      testId="lista-prospeccion"
                      icono="fa-solid fa-users"
                      defaultOpen={false}
                      titulo={
                        <>
                          {list.name || "—"}
                          <span className={`badge ${st.badge} ms-2`}>{st.icon} {st.label}</span>
                          <span className="text-muted fs-12 ms-2">{total.toLocaleString("es-ES")} prospectos</span>
                        </>
                      }
                      acciones={
                        <button type="button" className="btn btn-primary light btn-sm me-2"
                          onClick={() => { setSelectedList(list.id); void loadProspects(list.id); }}>
                          Ver prospectos
                        </button>
                      }
                    >
                      <div className="mb-3">
                        {f.industry !== "Todos" && <span className="badge badge-secondary light me-1">{f.industry}</span>}
                        {f.country !== "Todos" && <span className="badge badge-secondary light me-1">{f.country}</span>}
                        {f.jobTitle && <span className="badge badge-secondary light me-1">{f.jobTitle}</span>}
                        <span className="badge badge-secondary light me-1">{num(f.minEmployees)}–{num(f.maxEmployees)} emp.</span>
                      </div>
                      <div className="d-flex align-items-center mb-3">
                        <div className="progress flex-grow-1 me-2" style={{ height: 6 }}>
                          <div className="progress-bar bg-primary" style={{ width: `${enrichedPct}%` }}
                            role="progressbar" aria-valuenow={enrichedPct} aria-valuemin={0} aria-valuemax={100} />
                        </div>
                        <span className="text-muted fs-12">{enrichedPct}% enriquecidos</span>
                      </div>
                      {selectedList === list.id && (
                        prospects.length === 0 ? (
                          <W3crmEmptyState title="Sin prospectos en esta lista" />
                        ) : (
                          <>
                            <div className="mb-3">{botonSincronizarTodos}</div>
                            {tablaProspectos}
                          </>
                        )
                      )}
                    </W3crmContentBox>
                  );
                })
              )
            ) : (
              <div className="row">
                <div className="col-xl-4">
                  <W3crmContentBox titulo="Filtros de búsqueda" icono="fas fa-filter">
                    <form onSubmit={search}>
                      <div className="form-group mb-3">
                        <label htmlFor="pr-lista" className="text-black font-w600">Nombre de la lista <span className="required">*</span></label>
                        <input id="pr-lista" type="text" className="form-control" placeholder="Ej: CMOs Tech España"
                          value={listName} onChange={(e) => setListName(e.target.value)} />
                      </div>
                      <div className="form-group mb-3">
                        <label htmlFor="pr-cargo" className="text-black font-w600">Cargo / Título</label>
                        <input id="pr-cargo" type="text" className="form-control" placeholder="CEO, CMO, Director…"
                          value={filter.jobTitle} onChange={(e) => setFilter((f) => ({ ...f, jobTitle: e.target.value }))} />
                      </div>
                      <div className="form-group mb-3">
                        <label htmlFor="pr-industria" className="text-black font-w600">Industria</label>
                        <select id="pr-industria" className="form-control" value={filter.industry}
                          onChange={(e) => setFilter((f) => ({ ...f, industry: e.target.value }))}>
                          {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                        </select>
                      </div>
                      <div className="form-group mb-3">
                        <label htmlFor="pr-pais" className="text-black font-w600">País</label>
                        <select id="pr-pais" className="form-control" value={filter.country}
                          onChange={(e) => setFilter((f) => ({ ...f, country: e.target.value }))}>
                          {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="row">
                        <div className="col-6">
                          <div className="form-group mb-3">
                            <label htmlFor="pr-min" className="text-black font-w600">Empleados mín.</label>
                            <input id="pr-min" type="number" min={1} className="form-control" value={filter.minEmployees}
                              onChange={(e) => setFilter((f) => ({ ...f, minEmployees: Number(e.target.value) }))} />
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="form-group mb-3">
                            <label htmlFor="pr-max" className="text-black font-w600">Empleados máx.</label>
                            <input id="pr-max" type="number" min={1} className="form-control" value={filter.maxEmployees}
                              onChange={(e) => setFilter((f) => ({ ...f, maxEmployees: Number(e.target.value) }))} />
                          </div>
                        </div>
                      </div>
                      <div className="form-group mb-3">
                        <label htmlFor="pr-keywords" className="text-black font-w600">Palabras clave</label>
                        <input id="pr-keywords" type="text" className="form-control" placeholder="SaaS, ecommerce, startup…"
                          value={filter.keywords} onChange={(e) => setFilter((f) => ({ ...f, keywords: e.target.value }))} />
                      </div>
                      <button type="submit" className="btn btn-primary w-100" disabled={searching || !listName.trim() || configured !== true}>
                        {searching ? "Buscando…" : configured !== true ? "Prospección no configurada" : "Buscar prospectos"}
                      </button>
                    </form>
                  </W3crmContentBox>
                </div>
                <div className="col-xl-8">
                  <W3crmContentBox
                    titulo="Resultados"
                    icono="fa-solid fa-file-lines"
                    acciones={prospects.length > 0 ? botonSincronizarTodos : undefined}
                  >
                    {prospects.length === 0 ? (
                      <W3crmEmptyState
                        title="Configura tus filtros"
                        description="Define el perfil ideal de tu prospecto y pulsa Buscar."
                      />
                    ) : (
                      tablaProspectos
                    )}
                  </W3crmContentBox>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
