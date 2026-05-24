"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AuthLayout } from "@/components/nelvyon-site/AuthLayout";
import { identifyUser, trackEvent } from "@/lib/analytics";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 transition focus:border-[#0066FF] focus:outline-none";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams?.get("next") ?? null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const destination =
    typeof nextPath === "string" && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) {
      setError("Introduce un email válido");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data === "object" && data !== null
            ? (typeof (data as { message?: unknown }).message === "string"
                ? (data as { message: string }).message
                : typeof (data as { error?: unknown }).error === "string"
                  ? (data as { error: string }).error
                  : null)
            : null;
        setError(msg ?? "Credenciales incorrectas");
        return;
      }
      const meRes = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
      if (meRes.ok) {
        const me = (await meRes.json()) as { userId?: string; plan?: string };
        if (typeof me.userId === "string") {
          identifyUser(me.userId, { plan: typeof me.plan === "string" ? me.plan : "free" });
        }
      }
      trackEvent("user_logged_in");
      router.push(destination);
      router.refresh();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout subtitle="Accede a tu panel NELVYON" title="Iniciar sesión">
      <form className="space-y-4" onSubmit={(ev) => void handleSubmit(ev)}>
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          onClick={() => setError("OAuth Google: crea tu cuenta con email o contacta a soporte para SSO empresarial.")}
          type="button"
        >
          <span className="text-lg">G</span>
          Continuar con Google
        </button>
        <p className="text-center text-xs text-zinc-600">o con email</p>
        <input autoComplete="email" className={inputClass} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required type="email" value={email} />
        <input autoComplete="current-password" className={inputClass} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" required type="password" value={password} />
        <div className="text-right">
          <Link className="text-xs text-[#0066FF] hover:underline" href="/auth/forgot-password">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        {error ? <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div> : null}
        <button className="w-full rounded-full bg-[#0066FF] py-3 text-sm font-semibold text-white hover:bg-[#0052cc] disabled:opacity-50" disabled={loading} type="submit">
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-zinc-500">
        ¿No tienes cuenta?{" "}
        <Link className="text-[#0066FF] hover:underline" href="/register">
          Regístrate gratis
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-zinc-400">Cargando…</p>}>
      <LoginForm />
    </Suspense>
  );
}
