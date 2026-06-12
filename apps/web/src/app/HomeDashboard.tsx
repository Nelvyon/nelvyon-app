"use client";

import React from "react";

import { useAuth } from "@/core/auth/AuthContext";
import { ActivationChecklist } from "@/features/onboarding/components/ActivationChecklist";

export function HomeDashboard() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-card">
        Preparando tu workspace…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-card">
        <p>Inicia sesión para ver tu checklist de activación y los próximos pasos recomendados.</p>
      </div>
    );
  }

  return <ActivationChecklist />;
}
