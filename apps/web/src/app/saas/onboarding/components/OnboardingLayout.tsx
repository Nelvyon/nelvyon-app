"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { NelvyonDsSectionHeader, NelvyonDsStatusDot } from "@/design-system/components";

export type OnboardingLayoutProps = {
  step: number;
  children: ReactNode;
};

export function OnboardingLayout({ step, children }: OnboardingLayoutProps) {
  const safeStep = Math.min(4, Math.max(1, step));
  const pct = Math.round((safeStep / 4) * 100);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <NelvyonDsSectionHeader
        eyebrow="SaaS onboarding"
        title="Configura tu espacio NELVYON"
        subtitle="Cuatro pasos rápidos para activar tu cuenta y alinear el producto a tu negocio."
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <NelvyonDsStatusDot status="ok" label={`Paso ${safeStep} de 4`} />
            Paso {safeStep} de 4
          </span>
          <span>{pct}%</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso de onboarding"
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {children}
      <p className="text-center text-xs text-muted-foreground">
        <Link className="underline hover:text-foreground" href="/legal/terms">
          Términos
        </Link>
        {" · "}
        <Link className="underline hover:text-foreground" href="/legal/privacy">
          Privacidad
        </Link>
      </p>
    </div>
  );
}
