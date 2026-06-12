"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { AuthDebugPanel } from "@/core/auth/AuthDebugPanel";
import { useAuth } from "@/core/auth/AuthContext";
import { getBrandAppName, getBrandMode } from "@/core/platform/brand";
import { isModuleAllowed, isPathAllowed } from "@/core/platform/surfacePolicy";
import { ModuleKey, can } from "@/core/routing/roleMatrix";
import { AppShell } from "@/core/shell/AppShell";
import { ForbiddenNotice } from "@/core/ui/pageStatus";

interface ProtectedLayoutProps {
  module: ModuleKey;
  children: ReactNode;
}

function AuthLoadingShell() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">Cargando sesión…</p>
    </div>
  );
}

export function ProtectedLayout({ module, children }: ProtectedLayoutProps) {
  const { isAuthenticated, isBootstrapping, user } = useAuth();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const brandMode = getBrandMode();
  const isClientMode = brandMode === "client";
  const appName = getBrandAppName(brandMode);

  useEffect(() => {
    if (isBootstrapping || isAuthenticated) return;
    if (isClientMode) return;
    const next = encodeURIComponent(pathname || "/dashboard");
    router.replace(`/login?next=${next}`);
  }, [isAuthenticated, isBootstrapping, isClientMode, pathname, router]);

  if (isBootstrapping) {
    return <AuthLoadingShell />;
  }

  if (!isAuthenticated || !user) {
    if (isClientMode) {
      return (
        <div className="space-y-4 p-6">
          <p className="text-sm text-destructive">Sign-in required</p>
          <p className="text-sm text-muted-foreground">
            Open the client access page to continue.{" "}
            <Link className="text-link underline" href="/client/sign-in">
              Client sign-in
            </Link>
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">Redirigiendo al inicio de sesión…</p>
        <p className="text-sm text-muted-foreground">
          Si no ocurre automáticamente, abre{" "}
          <Link className="text-link underline" href={`/login?next=${encodeURIComponent(pathname || "/dashboard")}`}>
            iniciar sesión
          </Link>
          .
        </p>
        {!isClientMode ? <AuthDebugPanel /> : null}
      </div>
    );
  }

  if (!isPathAllowed(pathname, brandMode) || !isModuleAllowed(module, brandMode)) {
    return (
      <div className="p-6">
        <ForbiddenNotice title="Internal area">
          <p>This area is reserved for internal operations and is not exposed in client portal mode.</p>
        </ForbiddenNotice>
      </div>
    );
  }

  if (!can(user.role, module, "view")) {
    if (isClientMode && isModuleAllowed(module, brandMode)) {
      return <AppShell>{children}</AppShell>;
    }
    return (
      <div className="p-6">
        <ForbiddenNotice>
          <p>
            {isClientMode
              ? "This section is not enabled for your account."
              : `This ${appName} module is not available for your current role. Ask a workspace admin if you need access, or switch account from the debug tools while you are testing.`}
          </p>
        </ForbiddenNotice>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
