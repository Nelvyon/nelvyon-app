"use client";

import Link from "next/link";

import { useAuth } from "@/core/auth/AuthContext";
import { getBrandMode } from "@/core/platform/brand";
import { isClientTicketCreateEnabled } from "@/core/platform/surfacePolicy";
import { ActivationChecklist } from "@/features/onboarding/components/ActivationChecklist";

export function HomeDashboard() {
  const { isAuthenticated } = useAuth();
  const isClientMode = getBrandMode() === "client";
  const ticketCreateEnabled = isClientTicketCreateEnabled();

  if (isClientMode) {
    if (!isAuthenticated) {
      return (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">
          <p>
            Sign in to open your request and project portal.
            {" "}
            <Link className="text-link underline" href="/client/sign-in">
              Open client sign-in
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
            Track requests, review project status, and contact support from one place.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3">
          <li className="rounded-md border border-border p-3">
            <p className="text-sm font-medium text-foreground">Requests</p>
            <p className="mt-1 text-xs text-muted-foreground">Review open items and updates from your account team.</p>
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
            <p className="text-sm font-medium text-foreground">Projects</p>
            <p className="mt-1 text-xs text-muted-foreground">View delivery progress and current execution status.</p>
            <Link className="mt-2 inline-block text-sm text-link underline" href="/campaigns">
              Open projects
            </Link>
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
            <p className="mt-1 text-xs text-muted-foreground">Review plan snapshot, usage, and invoices in read-only mode.</p>
            <Link className="mt-2 inline-block text-sm text-link underline" href="/billing">
              Open billing
            </Link>
          </li>
          <li className="rounded-md border border-border p-3">
            <p className="text-sm font-medium text-foreground">Account</p>
            <p className="mt-1 text-xs text-muted-foreground">Check profile details, access count, and recent account activity.</p>
            <Link className="mt-2 inline-block text-sm text-link underline" href="/account">
              Open account
            </Link>
          </li>
        </ul>
      </section>
    );
  }

  if (!isAuthenticated) {
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
