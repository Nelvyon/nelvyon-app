"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { fetchAuthMe, fetchWorkspaceList } from "@/core/auth/authApi";
import { resolveUiRole } from "@/core/auth/mapSession";
import { WORKSPACE_ID_STORAGE_KEY } from "@/core/auth/sessionStorageKeys";
import { useAuth } from "@/core/auth/AuthContext";
import { getBrandAppName, getBrandMode } from "@/core/platform/brand";
import { useWorkspace } from "@/core/workspace/WorkspaceContext";
import { Button } from "@/core/ui/button";
import { trackProductEvent } from "@/core/telemetry/productEvents";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const { setWorkspaceId } = useWorkspace();
  const [jwt, setJwt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const brandMode = getBrandMode();
  const appName = getBrandAppName(brandMode);

  const returnTo = searchParams?.get("returnTo") || "/";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const token = jwt.trim();
    if (!token) {
      setError("Paste a JWT issued by the NELVYON API (staging / demo).");
      return;
    }
    setBusy(true);
    try {
      const me = await fetchAuthMe(token);
      const workspaces = await fetchWorkspaceList(token);
      const activeRow = workspaces[0] ?? null;
      if (activeRow) {
        try {
          localStorage.setItem(WORKSPACE_ID_STORAGE_KEY, String(activeRow.id));
        } catch {
          /* ignore */
        }
      }
      const role = resolveUiRole(me, activeRow);
      signIn({ id: me.id, email: me.email || "—", role }, token);
      if (activeRow) {
        setWorkspaceId(String(activeRow.id));
      }
      trackProductEvent("auth_bridge_sign_in_success", {
        route: "/sign-in",
        workspace_id: activeRow?.id ?? null,
      });
      router.replace(returnTo.startsWith("/") ? returnTo : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not validate token.");
    } finally {
      setBusy(false);
    }
  };

  if (brandMode === "client") {
    return (
      <main className="mx-auto max-w-lg p-6">
        <h1 className="text-xl font-semibold text-foreground">{appName}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Direct token sign-in is disabled in client portal mode. Contact your account owner to access your enabled views.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Next: use the client access route for secure sign-in flow setup and account onboarding guidance.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild type="button">
            <Link href="/client/sign-in">Open client access</Link>
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/">Back to portal home</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-xl font-semibold text-foreground">NELVYON — session (staging / demo)</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        This is <strong>not</strong> the final product login. Production uses OIDC (
        <code className="rounded bg-muted px-1 text-xs">GET {API_BASE}/api/v1/auth/login</code>) which sets an HttpOnly
        cookie on the API origin — this Next app uses Bearer tokens for API calls. For real activation against a
        running API, paste a <strong>short-lived JWT</strong> from your identity pipeline or internal tooling. Tokens
        are kept in <code className="rounded bg-muted px-1 text-xs">sessionStorage</code> only for this browser tab.
      </p>

      <form className="mt-6 space-y-3" onSubmit={onSubmit}>
        <label className="block text-sm text-muted-foreground" htmlFor="jwt">
          Access token (JWT)
        </label>
        <textarea
          className="min-h-[120px] w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground"
          id="jwt"
          onChange={(e) => setJwt(e.target.value)}
          placeholder="eyJ…"
          value={jwt}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} type="submit">
            {busy ? "Checking…" : "Continue"}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/">Cancel</Link>
          </Button>
        </div>
      </form>

      <p className="mt-6 text-xs text-muted-foreground">
        After sign-in, workspaces load from <code className="rounded bg-muted px-1">GET /api/v1/workspace/list</code>.
        The first workspace is selected automatically if none was stored.
      </p>
    </main>
  );
}
