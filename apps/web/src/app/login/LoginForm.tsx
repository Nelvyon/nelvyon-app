"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AuthLayout } from "@/components/nelvyon-site/AuthLayout";
import { useAuth } from "@/core/auth/AuthContext";
import { nelvyonPlanToUiRole } from "@/core/auth/nelvyonPlanRole";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 transition focus:border-[#0066FF] focus:outline-none";

type LoginSuccess = {
  userId: string;
  email: string;
  tenantId: string;
  token: string;
  expiresAt?: string;
  plan?: string;
};

function resolveRedirectPath(next: string | null): string {
  const trimmed = next?.trim();
  if (trimmed && trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }
  return "/dashboard";
}

function readErrorMessage(data: unknown): string {
  if (typeof data !== "object" || data === null) return "Credenciales incorrectas";
  const o = data as { message?: unknown; error?: unknown };
  if (typeof o.message === "string" && o.message.trim()) return o.message;
  if (typeof o.error === "string" && o.error.trim()) return o.error;
  return "Credenciales incorrectas";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(readErrorMessage(data));
        return;
      }
      const body = data as LoginSuccess;
      if (
        typeof body.userId !== "string" ||
        typeof body.email !== "string" ||
        typeof body.token !== "string"
      ) {
        setError("Respuesta de login inválida. Inténtalo de nuevo.");
        return;
      }

      signIn(
        {
          id: body.userId,
          email: body.email,
          role: nelvyonPlanToUiRole(typeof body.plan === "string" ? body.plan : "free"),
          tenantId: typeof body.tenantId === "string" ? body.tenantId : undefined,
        },
        body.token,
      );

      const target = resolveRedirectPath(searchParams?.get("next") ?? null);
      router.push(target);
      router.refresh();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      subtitle="Accede al centro de operaciones de Nelvyon — packs autónomos y OS de marketing en un solo panel."
      title="Bienvenido de nuevo"
    >
      <form className="space-y-5" noValidate onSubmit={(ev) => void handleSubmit(ev)}>
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

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium text-zinc-400" htmlFor="password">
              Contraseña
            </label>
            <Link className="text-sm text-[#66a3ff] hover:text-white" href="/forgot-password">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            autoComplete="current-password"
            className={inputClass}
            disabled={loading}
            id="password"
            name="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            required
            type="password"
            value={password}
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
            {error}
          </div>
        ) : null}

        <button
          className="w-full rounded-xl bg-[#0066FF] px-4 py-3 text-sm font-semibold text-white shadow-[0_0_32px_rgba(0,102,255,0.35)] transition hover:bg-[#0052cc] disabled:opacity-50"
          disabled={loading}
          type="submit"
        >
          {loading ? "Iniciando sesión…" : "Acceder al panel"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-500">
        ¿No tienes cuenta?{" "}
        <Link className="font-semibold text-[#66a3ff] hover:text-white" href="/register">
          Empieza gratis
        </Link>
      </p>
    </AuthLayout>
  );
}
