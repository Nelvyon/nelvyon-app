"use client";

/**
 * /saas/documentos sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Las dos pestanas (documentos / plantillas) usan el `nav nav-tabs` de la
 * plantilla.
 *
 * Logica de NELVYON intacta: `GET/POST/DELETE /api/saas/documents` con sus
 * acciones (`update` para renombrar y para marcar como enviado), los tipos
 * `Document`, `DocStatus` y `ApiDocType`, `STATUS_CONFIG`, `TYPE_LABEL`,
 * `TEMPLATES` con sus secciones, `mapDocument`, `shortId`, `fmt`, el filtrado
 * por estado y texto, `sendDocument` y `deleteDocument` (solo en borradores).
 */
import { useCallback, useEffect, useState } from "react";
import Alert from "sweetalert2";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable, W3crmModal } from "@/features/saas-w3crm/components/W3crmContentBox";

type DocStatus = "draft" | "sent" | "viewed" | "signed" | "declined" | "expired";
type ApiDocType = "document" | "contract" | "proposal" | "nda";

interface Document {
  id: string; name: string; type: ApiDocType; status: DocStatus;
  contactId: string | null; signedAt: string | null; expiresAt: string | null; createdAt: string;
}

const STATUS_CONFIG: Record<DocStatus, { label: string; badge: string; icon: string }> = {
  draft: { label: "Borrador", badge: "badge-primary", icon: "✎" },
  sent: { label: "Enviado", badge: "badge-warning", icon: "↗" },
  viewed: { label: "Visto", badge: "badge-primary", icon: "◉" },
  signed: { label: "Firmado", badge: "badge-success", icon: "✓" },
  declined: { label: "Rechazado", badge: "badge-danger", icon: "✕" },
  expired: { label: "Expirado", badge: "badge-danger", icon: "⏰" },
};

const TYPE_LABEL: Record<ApiDocType, string> = {
  document: "Documento", proposal: "Propuesta", contract: "Contrato", nda: "NDA",
};

const TEMPLATES = [
  { id: "t1", name: "Propuesta de servicios", type: "proposal" as ApiDocType, sections: ["Resumen ejecutivo", "Servicios incluidos", "Cronograma", "Inversión", "Condiciones"] },
  { id: "t2", name: "Contrato de prestación de servicios", type: "contract" as ApiDocType, sections: ["Partes", "Objeto del contrato", "Duración", "Precio y forma de pago", "Propiedad intelectual", "Confidencialidad"] },
  { id: "t3", name: "Presupuesto detallado", type: "document" as ApiDocType, sections: ["Alcance del trabajo", "Desglose de costes", "Condiciones de pago", "Validez"] },
  { id: "t4", name: "Acuerdo de confidencialidad", type: "nda" as ApiDocType, sections: ["Definición de información confidencial", "Obligaciones de las partes", "Excepciones", "Duración"] },
];

/** Catalogos que pueden crecer en el backend sin dejar la pantalla en blanco. */
function estadoDe(s: DocStatus | string) {
  return STATUS_CONFIG[s as DocStatus] ?? { label: String(s || "—"), badge: "badge-secondary", icon: "•" };
}
function tipoDe(t: ApiDocType | string) {
  return TYPE_LABEL[t as ApiDocType] ?? String(t || "—");
}

function mapDocument(raw: Record<string, unknown>): Document {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    type: String(raw.type) as ApiDocType,
    status: String(raw.status) as DocStatus,
    contactId: raw.contactId != null ? String(raw.contactId) : null,
    signedAt: raw.signedAt != null ? String(raw.signedAt) : null,
    expiresAt: raw.expiresAt != null ? String(raw.expiresAt) : null,
    createdAt: String(raw.createdAt ?? ""),
  };
}

