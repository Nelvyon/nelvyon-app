"use client";

import Link from "next/link";
import { ReactNode } from "react";

import { getBrandMode } from "@/core/platform/brand";
import { ForbiddenNotice } from "@/core/ui/pageStatus";
import { PageLoading } from "@/core/ui/pageStatus";
import { AppShell } from "@/core/shell/AppShell";
import { usePortalAuth } from "@/features/client_portal_v1/PortalAuthContext";

export function PortalProtectedLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = usePortalAuth();
  const isClientMode = getBrandMode() === "client";

  if (!isClientMode) {
    return (
      <div className="p-6">
        <ForbiddenNotice title="Client portal only">
          <p>These routes are available when the app runs in client portal mode.</p>
        </ForbiddenNotice>
      </div>
    );
  }

  if (isLoading) {
    return (
      <AppShell>
        <PageLoading message="Loading your client portal session…" />
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="space-y-4 p-6">
          <p className="text-sm text-muted-foreground">Sign in to access your projects and deliverables.</p>
          <Link className="text-sm text-link underline" href="/client/sign-in">
            Go to client sign-in
          </Link>
        </div>
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}
