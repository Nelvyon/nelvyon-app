"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type FieldType = "text" | "number" | "date" | "boolean" | "select" | "file" | "relation";

interface ObjectField {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  relationTo?: string;
}

interface CustomObject {
  id: string;
  name: string;
  pluralName: string;
  icon: string;
  color: string;
  fields: ObjectField[];
  recordCount: number;
  createdAt: string;
}

const FIELD_ICON: Record<FieldType, string> = {
  text: "T", number: "#", date: "📅", boolean: "☑", select: "▼", file: "📎", relation: "🔗",
};

const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: "Texto", number: "Número", date: "Fecha", boolean: "Sí/No", select: "Lista", file: "Archivo", relation: "Relación",
};

const OBJECT_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

const MOCK_OBJECTS: CustomObject[] = [
  {
    id: "o1", name: "Proyecto", pluralName: "Proyectos", icon: "🏗️", color: "#6366f1", recordCount: 24,
    createdAt: "2026-03-01T10:00:00Z",
    fields: [
      { id: "f1", name: "Nombre", type: "text", required: true },
      { id: "f2", name: "Presupuesto", type: "number", required: false },
      { id: "f3", name: "Fecha inicio", type: "date", required: false },
      { id: "f4", name: "Estado", type: "select", required: true, options: ["Propuesta", "En curso", "Entregado", "Cancelado"] },
      { id: "f5", name: "Cliente", type: "relation", required: false, relationTo: "CRM" },
    ],
  },
  {
    id: "o2", name: "Vehículo", pluralName: "Vehículos", icon: "🚗", color: "#ec4899", recordCount: 87,
    createdAt: "2026-04-10T10:00:00Z",
    fields: [
      { id: "g1", name: "Matrícula", type: "text", required: true },
      { id: "g2", name: "Marca", type: "text", required: true },
      { id: "g3", name: "Año", type: "number", required: false },
      { id: "g4", name: "En servicio", type: "boolean", required: false },
    ],
  },
  {
    id: "o3", name: "Propiedad", pluralName: "Propiedades", icon: "🏠", color: "#10b981", recordCount: 142,
    createdAt: "2026-02-15T10:00:00Z",
    fields: [
      { id: "h1", name: "Dirección", type: "text", required: true },
      { id: "h2", name: "Precio", type: "number", required: true },
      { id: "h3", name: "Tipo", type: "select", required: true, options: ["Piso", "Casa", "Local", "Solar"] },
      { id: "h4", name: "Disponible", type: "boolean", required: false },
      { id: "h5", name: "Fotos", type: "file", required: false },
    ],
  },
];

function FieldBadge({ field }: { field: ObjectField }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/10 px-3 py-2">
      <span className="text-xs font-mono font-bold text-muted-foreground w-4">{FIELD_ICON[field.type]}</span>
      <span className="text-sm text-foreground">{field.name}</span>
      <span className="text-xs text-muted-foreground">{FIELD_TYPE_LABEL[field.type]}</span>
      {field.required && <span className="text-xs text-red-400">*</span>}
      {field.options && <span className="text-xs text-muted-foreground">({field.options.slice(0, 2).join(", ")}{field.options.length > 2 ? "…" : ""})</span>}
      {field.relationTo && <span className="text-xs text-primary">→ {field.relationTo}</span>}
    </div>
  );
}

function CreateObjectModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [pluralName, setPluralName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [color, setColor] = useState(OBJECT_COLORS[0]);
  const [fields, setFields] = useState<Omit<ObjectField, "id">[]>([
    { name: "", type: "text", required: false },
  ]);
  const [saving, setSaving] = useState(false);

  function addField() { setFields(f => [...f, { name: "", type: "text", required: false }]); }
  function updateField(i: number, upd: Partial<Omit<ObjectField, "id">>) {
    setFields(f => f.map((field, idx) => idx === i ? { ...field, ...upd } : field));
  }
  function removeField(i: number) { setFields(f => f.filter((_, idx) => idx !== i)); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/saas/objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pluralName, icon, color, fields }),
      });
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nuevo objeto personalizado</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre singular *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Proyecto"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre plural *</label>
              <input value={pluralName} onChange={e => setPluralName(e.target.value)} placeholder="Ej: Proyectos"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Icono (emoji)</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} maxLength={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-2xl text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">Color</label>
              <div className="flex gap-2">
                {OBJECT_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${color === c ? "scale-110 border-white" : "border-transparent"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Campos</label>
              <button type="button" onClick={addField} className="text-xs text-primary hover:underline">+ Añadir campo</button>
            </div>
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={field.name} onChange={e => updateField(i, { name: e.target.value })} placeholder="Nombre del campo"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
                  <select value={field.type} onChange={e => updateField(i, { type: e.target.value as FieldType })}
                    className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                    {(Object.keys(FIELD_TYPE_LABEL) as FieldType[]).map(t => (
                      <option key={t} value={t}>{FIELD_TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <input type="checkbox" checked={field.required} onChange={e => updateField(i, { required: e.target.checked })} className="accent-primary" />
                    Req.
                  </label>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => removeField(i)} className="text-red-400 hover:text-red-300 text-sm">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving || !name || !pluralName} className="flex-1">{saving ? "Creando…" : "Crear objeto"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasObjetosPage() {
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/objects");
      if (res.ok) {
        const d = (await res.json()) as { objects?: CustomObject[] };
        setObjects(d.objects ?? MOCK_OBJECTS);
      } else setObjects(MOCK_OBJECTS);
    } catch { setObjects(MOCK_OBJECTS); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="objetos" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader
                title="Objetos Personalizados"
                subtitle="Crea estructuras de datos a medida para tu negocio, como Salesforce pero en Nelvyon"
              />
              <NelvyonDsButton onClick={() => setShowModal(true)}>+ Nuevo objeto</NelvyonDsButton>
            </div>

            {/* Intro card */}
            <NelvyonDsCard className="border-primary/20 bg-primary/5 p-4">
              <div className="flex gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="text-sm font-medium text-foreground">¿Qué son los objetos personalizados?</p>
                  <p className="mt-1 text-xs text-muted-foreground">Define entidades propias de tu negocio (propiedades, vehículos, proyectos…) con sus campos, vincúlalas al CRM y úsalas en workflows, reportes y automatizaciones.</p>
                </div>
              </div>
            </NelvyonDsCard>

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
                {objects.map(obj => (
                  <NelvyonDsCard key={obj.id} className="overflow-hidden p-0">
                    <button
                      onClick={() => setExpandedId(expandedId === obj.id ? null : obj.id)}
                      className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: `${obj.color}20` }}>
                        {obj.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{obj.pluralName}</p>
                        <p className="text-xs text-muted-foreground">{obj.fields.length} campos · {obj.recordCount} registros</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <NelvyonDsButton variant="ghost" className="text-xs">Ver registros</NelvyonDsButton>
                        <span className="text-muted-foreground text-sm">{expandedId === obj.id ? "▲" : "▼"}</span>
                      </div>
                    </button>
                    {expandedId === obj.id && (
                      <div className="border-t border-border p-4">
                        <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Campos</p>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {obj.fields.map(f => <FieldBadge key={f.id} field={f} />)}
                        </div>
                        <div className="mt-4 flex gap-2">
                          <NelvyonDsButton variant="ghost" className="text-xs">+ Añadir campo</NelvyonDsButton>
                          <NelvyonDsButton variant="ghost" className="text-xs">Editar objeto</NelvyonDsButton>
                        </div>
                      </div>
                    )}
                  </NelvyonDsCard>
                ))}
              </div>
            )}
      {showModal && <CreateObjectModal onClose={() => { setShowModal(false); void load(); }} />}
    </SaasShellLayout>
  );
}
