"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { identifyUser, trackEvent } from "@/lib/analytics";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.name.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres");
      return;
    }
    if (!form.email.includes("@")) {
      setError("Introduce un email válido");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(form),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof (data as { message: unknown }).message === "string"
            ? (data as { message: string }).message
            : "Error al crear la cuenta";
        setError(msg);
        return;
      }
      const registered = data as { userId?: string };
      if (typeof registered.userId === "string") {
        identifyUser(registered.userId, { plan: "free" });
      }
      trackEvent("signup_completed", { plan: "free" });
      router.push("/dashboard");
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
          <p className="mt-2 text-sm text-zinc-400">Crea tu cuenta gratis</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Nombre</label>
              <input
                type="text"
                required
                placeholder="Tu nombre"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Email</label>
              <input
                type="email"
                required
                placeholder="tu@empresa.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Contraseña</label>
              <input
                type="password"
                required
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Creando cuenta…" : "Crear cuenta gratis →"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
              Inicia sesión
            </Link>
          </p>
          <p className="mt-3 text-center text-xs text-zinc-600">
            Al registrarte aceptas los{" "}
            <Link href="/terms" className="underline hover:text-zinc-400">
              Términos
            </Link>{" "}
            y la{" "}
            <Link href="/privacy" className="underline hover:text-zinc-400">
              Política de privacidad
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