function shortId(id: string | null): string {
  if (!id) return "Sin contacto";
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function CreateDocumentModal({
  onClose, onCreated, initialName = "", initialType = "document" as ApiDocType, templateId,
}: {
  onClose: () => void; onCreated: () => void;
  initialName?: string; initialType?: ApiDocType; templateId?: string;
}) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<ApiDocType>(initialType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, ...(templateId ? { templateId } : {}) }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear documento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <W3crmModal titulo="Nuevo documento" onClose={onClose} error={error} testId="modal-documento">
      <form onSubmit={save}>
        <div className="row">
          <div className="col-lg-8">
            <div className="form-group mb-3">
              <label htmlFor="doc-nombre" className="text-black font-w600">Nombre <span className="required">*</span></label>
              <input id="doc-nombre" type="text" className="form-control" placeholder="Ej: Propuesta Q3 2026"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-4">
            <div className="form-group mb-3">
              <label htmlFor="doc-tipo" className="text-black font-w600">Tipo</label>
              <select id="doc-tipo" className="form-control" value={type} onChange={(e) => setType(e.target.value as ApiDocType)}>
                {(Object.keys(TYPE_LABEL) as ApiDocType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
          </div>
          <div className="col-lg-12">
            <div className="text-end">
              <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
                {saving ? "Creando…" : "Crear documento"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </W3crmModal>
  );
}

function EditDocumentModal({ doc, onClose, onSaved }: { doc: Document; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(doc.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: doc.id, name: name.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar documento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <W3crmModal titulo="Editar documento" onClose={onClose} error={error} testId="modal-editar-documento">
      <form onSubmit={save}>
        <div className="row">
          <div className="col-lg-12">
            <div className="form-group mb-3">
              <label htmlFor="doc-edit-nombre" className="text-black font-w600">Nombre <span className="required">*</span></label>
              <input id="doc-edit-nombre" type="text" className="form-control" placeholder="Nombre del documento"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <p className="fs-12 text-muted">
              Tipo: {tipoDe(doc.type)} · Estado: {estadoDe(doc.status).label}
            </p>
          </div>
          <div className="col-lg-12">
            <div className="text-end">
              <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </W3crmModal>
  );
}

export default function SaasDocumentosPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"docs" | "templates">("docs");
  const [filterStatus, setFilterStatus] = useState<DocStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [modalPrefill, setModalPrefill] = useState<{ name: string; type: ApiDocType; templateId?: string } | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/documents");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json().catch(() => ({}))) as { documents?: Record<string, unknown>[] };
      setDocs(Array.isArray(d.documents) ? d.documents.map(mapDocument) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar documentos");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreateModal(prefill?: { name: string; type: ApiDocType; templateId?: string }) {
    setModalPrefill(prefill ?? null);
    setShowModal(true);
  }

  async function sendDocument(id: string) {
    setSendingId(id);
    setActionError(null);
    try {
      const res = await fetch("/api/saas/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id, status: "sent" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al enviar documento");
    } finally {
      setSendingId(null);
    }
  }

  async function deleteDocument(id: string) {
    const r = await Alert.fire({
      title: "¿Eliminar este borrador?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!r.value) return;
    setDeletingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/saas/documents?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al eliminar documento");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = docs.filter((d) => {
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    if (search && !(d.name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: docs.length,
    signed: docs.filter((d) => d.status === "signed").length,
    pending: docs.filter((d) => ["sent", "viewed"].includes(d.status)).length,
    expired: docs.filter((d) => d.status === "expired").length,
  };

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Documentos" parentTitle="Gestión" pageTitle="Documentos" />
      <div className="container-fluid">
        <div className="row">
          {(error || actionError) && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {actionError ?? error}
                <button type="button" className="btn-close" aria-label="Cerrar"
                  onClick={() => { setActionError(null); setError(null); }} />
              </div>
            </div>
          )}

          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Documentos" value={stats.total} accent /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Firmados" value={stats.signed} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Pendientes firma" value={stats.pending} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Expirados" value={stats.expired} /></div>

          <div className="col-xl-12">
            <div className="mb-3">
              <ul className="d-flex align-items-center flex-wrap">
                <li><button type="button" className="btn btn-primary" onClick={() => openCreateModal()}>+ Nuevo documento</button></li>
              </ul>
            </div>

            <ul className="nav nav-tabs mb-3" role="tablist">
              {(["docs", "templates"] as const).map((t) => (
                <li className="nav-item" key={t} role="presentation">
                  <button type="button" role="tab" aria-selected={tab === t}
                    className={`nav-link ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                    {t === "docs" ? `Mis documentos (${docs.length})` : "Plantillas"}
                  </button>
                </li>
              ))}
            </ul>

            {tab === "docs" ? (
              <>
                <W3crmContentBox titulo="Filtro" icono="fas fa-filter" bodyClassName="card-body pb-3">
                  <div className="row">
                    <div className="col-xl-4 col-sm-6">
                      <label className="visually-hidden" htmlFor="doc-buscar">Buscar documento</label>
                      <input id="doc-buscar" type="text" className="form-control mb-3 mb-xl-0" placeholder="Buscar documento…"
                        value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="col-xl-4 col-sm-6 mb-3 mb-xl-0">
                      <label className="visually-hidden" htmlFor="doc-filtro-estado">Estado</label>
                      <select id="doc-filtro-estado" className="form-control" value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as DocStatus | "all")}>
                        <option value="all">Todos los estados</option>
                        {(Object.keys(STATUS_CONFIG) as DocStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-xl-4 col-sm-6">
                      <button type="button" className="btn btn-danger light" onClick={() => { setSearch(""); setFilterStatus("all"); }}>
                        Quitar filtros
                      </button>
                    </div>
                  </div>
                </W3crmContentBox>

                <W3crmContentBox titulo="Documentos" icono="fa-solid fa-file-lines">
                  {loading ? (
                    <W3crmCargando texto="Cargando documentos…" />
                  ) : filtered.length === 0 ? (
                    <W3crmEmptyState
                      title={docs.length === 0 ? "Sin documentos todavía" : "Sin resultados"}
                      description={docs.length === 0
                        ? "Crea tu primera propuesta, contrato o presupuesto."
                        : "Sin resultados para los filtros aplicados."}
                    />
                  ) : (
                    <W3crmDataTable
                      filas={filtered}
                      etiqueta="documentos"
                      reiniciarEn={`${filterStatus}|${search}`}
                      columnas={[{ titulo: "Documento" }, { titulo: "Contacto" }, { titulo: "Tipo" }, { titulo: "Estado" }, { titulo: "Creado" }, { titulo: "Firmado" }, { titulo: "Acciones", alFinal: true }]}
                      render={(d) => {
                        const sc = estadoDe(d.status);
                        return (
                          <tr key={d.id}>
                            <td><span className="fw-bold">{d.name || "—"}</span></td>
                            <td><span className="text-muted fs-12" title={d.contactId ?? undefined}>{shortId(d.contactId)}</span></td>
                            <td>{tipoDe(d.type)}</td>
                            <td><span className={`badge ${sc.badge}`}>{sc.icon} {sc.label}</span></td>
                            <td>{fmt(d.createdAt)}</td>
                            <td>{fmt(d.signedAt)}</td>
                            <td className="text-end">
                              <button type="button" className="btn btn-warning btn-sm content-icon me-1"
                                aria-label={`Editar ${d.name || "documento"}`}
                                onClick={() => { setEditingDoc(d); setShowEditModal(true); }}>
                                <i className="fa fa-edit" />
                              </button>
                              {d.status === "draft" && (
                                <>
                                  <button type="button" className="btn btn-primary btn-sm content-icon me-1"
                                    disabled={sendingId === d.id}
                                    title="Marca el documento como enviado (seguimiento interno)"
                                    aria-label={`Enviar ${d.name || "documento"}`}
                                    onClick={() => void sendDocument(d.id)}>
                                    <i className="fa-solid fa-paper-plane" />
                                  </button>
                                  <button type="button" className="btn btn-danger btn-sm content-icon"
                                    disabled={deletingId === d.id}
                                    aria-label={`Eliminar ${d.name || "documento"}`}
                                    onClick={() => void deleteDocument(d.id)}>
                                    <i className="fa-solid fa-trash" />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      }}
                    />
                  )}
                </W3crmContentBox>
              </>
            ) : (
              <div className="row">
                {TEMPLATES.map((t) => (
                  <div className="col-xl-6 mb-3" key={t.id}>
                    <div className="card mb-0 h-100">
                      <div className="card-body">
                        <div className="d-flex align-items-start justify-content-between mb-3">
                          <div>
                            <h5 className="mb-1">{t.name}</h5>
                            <p className="fs-12 text-muted mb-0">{TYPE_LABEL[t.type]}</p>
                          </div>
                          <button type="button" className="btn btn-primary btn-sm"
                            onClick={() => openCreateModal({ name: t.name, type: t.type, templateId: t.id })}>
                            Usar plantilla
                          </button>
                        </div>
                        <ol className="mb-0 ps-3">
                          {t.sections.map((s) => <li className="fs-12 text-muted" key={s}>{s}</li>)}
                        </ol>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <CreateDocumentModal
          onClose={() => { setShowModal(false); setModalPrefill(null); }}
          onCreated={() => { void load(); setTab("docs"); }}
          initialName={modalPrefill?.name ?? ""}
          initialType={modalPrefill?.type ?? "document"}
          templateId={modalPrefill?.templateId}
        />
      )}
      {showEditModal && editingDoc && (
        <EditDocumentModal
          doc={editingDoc}
          onClose={() => { setShowEditModal(false); setEditingDoc(null); }}
          onSaved={() => void load()}
        />
      )}
    </SaasW3crmShell>
  );
}
