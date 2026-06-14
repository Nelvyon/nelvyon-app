"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { getBrandAppName, getBrandMode } from "@/core/platform/brand";
import { Button } from "@/core/ui/button";
import { portalApi } from "@/features/client_portal_v1/api";
import { usePortalAuth } from "@/features/client_portal_v1/PortalAuthContext";
import { PortalErrorState } from "@/features/client_portal_v1/components/PortalUiStates";

export default function ClientSignInPage() {
  const router = useRouter();
  const { signIn, isAuthenticated } = usePortalAuth();
  const appName = getBrandAppName(getBrandMode());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace("/portal");
  }, [isAuthenticated, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await portalApi.login({ email: email.trim(), password });
      signIn(response);
      router.push("/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center p-6">
      <div className="rounded-lg border border-border bg-card p-6 shadow-card">
        <h1 className="text-xl font-semibold text-foreground">Acceso cliente · {appName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Inicia sesión con el email y la contraseña que definiste al aceptar la invitación.
        </p>

        <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              className="h-9 w-full rounded-md border border-input bg-background px-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="h-9 w-full rounded-md border border-input bg-background px-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? <PortalErrorState title="Error al iniciar sesión" message={error} /> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando…" : "Iniciar sesión"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          ¿Recibiste un enlace de invitación?{" "}
          <Link className="text-link underline" href="/client/accept-invite">
            Activar cuenta
          </Link>
        </p>
        <p className="mt-2 text-sm">
          <Link className="text-link underline" href="/">
            Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}
