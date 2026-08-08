"use client";

/**
 * /saas/lms sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: catalogo de cursos, arbol de modulos y lista de alumnos ->
 * `W3crmContentBox` + `W3crmDataTable`; los cinco dialogos (nuevo curso, nueva
 * leccion, matricular, editor de modulos, alumnos) -> `W3crmModal`; KPIs ->
 * `W3crmKpiTile`. Sin componentes nuevos.
 *
 * Inventario: sin `data-testid` y sin spec dedicado — lo cubren
 * `saas-modules.spec.ts` (la ruta carga sin 500) y `saas-nav-full-coverage`.
 * Sin textos-contrato salvo el titulo del modulo, que se conserva.
 *
 * Logica de NELVYON intacta: los cinco endpoints (`/api/saas/lms`,
 * `/lessons`, `/lessons/[id]`, `/modules`, `/modules/[id]`) con sus cuerpos en
 * snake_case tal cual los espera la API; las acciones `enroll`, `publish` e
 * `issue_certificate`; el `DELETE /api/saas/lms?id=`; la reconciliacion de
 * `editorCourse`/`studentsCourse` tras recargar; el `quiz_json` construido a
 * partir de pregunta + opciones por linea + indice correcto.
 *
 * Unico cambio de comportamiento: los dos `confirm()` nativos pasan al dialogo
 * de sweetalert2 que ya usa el resto del SaaS migrado. Misma pregunta, misma
 * consecuencia.
 */
import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Alert from "sweetalert2";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import {
  W3crmCargando,
  W3crmContentBox,
  W3crmDataTable,
  W3crmModal,
} from "@/features/saas-w3crm/components/W3crmContentBox";

interface Course {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  price: number;
  enrollments: number;
  modulesCount: number;
  coverImage: string | null;
  createdAt: string;
}
interface LmsLesson {
  id: string;
  moduleId: string;
  title: string;
  contentType: "text" | "video" | "quiz";
  content: string | null;
  videoUrl: string | null;
  durationMinutes: number | null;
  lessonOrder: number;
  quizJson: Record<string, unknown> | null;
}
interface LmsModule {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  modOrder: number;
  lessonsCount: number;
  lessons: LmsLesson[];
}
interface Enrollment {
  id: string;
  courseId: string;
  contactEmail: string;
  contactName: string | null;
  status: string;
  enrolledAt: string;
  progressPct?: number;
  lessonsCompleted?: number;
  lessonsTotal?: number;
  certificateUrl?: string | null;
}

const ESTADO_LABEL: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};
const ESTADO_BADGE: Record<string, string> = {
  draft: "badge-primary",
  published: "badge-success",
  archived: "badge-secondary",
};

/** Un estado fuera de catalogo pintaba `undefined`. */
function statusLabel(s: string): string {
  return ESTADO_LABEL[s] ?? (s ? String(s) : "—");
}
function statusBadge(s: string): string {
  return ESTADO_BADGE[s] ?? "badge-secondary";
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** El ancho de la barra no puede salirse de la tarjeta con datos corruptos. */
function pct(v: unknown): number {
  return Math.min(100, Math.max(0, Math.round(num(v))));
}
function tipoLeccion(t: string): string {
  return t === "video" ? "Vídeo" : t === "quiz" ? "Quiz" : "Texto";
}
async function confirmar(title: string, text: string): Promise<boolean> {
  const r = await Alert.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Eliminar",
    cancelButtonText: "Cancelar",
  });
  return Boolean(r.isConfirmed);
}

