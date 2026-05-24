"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthLayout } from "@/components/nelvyon-site/AuthLayout";
import { identifyUser, trackEvent } from "@/lib/analytics";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 transition focus:border-[#0066FF] focus:outline-none";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "" });
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
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data === "object" && data !== null && "message" in data && typeof (data as { message: unknown }).message === "string"
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
    <AuthLayout subtitle="Crea tu workspace y empieza a imponer tu legado" title="Registro">
      <form className="space-y-4" onSubmit={(ev) => void handleSubmit(ev)}>
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          onClick={() => setError("Registro con Google disponible para cuentas empresariales — usa el formulario o contacta ventas.")}
          type="button"
        >
          <span className="text-lg">G</span>
          Registrarse con Google
        </button>
        <p className="text-center text-xs text-zinc-600">o completa el formulario</p>
        <input className={inputClass} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nombre completo" required type="text" value={form.name} />
        <input className={inputClass} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email profesional" required type="email" value={form.email} />
        <input className={inputClass} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} placeholder="Empresa (opcional)" type="text" value={form.company} />
        <input className={inputClass} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Contraseña (mín. 8 caracteres)" required type="password" value={form.password} />
        <p className="text-xs text-zinc-600">
          Al registrarte aceptas los{" "}
          <Link className="text-[#0066FF] hover:underline" href="/terminos">
            términos
          </Link>{" "}
          y la{" "}
          <Link className="text-[#0066FF] hover:underline" href="/privacidad">
            privacidad
          </Link>
          .
        </p>
        {error ? <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div> : null}
        <button className="w-full rounded-full bg-[#0066FF] py-3 text-sm font-semibold text-white hover:bg-[#0052cc] disabled:opacity-50" disabled={loading} type="submit">
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-zinc-500">
        ¿Ya tienes cuenta?{" "}
        <Link className="text-[#0066FF] hover:underline" href="/login">
          Iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
