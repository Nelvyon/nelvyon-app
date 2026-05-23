"use client";

import { CheckCircle2, Download } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import { publicLmsApi } from "@/features/dashboard/api";

function str(v: unknown, fb = ""): string {
  if (v == null || v === "") return fb;
  return String(v);
}

function lsKey(courseId: string, suffix: string) {
  return `lms_${suffix}_${courseId}`;
}

export default function AprenderCursoPage() {
  const params = useParams();
  const courseId = str(params?.id);
  const [course, setCourse] = useState<Record<string, unknown> | null>(null);
  const [progress, setProgress] = useState<Record<string, unknown>>({});
  const [activeLesson, setActiveLesson] = useState<Record<string, unknown> | null>(null);
  const [certificate, setCertificate] = useState<Record<string, unknown> | null>(null);
  const enrollmentId = typeof window !== "undefined" ? localStorage.getItem(lsKey(courseId, "enrollment")) : null;
  const email = typeof window !== "undefined" ? localStorage.getItem(lsKey(courseId, "email")) : null;

  const load = useCallback(async () => {
    const c = await publicLmsApi.course(courseId);
    setCourse(c);
    const mods = (c.modules as Record<string, unknown>[]) ?? [];
    const firstLesson = mods.flatMap((m) => (m.lessons as Record<string, unknown>[]) ?? [])[0] ?? null;
    setActiveLesson((prev) => prev ?? firstLesson);
    if (email) {
      const p = await publicLmsApi.progress(courseId, email);
      setProgress(p);
      if (Number(p.progress_percent) >= 100 && p.enrollment_id) {
        const cert = await publicLmsApi.certificate(str(p.enrollment_id));
        setCertificate(cert);
      }
    }
  }, [courseId, email]);

  useEffect(() => {
    load().catch(() => setCourse(null));
  }, [load]);

  const completedSet = useMemo(() => new Set((progress.completed_lessons as string[]) ?? []), [progress]);
  const pct = Number(progress.progress_percent ?? 0);

  async function completeLesson() {
    const eid = enrollmentId || str(progress.enrollment_id);
    const lid = str(activeLesson?.id);
    if (!eid || !lid) return;
    const p = await publicLmsApi.completeLesson(eid, lid);
    setProgress(p);
    if (Number(p.progress_percent) >= 100) {
      const cert = await publicLmsApi.certificate(eid);
      setCertificate(cert);
    }
  }

  function downloadCertificate() {
    if (!certificate) return;
    const blob = new Blob([JSON.stringify(certificate, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificado-${courseId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!course) {
    return (
      <p className="p-8 text-center text-muted-foreground">
        Curso no disponible. <Link href={`/curso/${courseId}`}>Inscríbete primero</Link>
      </p>
    );
  }

  const modules = (course.modules as Record<string, unknown>[]) ?? [];

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="w-full border-b bg-muted/30 p-4 lg:w-72 lg:border-b-0 lg:border-r">
        <Link className="text-sm text-primary underline" href={`/curso/${courseId}`}>
          ← {str(course.title)}
        </Link>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs">
            <span>Progreso</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <nav className="mt-6 space-y-4 text-sm">
          {modules.map((mod) => (
            <div key={str(mod.id)}>
              <p className="font-semibold">{str(mod.title)}</p>
              <ul className="mt-1 space-y-1">
                {((mod.lessons as Record<string, unknown>[]) ?? []).map((l) => {
                  const lid = str(l.id);
                  const done = completedSet.has(lid);
                  return (
                    <li key={lid}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-muted",
                          activeLesson?.id === l.id && "bg-primary/10 font-medium",
                        )}
                        onClick={() => setActiveLesson(l)}
                      >
                        {done ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <span className="h-3 w-3 rounded-full border" />}
                        {str(l.title)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6">
        {!activeLesson ? (
          <p>Selecciona una lección</p>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-2xl font-bold">{str(activeLesson.title)}</h1>
            {activeLesson.content_type === "video" && activeLesson.content_url ? (
              <video controls className="w-full rounded-lg border" src={str(activeLesson.content_url)} />
            ) : null}
            {activeLesson.content_type === "text" ? (
              <div className="prose rounded-lg border bg-card p-4 dark:prose-invert">
                <p className="whitespace-pre-wrap">{str(activeLesson.content_url) || "Contenido de texto pendiente."}</p>
              </div>
            ) : null}
            {activeLesson.content_type === "pdf" && activeLesson.content_url ? (
              <iframe className="h-[480px] w-full rounded-lg border" src={str(activeLesson.content_url)} title="PDF" />
            ) : null}
            {activeLesson.content_type === "quiz" ? (
              <p className="rounded-lg border bg-muted/30 p-4 text-sm">Quiz interactivo — {str(activeLesson.content_url)}</p>
            ) : null}
            <Button onClick={completeLesson}>Completar lección</Button>
          </div>
        )}

        {certificate ? (
          <div className="mx-auto mt-10 max-w-lg rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h2 className="mt-2 text-lg font-bold">¡Curso completado!</h2>
            <p className="text-sm text-muted-foreground">{str(certificate.course_title)}</p>
            <Button className="mt-4" onClick={downloadCertificate}>
              <Download className="mr-2 h-4 w-4" /> Descargar certificado
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
