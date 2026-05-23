"use client";

import { GraduationCap, Users } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "@/core/ui/button";
import { publicLmsApi } from "@/features/dashboard/api";

function str(v: unknown, fb = ""): string {
  if (v == null || v === "") return fb;
  return String(v);
}

function formatPrice(cents: unknown, currency = "eur"): string {
  const n = Number(cents ?? 0);
  if (n <= 0) return "Gratis";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: String(currency) }).format(n / 100);
}

export default function PublicCursoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = str(params?.id);
  const [course, setCourse] = useState<Record<string, unknown> | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const c = await publicLmsApi.course(id);
    setCourse(c);
  }, [id]);

  useEffect(() => {
    load().catch(() => setCourse(null));
  }, [load]);

  useEffect(() => {
    const sessionId = searchParams?.get("session_id");
    const savedEmail = typeof window !== "undefined" ? localStorage.getItem(`lms_email_${id}`) : null;
    if (sessionId && savedEmail) {
      publicLmsApi
        .enroll(id, { student_email: savedEmail, checkout_session_id: sessionId })
        .then((en) => {
          if (en.id) {
            localStorage.setItem(`lms_enrollment_${id}`, str(en.id));
            window.location.href = `/curso/${id}/aprender`;
          }
        })
        .catch(() => undefined);
    }
  }, [id, searchParams]);

  async function onEnroll(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const price = Number(course?.price_cents ?? 0);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const body = {
        student_email: email,
        student_name: name || undefined,
        success_url: `${origin}/curso/${id}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/curso/${id}`,
      };
      const result = await publicLmsApi.enroll(id, body);
      if (result.checkout_url) {
        localStorage.setItem(`lms_email_${id}`, email);
        window.location.href = str(result.checkout_url);
        return;
      }
      if (result.id) {
        localStorage.setItem(`lms_enrollment_${id}`, str(result.id));
        localStorage.setItem(`lms_email_${id}`, email);
        if (price <= 0) {
          window.location.href = `/curso/${id}/aprender`;
        }
      }
    } catch {
      setError("No se pudo completar la inscripción");
    } finally {
      setLoading(false);
    }
  }

  if (!course) {
    return <p className="mx-auto max-w-3xl p-8 text-muted-foreground">Curso no encontrado o no publicado.</p>;
  }

  const modules = (course.modules as Record<string, unknown>[]) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      {course.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="h-56 w-full rounded-xl object-cover" src={str(course.thumbnail_url)} />
      ) : null}
      <header className="space-y-3">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <GraduationCap className="h-8 w-8 text-primary" />
          {str(course.title)}
        </h1>
        <p className="text-muted-foreground">{str(course.description)}</p>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="text-lg font-semibold text-foreground">{formatPrice(course.price_cents, str(course.currency, "eur"))}</span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" /> {str(course.students_count, "0")} alumnos
          </span>
          <span>{str(course.total_duration_minutes, "0")} min total</span>
          <span>Idioma: {str(course.idioma, "es")}</span>
        </div>
      </header>

      <section className="rounded-xl border p-6">
        <h2 className="mb-4 text-lg font-semibold">Temario</h2>
        <div className="space-y-4">
          {modules.map((mod) => (
            <div key={str(mod.id)}>
              <h3 className="font-medium">{str(mod.title)}</h3>
              <ul className="mt-2 space-y-1 pl-4 text-sm text-muted-foreground">
                {((mod.lessons as Record<string, unknown>[]) ?? []).map((l) => (
                  <li key={str(l.id)}>
                    {str(l.title)} ({str(l.content_type)})
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Inscribirse</h2>
        <form className="space-y-3" onSubmit={onEnroll}>
          <input required type="email" className="w-full rounded-lg border px-3 py-2" placeholder="Email" value={email} onChange={(ev) => setEmail(ev.target.value)} />
          <input className="w-full rounded-lg border px-3 py-2" placeholder="Nombre (opcional)" value={name} onChange={(ev) => setName(ev.target.value)} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={loading} type="submit">
            {Number(course.price_cents) > 0 ? "Pagar e inscribirse" : "Inscribirse gratis"}
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          ¿Ya inscrito? <Link className="text-primary underline" href={`/curso/${id}/aprender`}>Ir al área de aprendizaje</Link>
        </p>
      </section>
    </div>
  );
}
