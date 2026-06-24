"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Course { id: string; title: string; description: string | null; status: "draft" | "published" | "archived"; price: number; enrollments: number; modulesCount: number; coverImage: string | null; createdAt: string }
interface LmsLesson { id: string; moduleId: string; title: string; contentType: "text" | "video" | "quiz"; content: string | null; videoUrl: string | null; durationMinutes: number | null; lessonOrder: number; quizJson: Record<string, unknown> | null }
interface LmsModule { id: string; courseId: string; title: string; description: string | null; modOrder: number; lessonsCount: number; lessons: LmsLesson[] }
interface Enrollment { id: string; courseId: string; contactEmail: string; contactName: string | null; status: string; enrolledAt: string; progressPct?: number; lessonsCompleted?: number; lessonsTotal?: number }

// ── Utilities ──────────────────────────────────────────────────────────────────
function statusLabel(s: Course["status"]) { return s === "published" ? "Publicado" : s === "archived" ? "Archivado" : "Borrador" }
function statusTone(s: Course["status"]): "success" | "primary" { return s === "published" ? "success" : "primary" }

// ── New Course Modal ───────────────────────────────────────────────────────────
function NewCourseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState(""); const [price, setPrice] = useState("0");
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!title.trim()) { setError("El título es obligatorio"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/saas/lms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim(), description: desc.trim() || null, price: parseFloat(price) || 0 }) });
      if (!res.ok) throw new Error("Error al crear curso"); onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); } finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Nuevo curso</h2>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={save} className="space-y-4">
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Marketing Digital con IA" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Descripción</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Descripción del curso..." className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Precio (€) — 0 = gratuito</label>
            <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Creando…" : "Crear curso"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Lesson Modal ───────────────────────────────────────────────────────────
