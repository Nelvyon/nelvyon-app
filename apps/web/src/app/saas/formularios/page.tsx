"use client";

/**
 * /saas/formularios sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * El constructor, el embed y las respuestas usan el `<Modal>` de la plantilla;
 * el listado, su tabla con paginacion.
 *
 * Logica de NELVYON intacta: `GET/POST /api/saas/formularios`,
 * `PATCH/DELETE /api/saas/formularios/[id]`,
 * `GET /api/saas/formularios/[id]/submissions` y
 * `GET/POST /api/saas/formularios/templates`; los tipos `Form`, `FormField` y
 * `FormSubmission`, `FIELD_TYPES` con sus nueve tipos, `uid`, el editor de
 * campos con reordenacion (`moveField`), las etiquetas por defecto al anadir
 * campo, la validacion (nombre + al menos un campo), `toggleActive`,
 * `deleteForm` y la galeria de plantillas con su importacion.
 */
import { useCallback, useEffect, useState } from "react";
import Alert from "sweetalert2";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable, W3crmModal } from "@/features/saas-w3crm/components/W3crmContentBox";

type FieldType = "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "number" | "url" | "date";

interface FormField {
  id: string; type: FieldType; label: string; placeholder: string; required: boolean; options?: string[];
}

interface Form {
  id: string; name: string; description: string | null; fields: FormField[];
  submissions: number; isActive: boolean; embedCode: string | null; createdAt: string;
}

interface FormSubmission {
  id: string; data: Record<string, unknown>; ip: string | null; createdAt: string;
  contactId: string | null; contactName: string | null; contactEmail: string | null;
}

const FIELD_TYPES: { type: FieldType; label: string; icon: string }[] = [
  { type: "text", label: "Texto corto", icon: "T" },
  { type: "email", label: "Email", icon: "@" },
  { type: "phone", label: "Teléfono", icon: "📱" },
  { type: "textarea", label: "Texto largo", icon: "¶" },
  { type: "select", label: "Desplegable", icon: "▾" },
  { type: "checkbox", label: "Casilla", icon: "☑" },
  { type: "number", label: "Número", icon: "#" },
  { type: "url", label: "URL", icon: "🔗" },
  { type: "date", label: "Fecha", icon: "📅" },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES");
}
/** `fields` puede llegar nulo o no-array desde el backend. */
function camposDe(f: Form): FormField[] {
  return Array.isArray(f.fields) ? f.fields : [];
}
/** Tipo fuera de catalogo -> se muestra crudo, sin romper. */
function tipoDe(t: FieldType | string) {
  return FIELD_TYPES.find((x) => x.type === t) ?? { type: t as FieldType, label: String(t || "—"), icon: "?" };
}

// ─── Constructor ──────────────────────────────────────────────────────────────

