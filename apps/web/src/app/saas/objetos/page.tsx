"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type FieldType = "text" | "number" | "date" | "boolean" | "select" | "email" | "url";

interface ObjectField {
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
  options?: string[];
}

interface CustomObject {
  id: string;
  name: string;
  pluralName: string;
  icon: string;
  fields: ObjectField[];
  recordsCount: number;
  createdAt: string;
}

interface ObjectRecord {
  id: string;
  objectId: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const FIELD_ICON: Record<FieldType, string> = {
  text: "T", number: "#", date: "📅", boolean: "☑", select: "▼", email: "@", url: "🔗",
};

const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: "Texto", number: "Número", date: "Fecha", boolean: "Sí/No", select: "Lista", email: "Email", url: "URL",
};

const inp = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

function FieldBadge({ field }: { field: ObjectField }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/10 px-3 py-2">
      <span className="w-4 text-xs font-mono font-bold text-muted-foreground">{FIELD_ICON[field.type] ?? "?"}</span>
      <span className="text-sm text-foreground">{field.label || field.name}</span>
      <span className="text-xs text-muted-foreground">{FIELD_TYPE_LABEL[field.type] ?? field.type}</span>
      {field.required && <span className="text-xs text-red-400">*</span>}
      {field.options && field.options.length > 0 && (
        <span className="text-xs text-muted-foreground">
          ({field.options.slice(0, 2).join(", ")}{field.options.length > 2 ? "…" : ""})
        </span>
      )}
    </div>
  );
}

function CreateObjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [pluralName, setPluralName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [fields, setFields] = useState<ObjectField[]>([
    { name: "", type: "text", label: "", required: false },
  ]);
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
        body: JSON.stringify({
          name: name.trim(),
          pluralName: pluralName.trim(),
          icon,
          fields: payloadFields,
        }),
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nuevo objeto personalizado</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={(e) => void save(e)} className="space-y-5 p-6">
          {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre singular *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Proyecto" className={inp} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre plural *</label>
              <input value={pluralName} onChange={(e) => setPluralName(e.target.value)} placeholder="Ej: Proyectos" className={inp} required />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Icono (emoji)</label>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} className={`${inp} text-2xl`} />
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Campos</label>
              <button type="button" onClick={addField} className="text-xs text-primary hover:underline">+ Añadir campo</button>
            </div>
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input
                    value={field.name}
                    onChange={(e) => updateField(i, { name: e.target.value })}
                    placeholder="nombre_campo"
                    className={`min-w-[8rem] flex-1 ${inp}`}
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateField(i, { type: e.target.value as FieldType })}
                    className={inp}
                  >
                    {(Object.keys(FIELD_TYPE_LABEL) as FieldType[]).map((t) => (
                      <option key={t} value={t}>{FIELD_TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                  {field.type === "select" && (
                    <input
                      value={(field.options ?? []).join(", ")}
                      onChange={(e) => updateField(i, {
                        options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })}
                      placeholder="Opciones: A, B, C"
                      className={`min-w-[10rem] flex-1 ${inp}`}
                    />
                  )}
                  <label className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={Boolean(field.required)}
                      onChange={(e) => updateField(i, { required: e.target.checked })}
                      className="accent-primary"
                    />
                    Req.
                  </label>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => removeField(i)} className="text-sm text-red-400 hover:text-red-300">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving || !name.trim() || !pluralName.trim()} className="flex-1">
              {saving ? "Creando…" : "Crear objeto"}
            </NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordsPanel({
  object,
  onClose,
  onChanged,
}: {
  object: CustomObject;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [records, setRecords] = useState<ObjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/saas/custom-objects?objectId=${encodeURIComponent(object.id)}&records=true`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json()) as { records?: ObjectRecord[] };
      setRecords(d.records ?? []);
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
      for (const field of object.fields) {
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
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Registros · {object.pluralName}</p>
            <p className="text-xs text-muted-foreground">{records.length} registros</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="space-y-5 p-5">
          {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

          {object.fields.length > 0 && (
            <form onSubmit={(e) => void createRecord(e)} className="space-y-3 rounded-xl border border-border bg-muted/10 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nuevo registro</p>
              {object.fields.map((field) => (
                <div key={field.name}>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    {field.label || field.name}{field.required ? " *" : ""}
                  </label>
                  {field.type === "boolean" ? (
                    <select
                      value={form[field.name] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                      className={inp}
                    >
                      <option value="">—</option>
                      <option value="true">Sí</option>
                      <option value="false">No</option>
                    </select>
                  ) : field.type === "select" ? (
                    <select
                      value={form[field.name] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                      className={inp}
                    >
                      <option value="">—</option>
                      {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
                      value={form[field.name] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                      className={inp}
                    />
                  )}
                </div>
              ))}
              <NelvyonDsButton type="submit" disabled={saving} className="w-full">
                {saving ? "Guardando…" : "Crear registro"}
              </NelvyonDsButton>
            </form>
          )}

          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/20" />)}</div>
          ) : records.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin registros todavía</p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                    <NelvyonDsButton
                      variant="ghost"
                      className="text-xs text-red-400"
                      disabled={deletingId === r.id}
                      onClick={() => void deleteRecord(r.id)}
                    >
                      {deletingId === r.id ? "…" : "Eliminar"}
                    </NelvyonDsButton>
                  </div>
                  <dl className="space-y-1 text-sm">
                    {object.fields.map((field) => (
                      <div key={field.name} className="flex gap-2">
                        <dt className="shrink-0 text-muted-foreground">{field.label || field.name}:</dt>
                        <dd className="text-foreground">{String(r.data[field.name] ?? "—")}</dd>
                      </div>
                    ))}
                    {object.fields.length === 0 && (
                      <pre className="overflow-x-auto text-xs text-muted-foreground">{JSON.stringify(r.data, null, 2)}</pre>
                    )}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SaasObjetosPage() {
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
      const d = (await res.json()) as { objects?: CustomObject[] };
      setObjects(d.objects ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar objetos");
      setObjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function deleteObject(id: string) {
    setDeletingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/saas/custom-objects?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      if (expandedId === id) setExpandedId(null);
      if (recordsObject?.id === id) setRecordsObject(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al eliminar objeto");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="objetos" />}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <NelvyonDsSectionHeader
          title="Objetos Personalizados"
          subtitle="Crea estructuras de datos a medida para tu negocio"
        />
        <NelvyonDsButton onClick={() => setShowModal(true)}>+ Nuevo objeto</NelvyonDsButton>
      </div>

      <NelvyonDsCard className="border-primary/20 bg-primary/5 p-4">
        <div className="flex gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-sm font-medium text-foreground">¿Qué son los objetos personalizados?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Define entidades propias de tu negocio con sus campos, crea registros y úsalos en workflows y reportes.
            </p>
          </div>
        </div>
      </NelvyonDsCard>

      {error && (
        <NelvyonDsCard className="border-red-500/30 bg-red-500/5 p-4">
          <p className="text-sm text-red-400">{error}</p>
          <button type="button" onClick={() => void load()} className="mt-2 text-xs text-primary hover:underline">Reintentar</button>
        </NelvyonDsCard>
      )}
      {actionError && (
        <NelvyonDsCard className="border-red-500/30 bg-red-500/5 p-4">
          <p className="text-sm text-red-400">{actionError}</p>
          <button type="button" onClick={() => setActionError(null)} className="mt-2 text-xs text-primary hover:underline">Cerrar</button>
        </NelvyonDsCard>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/30" />)}</div>
      ) : objects.length === 0 ? (
        <NelvyonDsCard className="p-16 text-center">
          <p className="text-5xl">🧩</p>
          <p className="mt-4 text-lg font-semibold text-foreground">Sin objetos personalizados</p>
          <p className="mt-2 text-sm text-muted-foreground">Modela los datos específicos de tu negocio</p>
          <NelvyonDsButton className="mt-5" onClick={() => setShowModal(true)}>+ Crear primer objeto</NelvyonDsButton>
        </NelvyonDsCard>
      ) : (
        <div className="space-y-3">
          {objects.map((obj) => (
            <NelvyonDsCard key={obj.id} className="overflow-hidden p-0">
              <div className="flex w-full items-center gap-4 p-4">
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === obj.id ? null : obj.id)}
                  className="flex min-w-0 flex-1 items-center gap-4 text-left hover:opacity-90"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-xl">
                    {obj.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{obj.pluralName}</p>
                    <p className="text-xs text-muted-foreground">
                      {obj.fields.length} campos · {obj.recordsCount} registros
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">{expandedId === obj.id ? "▲" : "▼"}</span>
                </button>
                <NelvyonDsButton
                  variant="ghost"
                  className="shrink-0 text-xs"
                  onClick={() => setRecordsObject(obj)}
                >
                  Ver registros
                </NelvyonDsButton>
              </div>
              {expandedId === obj.id && (
                <div className="border-t border-border p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Campos</p>
                  {obj.fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin campos definidos</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {obj.fields.map((f) => <FieldBadge key={f.name} field={f} />)}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <NelvyonDsButton variant="ghost" className="text-xs" onClick={() => setRecordsObject(obj)}>
                      Gestionar registros
                    </NelvyonDsButton>
                    <NelvyonDsButton
                      variant="ghost"
                      className="text-xs text-red-400"
                      disabled={deletingId === obj.id}
                      onClick={() => {
                        if (window.confirm(`¿Eliminar el objeto "${obj.name}" y todos sus registros?`)) {
                          void deleteObject(obj.id);
                        }
                      }}
                    >
                      {deletingId === obj.id ? "Eliminando…" : "Eliminar objeto"}
                    </NelvyonDsButton>
                  </div>
                </div>
              )}
            </NelvyonDsCard>
          ))}
        </div>
      )}

      {showModal && (
        <CreateObjectModal
          onClose={() => setShowModal(false)}
          onCreated={() => void load()}
        />
      )}
      {recordsObject && (
        <RecordsPanel
          object={recordsObject}
          onClose={() => setRecordsObject(null)}
          onChanged={() => void load()}
        />
      )}
    </SaasShellLayout>
  );
}
