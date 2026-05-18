"use client";

import React from "react";
import Link from "next/link";

import { useAuth } from "@/core/auth/AuthContext";
import { Button } from "@/core/ui/button";

/**
 * Staging helpers — not production login. OIDC remains the long-term browser flow on the API host.
 */
export function AuthDebugPanel() {
  const { user, signOut } = useAuth();

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{user.role}</span>
        <Button size="sm" variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" variant="default">
        <Link href="/sign-in">Sign in (JWT)</Link>
      </Button>
    </div>
  );
}
