"use client";

import { GraduationCap, Plus, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { SimpleModal } from "@/features/builders/components/DashboardUi";
import { MetricGrid } from "@/features/dashboard/components/DashboardTabs";
import { dashboardLmsApi } from "@/features/dashboard/api";

type Row = Record<string, unknown>;

function str(v: unknown, fb = "—"): string {
  if (v == null || v === "") return fb;
  return String(v);
}

function formatPrice(cents: unknown, currency = "eur"): string {
  const n = Number(cents ?? 0);
  if (n <= 0) return "Gratis";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: String(currency) }).format(n / 100);
}

export default function CursosDashboardPage() {
  const [courses, setCourses] = useState<Row[]>([]);
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price_eur: 0,
    currency: "eur",
    category: "",
    idioma: "es",
    thumbnail_url: "",
  });

  const load = useCallback(async () => {
    const res = await dashboardLmsApi.list();
    setCourses(res.items ?? []);
    setStats(res.workspace_stats ?? {});
  }, []);

  useEffect(() => {
    load().catch(() => {
      setCourses([]);
      setStats({});
    });
  }, [load]);

  async function createCourse() {
    await dashboardLmsApi.create({
      title: form.title,
      description: form.description,
      price_cents: Math.round(Number(form.price_eur) * 100) || 0,
      currency: form.currency,
      category: form.category || undefined,
      idioma: form.idioma,
      thumbnail_url: form.thumbnail_url || undefined,
    });
    setModal(false);
    setForm({ title: "", description: "", price_eur: 0, currency: "eur", category: "", idioma: "es", thumbnail_url: "" });
    load();
  }

  async function removeCourse(id: string) {
    if (!confirm("¿Eliminar este curso?")) return;
    await dashboardLmsApi.delete(id);
    load();
  }

  const metrics = [
    { label: "Ingresos LMS", value: formatPrice(stats.revenue_cents, "eur") },
    { label: "Alumnos activos", value: str(stats.active_students, "0") },
    { label: "Cursos publicados", value: str(stats.published_courses, "0") },
  ];

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <GraduationCap className="h-7 w-7 text-primary" aria-hidden />
              Cursos online
            </h1>
            <p className="text-sm text-muted-foreground">Crea y vende formación con vídeos, PDFs y certificados</p>
          </div>
          <Button onClick={() => setModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo curso
          </Button>
        </div>

        <MetricGrid items={metrics} />

        {courses.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Aún no tienes cursos. Crea el primero para publicarlo en el catálogo.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <article key={str(c.id)} className="overflow-hidden rounded-xl border bg-card shadow-sm">
                {c.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" className="h-36 w-full object-cover" src={str(c.thumbnail_url)} />
                ) : (
                  <div className="flex h-36 items-center justify-center bg-muted text-muted-foreground">
                    <GraduationCap className="h-10 w-10 opacity-40" />
                  </div>
                )}
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">{str(c.title)}</h2>
                      <p className="text-xs text-muted-foreground">
                        {str(c.status)} · {formatPrice(c.price_cents, str(c.currency, "eur"))}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => removeCourse(str(c.id))} aria-label="Eliminar">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {str(c.students_count, "0")} alumnos · {str(c.active_students, "0")} activos
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/cursos/${str(c.id)}`}>
                      <Settings className="mr-1 h-3 w-3" /> Editar curso
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <SimpleModal open={modal} onClose={() => setModal(false)} title="Nuevo curso" wide>
        <div className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Título</span>
            <input className="w-full rounded-lg border px-3 py-2" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Descripción</span>
            <textarea className="w-full rounded-lg border px-3 py-2" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Precio (€)</span>
              <input type="number" min={0} step={0.01} className="w-full rounded-lg border px-3 py-2" value={form.price_eur} onChange={(e) => setForm({ ...form, price_eur: Number(e.target.value) })} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Categoría</span>
              <input className="w-full rounded-lg border px-3 py-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Idioma</span>
            <select className="w-full rounded-lg border px-3 py-2" value={form.idioma} onChange={(e) => setForm({ ...form, idioma: e.target.value })}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Thumbnail (URL)</span>
            <input className="w-full rounded-lg border px-3 py-2" value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button disabled={!form.title.trim()} onClick={createCourse}>Crear</Button>
          </div>
        </div>
      </SimpleModal>
    </ProtectedLayout>
  );
}
