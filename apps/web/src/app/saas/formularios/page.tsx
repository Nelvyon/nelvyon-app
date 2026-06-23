"use client";

import { useCallback, useEffect, useState } from "react";

import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldType = "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "number" | "url" | "date";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[]; // for select
}

interface Form {
  id: string;
  name: string;
  description: string | null;
  fields: FormField[];
  submissions: number;
  isActive: boolean;
  embedCode: string | null;
  createdAt: string;
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

// ─── Field preview in builder ─────────────────────────────────────────────────

function FieldPreview({ field }: { field: FormField }) {
  const cls = "w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-muted-foreground";
  switch (field.type) {
    case "textarea":
      return <textarea disabled rows={3} placeholder={field.placeholder} className={`${cls} resize-none`} />;
    case "select":
      return (
        <select disabled className={cls}>
          <option>{field.placeholder || "Selecciona…"}</option>
          {field.options?.map((o) => <option key={o}>{o}</option>)}
        </select>
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" disabled className="rounded" />
          {field.placeholder || field.label}
        </label>
      );
    default:
      return <input disabled type={field.type} placeholder={field.placeholder} className={cls} />;
  }
}

// ─── Field editor row ─────────────────────────────────────────────────────────

function FieldRow({
  field,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  field: FormField;
  index: number;
  total: number;
  onChange: (f: FormField) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
          {FIELD_TYPES.find((t) => t.type === field.type)?.icon ?? "T"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{field.label || "(sin título)"}</p>
          <p className="text-xs text-muted-foreground">{FIELD_TYPES.find((t) => t.type === field.type)?.label} {field.required && "· Obligatorio"}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">▲</button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">▼</button>
          <button onClick={() => setExpanded((v) => !v)} className="rounded p-1 text-muted-foreground hover:text-foreground">✏️</button>
          <button onClick={onRemove} className="rounded p-1 text-red-400 hover:text-red-300">✕</button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Etiqueta</label>
              <input
                value={field.label}
                onChange={(e) => onChange({ ...field, label: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Placeholder</label>
              <input
                value={field.placeholder}
                onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            {field.type === "select" && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Opciones (una por línea)</label>
                <textarea
                  rows={3}
                  value={(field.options ?? []).join("\n")}
                  onChange={(e) => onChange({ ...field, options: e.target.value.split("\n").filter(Boolean) })}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => onChange({ ...field, required: e.target.checked })}
                className="rounded"
              />
              Campo obligatorio
            </label>
          </div>
          <div className="mt-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Vista previa</p>
            <FieldPreview field={field} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Form builder modal ───────────────────────────────────────────────────────

function FormBuilderModal({ form, onClose, onSaved }: { form?: Form; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(form?.name ?? "");
  const [description, setDescription] = useState(form?.description ?? "");
  const [fields, setFields] = useState<FormField[]>(form?.fields ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addField(type: FieldType) {
    const defaultLabel: Record<FieldType, string> = {
      text: "Nombre",
      email: "Email",
      phone: "Teléfono",
      textarea: "Mensaje",
      select: "¿Cómo nos encontraste?",
      checkbox: "Acepto los términos",
      number: "Número",
      url: "Sitio web",
      date: "Fecha",
    };
    setFields((prev) => [
      ...prev,
      { id: uid(), type, label: defaultLabel[type], placeholder: "", required: type === "email", options: type === "select" ? ["Opción 1", "Opción 2"] : undefined },
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">{form ? "Editar formulario" : "Nuevo formulario"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <form onSubmit={save}>
          <div className="space-y-5 px-6 py-5">
            {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre del formulario *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Formulario de contacto"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Descripción</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Para solicitar presupuesto"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Field type palette */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Añadir campo</p>
              <div className="flex flex-wrap gap-2">
                {FIELD_TYPES.map(({ type, label, icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addField(type)}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    <span>{icon}</span> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fields */}
            {fields.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-12 text-center">
                <p className="text-sm text-muted-foreground">Añade campos desde la paleta de arriba</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {fields.map((f, i) => (
                  <FieldRow
                    key={f.id}
                    field={f}
                    index={i}
                    total={fields.length}
                    onChange={(updated) => setFields((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
                    onRemove={() => setFields((prev) => prev.filter((x) => x.id !== f.id))}
                    onMove={(dir) => moveField(i, dir)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose}>Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar formulario"}
            </NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Embed code modal ─────────────────────────────────────────────────────────

function EmbedModal({ form, onClose }: { form: Form; onClose: () => void }) {
  const embedCode = `<script src="${typeof window !== "undefined" ? window.location.origin : "https://nelvyon.com"}/embed/form.js" data-form-id="${form.id}" async></script>`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-1 text-lg font-semibold text-foreground">Integrar formulario</h2>
        <p className="mb-4 text-sm text-muted-foreground">Pega este código donde quieras que aparezca el formulario</p>
        <pre className="overflow-x-auto rounded-xl bg-muted/30 p-4 text-xs text-muted-foreground">{embedCode}</pre>
        <div className="mt-4 flex gap-3">
          <NelvyonDsButton className="flex-1" onClick={copy}>{copied ? "¡Copiado!" : "Copiar código"}</NelvyonDsButton>
          <NelvyonDsButton variant="ghost" onClick={onClose}>Cerrar</NelvyonDsButton>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaasFormulariosPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | undefined>(undefined);
  const [embedForm, setEmbedForm] = useState<Form | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/formularios");
      const data = (await res.json().catch(() => ({ forms: [] }))) as { forms: Form[] };
      setForms(data.forms ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalSubmissions = forms.reduce((s, f) => s + f.submissions, 0);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="formularios" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader
            title="Formularios"
            subtitle="Crea formularios inteligentes y embédalos en cualquier web"
          />
          <NelvyonDsButton onClick={() => { setEditingForm(undefined); setShowBuilder(true); }}>+ Nuevo formulario</NelvyonDsButton>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Formularios", value: forms.length },
            { label: "Activos", value: forms.filter((f) => f.isActive).length },
            { label: "Respuestas totales", value: totalSubmissions.toLocaleString("es-ES") },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Forms grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        ) : forms.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">📋</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin formularios</p>
            <p className="mt-2 text-sm text-muted-foreground">Crea tu primer formulario de captación de leads</p>
            <NelvyonDsButton className="mt-5" onClick={() => { setEditingForm(undefined); setShowBuilder(true); }}>
              + Nuevo formulario
            </NelvyonDsButton>
          </NelvyonDsCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {forms.map((f) => (
              <NelvyonDsCard key={f.id} className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{f.name}</p>
                    {f.description && <p className="mt-0.5 text-sm text-muted-foreground">{f.description}</p>}
                  </div>
                  <NelvyonDsBadge tone={f.isActive ? "success" : "primary"}>
                    {f.isActive ? "Activo" : "Inactivo"}
                  </NelvyonDsBadge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{f.fields.length} campos</span>
                  <span>·</span>
                  <span>{f.submissions} respuestas</span>
                </div>
                <div className="flex gap-2">
                  <NelvyonDsButton variant="ghost" className="flex-1" onClick={() => setEmbedForm(f)}>
                    {"</>"} Embed
                  </NelvyonDsButton>
                  <NelvyonDsButton variant="ghost" className="flex-1" onClick={() => { setEditingForm(f); setShowBuilder(true); }}>
                    Editar
                  </NelvyonDsButton>
                </div>
              </NelvyonDsCard>
            ))}
          </div>
        )}
      </div>

      {showBuilder && (
        <FormBuilderModal
          form={editingForm}
          onClose={() => setShowBuilder(false)}
          onSaved={load}
        />
      )}
      {embedForm && <EmbedModal form={embedForm} onClose={() => setEmbedForm(null)} />}
    </SaasShellLayout>
  );
}