// ── Nuevo curso ──────────────────────────────────────────────────────────────
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
      const res = await fetch("/api/saas/lms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: desc.trim() || null,
          price: parseFloat(price) || 0,
        }),
      });
      if (!res.ok) throw new Error("Error al crear curso");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <W3crmModal titulo="Nuevo curso" onClose={onClose} error={error}>
      <form onSubmit={(e) => void save(e)}>
        <div className="form-group mb-3">
          <label htmlFor="lms-titulo" className="text-black font-w600">Título <span className="required">*</span></label>
          <input id="lms-titulo" className="form-control" placeholder="Marketing Digital con IA"
            value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="form-group mb-3">
          <label htmlFor="lms-desc" className="text-black font-w600">Descripción</label>
          <textarea id="lms-desc" className="form-control" rows={3} placeholder="Descripción del curso…"
            value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="form-group mb-3">
          <label htmlFor="lms-precio" className="text-black font-w600">Precio (€) — 0 = gratuito</label>
          <input id="lms-precio" className="form-control" type="number" min="0" step="0.01"
            value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Creando…" : "Crear curso"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

// ── Nueva lección ────────────────────────────────────────────────────────────
function AddLessonModal({ moduleId, onClose, onSaved }: { moduleId: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"text" | "video" | "quiz">("text");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [quizQ, setQuizQ] = useState("");
  const [quizOpts, setQuizOpts] = useState("");
  const [quizCorrect, setQuizCorrect] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("El título es obligatorio"); return; }
    setSaving(true);
    try {
      const quizJson =
        type === "quiz"
          ? {
              questions: [
                {
                  text: quizQ,
                  options: quizOpts.split("\n").map((s) => s.trim()).filter(Boolean),
                  correct: parseInt(quizCorrect) || 0,
                },
              ],
            }
          : null;
      const res = await fetch("/api/saas/lms/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_id: moduleId,
          title: title.trim(),
          content_type: type,
          content: type === "text" ? content || null : null,
          video_url: type === "video" ? videoUrl || null : null,
          duration_minutes: duration ? parseInt(duration) : null,
          quiz_json: quizJson,
        }),
      });
      if (!res.ok) { const d = (await res.json()) as { error?: string }; throw new Error(d.error ?? "Error"); }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <W3crmModal titulo="Nueva lección" onClose={onClose} error={error} size="lg">
      <form onSubmit={(e) => void save(e)}>
        <div className="form-group mb-3">
          <label htmlFor="lec-titulo" className="text-black font-w600">Título <span className="required">*</span></label>
          <input id="lec-titulo" className="form-control" placeholder="Introducción al módulo"
            value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="form-group mb-3">
          <label htmlFor="lec-tipo" className="text-black font-w600">Tipo</label>
          <select id="lec-tipo" className="form-control" value={type}
            onChange={(e) => setType(e.target.value as "text" | "video" | "quiz")}>
            <option value="text">Texto</option>
            <option value="video">Vídeo</option>
            <option value="quiz">Quiz</option>
          </select>
        </div>
        {type === "text" && (
          <div className="form-group mb-3">
            <label htmlFor="lec-contenido" className="text-black font-w600">Contenido</label>
            <textarea id="lec-contenido" className="form-control" rows={5}
              value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
        )}
        {type === "video" && (
          <>
            <div className="form-group mb-3">
              <label htmlFor="lec-video" className="text-black font-w600">URL del vídeo</label>
              <input id="lec-video" className="form-control" placeholder="https://www.youtube.com/watch?v=…"
                value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
            </div>
            <div className="form-group mb-3">
              <label htmlFor="lec-duracion" className="text-black font-w600">Duración (min)</label>
              <input id="lec-duracion" className="form-control" type="number" min="1"
                value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </>
        )}
        {type === "quiz" && (
          <>
            <div className="form-group mb-3">
              <label htmlFor="lec-pregunta" className="text-black font-w600">Pregunta</label>
              <input id="lec-pregunta" className="form-control" value={quizQ} onChange={(e) => setQuizQ(e.target.value)} />
            </div>
            <div className="form-group mb-3">
              <label htmlFor="lec-opciones" className="text-black font-w600">Opciones (una por línea)</label>
              <textarea id="lec-opciones" className="form-control" rows={3} placeholder={"Opción A\nOpción B\nOpción C"}
                value={quizOpts} onChange={(e) => setQuizOpts(e.target.value)} />
            </div>
            <div className="form-group mb-3">
              <label htmlFor="lec-correcta" className="text-black font-w600">Índice respuesta correcta (0, 1, 2…)</label>
              <input id="lec-correcta" className="form-control" type="number" min="0"
                value={quizCorrect} onChange={(e) => setQuizCorrect(e.target.value)} />
            </div>
          </>
        )}
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Añadir lección"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

