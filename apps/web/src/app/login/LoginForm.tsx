"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { IconBrandGithub, IconBrandGoogle } from "@tabler/icons-react";

import { Container } from "@/components/agenforce/container";
import { Heading } from "@/components/agenforce/heading";
import { MarketingLayout } from "@/components/agenforce/marketing-layout";
import { Subheading } from "@/components/agenforce/subheading";
import { useAuth } from "@/core/auth/AuthContext";
import { nelvyonPlanToUiRole } from "@/core/auth/nelvyonPlanRole";

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
    <MarketingLayout>
      <div className="w-full min-h-[70vh] px-4 py-8">
        <Container className="w-full max-w-md">
          <div className="flex flex-col items-center">
            <Heading as="h1" className="text-center text-2xl md:text-3xl lg:text-4xl">
              Bienvenido de nuevo
            </Heading>
            <Subheading className="mt-2 text-center">
              Inicia sesión para gestionar clientes, campañas y soporte desde un solo panel.
            </Subheading>
          </div>

          <div className="mt-8 space-y-4">
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Próximamente"
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium opacity-60 transition-colors dark:border-neutral-700 dark:bg-neutral-800"
            >
              <IconBrandGoogle className="size-5" />
              Continuar con Google
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Próximamente"
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium opacity-60 transition-colors dark:border-neutral-700 dark:bg-neutral-800"
            >
              <IconBrandGithub className="size-5" />
              Continuar con GitHub
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-4 text-neutral-500">O continúa con email</span>
            </div>
          </div>

          <form className="space-y-6" noValidate onSubmit={(ev) => void handleSubmit(ev)}>
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-neutral-700 dark:bg-neutral-800"
                placeholder="tu@empresa.com"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Contraseña
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-neutral-500 transition-colors hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-neutral-700 dark:bg-neutral-800"
                placeholder="Tu contraseña"
              />
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-sm bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? "Iniciando sesión…" : "Iniciar sesión"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-neutral-500">
            ¿No tienes cuenta?{" "}
            <Link
              href="/register"
              className="font-medium text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
            >
              Regístrate gratis
            </Link>
          </p>
        </Container>
      </div>
    </MarketingLayout>
  );
}
