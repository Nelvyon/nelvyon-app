"use client";

import Link from "next/link";

import { useAuth } from "@/core/auth/AuthContext";
import { getBrandMode } from "@/core/platform/brand";
import { isClientTicketCreateEnabled } from "@/core/platform/surfacePolicy";
import { usePortalAuth } from "@/features/client_portal_v1/PortalAuthContext";
import { ActivationChecklist } from "@/features/onboarding/components/ActivationChecklist";

export function HomeDashboard() {
  const isClientMode = getBrandMode() === "client";
  const portalAuth = usePortalAuth();
  const { isAuthenticated: platformAuthenticated } = useAuth();
  const ticketCreateEnabled = isClientTicketCreateEnabled();

  if (isClientMode) {
    if (portalAuth.isLoading) {
      return (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">
          Loading your portal session…
        </div>
      );
    }

    if (!portalAuth.isAuthenticated) {
      return (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">
          <p>
            Sign in to review projects and deliverables.{" "}
            <Link className="text-link underline" href="/client/sign-in">
              Client sign-in
            </Link>{" "}
            or{" "}
            <Link className="text-link underline" href="/client/accept-invite">
              activate an invite
            </Link>
            .
          </p>
        </div>
      );
    }

    return (
      <section aria-label="Client portal home" className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card">
        <div>
          <h2 className="text-base font-semibold text-foreground">Start here</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review deliverables, track project status, and contact support from one place.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3">
          <li className="rounded-md border border-border p-3">
            <p className="text-sm font-medium text-foreground">Dashboard</p>
            <p className="mt-1 text-xs text-muted-foreground">Overview of pending reviews and activity.</p>
            <Link className="mt-2 inline-block text-sm text-link underline" href="/portal">
              Open dashboard
            </Link>
          </li>
          <li className="rounded-md border border-border p-3">
            <p className="text-sm font-medium text-foreground">Projects</p>
            <p className="mt-1 text-xs text-muted-foreground">View delivery progress and project details.</p>
            <Link className="mt-2 inline-block text-sm text-link underline" href="/portal/projects">
              Open projects
            </Link>
          </li>
          <li className="rounded-md border border-border p-3">
            <p className="text-sm font-medium text-foreground">Deliverables</p>
            <p className="mt-1 text-xs text-muted-foreground">Approve or request changes on published work.</p>
            <Link className="mt-2 inline-block text-sm text-link underline" href="/portal/deliverables">
              Open deliverables
            </Link>
          </li>
          <li className="rounded-md border border-border p-3">
            <p className="text-sm font-medium text-foreground">Requests</p>
            <p className="mt-1 text-xs text-muted-foreground">Review open items from your account team.</p>
            <Link className="mt-2 inline-block text-sm text-link underline" href="/inbox/tickets">
              Open requests
            </Link>
            {ticketCreateEnabled ? (
              <span className="mt-1 block text-xs text-muted-foreground">You can create new requests from this portal.</span>
            ) : (
              <span className="mt-1 block text-xs text-muted-foreground">New request creation is currently disabled.</span>
            )}
          </li>
          <li className="rounded-md border border-border p-3">
            <p className="text-sm font-medium text-foreground">Support</p>
            <p className="mt-1 text-xs text-muted-foreground">Find guidance and next steps for common tasks.</p>
            <Link className="mt-2 inline-block text-sm text-link underline" href="/help">
              Open support
            </Link>
          </li>
          <li className="rounded-md border border-border p-3">
            <p className="text-sm font-medium text-foreground">Billing</p>
            <p className="mt-1 text-xs text-muted-foreground">Review plan snapshot and invoices (read-only).</p>
            <Link className="mt-2 inline-block text-sm text-link underline" href="/billing">
              Open billing
            </Link>
          </li>
        </ul>
      </section>
    );
  }

  if (!platformAuthenticated) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">
        <p>
          Sign in with a <strong>real API JWT</strong> to load workspaces and the activation checklist.{" "}
          <Link className="text-link underline" href="/sign-in">
            Open sign-in (staging)
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ActivationChecklist />
    </div>
  );
}