// ── Matricular ───────────────────────────────────────────────────────────────
function EnrollModal({ courseId, onClose, onSaved }: { courseId: string; onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Email obligatorio"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/saas/lms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enroll",
          course_id: courseId,
          contact_email: email.trim(),
          contact_name: name.trim() || null,
        }),
      });
      if (!res.ok) { const d = (await res.json()) as { error?: string }; throw new Error(d.error ?? "Error"); }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <W3crmModal titulo="Matricular alumno" onClose={onClose} error={error}>
      <form onSubmit={(e) => void save(e)}>
        <div className="form-group mb-3">
          <label htmlFor="mat-email" className="text-black font-w600">Email <span className="required">*</span></label>
          <input id="mat-email" className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="form-group mb-3">
          <label htmlFor="mat-nombre" className="text-black font-w600">Nombre</label>
          <input id="mat-nombre" className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Matriculando…" : "Matricular"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

// ── Editor de módulos y lecciones ────────────────────────────────────────────
function CourseEditorPanel({ course, onClose, onRefresh }: { course: Course; onClose: () => void; onRefresh: () => void }) {
  const [modules, setModules] = useState<LmsModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModTitle, setNewModTitle] = useState("");
  const [addLessonModId, setAddLessonModId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string>(course.status);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => { setStatus(course.status); }, [course.status]);

  const loadModules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/saas/lms/modules?course_id=${course.id}`);
      const data = (await res.json().catch(() => ({}))) as { modules?: LmsModule[] };
      setModules(Array.isArray(data.modules) ? data.modules : []);
    } finally {
      setLoading(false);
    }
  }, [course.id]);

  useEffect(() => { void loadModules(); }, [loadModules]);

  async function addModule() {
    if (!newModTitle.trim()) return;
    setActionError(null);
    const res = await fetch("/api/saas/lms/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: course.id, title: newModTitle.trim() }),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setActionError(d.error ?? "No se pudo crear el módulo");
      return;
    }
    setNewModTitle("");
    void loadModules();
    void onRefresh();
  }

  async function deleteModule(modId: string) {
    if (!(await confirmar("¿Eliminar módulo y todas sus lecciones?", "Esta acción no se puede deshacer."))) return;
    setActionError(null);
    const res = await fetch(`/api/saas/lms/modules/${modId}`, { method: "DELETE" });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setActionError(d.error ?? "No se pudo eliminar el módulo");
      return;
    }
    void loadModules();
    void onRefresh();
  }

  async function deleteLesson(lessonId: string) {
    setActionError(null);
    const res = await fetch(`/api/saas/lms/lessons/${lessonId}`, { method: "DELETE" });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setActionError(d.error ?? "No se pudo eliminar la lección");
      return;
    }
    void loadModules();
  }

  async function publishCourse() {
    setActionError(null);
    const res = await fetch("/api/saas/lms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", course_id: course.id }),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setActionError(d.error ?? "No se pudo publicar el curso");
      return;
    }
    setStatus("published");
    void onRefresh();
  }

  function toggleExpand(modId: string) {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(modId)) n.delete(modId); else n.add(modId);
      return n;
    });
  }

  return (
    <>
      <W3crmModal titulo={`${course.title} — módulos y lecciones`} onClose={onClose} error={actionError} size="lg">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <span className={`badge ${statusBadge(status)}`}>{statusLabel(status)}</span>
          {status === "draft" && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void publishCourse()}>
              Publicar curso
            </button>
          )}
        </div>

        {loading ? (
          <W3crmCargando texto="Cargando módulos…" />
        ) : modules.length === 0 ? (
          <W3crmEmptyState title="Sin módulos" description="Añade el primero con el formulario de abajo." />
        ) : (
          <W3crmDataTable
            filas={modules}
            etiqueta="módulos"
            wrapperId="modules_wrapper"
            porPagina={10}
            columnas={[{ titulo: "Módulo" }, { titulo: "Lecciones" }, { titulo: "Gestión", alFinal: true }]}
            render={(mod) => {
              const lecciones = Array.isArray(mod.lessons) ? mod.lessons : [];
              const abierto = expanded.has(mod.id);
              return (
                /* La fila del modulo y la de sus lecciones son hermanas dentro
                   del `map` de la tabla: la clave va en el fragmento. */
                <Fragment key={mod.id}>
                  <tr>
                    <td>
                      <button type="button" className="btn btn-link p-0 text-start text-decoration-none"
                        aria-expanded={abierto} onClick={() => toggleExpand(mod.id)}>
                        <i className={`fa-solid ${abierto ? "fa-angle-down" : "fa-angle-right"} me-2`} />
                        <span className="fw-bold">{mod.title || "—"}</span>
                      </button>
                    </td>
                    <td>{num(mod.lessonsCount)}</td>
                    <td className="text-end">
                      <button type="button" className="btn btn-primary light btn-sm me-1"
                        aria-label={`Añadir lección a ${mod.title}`} onClick={() => setAddLessonModId(mod.id)}>
                        + Lección
                      </button>
                      <button type="button" className="btn btn-danger light btn-sm"
                        aria-label={`Eliminar módulo ${mod.title}`} onClick={() => void deleteModule(mod.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                  {abierto && (
                    <tr>
                      <td colSpan={3}>
                        {lecciones.length === 0 ? (
                          <p className="text-muted fs-12 mb-0">Sin lecciones</p>
                        ) : (
                          <ul className="list-group list-group-flush">
                            {lecciones.map((l) => (
                              <li key={l.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                                <span>
                                  <span className="badge badge-secondary me-2">{tipoLeccion(l.contentType)}</span>
                                  {l.title || "—"}
                                  {l.durationMinutes ? (
                                    <span className="text-muted fs-12 ms-2">{num(l.durationMinutes)} min</span>
                                  ) : null}
                                </span>
                                <button type="button" className="btn btn-danger light btn-sm"
                                  aria-label={`Eliminar lección ${l.title}`} onClick={() => void deleteLesson(l.id)}>
                                  Eliminar
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            }}
          />
        )}

        <div className="row align-items-end mt-3">
          <div className="col-sm-8">
            <div className="form-group mb-3">
              <label htmlFor="mod-nuevo" className="text-black font-w600">Nuevo módulo</label>
              <input id="mod-nuevo" className="form-control" placeholder="Nombre del nuevo módulo"
                value={newModTitle} onChange={(e) => setNewModTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addModule(); } }} />
            </div>
          </div>
          <div className="col-sm-4">
            <div className="form-group mb-3">
              <button type="button" className="btn btn-primary w-100" disabled={!newModTitle.trim()}
                onClick={() => void addModule()}>
                + Módulo
              </button>
            </div>
          </div>
        </div>
      </W3crmModal>
      {addLessonModId && (
        <AddLessonModal moduleId={addLessonModId}
          onClose={() => setAddLessonModId(null)}
          onSaved={() => { void loadModules(); setAddLessonModId(null); }} />
      )}
    </>
  );
}

// ── Alumnos ──────────────────────────────────────────────────────────────────
function StudentsPanel({ course, onClose }: { course: Course; onClose: () => void }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuingCert, setIssuingCert] = useState<string | null>(null);
  const [showEnroll, setShowEnroll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/saas/lms?course_id=${course.id}`);
      const data = (await res.json().catch(() => ({}))) as { enrollments?: Enrollment[] };
      setEnrollments(Array.isArray(data.enrollments) ? data.enrollments : []);
    } finally {
      setLoading(false);
    }
  }, [course.id]);

  useEffect(() => { void loadEnrollments(); }, [loadEnrollments]);

  async function issueCert(enrollmentId: string) {
    setIssuingCert(enrollmentId);
    setActionError(null);
    try {
      const res = await fetch("/api/saas/lms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "issue_certificate", enrollment_id: enrollmentId }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(d.error ?? "No se pudo emitir el certificado");
        return;
      }
      void loadEnrollments();
    } finally {
      setIssuingCert(null);
    }
  }

  return (
    <>
      <W3crmModal titulo={`${course.title} — alumnos matriculados`} onClose={onClose} error={actionError} size="lg">
        <div className="text-end mb-3">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowEnroll(true)}>
            + Matricular
          </button>
        </div>
        {loading ? (
          <W3crmCargando texto="Cargando alumnos…" />
        ) : enrollments.length === 0 ? (
          <W3crmEmptyState title="Sin alumnos" description="Matricula al primero con el botón de arriba." />
        ) : (
          <W3crmDataTable
            filas={enrollments}
            etiqueta="alumnos"
            wrapperId="enrollments_wrapper"
            porPagina={10}
            columnas={[{ titulo: "Alumno" }, { titulo: "Progreso" }, { titulo: "Estado" }, { titulo: "Certificado", alFinal: true }]}
            render={(e) => {
              const p = pct(e.progressPct);
              const certUrl = e.certificateUrl ?? null;
              return (
                <tr key={e.id}>
                  <td>
                    <span className="fw-bold">{e.contactName ?? e.contactEmail ?? "—"}</span>
                    {e.contactName ? <div className="text-muted fs-12">{e.contactEmail}</div> : null}
                  </td>
                  <td style={{ minWidth: 140 }}>
                    <div className="d-flex justify-content-between fs-12 text-muted">
                      <span>{e.lessonsTotal ? `${num(e.lessonsCompleted)}/${num(e.lessonsTotal)}` : "Progreso"}</span>
                      <span>{p}%</span>
                    </div>
                    <div className="progress" style={{ height: 6 }}>
                      <div className="progress-bar bg-primary" style={{ width: `${p}%` }}
                        role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}
                        aria-label={`Progreso de ${e.contactName ?? e.contactEmail}`} />
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${e.status === "completed" ? "badge-success" : "badge-primary"}`}>
                      {e.status === "completed" ? "Completado" : "Activo"}
                    </span>
                  </td>
                  <td className="text-end">
                    {certUrl ? (
                      <a className="btn btn-primary light btn-sm" href={certUrl} target="_blank" rel="noreferrer">
                        Ver certificado
                      </a>
                    ) : (
                      <button type="button" className="btn btn-primary light btn-sm" disabled={issuingCert === e.id}
                        aria-label={`Emitir certificado para ${e.contactName ?? e.contactEmail}`}
                        onClick={() => void issueCert(e.id)}>
                        {issuingCert === e.id ? "Emitiendo…" : "Emitir certificado"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            }}
          />
        )}
      </W3crmModal>
      {showEnroll && (
        <EnrollModal courseId={course.id}
          onClose={() => setShowEnroll(false)}
          onSaved={() => { void loadEnrollments(); setShowEnroll(false); }} />
      )}
    </>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function SaasLmsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editorCourse, setEditorCourse] = useState<Course | null>(null);
  const [studentsCourse, setStudentsCourse] = useState<Course | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/lms");
      const data = (await res.json().catch(() => ({}))) as { courses?: Course[] };
      const list = Array.isArray(data.courses) ? data.courses : [];
      setCourses(list);
      setEditorCourse((prev) => (prev ? list.find((c) => c.id === prev.id) ?? prev : null));
      setStudentsCourse((prev) => (prev ? list.find((c) => c.id === prev.id) ?? prev : null));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function deleteCourse(id: string) {
    if (!(await confirmar("¿Eliminar este curso y todo su contenido?", "Esta acción no se puede deshacer."))) return;
    setActionError(null);
    const res = await fetch(`/api/saas/lms?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setActionError(d.error ?? "No se pudo eliminar el curso");
      return;
    }
    if (editorCourse?.id === id) setEditorCourse(null);
    if (studentsCourse?.id === id) setStudentsCourse(null);
    void load();
  }

  const totalRevenue = courses.reduce((s, c) => s + num(c.price) * num(c.enrollments), 0);
  const totalAlumnos = courses.reduce((s, c) => s + num(c.enrollments), 0);
  const publicados = courses.filter((c) => c.status === "published").length;

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="LMS — Cursos y Formación" parentTitle="Gestión" pageTitle="LMS" />
      <div className="container-fluid">
        <div className="row">
          {actionError && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {actionError}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setActionError(null)} />
              </div>
            </div>
          )}

          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Cursos" value={courses.length} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Publicados" value={publicados} accent /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Alumnos totales" value={totalAlumnos} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Revenue cursos" value={`${totalRevenue.toFixed(0)} €`} /></div>

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Crea y vende cursos online directamente desde Nelvyon ·{" "}
              <Link href="/saas/certificados">Certificados LMS</Link>
            </p>

            <W3crmContentBox
              titulo="Cursos"
              icono="fa-solid fa-graduation-cap"
              acciones={
                <button type="button" className="btn btn-primary btn-sm me-2" onClick={() => setShowNew(true)}>
                  + Nuevo curso
                </button>
              }
            >
              {loading ? (
                <W3crmCargando texto="Cargando cursos…" />
              ) : courses.length === 0 ? (
                <W3crmEmptyState title="Sin cursos" description="Monetiza tu conocimiento creando cursos online." />
              ) : (
                <W3crmDataTable
                  filas={courses}
                  etiqueta="cursos"
                  wrapperId="courses_wrapper"
                  porPagina={10}
                  columnas={[
                    { titulo: "Curso" },
                    { titulo: "Precio" },
                    { titulo: "Alumnos" },
                    { titulo: "Módulos" },
                    { titulo: "Estado" },
                    { titulo: "Gestión", alFinal: true },
                  ]}
                  render={(c) => (
                    <tr key={c.id}>
                      <td>
                        <span className="fw-bold">{c.title || "—"}</span>
                        {c.description ? <div className="text-muted fs-12">{c.description}</div> : null}
                      </td>
                      <td>{num(c.price) === 0 ? "Gratis" : `${num(c.price)} €`}</td>
                      <td>{num(c.enrollments)}</td>
                      <td>{num(c.modulesCount)}</td>
                      <td><span className={`badge ${statusBadge(c.status)}`}>{statusLabel(c.status)}</span></td>
                      <td className="text-end">
                        <button type="button" className="btn btn-primary light btn-sm me-1"
                          aria-label={`Módulos de ${c.title}`} onClick={() => setEditorCourse(c)}>
                          Módulos
                        </button>
                        <button type="button" className="btn btn-primary light btn-sm me-1"
                          aria-label={`Alumnos de ${c.title}`} onClick={() => setStudentsCourse(c)}>
                          Alumnos
                        </button>
                        <button type="button" className="btn btn-danger light btn-sm"
                          aria-label={`Eliminar curso ${c.title}`} onClick={() => void deleteCourse(c.id)}>
                          Eliminar
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

      {showNew && <NewCourseModal onClose={() => setShowNew(false)} onSaved={load} />}
      {editorCourse && <CourseEditorPanel course={editorCourse} onClose={() => setEditorCourse(null)} onRefresh={load} />}
      {studentsCourse && <StudentsPanel course={studentsCourse} onClose={() => setStudentsCourse(null)} />}
    </SaasW3crmShell>
  );
}
