"use client";

import { ArrowLeft, ChevronDown, ChevronRight, Plus, Rocket } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import { toastSuccess } from "@/core/ui/toastFeedback";
import { SimpleModal } from "@/features/builders/components/DashboardUi";
import { MetricGrid } from "@/features/dashboard/components/DashboardTabs";
import { dashboardLmsApi } from "@/features/dashboard/api";

type Tab = "content" | "students" | "stats" | "config";

function str(v: unknown, fb = ""): string {
  if (v == null || v === "") return fb;
  return String(v);
}

function formatPrice(cents: unknown, currency = "eur"): string {
  const n = Number(cents ?? 0);
  if (n <= 0) return "Gratis";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: String(currency) }).format(n / 100);
}

export default function CursoEditorPage() {
  const params = useParams();
  const id = str(params?.id);
  const [tab, setTab] = useState<Tab>("content");
  const [course, setCourse] = useState<Record<string, unknown>>({});
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [moduleModal, setModuleModal] = useState(false);
  const [lessonModal, setLessonModal] = useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [lessonForm, setLessonForm] = useState({
    title: "",
    content_type: "video",
    content_url: "",
    duration_minutes: 10,
  });
  const [configForm, setConfigForm] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    if (!id) return;
    const [c, s, e] = await Promise.all([
      dashboardLmsApi.get(id),
      dashboardLmsApi.stats(id),
      dashboardLmsApi.enrollments(id),
    ]);
    setCourse(c);
    setStats(s);
    setStudents(e.items ?? []);
    setConfigForm({
      title: c.title,
      description: c.description,
      price_cents: Number(c.price_cents ?? 0) / 100,
      category: c.category,
      idioma: c.idioma,
      thumbnail_url: c.thumbnail_url,
    });
  }, [id]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const modules = (course.modules as Record<string, unknown>[]) ?? [];

  async function addModule() {
    await dashboardLmsApi.addModule(id, { title: moduleTitle, order_index: modules.length });
    setModuleModal(false);
    setModuleTitle("");
    load();
  }

  async function addLesson(moduleId: string) {
    await dashboardLmsApi.addLesson(moduleId, {
      ...lessonForm,
      order_index: 0,
    });
    setLessonModal(null);
    setLessonForm({ title: "", content_type: "video", content_url: "", duration_minutes: 10 });
    load();
  }

  async function publish() {
    const res = await dashboardLmsApi.publish(id);
    toastSuccess(res.status === "pending_stripe" ? "Publicado (Stripe pendiente)" : "Curso publicado");
    load();
  }

  async function saveConfig() {
    await dashboardLmsApi.update(id, {
      title: configForm.title,
      description: configForm.description,
      price_cents: Math.round(Number(configForm.price_cents) * 100) || 0,
      category: configForm.category,
      idioma: configForm.idioma,
      thumbnail_url: configForm.thumbnail_url,
    });
    toastSuccess("Configuración guardada");
    load();
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/cursos">
              <ArrowLeft className="mr-1 h-4 w-4" /> Volver
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{str(course.title, "Curso")}</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{str(course.status, "draft")}</span>
          <Button className="ml-auto" onClick={publish}>
            <Rocket className="mr-2 h-4 w-4" /> Publicar curso
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 border-b pb-2">
          {(["content", "students", "stats", "config"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm capitalize",
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
              onClick={() => setTab(t)}
            >
              {t === "content" ? "Contenido" : t === "students" ? "Alumnos" : t === "stats" ? "Estadísticas" : "Configuración"}
            </button>
          ))}
        </div>

        {tab === "content" && (
          <div className="space-y-4">
            <Button onClick={() => setModuleModal(true)}>
              <Plus className="mr-2 h-4 w-4" /> Añadir módulo
            </Button>
            {modules.map((mod) => {
              const mid = str(mod.id);
              const open = openModules[mid] ?? true;
              const lessons = (mod.lessons as Record<string, unknown>[]) ?? [];
              return (
                <div key={mid} className="rounded-lg border">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium hover:bg-muted/50"
                    onClick={() => setOpenModules({ ...openModules, [mid]: !open })}
                  >
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {str(mod.title)}
                  </button>
                  {open && (
                    <div className="space-y-2 border-t px-4 py-3">
                      {lessons.map((l) => (
                        <div key={str(l.id)} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-sm">
                          <span>{str(l.title)}</span>
                          <span className="text-xs text-muted-foreground">
                            {str(l.content_type)} · {str(l.duration_minutes, "0")} min
                          </span>
                        </div>
                      ))}
                      <Button size="sm" variant="outline" onClick={() => setLessonModal(mid)}>
                        <Plus className="mr-1 h-3 w-3" /> Lección
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "students" && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2">Email</th>
                  <th className="p-2">Progreso</th>
                  <th className="p-2">Inscripción</th>
                  <th className="p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={str(s.id)} className="border-t">
                    <td className="p-2">{str(s.student_email)}</td>
                    <td className="p-2">{str(s.progress_percent, "0")}%</td>
                    <td className="p-2">{str(s.enrolled_at).slice(0, 10)}</td>
                    <td className="p-2">{str(s.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "stats" && (
          <MetricGrid
            items={[
              { label: "Ingresos", value: formatPrice(stats.revenue_cents) },
              { label: "Alumnos", value: str(stats.students, "0") },
              { label: "Progreso medio", value: `${str(stats.avg_progress_percent, "0")}%` },
              { label: "Completado", value: `${str(stats.completion_rate_percent, "0")}%` },
            ]}
          />
        )}

        {tab === "config" && (
          <div className="max-w-xl space-y-4">
            {(["title", "description", "price_cents", "category", "idioma", "thumbnail_url"] as const).map((key) => (
              <label key={key} className="block space-y-1 text-sm">
                <span className="font-medium capitalize">{key.replace("_", " ")}</span>
                {key === "description" ? (
                  <textarea className="w-full rounded-lg border px-3 py-2" rows={4} value={str(configForm[key])} onChange={(e) => setConfigForm({ ...configForm, [key]: e.target.value })} />
                ) : (
                  <input className="w-full rounded-lg border px-3 py-2" value={str(configForm[key])} onChange={(e) => setConfigForm({ ...configForm, [key]: key === "price_cents" ? Number(e.target.value) : e.target.value })} />
                )}
              </label>
            ))}
            <Button onClick={saveConfig}>Guardar</Button>
            <p className="text-xs text-muted-foreground">
              Página pública: <Link className="text-primary underline" href={`/curso/${id}`} target="_blank">/curso/{id}</Link>
            </p>
          </div>
        )}
      </div>

      <SimpleModal open={moduleModal} onClose={() => setModuleModal(false)} title="Nuevo módulo">
        <div className="space-y-4">
          <input className="w-full rounded-lg border px-3 py-2" placeholder="Título del módulo" value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} />
          <Button disabled={!moduleTitle.trim()} onClick={addModule}>Crear módulo</Button>
        </div>
      </SimpleModal>

      <SimpleModal open={!!lessonModal} onClose={() => setLessonModal(null)} title="Nueva lección">
        <div className="space-y-3">
          <input className="w-full rounded-lg border px-3 py-2" placeholder="Título" value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} />
          <select className="w-full rounded-lg border px-3 py-2" value={lessonForm.content_type} onChange={(e) => setLessonForm({ ...lessonForm, content_type: e.target.value })}>
            <option value="video">Vídeo</option>
            <option value="text">Texto</option>
            <option value="pdf">PDF</option>
            <option value="quiz">Quiz</option>
          </select>
          <input className="w-full rounded-lg border px-3 py-2" placeholder="URL o contenido" value={lessonForm.content_url} onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value })} />
          <input type="number" className="w-full rounded-lg border px-3 py-2" placeholder="Duración (min)" value={lessonForm.duration_minutes} onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: Number(e.target.value) })} />
          <Button disabled={!lessonForm.title.trim() || !lessonModal} onClick={() => lessonModal && addLesson(lessonModal)}>Añadir lección</Button>
        </div>
      </SimpleModal>
    </ProtectedLayout>
  );
}
