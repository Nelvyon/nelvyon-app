"use client";

/**
 * /saas/objetos sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Cada objeto es una caja plegable cuyo cuerpo son sus campos; el panel de
 * registros usa el `<Modal>` de la plantilla.
 *
 * Logica de NELVYON intacta: `GET /api/saas/custom-objects`,
 * `GET ?objectId=&records=true`, el `POST` de alta y sus acciones
 * (`create_record`, `delete_record`) y el `DELETE` de objeto; los tipos
 * `CustomObject`, `ObjectField` y `ObjectRecord`, `FIELD_ICON`,
 * `FIELD_TYPE_LABEL`, el editor de campos (`addField`, `updateField`,
 * `removeField`), la normalizacion del nombre de campo a snake_case, el
 * casting por tipo al crear registro y la validacion de obligatorios.
 */
import { useCallback, useEffect, useState } from "react";
import Alert from "sweetalert2";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmModal } from "@/features/saas-w3crm/components/W3crmContentBox";

type FieldType = "text" | "number" | "date" | "boolean" | "select" | "email" | "url";

interface ObjectField {
  name: string; type: FieldType; label: string; required?: boolean; options?: string[];
}

interface CustomObject {
  id: string; name: string; pluralName: string; icon: string;
  fields: ObjectField[]; recordsCount: number; createdAt: string;
}

interface ObjectRecord {
  id: string; objectId: string; data: Record<string, unknown>; createdAt: string; updatedAt: string;
}

const FIELD_ICON: Record<FieldType, string> = {
  text: "T", number: "#", date: "📅", boolean: "☑", select: "▼", email: "@", url: "🔗",
};

const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: "Texto", number: "Número", date: "Fecha", boolean: "Sí/No", select: "Lista", email: "Email", url: "URL",
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}
/** `fields` puede llegar nulo o no-array desde el backend. */
function camposDe(o: CustomObject): ObjectField[] {
  return Array.isArray(o.fields) ? o.fields : [];
}
/** Tipo de campo fuera de catalogo -> se muestra crudo, sin romper. */
function iconoCampo(t: FieldType | string) {
  return FIELD_ICON[t as FieldType] ?? "?";
}
function etiquetaTipo(t: FieldType | string) {
  return FIELD_TYPE_LABEL[t as FieldType] ?? String(t || "—");
}

function CreateObjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [pluralName, setPluralName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [fields, setFields] = useState<ObjectField[]>([{ name: "", type: "text", label: "", required: false }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addField() {
    setFields((f) => [...f, { name: "", type: "text", label: "", required: false }]);
  }
  function updateField(i: number, upd: Partial<ObjectField>) {
    setFields((f) => f.map((field, idx) => {
      if (idx !== i) return field;
      const next = { ...field, ...upd };
      if (upd.name !== undefined && !upd.label) next.label = upd.name;
      return next;
    }));
  }
  function removeField(i: number) {
    setFields((f) => f.filter((_, idx) => idx !== i));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payloadFields = fields
        .filter((f) => f.name.trim())
        .map((f) => ({
          name: f.name.trim().toLowerCase().replace(/\s+/g, "_"),
          label: (f.label || f.name).trim(),
          type: f.type,
          required: Boolean(f.required),
          ...(f.type === "select" && f.options?.length ? { options: f.options } : {}),
        }));
      const res = await fetch("/api/saas/custom-objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), pluralName: pluralName.trim(), icon, fields: payloadFields }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear objeto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <W3crmModal titulo="Nuevo objeto personalizado" onClose={onClose} error={error} size="lg" testId="modal-objeto">
      <form onSubmit={(e) => void save(e)}>
        <div className="row">
          <div className="col-lg-5">
            <div className="form-group mb-3">
              <label htmlFor="ob-nombre" className="text-black font-w600">Nombre singular <span className="required">*</span></label>
              <input id="ob-nombre" type="text" className="form-control" placeholder="Ej: Proyecto" required
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-5">
            <div className="form-group mb-3">
              <label htmlFor="ob-plural" className="text-black font-w600">Nombre plural <span className="required">*</span></label>
              <input id="ob-plural" type="text" className="form-control" placeholder="Ej: Proyectos" required
                value={pluralName} onChange={(e) => setPluralName(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-2">
            <div className="form-group mb-3">
              <label htmlFor="ob-icono" className="text-black font-w600">Icono</label>
              <input id="ob-icono" type="text" className="form-control text-center" maxLength={4}
                value={icon} onChange={(e) => setIcon(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-12">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <label className="text-black font-w600 mb-0">Campos</label>
              <button type="button" className="btn btn-primary light btn-xs" onClick={addField}>+ Añadir campo</button>
            </div>
            {fields.map((field, i) => (
              <div className="row align-items-end mb-2" key={i}>
                <div className="col-lg-4">
                  <label className="visually-hidden" htmlFor={`ob-campo-${i}`}>Nombre del campo {i + 1}</label>
                  <input id={`ob-campo-${i}`} type="text" className="form-control" placeholder="nombre_campo"
                    value={field.name} onChange={(e) => updateField(i, { name: e.target.value })} />
                </div>
                <div className="col-lg-3">
                  <label className="visually-hidden" htmlFor={`ob-tipo-${i}`}>Tipo del campo {i + 1}</label>
                  <select id={`ob-tipo-${i}`} className="form-control" value={field.type}
                    onChange={(e) => updateField(i, { type: e.target.value as FieldType })}>
                    {(Object.keys(FIELD_TYPE_LABEL) as FieldType[]).map((t) => (
                      <option key={t} value={t}>{FIELD_TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                </div>
                {field.type === "select" && (
                  <div className="col-lg-3">
                    <label className="visually-hidden" htmlFor={`ob-opciones-${i}`}>Opciones del campo {i + 1}</label>
                    <input id={`ob-opciones-${i}`} type="text" className="form-control" placeholder="Opciones: A, B, C"
                      value={(field.options ?? []).join(", ")}
                      onChange={(e) => updateField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                  </div>
                )}
                <div className="col-lg-1">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id={`ob-req-${i}`}
                      checked={Boolean(field.required)} onChange={(e) => updateField(i, { required: e.target.checked })} />
                    <label className="form-check-label fs-12" htmlFor={`ob-req-${i}`}>Req.</label>
                  </div>
                </div>
                {fields.length > 1 && (
                  <div className="col-lg-1">
                    <button type="button" className="btn btn-danger btn-sm content-icon"
                      aria-label={`Quitar campo ${i + 1}`} onClick={() => removeField(i)}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="col-lg-12">
            <div className="text-end">
              <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !name.trim() || !pluralName.trim()}>
                {saving ? "Creando…" : "Crear objeto"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </W3crmModal>
  );
}

function RecordsPanel({ object, onClose, onChanged }: {
  object: CustomObject; onClose: () => void; onChanged: () => void;
}) {
  const [records, setRecords] = useState<ObjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const campos = camposDe(object);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/saas/custom-objects?objectId=${encodeURIComponent(object.id)}&records=true`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json().catch(() => ({}))) as { records?: ObjectRecord[] };
      setRecords(Array.isArray(d.records) ? d.records : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar registros");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [object.id]);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  async function createRecord(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data: Record<string, unknown> = {};
      for (const field of campos) {
        const raw = form[field.name] ?? "";
        if (field.required && !raw.trim()) {
          throw new Error(`El campo "${field.label || field.name}" es obligatorio`);
        }
        if (!raw.trim()) continue;
        if (field.type === "number") data[field.name] = Number(raw);
        else if (field.type === "boolean") data[field.name] = raw === "true";
        else data[field.name] = raw.trim();
      }
      const res = await fetch("/api/saas/custom-objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_record", objectId: object.id, data }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      setForm({});
      await loadRecords();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear registro");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(recordId: string) {
    setDeletingId(recordId);
    setError(null);
    try {
      const res = await fetch("/api/saas/custom-objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_record", objectId: object.id, recordId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      await loadRecords();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar registro");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <W3crmModal titulo={`Registros · ${object.pluralName}`} onClose={onClose} error={error} size="lg" testId="modal-registros">
      {campos.length > 0 && (
        <form onSubmit={(e) => void createRecord(e)} className="card mb-3">
          <div className="card-body">
            <p className="fw-bold fs-14 mb-3">Nuevo registro</p>
            <div className="row">
              {campos.map((field) => (
                <div className="col-lg-6" key={field.name}>
                  <div className="form-group mb-3">
                    <label className="text-black font-w600" htmlFor={`rec-${field.name}`}>
                      {field.label || field.name}{field.required ? " *" : ""}
                    </label>
                    {field.type === "boolean" ? (
                      <select id={`rec-${field.name}`} className="form-control" value={form[field.name] ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}>
                        <option value="">—</option>
                        <option value="true">Sí</option>
                        <option value="false">No</option>
                      </select>
                    ) : field.type === "select" ? (
                      <select id={`rec-${field.name}`} className="form-control" value={form[field.name] ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}>
                        <option value="">—</option>
                        {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        id={`rec-${field.name}`}
                        className="form-control"
                        type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
                        value={form[field.name] ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                      />
                    )}
                  </div>
                </div>
              ))}
              <div className="col-lg-12">
                <div className="text-end">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Guardando…" : "Crear registro"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <W3crmCargando texto="Cargando registros…" />
      ) : records.length === 0 ? (
        <W3crmEmptyState title="Sin registros todavía" />
      ) : (
        <div className="table-responsive">
          <div className="dataTables_wrapper no-footer">
            <table className="table table-responsive-lg table-striped table-condensed flip-content">
              <thead>
                <tr>
                  <th className="text-black">Creado</th>
                  {campos.map((f) => <th className="text-black" key={f.name}>{f.label || f.name}</th>)}
                  {campos.length === 0 && <th className="text-black">Datos</th>}
                  <th className="text-black text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{fecha(r.createdAt)}</td>
                    {campos.map((f) => (
                      <td key={f.name}>{String(r.data?.[f.name] ?? "—")}</td>
                    ))}
                    {campos.length === 0 && (
                      <td><code className="fs-12">{JSON.stringify(r.data ?? {})}</code></td>
                    )}
                    <td className="text-end">
                      <button type="button" className="btn btn-danger btn-sm content-icon"
                        disabled={deletingId === r.id} aria-label="Eliminar registro"
                        onClick={() => void deleteRecord(r.id)}>
                        <i className="fa-solid fa-trash" />
                      </button>
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

export default function SaasObjetosPage() {
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [recordsObject, setRecordsObject] = useState<CustomObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/custom-objects");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json().catch(() => ({}))) as { objects?: CustomObject[] };
      setObjects(Array.isArray(d.objects) ? d.objects : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar objetos");
      setObjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function deleteObject(obj: CustomObject) {
    const r = await Alert.fire({
      title: `¿Eliminar el objeto "${obj.name}"?`,
      text: "Se eliminarán también todos sus registros.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!r.value) return;
    setDeletingId(obj.id);
    setActionError(null);
    try {
      const res = await fetch(`/api/saas/custom-objects?id=${encodeURIComponent(obj.id)}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      if (recordsObject?.id === obj.id) setRecordsObject(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al eliminar objeto");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Objetos personalizados" parentTitle="Gestión" pageTitle="Objetos personalizados" />
      <div className="container-fluid">
        <div className="row">
          {(error || actionError) && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error ?? actionError}
                <button type="button" className="btn-close" aria-label="Cerrar"
                  onClick={() => { const habiaError = !!error; setError(null); setActionError(null); if (habiaError) void load(); }} />
              </div>
            </div>
          )}

          <div className="col-xl-6 col-sm-6"><W3crmKpiTile label="Objetos" value={objects.length} accent /></div>
          <div className="col-xl-6 col-sm-6"><W3crmKpiTile label="Registros totales" value={objects.reduce((s, o) => s + num(o.recordsCount), 0).toLocaleString("es-ES")} /></div>

          <div className="col-xl-12">
            <div className="alert alert-primary" role="note">
              <strong>¿Qué son los objetos personalizados?</strong> Define entidades propias de tu negocio con sus
              campos, crea registros y úsalos en workflows y reportes.
            </div>

            <div className="mb-3">
              <ul className="d-flex align-items-center flex-wrap">
                <li><button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nuevo objeto</button></li>
              </ul>
            </div>

            {loading ? (
              <W3crmContentBox titulo="Objetos" icono="fa-solid fa-cubes">
                <W3crmCargando texto="Cargando objetos…" />
              </W3crmContentBox>
            ) : objects.length === 0 ? (
              <W3crmContentBox titulo="Objetos" icono="fa-solid fa-cubes">
                <W3crmEmptyState title="Sin objetos personalizados" description="Modela los datos específicos de tu negocio." />
              </W3crmContentBox>
            ) : (
              objects.map((obj) => {
                const campos = camposDe(obj);
                return (
                  <W3crmContentBox
                    key={obj.id}
                    testId="objeto"
                    icono="fa-solid fa-cubes"
                    defaultOpen={false}
                    titulo={
                      <>
                        <span className="me-1">{obj.icon}</span>
                        {obj.pluralName || obj.name || "—"}
                        <span className="text-muted fs-12 ms-2">
                          {campos.length} campos · {num(obj.recordsCount)} registros
                        </span>
                      </>
                    }
                    acciones={
                      <>
                        <button type="button" className="btn btn-primary light btn-sm me-2" onClick={() => setRecordsObject(obj)}>
                          Ver registros
                        </button>
                        <button type="button" className="btn btn-danger light btn-sm me-2" disabled={deletingId === obj.id}
                          onClick={() => void deleteObject(obj)}>
                          {deletingId === obj.id ? "Eliminando…" : "Eliminar"}
                        </button>
                      </>
                    }
                  >
                    {campos.length === 0 ? (
                      <W3crmEmptyState title="Sin campos definidos" />
                    ) : (
                      <div className="table-responsive">
                        <div className="dataTables_wrapper no-footer">
                          <table className="table table-responsive-lg table-striped table-condensed flip-content">
                            <thead>
                              <tr>
                                <th className="text-black">Campo</th>
                                <th className="text-black">Tipo</th>
                                <th className="text-black">Opciones</th>
                                <th className="text-black text-end">Obligatorio</th>
                              </tr>
                            </thead>
                            <tbody>
                              {campos.map((f) => (
                                <tr key={f.name}>
                                  <td>
                                    <span className="badge badge-secondary light me-2">{iconoCampo(f.type)}</span>
                                    <span className="fw-bold">{f.label || f.name}</span>
                                  </td>
                                  <td>{etiquetaTipo(f.type)}</td>
                                  <td>
                                    {Array.isArray(f.options) && f.options.length > 0
                                      ? f.options.map((o) => <span key={o} className="badge badge-secondary light me-1 fs-12">{o}</span>)
                                      : <span className="text-muted">—</span>}
                                  </td>
                                  <td className="text-end">
                                    {f.required ? <span className="badge badge-danger">Sí</span> : <span className="text-muted">No</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </W3crmContentBox>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showModal && <CreateObjectModal onClose={() => setShowModal(false)} onCreated={() => void load()} />}
      {recordsObject && (
        <RecordsPanel object={recordsObject} onClose={() => setRecordsObject(null)} onChanged={() => void load()} />
      )}
    </SaasW3crmShell>
  );
}
