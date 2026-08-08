"use client";

/**
 * /saas/snippets sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 *
 * Logica de NELVYON intacta: `GET/POST/PUT /api/saas/snippets`, el tipo
 * `Snippet`, `TYPE_CONFIG` con sus cinco canales, `primaryChannel`,
 * `detectVariables`, el copiado al portapapeles con su aviso de 1,5 s y el
 * filtrado por canal y texto.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable, W3crmModal } from "@/features/saas-w3crm/components/W3crmContentBox";

type SnippetChannel = "email" | "sms" | "whatsapp" | "social" | "call";

interface Snippet {
  id: string;
  name: string;
  content: string;
  channels: string[];
  variables: string[];
  shortcut: string | null;
  createdAt: string;
  updatedAt: string;
}

const TYPE_CONFIG: Record<SnippetChannel, { label: string; icon: string; badge: string }> = {
  email: { label: "Email", icon: "📧", badge: "badge-primary" },
  sms: { label: "SMS", icon: "💬", badge: "badge-success" },
  whatsapp: { label: "WhatsApp", icon: "📱", badge: "badge-success" },
  social: { label: "Redes Sociales", icon: "📣", badge: "badge-warning" },
  call: { label: "Llamada", icon: "📞", badge: "badge-secondary" },
};

function primaryChannel(s: Snippet): SnippetChannel {
  const c = (s.channels ?? [])[0];
  if (c === "email" || c === "sms" || c === "whatsapp" || c === "social" || c === "call") return c;
  return "email";
}

function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES");
}

function SnippetModal({ snippet, onClose }: { snippet?: Snippet; onClose: () => void }) {
  const [name, setName] = useState(snippet?.name ?? "");
  const [type, setType] = useState<SnippetChannel>(snippet ? primaryChannel(snippet) : "email");
  const [content, setContent] = useState(snippet?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function detectVariables(text: string) {
    return [...new Set([...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]!))];
  }

  const variables = detectVariables(content);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { id: snippet?.id, name: name.trim(), content, channels: [type], variables };
      const res = await fetch("/api/saas/snippets", {
        method: snippet ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function copyContent() {
    void navigator.clipboard?.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <W3crmModal titulo={snippet ? "Editar snippet" : "Nuevo snippet"} onClose={onClose} error={error} size="lg" testId="modal-snippet">
      <form onSubmit={(e) => void save(e)}>
        <div className="row">
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="sn-nombre" className="text-black font-w600">Nombre <span className="required">*</span></label>
              <input id="sn-nombre" type="text" className="form-control" placeholder="Ej: Bienvenida lead frío"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="sn-canal" className="text-black font-w600">Canal</label>
              <select id="sn-canal" className="form-control" value={type} onChange={(e) => setType(e.target.value as SnippetChannel)}>
                {(Object.keys(TYPE_CONFIG) as SnippetChannel[]).map((t) => (
                  <option key={t} value={t}>{TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-lg-12">
            <div className="form-group mb-3">
              <div className="d-flex align-items-center justify-content-between">
                <label htmlFor="sn-contenido" className="text-black font-w600">
                  Contenido <span className="required">*</span>
                </label>
                <button type="button" className="btn btn-primary light btn-xs" onClick={copyContent}>
                  {copied ? "✓ Copiado" : "Copiar"}
                </button>
              </div>
              <textarea id="sn-contenido" className="form-control" rows={6} placeholder="Hola {{nombre}}, gracias por…"
                value={content} onChange={(e) => setContent(e.target.value)} />
              <div className="form-text">Usa <code>{"{{variable}}"}</code> para personalizar.</div>
            </div>
          </div>
          {variables.length > 0 && (
            <div className="col-lg-12">
              <div className="mb-3">
                <p className="fs-12 text-muted mb-1">Variables detectadas</p>
                {variables.map((v) => (
                  <span key={v} className="badge badge-primary light me-1">{`{{${v}}}`}</span>
                ))}
              </div>
            </div>
          )}
          <div className="col-lg-12">
            <div className="text-end">
              <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Guardando…" : "Guardar snippet"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </W3crmModal>
  );
}

export default function SaasSnippetsPage() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Snippet | undefined>();
  const [filterType, setFilterType] = useState<SnippetChannel | "all">("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/saas/snippets");
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const d = (await res.json().catch(() => ({}))) as { snippets?: Snippet[] };
      setSnippets(Array.isArray(d.snippets) ? d.snippets : []);
    } catch (e) {
      setSnippets([]);
      setLoadError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function copySnippet(s: Snippet) {
    void navigator.clipboard?.writeText(s.content);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const filtered = snippets.filter((s) => {
    if (filterType !== "all" && primaryChannel(s) !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(s.name ?? "").toLowerCase().includes(q) && !(s.content ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Snippets" parentTitle="Gestión" pageTitle="Snippets" />
      <div className="container-fluid">
        <div className="row">
          {loadError && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {loadError}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setLoadError(null)} />
              </div>
            </div>
          )}
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Total snippets" value={snippets.length} accent /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Canales" value={new Set(snippets.flatMap((s) => s.channels ?? [])).size} /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Con variables" value={snippets.filter((s) => (s.variables?.length ?? 0) > 0).length} /></div>

          <div className="col-xl-12">
            <W3crmContentBox titulo="Filtro" icono="fas fa-filter" bodyClassName="card-body pb-3">
              <div className="row">
                <div className="col-xl-4 col-sm-6">
                  <label className="visually-hidden" htmlFor="sn-buscar">Buscar snippet</label>
                  <input id="sn-buscar" type="text" className="form-control mb-3 mb-xl-0" placeholder="Buscar snippet…"
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="col-xl-4 col-sm-6 mb-3 mb-xl-0">
                  <label className="visually-hidden" htmlFor="sn-filtro-canal">Canal</label>
                  <select id="sn-filtro-canal" className="form-control" value={filterType}
                    onChange={(e) => setFilterType(e.target.value as SnippetChannel | "all")}>
                    <option value="all">Todos los canales</option>
                    {(Object.keys(TYPE_CONFIG) as SnippetChannel[]).map((t) => (
                      <option key={t} value={t}>{TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-xl-4 col-sm-6">
                  <button type="button" className="btn btn-danger light" onClick={() => { setSearch(""); setFilterType("all"); }}>
                    Quitar filtros
                  </button>
                </div>
              </div>
            </W3crmContentBox>

            <div className="mb-3">
              <ul className="d-flex align-items-center flex-wrap">
                <li>
                  <button type="button" className="btn btn-primary" onClick={() => { setEditing(undefined); setShowModal(true); }}>
                    + Nuevo snippet
                  </button>
                </li>
              </ul>
            </div>

            <W3crmContentBox titulo="Snippets" icono="fa-solid fa-file-lines">
              {loading ? (
                <W3crmCargando texto="Cargando snippets…" />
              ) : filtered.length === 0 ? (
                <W3crmEmptyState
                  title="Sin snippets"
                  description="Crea textos reutilizables para ahorrar tiempo en tus comunicaciones."
                />
              ) : (
                <W3crmDataTable
                  filas={filtered}
                  etiqueta="snippets"
                  reiniciarEn={`${filterType}|${search}`}
                  columnas={[{ titulo: "Nombre" }, { titulo: "Canal" }, { titulo: "Contenido" }, { titulo: "Variables" }, { titulo: "Modificado" }, { titulo: "Acciones", alFinal: true }]}
                  render={(s) => {
                    const cfg = TYPE_CONFIG[primaryChannel(s)];
                    return (
                      <tr key={s.id}>
                        <td><span className="fw-bold">{s.name || "—"}</span></td>
                        <td><span className={`badge ${cfg.badge}`}>{cfg.icon} {cfg.label}</span></td>
                        <td><span className="text-muted fs-12">{(s.content ?? "").slice(0, 80)}</span></td>
                        <td>{s.variables?.length ?? 0}</td>
                        <td>{fecha(s.updatedAt)}</td>
                        <td className="text-end">
                          <button type="button" className="btn btn-primary light btn-sm content-icon me-1"
                            aria-label={`Copiar ${s.name || "snippet"}`} onClick={() => copySnippet(s)}>
                            <i className={`fa-solid ${copiedId === s.id ? "fa-check" : "fa-copy"}`} />
                          </button>
                          <button type="button" className="btn btn-warning btn-sm content-icon"
                            aria-label={`Editar ${s.name || "snippet"}`} onClick={() => { setEditing(s); setShowModal(true); }}>
                            <i className="fa fa-edit" />
                          </button>
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

      {showModal && <SnippetModal snippet={editing} onClose={() => { setShowModal(false); void load(); }} />}
    </SaasW3crmShell>
  );
}
