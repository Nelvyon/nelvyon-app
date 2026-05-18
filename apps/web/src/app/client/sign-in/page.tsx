"use client";

import Link from "next/link";

import { getBrandAppName, getBrandMode } from "@/core/platform/brand";

export default function ClientSignInPage() {
  const appName = getBrandAppName(getBrandMode());
  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-xl font-semibold text-foreground">{appName} access</h1>
      <p className="text-sm text-muted-foreground">
        Client sign-in is prepared for a secure email link flow. This page intentionally does not expose technical token login.
      </p>
      <p className="text-sm text-muted-foreground">
        Next step for deployment: connect this route to backend-issued one-time links and a server session cookie.
      </p>
      <p className="text-sm">
        <Link className="text-link underline" href="/">
          Back to portal home
        </Link>
      </p>
    </main>
  );
}