function AddLessonModal({ moduleId, onClose, onSaved }: { moduleId: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(""); const [type, setType] = useState<"text" | "video" | "quiz">("text");
  const [content, setContent] = useState(""); const [videoUrl, setVideoUrl] = useState(""); const [duration, setDuration] = useState("");
  const [quizQ, setQuizQ] = useState(""); const [quizOpts, setQuizOpts] = useState(""); const [quizCorrect, setQuizCorrect] = useState("0");
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!title.trim()) { setError("El título es obligatorio"); return; }
    setSaving(true);
    try {
      const quizJson = type === "quiz" ? { questions: [{ text: quizQ, options: quizOpts.split("\n").map(s => s.trim()).filter(Boolean), correct: parseInt(quizCorrect) || 0 }] } : null;
      const res = await fetch("/api/saas/lms/lessons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module_id: moduleId, title: title.trim(), content_type: type, content: type === "text" ? content || null : null, video_url: type === "video" ? videoUrl || null : null, duration_minutes: duration ? parseInt(duration) : null, quiz_json: quizJson }) });
      if (!res.ok) { const d = await res.json() as { error?: string }; throw new Error(d.error ?? "Error"); }
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Nueva lección</h2>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={save} className="space-y-4">
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Introducción al módulo" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
            <select value={type} onChange={e => setType(e.target.value as "text" | "video" | "quiz")} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
              <option value="text">Texto</option><option value="video">Vídeo</option><option value="quiz">Quiz</option>
            </select></div>
          {type === "text" && <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Contenido</label><textarea value={content} onChange={e => setContent(e.target.value)} rows={5} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>}
          {type === "video" && <>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">URL del vídeo</label><input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Duración (min)</label><input type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
          </>}
          {type === "quiz" && <>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Pregunta</label><input value={quizQ} onChange={e => setQuizQ(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Opciones (una por línea)</label><textarea value={quizOpts} onChange={e => setQuizOpts(e.target.value)} rows={3} placeholder={"Opción A\nOpción B\nOpción C"} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Índice respuesta correcta (0, 1, 2…)</label><input type="number" min="0" value={quizCorrect} onChange={e => setQuizCorrect(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
          </>}
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Guardando…" : "Añadir lección"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Enroll Modal ───────────────────────────────────────────────────────────────
function EnrollModal({ courseId, onClose, onSaved }: { courseId: string; onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState(""); const [name, setName] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!email.trim()) { setError("Email obligatorio"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/saas/lms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "enroll", course_id: courseId, contact_email: email.trim(), contact_name: name.trim() || null }) });
      if (!res.ok) { const d = await res.json() as { error?: string }; throw new Error(d.error ?? "Error"); }
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); } finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Matricular alumno</h2>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={save} className="space-y-4">
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Email *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre</label><input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
          <div className="flex gap-3"><NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton><NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Matriculando…" : "Matricular"}</NelvyonDsButton></div>
        </form>
      </div>
    </div>
  );
}

// ── Course Editor Panel ────────────────────────────────────────────────────────
function CourseEditorPanel({ course, onClose, onRefresh }: { course: Course; onClose: () => void; onRefresh: () => void }) {
  const [modules, setModules] = useState<LmsModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModTitle, setNewModTitle] = useState("");
  const [addLessonModId, setAddLessonModId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadModules = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/saas/lms/modules?course_id=${course.id}`);
    const data = await res.json() as { modules?: LmsModule[] };
    setModules(data.modules ?? []);
    setLoading(false);
  }, [course.id]);

  useEffect(() => { void loadModules(); }, [loadModules]);

  async function addModule() {
    if (!newModTitle.trim()) return;
    await fetch("/api/saas/lms/modules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course_id: course.id, title: newModTitle.trim() }) });
    setNewModTitle(""); void loadModules(); void onRefresh();
  }

  async function deleteModule(modId: string) {
    if (!confirm("¿Eliminar módulo y todas sus lecciones?")) return;
    await fetch(`/api/saas/lms/modules/${modId}`, { method: "DELETE" });
    void loadModules(); void onRefresh();
  }

  async function deleteLesson(lessonId: string) {
    await fetch(`/api/saas/lms/lessons/${lessonId}`, { method: "DELETE" });
    void loadModules();
  }

  async function publishCourse() {
    await fetch("/api/saas/lms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", course_id: course.id }) });
    void onRefresh();
  }

  function toggleExpand(modId: string) {
    setExpanded(s => { const n = new Set(s); n.has(modId) ? n.delete(modId) : n.add(modId); return n; });
  }

  const lessonTypeIcon = (t: LmsLesson["contentType"]) => t === "video" ? "🎬" : t === "quiz" ? "📝" : "📄";

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="w-full max-w-2xl ml-auto flex flex-col bg-card border-l border-border shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between gap-4 p-5 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="font-semibold text-foreground">{course.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Editor de módulos y lecciones</p>
          </div>
          <div className="flex items-center gap-2">
            {course.status === "draft" && <NelvyonDsButton onClick={publishCourse} className="text-xs px-3 py-1.5">Publicar curso</NelvyonDsButton>}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
          </div>
        </div>

        <div className="p-5 flex-1">
          {loading ? <div className="text-center py-10 text-muted-foreground text-sm">Cargando…</div> : (
            <div className="space-y-3">
              {modules.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Sin módulos — añade el primero</p>}
              {modules.map((mod) => (
                <div key={mod.id} className="rounded-xl border border-border bg-background">
                  <div className="flex items-center justify-between gap-2 p-3 cursor-pointer" onClick={() => toggleExpand(mod.id)}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground text-sm">{expanded.has(mod.id) ? "▼" : "▶"}</span>
                      <span className="font-medium text-foreground text-sm truncate">{mod.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{mod.lessonsCount} lección{mod.lessonsCount !== 1 ? "es" : ""}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={e => { e.stopPropagation(); setAddLessonModId(mod.id); }} className="text-xs text-primary hover:underline">+ Lección</button>
                      <button onClick={e => { e.stopPropagation(); void deleteModule(mod.id); }} className="text-xs text-red-400 hover:text-red-300">Eliminar</button>
                    </div>
                  </div>
                  {expanded.has(mod.id) && (
                    <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
                      {mod.lessons.length === 0 && <p className="text-xs text-muted-foreground py-2">Sin lecciones</p>}
                      {mod.lessons.map((l) => (
                        <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/20 px-3 py-2">
                          <span className="text-sm">{lessonTypeIcon(l.contentType)} <span className="text-foreground">{l.title}</span>{l.durationMinutes ? <span className="text-xs text-muted-foreground ml-2">{l.durationMinutes} min</span> : null}</span>
                          <button onClick={() => void deleteLesson(l.id)} className="text-xs text-red-400 hover:text-red-300 shrink-0">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <input value={newModTitle} onChange={e => setNewModTitle(e.target.value)} placeholder="Nombre del nuevo módulo" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void addModule(); } }}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            <NelvyonDsButton onClick={addModule} disabled={!newModTitle.trim()}>+ Módulo</NelvyonDsButton>
          </div>
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
      {addLessonModId && <AddLessonModal moduleId={addLessonModId} onClose={() => setAddLessonModId(null)} onSaved={() => { void loadModules(); setAddLessonModId(null); }} />}
    </div>
  );
}

// ── Students Panel ─────────────────────────────────────────────────────────────
function StudentsPanel({ course, onClose }: { course: Course; onClose: () => void }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuingCert, setIssuingCert] = useState<string | null>(null);
  const [certUrls, setCertUrls] = useState<Record<string, string>>({});
  const [showEnroll, setShowEnroll] = useState(false);

  const loadEnrollments = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/saas/lms?course_id=${course.id}`);
    const data = await res.json() as { enrollments?: Enrollment[] };
    setEnrollments(data.enrollments ?? []);
    setLoading(false);
  }, [course.id]);

  useEffect(() => { void loadEnrollments(); }, [loadEnrollments]);

  async function issueCert(enrollmentId: string) {
    setIssuingCert(enrollmentId);
    try {
      const res = await fetch("/api/saas/lms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "issue_certificate", enrollment_id: enrollmentId }) });
      const data = await res.json() as { certificate?: { certificateUrl: string } };
      if (data.certificate?.certificateUrl) {
        setCertUrls(u => ({ ...u, [enrollmentId]: data.certificate!.certificateUrl }));
        void loadEnrollments();
      }
    } finally { setIssuingCert(null); }
  }

  const statusBadge = (e: Enrollment) => {
    if (e.status === "completed") return <NelvyonDsBadge tone="success">Completado</NelvyonDsBadge>;
    return <NelvyonDsBadge tone="primary">Activo</NelvyonDsBadge>;
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="w-full max-w-xl ml-auto flex flex-col bg-card border-l border-border shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between gap-4 p-5 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="font-semibold text-foreground">{course.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Alumnos matriculados</p>
          </div>
          <div className="flex items-center gap-2">
            <NelvyonDsButton onClick={() => setShowEnroll(true)} className="text-xs px-3 py-1.5">+ Matricular</NelvyonDsButton>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
          </div>
        </div>
        <div className="p-5 flex-1">
          {loading ? <div className="text-center py-10 text-muted-foreground text-sm">Cargando…</div> : enrollments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-sm text-muted-foreground">Sin alumnos — matricula el primero</p>
            </div>
          ) : (
            <div className="space-y-3">
              {enrollments.map((e) => {
                const pct = e.progressPct ?? 0;
                const certUrl = certUrls[e.id];
                return (
                  <NelvyonDsCard key={e.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground text-sm">{e.contactName ?? e.contactEmail}</p>
                        {e.contactName && <p className="text-xs text-muted-foreground">{e.contactEmail}</p>}
                      </div>
                      {statusBadge(e)}
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progreso</span><span>{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted/30">
                        <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {certUrl ? (
                        <a href={certUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Ver certificado →</a>
                      ) : (
                        <button onClick={() => void issueCert(e.id)} disabled={issuingCert === e.id}
                          className="text-xs text-primary hover:underline disabled:opacity-50">
                          {issuingCert === e.id ? "Emitiendo…" : "Emitir certificado"}
                        </button>
                      )}
                    </div>
                  </NelvyonDsCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
      {showEnroll && <EnrollModal courseId={course.id} onClose={() => setShowEnroll(false)} onSaved={() => { void loadEnrollments(); setShowEnroll(false); }} />}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SaasLmsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editorCourse, setEditorCourse] = useState<Course | null>(null);
  const [studentsCourse, setStudentsCourse] = useState<Course | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/lms");
      const data = (await res.json().catch(() => ({ courses: [] }))) as { courses: Course[] };
      setCourses(data.courses ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalRevenue = courses.reduce((s, c) => s + c.price * c.enrollments, 0);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="lms" />}>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-muted/30" />)}
          </div>
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
                  <NelvyonDsBadge tone={statusTone(c.status)}>{statusLabel(c.status)}</NelvyonDsBadge>
                </div>
                {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div><p className="text-xs text-muted-foreground">Precio</p><p className="font-semibold text-foreground">{c.price === 0 ? "Gratis" : `${c.price}€`}</p></div>
                  <div><p className="text-xs text-muted-foreground">Alumnos</p><p className="font-semibold text-foreground">{c.enrollments}</p></div>
                  <div><p className="text-xs text-muted-foreground">Módulos</p><p className="font-semibold text-foreground">{c.modulesCount}</p></div>
                </div>
                <div className="flex gap-2">
                  <NelvyonDsButton variant="ghost" className="flex-1" onClick={() => setEditorCourse(c)}>Módulos</NelvyonDsButton>
                  <NelvyonDsButton variant="ghost" className="flex-1" onClick={() => setStudentsCourse(c)}>Alumnos</NelvyonDsButton>
                </div>
              </NelvyonDsCard>
            ))}
          </div>
        )}
      </div>

      {showNew && <NewCourseModal onClose={() => setShowNew(false)} onSaved={load} />}
      {editorCourse && <CourseEditorPanel course={editorCourse} onClose={() => setEditorCourse(null)} onRefresh={load} />}
      {studentsCourse && <StudentsPanel course={studentsCourse} onClose={() => setStudentsCourse(null)} />}
    </SaasShellLayout>
  );
}
