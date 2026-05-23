"use client";

import { Calendar, User, Video } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/core/ui/button";
import { publicWebinarsApi } from "@/features/dashboard/api";

function str(v: unknown, fb = ""): string {
  if (v == null || v === "") return fb;
  return String(v);
}

function formatPrice(cents: unknown): string {
  const n = Number(cents ?? 0);
  if (n <= 0) return "Gratis";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n / 100);
}

function useCountdown(targetIso: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return useMemo(() => {
    const target = new Date(targetIso).getTime();
    const diff = Math.max(0, target - now);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s, done: diff <= 0 };
  }, [now, targetIso]);
}

export default function PublicWebinarPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = str(params?.slug);
  const [webinar, setWebinar] = useState<Record<string, unknown> | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const w = await publicWebinarsApi.get(slug);
    setWebinar(w);
  }, [slug]);

  useEffect(() => {
    load().catch(() => setWebinar(null));
  }, [load]);

  useEffect(() => {
    const sessionId = searchParams?.get("session_id");
    const savedEmail = typeof window !== "undefined" ? localStorage.getItem(`webinar_email_${slug}`) : null;
    const wid = str(webinar?.id);
    if (sessionId && savedEmail && wid) {
      publicWebinarsApi
        .register(wid, { email: savedEmail, checkout_session_id: sessionId })
        .then(() => toastRegister())
        .catch(() => undefined);
    }
  }, [slug, searchParams, webinar?.id]);

  function toastRegister() {
    if (typeof window !== "undefined") {
      alert("¡Registro confirmado! Revisa tu email.");
    }
  }

  const countdown = useCountdown(str(webinar?.scheduled_at, new Date().toISOString()));

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    if (!webinar?.id) return;
    setLoading(true);
    setError("");
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const body = {
        email,
        name: name || undefined,
        success_url: `${origin}/webinar/${slug}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/webinar/${slug}`,
      };
      const result = await publicWebinarsApi.register(str(webinar.id), body);
      if (result.checkout_url) {
        localStorage.setItem(`webinar_email_${slug}`, email);
        window.location.href = str(result.checkout_url);
        return;
      }
      localStorage.setItem(`webinar_email_${slug}`, email);
      toastRegister();
    } catch {
      setError("No se pudo completar el registro");
    } finally {
      setLoading(false);
    }
  }

  if (!webinar) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-muted-foreground">
        Cargando webinar…
      </div>
    );
  }

  const isLive = str(webinar.status) === "live";

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      {webinar.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={str(webinar.thumbnail_url)} alt="" className="h-56 w-full rounded-xl object-cover" />
      ) : (
        <div className="flex h-56 items-center justify-center rounded-xl bg-muted">
          <Video className="h-16 w-16 text-muted-foreground" />
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold">{str(webinar.title)}</h1>
        <p className="mt-2 text-muted-foreground">{str(webinar.description)}</p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" /> {str(webinar.scheduled_at).slice(0, 16)}
        </span>
        <span className="flex items-center gap-1">
          <User className="h-4 w-4" /> {str(webinar.host_name, "Host")}
        </span>
        <span className="font-medium">{formatPrice(webinar.price_cents)}</span>
      </div>

      {!countdown.done && !isLive ? (
        <div className="rounded-lg border p-4 text-center">
          <p className="text-sm text-muted-foreground">Comienza en</p>
          <p className="text-3xl font-bold tabular-nums">
            {String(countdown.h).padStart(2, "0")}:{String(countdown.m).padStart(2, "0")}:{String(countdown.s).padStart(2, "0")}
          </p>
        </div>
      ) : null}

      {isLive ? (
        <Button asChild>
          <Link href={`/webinar/${slug}/live`}>Entrar al webinar en vivo</Link>
        </Button>
      ) : (
        <form onSubmit={onRegister} className="max-w-md space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Regístrate</h2>
          <input
            type="text"
            placeholder="Nombre"
            className="w-full rounded border px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="email"
            required
            placeholder="Email"
            className="w-full rounded border px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Procesando…" : "Reservar plaza"}
          </Button>
        </form>
      )}
    </div>
  );
}
