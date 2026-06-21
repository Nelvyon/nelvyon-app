"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080808] px-4 text-zinc-100">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <h1 className="text-xl font-semibold text-red-300">Enlace no válido</h1>
          <p className="mt-3 text-sm text-zinc-400">Falta el token de restablecimiento. Solicita un nuevo enlace.</p>
          <Link href="/auth/forgot-password" className="mt-8 inline-block text-sm text-indigo-400 hover:text-indigo-300">
            Solicitar nuevo enlace →
          </Link>
        </div>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo restablecer la contraseña");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080808] px-4 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <Link href="/" className="text-2xl font-black tracking-tight text-indigo-500">
          NELVYON
        </Link>
        <h1 className="mt-6 text-xl font-semibold text-zinc-100">Nueva contraseña</h1>

        {done ? (
          <p className="mt-3 text-sm text-emerald-400">
            Contraseña actualizada. Redirigiendo al login…
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-zinc-400">Elige una contraseña segura de al menos 8 caracteres.</p>
            <form className="mt-6 space-y-4" noValidate onSubmit={(ev) => void handleSubmit(ev)}>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400" htmlFor="password">
                  Nueva contraseña
                </label>
                <input
                  autoComplete="new-password"
                  className={inputClass}
                  disabled={loading}
                  id="password"
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400" htmlFor="confirm">
                  Confirmar contraseña
                </label>
                <input
                  autoComplete="new-password"
                  className={inputClass}
                  disabled={loading}
                  id="confirm"
                  minLength={8}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  type="password"
                  value={confirm}
                />
              </div>
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              <button
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                disabled={loading}
                type="submit"
              >
                {loading ? "Guardando…" : "Guardar contraseña"}
              </button>
            </form>
          </>
        )}

        <Link href="/login" className="mt-8 inline-block text-sm text-indigo-400 hover:text-indigo-300">
          ← Volver al login
        </Link>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-zinc-400">Cargando…</p>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
