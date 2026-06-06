"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { getBrandAppName, getBrandMode } from "@/core/platform/brand";
import { Button } from "@/core/ui/button";
import { usePortalAuth } from "@/features/client_portal_v1/PortalAuthContext";

export function PortalPageHeader({
  title,
  description,
  backHref,
}: {
  title: string;
  description?: string;
  backHref?: string;
}) {
  return (
    <header className="space-y-2">
      {backHref ? (
        <Link className="text-sm text-link underline" href={backHref}>
          ← Back
        </Link>
      ) : null}
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </header>
  );
}

export function PortalPageShell({
  title,
  description,
  backHref,
  children,
}: {
  title: string;
  description?: string;
  backHref?: string;
  children: ReactNode;
}) {
  const { user, signOut } = usePortalAuth();
  const appName = getBrandAppName(getBrandMode());

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{appName}</p>
          {user ? (
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user.email}</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/portal">Dashboard</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/portal/projects">Projects</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/portal/deliverables">Deliverables</Link>
          </Button>
          {user ? (
            <Button variant="ghost" size="sm" type="button" onClick={() => signOut()}>
              Sign out
            </Button>
          ) : null}
        </div>
      </div>
      <PortalPageHeader title={title} description={description} backHref={backHref} />
      {children}
    </div>
  );
}
