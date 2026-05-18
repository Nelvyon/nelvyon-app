"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { identifyUser, trackEvent } from "@/lib/analytics";

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
    <main className="flex min-h-screen items-center justify-center bg-[#080808] px-4 text-zinc-100">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-black tracking-tight text-indigo-500">
            NELVYON
          </Link>
          <p className="mt-2 text-sm text-zinc-400">Inicia sesión en tu cuenta</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300">Contraseña</label>
                <Link href="/auth/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Entrando…" : "Iniciar sesión →"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300">
              Crear cuenta gratis
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-zinc-400">Cargando…</p>}>
      <LoginForm />
    </Suspense>
  );
}
