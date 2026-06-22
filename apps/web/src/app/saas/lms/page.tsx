"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface Course {
  id: string; title: string; description: string | null;
  status: "draft" | "published" | "archived";
  price: number; enrollments: number; completionRate: number;
  modules: number; coverImage: string | null; createdAt: string;
}

function NewCourseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("El título es obligatorio"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/lms/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: desc.trim() || null, price: parseFloat(price) || 0 }),
      });
      if (!res.ok) throw new Error("Error al crear curso");
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Nuevo curso</h2>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Marketing Digital con IA — Curso completo"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Descripción</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Aprende a usar IA para..."
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Precio (€) — 0 = gratuito</label>
            <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Creando…" : "Crear curso"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasLmsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/lms/courses");
      const data = (await res.json().catch(() => ({ courses: [] }))) as { courses: Course[] };
      setCourses(data.courses ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalRevenue = courses.reduce((s, c) => s + c.price * c.enrollments, 0);

  return (
    <DashboardLayout sidebar={<SaasSidebar activeId="workflows" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader title="LMS — Cursos y Formación" subtitle="Crea y vende cursos online directamente desde Nelvyon" />
          <NelvyonDsButton onClick={() => setShowNew(true)}>+ Nuevo curso</NelvyonDsButton>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Cursos", value: courses.length },
            { label: "Publicados", value: courses.filter(c => c.status === "published").length },
            { label: "Alumnos totales", value: courses.reduce((s, c) => s + c.enrollments, 0) },
            { label: "Revenue cursos", value: `${totalRevenue.toFixed(0)}€` },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-muted/30" />)}</div>
        ) : courses.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">🎓</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin cursos</p>
            <p className="mt-2 text-sm text-muted-foreground">Monetiza tu conocimiento creando cursos online</p>
            <NelvyonDsButton className="mt-5" onClick={() => setShowNew(true)}>+ Nuevo curso</NelvyonDsButton>
          </NelvyonDsCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map(c => (
              <NelvyonDsCard key={c.id} className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground leading-tight">{c.title}</p>
                  <NelvyonDsBadge tone={c.status === "published" ? "success" : "primary"} size="sm">
                    {c.status === "published" ? "Publicado" : c.status === "archived" ? "Archivado" : "Borrador"}
                  </NelvyonDsBadge>
                </div>
                {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div><p className="text-xs text-muted-foreground">Precio</p><p className="font-semibold text-foreground">{c.price === 0 ? "Gratis" : `${c.price}€`}</p></div>
                  <div><p className="text-xs text-muted-foreground">Alumnos</p><p className="font-semibold text-foreground">{c.enrollments}</p></div>
                  <div><p className="text-xs text-muted-foreground">Completado</p><p className="font-semibold text-green-400">{c.completionRate.toFixed(0)}%</p></div>
                </div>
                <div className="flex gap-2">
                  <NelvyonDsButton size="sm" variant="ghost" className="flex-1">Módulos</NelvyonDsButton>
                  <NelvyonDsButton size="sm" variant="ghost" className="flex-1">Alumnos</NelvyonDsButton>
                </div>
              </NelvyonDsCard>
            ))}
          </div>
        )}
      </div>
      {showNew && <NewCourseModal onClose={() => setShowNew(false)} onSaved={load} />}
    </DashboardLayout>
  );
}