function FormBuilderModal({ form, onClose, onSaved }: { form?: Form; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(form?.name ?? "");
  const [description, setDescription] = useState(form?.description ?? "");
  const [fields, setFields] = useState<FormField[]>(form ? camposDe(form) : []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  function addField(type: FieldType) {
    const defaultLabel: Record<FieldType, string> = {
      text: "Nombre", email: "Email", phone: "Teléfono", textarea: "Mensaje",
      select: "¿Cómo nos encontraste?", checkbox: "Acepto los términos",
      number: "Número", url: "Sitio web", date: "Fecha",
    };
    setFields((prev) => [
      ...prev,
      {
        id: uid(), type, label: defaultLabel[type], placeholder: "",
        required: type === "email",
        options: type === "select" ? ["Opción 1", "Opción 2"] : undefined,
      },
    ]);
  }

  function moveField(index: number, dir: -1 | 1) {
    setFields((prev) => {
      const next = [...prev];
      const tmp = next[index];
      next[index] = next[index + dir]!;
      next[index + dir] = tmp!;
      return next;
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || fields.length === 0) { setError("El formulario necesita nombre y al menos un campo"); return; }
    setSaving(true);
    setError(null);
    try {
      const url = form ? `/api/saas/formularios/${form.id}` : "/api/saas/formularios";
      const method = form ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, fields }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Error al guardar");
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
    <W3crmModal titulo={form ? "Editar formulario" : "Nuevo formulario"} onClose={onClose} error={error} size="lg" testId="modal-formulario">
      <form onSubmit={save}>
        <div className="row">
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="fm-nombre" className="text-black font-w600">Nombre del formulario <span className="required">*</span></label>
              <input id="fm-nombre" type="text" className="form-control" placeholder="Formulario de contacto"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="fm-descripcion" className="text-black font-w600">Descripción</label>
              <input id="fm-descripcion" type="text" className="form-control" placeholder="Para solicitar presupuesto"
                value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="col-lg-12 mb-3">
            <label className="text-black font-w600 d-block mb-2">Añadir campo</label>
            {FIELD_TYPES.map(({ type, label, icon }) => (
              <button key={type} type="button" className="btn btn-primary light btn-sm me-1 mb-1" onClick={() => addField(type)}>
                {icon} {label}
              </button>
            ))}
          </div>

          <div className="col-lg-12">
            {fields.length === 0 ? (
              <W3crmEmptyState title="Sin campos" description="Añade campos desde la paleta de arriba." />
            ) : (
              <div className="table-responsive">
                <div className="dataTables_wrapper no-footer">
                  <table className="table table-responsive-lg table-striped table-condensed flip-content">
                    <thead>
                      <tr>
                        <th className="text-black">Campo</th>
                        <th className="text-black">Tipo</th>
                        <th className="text-black">Obligatorio</th>
                        <th className="text-black text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((f, i) => (
                        <>
                          <tr key={f.id}>
                            <td>
                              <span className="badge badge-secondary light me-2">{tipoDe(f.type).icon}</span>
                              <span className="fw-bold">{f.label || "(sin título)"}</span>
                            </td>
                            <td>{tipoDe(f.type).label}</td>
                            <td>{f.required ? <span className="badge badge-danger">Sí</span> : <span className="text-muted">No</span>}</td>
                            <td className="text-end">
                              <button type="button" className="btn btn-primary light btn-sm content-icon me-1" disabled={i === 0}
                                aria-label={`Subir ${f.label || "campo"}`} onClick={() => moveField(i, -1)}>
                                <i className="fa-solid fa-angle-up" />
                              </button>
                              <button type="button" className="btn btn-primary light btn-sm content-icon me-1" disabled={i === fields.length - 1}
                                aria-label={`Bajar ${f.label || "campo"}`} onClick={() => moveField(i, 1)}>
                                <i className="fa-solid fa-angle-down" />
                              </button>
                              <button type="button" className="btn btn-warning btn-sm content-icon me-1"
                                aria-label={`Editar ${f.label || "campo"}`}
                                onClick={() => setEditandoId(editandoId === f.id ? null : f.id)}>
                                <i className="fa fa-edit" />
                              </button>
                              <button type="button" className="btn btn-danger btn-sm content-icon"
                                aria-label={`Quitar ${f.label || "campo"}`}
                                onClick={() => setFields((prev) => prev.filter((x) => x.id !== f.id))}>
                                <i className="fa-solid fa-trash" />
                              </button>
                            </td>
                          </tr>
                          {editandoId === f.id && (
                            <tr key={`${f.id}-edit`}>
                              <td colSpan={4}>
                                <div className="row">
                                  <div className="col-lg-6">
                                    <div className="form-group mb-3">
                                      <label className="text-black font-w600" htmlFor={`fm-label-${f.id}`}>Etiqueta</label>
                                      <input id={`fm-label-${f.id}`} type="text" className="form-control" value={f.label}
                                        onChange={(e) => setFields((prev) => prev.map((x) => x.id === f.id ? { ...x, label: e.target.value } : x))} />
                                    </div>
                                  </div>
                                  <div className="col-lg-6">
                                    <div className="form-group mb-3">
                                      <label className="text-black font-w600" htmlFor={`fm-ph-${f.id}`}>Placeholder</label>
                                      <input id={`fm-ph-${f.id}`} type="text" className="form-control" value={f.placeholder}
                                        onChange={(e) => setFields((prev) => prev.map((x) => x.id === f.id ? { ...x, placeholder: e.target.value } : x))} />
                                    </div>
                                  </div>
                                  {f.type === "select" && (
                                    <div className="col-lg-12">
                                      <div className="form-group mb-3">
                                        <label className="text-black font-w600" htmlFor={`fm-opts-${f.id}`}>Opciones (una por línea)</label>
                                        <textarea id={`fm-opts-${f.id}`} className="form-control" rows={3}
                                          value={(f.options ?? []).join("\n")}
                                          onChange={(e) => setFields((prev) => prev.map((x) => x.id === f.id ? { ...x, options: e.target.value.split("\n").filter(Boolean) } : x))} />
                                      </div>
                                    </div>
                                  )}
                                  <div className="col-lg-12">
                                    <div className="form-check mb-0">
                                      <input className="form-check-input" type="checkbox" id={`fm-req-${f.id}`} checked={f.required}
                                        onChange={(e) => setFields((prev) => prev.map((x) => x.id === f.id ? { ...x, required: e.target.checked } : x))} />
                                      <label className="form-check-label" htmlFor={`fm-req-${f.id}`}>Campo obligatorio</label>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="col-lg-12">
            <div className="text-end">
              <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Guardando…" : "Guardar formulario"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </W3crmModal>
  );
}

// ─── Embed ────────────────────────────────────────────────────────────────────

function EmbedModal({ form, onClose }: { form: Form; onClose: () => void }) {
  const embedCode = `<script src="${typeof window !== "undefined" ? window.location.origin : "https://nelvyon.com"}/embed/form.js" data-form-id="${form.id}" async></script>`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard?.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <W3crmModal titulo="Integrar formulario" onClose={onClose} testId="modal-embed">
      <p className="fs-14 text-muted">Pega este código donde quieras que aparezca el formulario.</p>
      <pre className="border rounded p-3 fs-12 text-break mb-3">{embedCode}</pre>
      <div className="text-end">
        <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cerrar</button>
        <button type="button" className="btn btn-primary" onClick={() => void copy()}>
          {copied ? "¡Copiado!" : "Copiar código"}
        </button>
      </div>
    </W3crmModal>
  );
}

// ─── Respuestas ───────────────────────────────────────────────────────────────

function SubmissionsModal({ form, onClose }: { form: Form; onClose: () => void }) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/saas/formularios/${form.id}/submissions`)
      .then((r) => r.json())
      .then((d: { submissions?: FormSubmission[] }) => setSubmissions(Array.isArray(d.submissions) ? d.submissions : []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, [form.id]);

  return (
    <W3crmModal titulo={`Respuestas · ${form.name}`} onClose={onClose} size="lg" testId="modal-respuestas-form">
      {loading ? (
        <W3crmCargando texto="Cargando respuestas…" />
      ) : submissions.length === 0 ? (
        <W3crmEmptyState title="Sin respuestas" description="Todavía no hay respuestas para este formulario." />
      ) : (
        <div className="table-responsive">
          <div className="dataTables_wrapper no-footer">
            <table className="table table-responsive-lg table-striped table-condensed flip-content">
              <thead>
                <tr>
                  <th className="text-black">Fecha</th>
                  <th className="text-black">Contacto</th>
                  <th className="text-black">Datos</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td>{fecha(s.createdAt)}</td>
                    <td>
                      {s.contactId
                        ? <span className="badge badge-success">{s.contactName ?? s.contactEmail ?? "Contacto vinculado"}</span>
                        : <span className="badge badge-secondary light">Sin contacto</span>}
                    </td>
                    <td>
                      {Object.entries(s.data ?? {}).map(([key, value]) => (
                        <div key={key} className="fs-12">
                          <span className="text-muted">{key}: </span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </W3crmModal>
  );
}

// ─── Galeria de plantillas ────────────────────────────────────────────────────

function FormTemplateGallery({ onImported }: { onImported: () => void }) {
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [importing, setImporting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/saas/formularios/templates")
      .then((r) => r.json())
      .then((d: { templates?: Array<{ id: string; name: string; description: string }> }) =>
        setTemplates(Array.isArray(d.templates) ? d.templates : []))
      .catch(() => {});
  }, []);

  async function importTpl(id: string) {
    setImporting(id);
    try {
      const res = await fetch("/api/saas/formularios/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", template_id: id }),
      });
      if (res.ok) onImported();
    } finally {
      setImporting(null);
    }
  }

  if (!templates.length) return null;

  return (
    <W3crmContentBox titulo={`Plantillas oficiales Nelvyon (${templates.length})`} icono="fa-solid fa-file-lines">
      <div className="row">
        {templates.map((t) => (
          <div className="col-xl-3 col-md-6 mb-3" key={t.id}>
            <div className="card mb-0 h-100">
              <div className="card-body">
                <h6 className="mb-1">{t.name}</h6>
                <p className="fs-12 text-muted mb-3">{t.description}</p>
                <button type="button" className="btn btn-primary btn-sm" disabled={importing === t.id}
                  onClick={() => void importTpl(t.id)}>
                  {importing === t.id ? "Importando…" : "Importar"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </W3crmContentBox>
  );
}

export default function SaasFormulariosPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | undefined>(undefined);
  const [embedForm, setEmbedForm] = useState<Form | null>(null);
  const [submissionsForm, setSubmissionsForm] = useState<Form | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/formularios");
      const data = (await res.json().catch(() => ({}))) as { forms?: Form[] };
      setForms(Array.isArray(data.forms) ? data.forms : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggleActive(f: Form) {
    setTogglingId(f.id);
    try {
      const res = await fetch(`/api/saas/formularios/${f.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !f.isActive }),
      });
      if (res.ok) setForms((prev) => prev.map((x) => (x.id === f.id ? { ...x, isActive: !f.isActive } : x)));
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteForm(f: Form) {
    const r = await Alert.fire({
      title: `¿Eliminar el formulario "${f.name}"?`,
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!r.value) return;
    setDeletingId(f.id);
    try {
      const res = await fetch(`/api/saas/formularios/${f.id}`, { method: "DELETE" });
      if (res.ok) setForms((prev) => prev.filter((x) => x.id !== f.id));
    } finally {
      setDeletingId(null);
    }
  }

  const totalSubmissions = forms.reduce((s, f) => s + num(f.submissions), 0);

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Formularios" parentTitle="Gestión" pageTitle="Formularios" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Formularios" value={forms.length} accent /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Activos" value={forms.filter((f) => f.isActive).length} /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Respuestas totales" value={totalSubmissions.toLocaleString("es-ES")} /></div>

          <div className="col-xl-12">
            <div className="mb-3">
              <ul className="d-flex align-items-center flex-wrap">
                <li>
                  <button type="button" className="btn btn-primary"
                    onClick={() => { setEditingForm(undefined); setShowBuilder(true); }}>
                    + Nuevo formulario
                  </button>
                </li>
              </ul>
            </div>

            <FormTemplateGallery onImported={() => void load()} />

            <W3crmContentBox titulo="Formularios" icono="fa-solid fa-file-lines">
              {loading ? (
                <W3crmCargando texto="Cargando formularios…" />
              ) : forms.length === 0 ? (
                <W3crmEmptyState title="Sin formularios" description="Crea tu primer formulario de captación de leads." />
              ) : (
                <W3crmDataTable
                  filas={forms}
                  etiqueta="formularios"
                  columnas={[{ titulo: "Nombre" }, { titulo: "Campos" }, { titulo: "Respuestas" }, { titulo: "Estado" }, { titulo: "Acciones", alFinal: true }]}
                  render={(f) => (
                    <tr key={f.id}>
                      <td>
                        <span className="fw-bold">{f.name || "—"}</span>
                        {f.description ? <div className="text-muted fs-12">{f.description}</div> : null}
                      </td>
                      <td>{camposDe(f).length}</td>
                      <td>
                        <button type="button" className="btn btn-link p-0 fs-14" onClick={() => setSubmissionsForm(f)}>
                          {num(f.submissions)}
                        </button>
                      </td>
                      <td>
                        <button type="button"
                          className={`btn btn-sm ${f.isActive ? "btn-primary" : "btn-primary light"}`}
                          disabled={togglingId === f.id}
                          aria-pressed={f.isActive}
                          aria-label={f.isActive ? `Desactivar ${f.name}` : `Activar ${f.name}`}
                          onClick={() => void toggleActive(f)}>
                          {togglingId === f.id ? "…" : f.isActive ? "Activo" : "Inactivo"}
                        </button>
                      </td>
                      <td className="text-end">
                        <button type="button" className="btn btn-primary light btn-sm content-icon me-1"
                          aria-label={`Embed de ${f.name}`} onClick={() => setEmbedForm(f)}>
                          <i className="fa-solid fa-code" />
                        </button>
                        <button type="button" className="btn btn-warning btn-sm content-icon me-1"
                          aria-label={`Editar ${f.name}`} onClick={() => { setEditingForm(f); setShowBuilder(true); }}>
                          <i className="fa fa-edit" />
                        </button>
                        <button type="button" className="btn btn-danger btn-sm content-icon" disabled={deletingId === f.id}
                          aria-label={`Eliminar ${f.name}`} onClick={() => void deleteForm(f)}>
                          <i className="fa-solid fa-trash" />
                        </button>
                      </td>
                    </tr>
                  )}
                />
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>

      {showBuilder && (
        <FormBuilderModal form={editingForm} onClose={() => setShowBuilder(false)} onSaved={load} />
      )}
      {embedForm && <EmbedModal form={embedForm} onClose={() => setEmbedForm(null)} />}
      {submissionsForm && <SubmissionsModal form={submissionsForm} onClose={() => setSubmissionsForm(null)} />}
    </SaasW3crmShell>
  );
}
