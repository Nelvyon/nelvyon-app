"use client";

import Link from "next/link";
import { useState } from "react";

const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo enviar el enlace");
        return;
      }
      setSent(true);
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
        <h1 className="mt-6 text-xl font-semibold text-zinc-100">Recuperar contraseña</h1>

        {sent ? (
          <p className="mt-3 text-sm text-zinc-400">
            Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña en los próximos
            minutos. Revisa también la carpeta de spam.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-zinc-400">
              Introduce el email de tu cuenta y te enviaremos un enlace para elegir una nueva contraseña.
            </p>
            <form className="mt-6 space-y-4" noValidate onSubmit={(ev) => void handleSubmit(ev)}>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-400" htmlFor="email">
                  Email
                </label>
                <input
                  autoComplete="email"
                  className={inputClass}
                  disabled={loading}
                  id="email"
                  name="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  required
                  type="email"
                  value={email}
                />
              </div>
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              <button
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                disabled={loading}
                type="submit"
              >
                {loading ? "Enviando…" : "Enviar enlace"}
              </button>
            </form>
          </>
        )}

        <Link
          href="/login"
          className="mt-8 inline-block text-sm text-indigo-400 hover:text-indigo-300"
        >
          ← Volver al login
        </Link>
      </div>
    </main>
  );
}
