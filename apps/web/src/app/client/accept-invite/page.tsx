"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { getBrandAppName, getBrandMode } from "@/core/platform/brand";
import { Button } from "@/core/ui/button";
import { portalApi } from "@/features/client_portal_v1/api";
import { usePortalAuth } from "@/features/client_portal_v1/PortalAuthContext";
import { PortalErrorState, PortalLoadingState } from "@/features/client_portal_v1/components/PortalUiStates";

function AcceptInviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenFromUrl = params?.get("token") ?? "";
  const { signIn } = usePortalAuth();
  const appName = getBrandAppName(getBrandMode());
  const [token, setToken] = useState(tokenFromUrl);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hasTokenFromLink = Boolean(tokenFromUrl.trim());

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await portalApi.acceptInvite({
        token: token.trim(),
        password,
        name: name.trim() || undefined,
      });
      signIn(response);
      router.push("/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-card">
      <h1 className="text-xl font-semibold text-foreground">Activar acceso a {appName}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasTokenFromLink
          ? "Tu invitación está lista. Elige una contraseña (mínimo 8 caracteres) para acceder al portal."
          : "Pega el token de invitación y elige una contraseña (mínimo 8 caracteres)."}
      </p>

      <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
        {!hasTokenFromLink ? (
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Token de invitación</span>
            <input
              type="text"
              required
              className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-xs"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </label>
        ) : (
          <input type="hidden" value={token} readOnly />
        )}
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Tu nombre (opcional)</span>
          <input
            type="text"
            className="h-9 w-full rounded-md border border-input bg-background px-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Contraseña</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-9 w-full rounded-md border border-input bg-background px-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <PortalErrorState title="Error de activación" message={error} /> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Activando…" : "Activar cuenta"}
        </Button>
      </form>

      <p className="mt-4 text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link className="text-link underline" href="/client/sign-in">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}

export default function ClientAcceptInvitePage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center p-6">
      <Suspense fallback={<PortalLoadingState message="Cargando invitación…" />}>
        <AcceptInviteForm />
      </Suspense>
    </main>
  );
}
